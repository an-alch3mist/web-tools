# Grab Rope — Manual Test Flow

> Verifies SpringJoint grab + LineRenderer rope visual + joint break + release behavior.

---

## Prerequisites

- Player GO with: PlayerMovement, PlayerCamera, PlayerGrab
- Camera child GO with Camera component
- HoldPosition child GO (in front of camera, ~1m forward)
- RigidbodyDragger child GO (starts **inactive**):
  - Rigidbody (isKinematic = true)
  - RigidbodyDraggerController (wire `_playerGrab` → PlayerGrab on parent)
- LineRenderer on Player GO:
  - Material: simple unlit white/grey
  - Start Width: 0.02, End Width: 0.02
  - Positions: 2 (set at runtime)
- 4-5 cubes in scene:
  - Rigidbody (mass ~1, no constraints)
  - Collider (BoxCollider)
  - Tag: "Grabbable"
  - Layer: "Interact"
- PlayerGrab wiring:
  - `_cam` → Camera
  - `_holdPos` → HoldPosition
  - `_dragger` → RigidbodyDragger GO
  - `_rope` → LineRenderer
  - `_interactRange` → 2
  - `_interactLayerMask` → "Interact" layer
- PlayerGrabTest or PlayerMovementTest script on a GO (for M/N menu sim)

---

## 1. Initial State

**DO:** Press Play
**EXPECT:**
- All cubes sitting on ground, physics settled
- LineRenderer **not visible** (rope disabled)
- RigidbodyDragger GO is **inactive**
- Cursor locked (FPS mode)

---

## 2. Grab a Cube

**DO:** Look at a cube (within 2m) → right-click
**EXPECT:**
- **Rope appears** — line from HoldPosition to cube's grab point
- Rope has 2 points: dragger position → cube anchor point
- Cube starts **following** your aim with spring physics (slight lag + bounce)
- RigidbodyDragger GO is now **active**
- Cube's Rigidbody: linearDamping increased (feels heavy/dampened)
- Cube's Rigidbody: interpolation set to Interpolate (smooth visual)

---

## 3. Move While Grabbing

**DO:** WASD to walk around while holding cube
**EXPECT:**
- Rope **stretches and follows** — line endpoints update every frame
- Cube trails behind with spring tension
- Rope length varies as you move (not fixed distance)
- No rope clipping through walls (rope is just a line, it will clip — that's normal)

**DO:** Look up/down while holding
**EXPECT:**
- Cube follows vertical aim too — HoldPosition is child of camera
- Rope redraws to match new position

---

## 4. Release

**DO:** Right-click again
**EXPECT:**
- Rope **disappears** instantly
- SpringJoint destroyed
- RigidbodyDragger GO goes **inactive**
- Cube's Rigidbody: linearDamping restored to original (bouncy again)
- Cube continues with residual physics velocity (slides/rolls)
- After ~3s: cube's interpolation set back to None (DisableInterpolationLater coroutine)

---

## 5. Grab + Object Destroyed

**DO:** Grab a cube → have another script destroy it (or use Debug console: `Destroy(cube)`)
**EXPECT:**
- Rope **disappears** automatically (Update checks `heldObject.activeInHierarchy`)
- No null ref errors in console
- Grab state resets — can grab another cube immediately

---

## 6. SpringJoint Break (Force Limit)

**DO:** Grab a cube → walk very far away quickly (sprint away)
**EXPECT:**
- At some distance, SpringJoint **breaks** (breakForce = 120)
- `RigidbodyDraggerController.OnJointBreak()` fires → calls `ForceRelease()`
- Rope **disappears**
- Cube's damping restored
- RigidbodyDragger goes inactive
- Console: no errors

**DO:** Try to grab another cube after joint break
**EXPECT:**
- Works normally — state fully reset

---

## 7. Can't Grab When Menu Open

**DO:** Press `M` (simulate menu open) → right-click on cube
**EXPECT:**
- Nothing happens — grab blocked when `isAnyMenuOpen = true`
- Cursor is unlocked (visible)

**DO:** Press `N` (simulate menu close) → right-click on cube
**EXPECT:**
- Grab works normally again

---

## 8. Grab Non-Grabbable Object

**DO:** Look at a wall or floor (no "Grabbable" tag) → right-click
**EXPECT:**
- Nothing happens — only tag "Grabbable" objects can be grabbed
- No rope appears

---

## 9. Rope Visual Quality

**DO:** Grab a cube → look at the rope closely
**EXPECT:**
- Rope is a thin line (width 0.02)
- Start point: at RigidbodyDragger position (near HoldPosition)
- End point: at cube's connected anchor point (where you clicked on the cube)
- Rope updates every frame — no 1-frame lag

---

## Summary Checklist

- [ ] Rope appears on grab (2 points, thin line)
- [ ] Rope follows cube + player movement every frame
- [ ] Right-click releases — rope disappears, damping restored
- [ ] Destroyed object → auto-release, no errors
- [ ] SpringJoint break → ForceRelease, rope gone, state reset
- [ ] Can grab new cube after break/release
- [ ] Menu open blocks grab
- [ ] Non-Grabbable objects ignored
- [ ] After 3s post-release: interpolation disabled on cube
- [ ] RigidbodyDragger active during grab, inactive otherwise