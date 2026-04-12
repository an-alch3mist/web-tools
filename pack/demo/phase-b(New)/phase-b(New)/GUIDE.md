# Phase B — Player Controller + Inventory + Tools + Grabbing (15%)

## What It Looks Like When Running

```
Full FPS controller: walk, sprint, duck, jump, slope sliding.
Look around with mouse, FOV widens when sprinting.

Walk up to a dropped pickaxe on the ground → press E → it goes
into your hotbar. Press 1-0 to switch tools. Scroll wheel cycles.
Active tool shows as a view model (first-person hands).

Hold right-click on a physics cube → SpringJoint grabs it,
a LineRenderer rope connects you to the object. Move mouse to
drag it around. Click again to release. Object bounces naturally.

Equip pickaxe → hold left-click → swing animation plays,
delayed raycast hits world objects.

Equip magnet tool → hold right-click → nearby physics objects
fly toward you via spring joints. Left-click to launch them.
R to drop gently. Q to cycle grab mode.

FresnelHighlighter outlines whatever you're looking at.
Each system testable independently.
```

---

## Folder Structure

```
phase-b(New)/
├── 0-Core/
│   └── GameEvents.cs                       (partial: OnToolSwitched, OnItemPickedUp, etc.)
├── 1-Managers/
│   └── SubManager/
│       └── InventoryUI.cs                  → "I open and close the inventory panel"
├── 2-Data/
│   ├── SO_FootstepSoundDefinition.cs       → "I pair left/right footstep sounds"
│   ├── Field_InventorySlot.cs              → "I display one inventory slot"
│   ├── Interface/
│   │   ├── IIconItem.cs                    → "I have an inventory icon"
│   │   └── ISaveLoadableObject.cs          → "I can be saved/loaded (stub)"
│   ├── DataService/
│   │   └── InventoryDataService.cs         → "I manage all inventory slots" (nested: Slot)
│   └── Entities/
│       ├── MagnetToolSelectionMode.cs      → "I list magnet grab modes"
│       ├── SavableObjectID.cs              → "I identify savable objects (stub)"
│       └── HighlightStyle.cs               → "I define a fresnel highlight preset"
├── 3-MonoBehaviours/
│   ├── Orchestrator/
│   │   └── InventoryOrchestrator.cs        → "I wire inventory slot Field_ instances"
│   ├── Player/
│   │   ├── PlayerMovement.cs               → "I handle walk, sprint, duck, jump, slope sliding"
│   │   ├── PlayerCamera.cs                 → "I handle mouse look, FOV, camera bobbing"
│   │   ├── PlayerGrab.cs                   → "I grab physics objects with SpringJoint + LineRenderer"
│   │   ├── PlayerFootsteps.cs              → "I play footstep sounds based on movement"
│   │   ├── PlayerSpawnPoint.cs             → "I mark where the player spawns"
│   │   └── RigidbodyDraggerController.cs   → "I auto-release grab when SpringJoint breaks"
│   ├── Tool/
│   │   ├── BaseHeldTool.cs                 → "I'm the base class for all equippable tools"
│   │   ├── ToolPickaxe.cs                  → "I swing and raycast-hit with delay"
│   │   ├── ToolMagnet.cs                   → "I pull nearby physics objects via spring joints"
│   │   ├── ToolHammer.cs                   → "I pick up / pack placed buildings"
│   │   ├── ToolMiningHat.cs                → "I toggle a light on equip/unequip"
│   │   ├── ToolSupportsWrench.cs           → "I toggle building supports on/off"
│   │   ├── ToolResourceScanner.cs          → "I show resource info on raycast hit"
│   │   ├── ToolBuilder.cs                  → "I show ghost + place buildings (partial)"
│   │   └── ToolHardHat.cs                  → "I'm a separate tool extending ToolPickaxe"
│   ├── UIRelay/
│   │   └── UIEventRelay.cs                 → "I relay EventSystem events to Action callbacks"
│   ├── Physics/
│   │   ├── BasePhysicsObject.cs            → "I accumulate conveyor velocities for FixedUpdate"
│   │   ├── BaseSellableItem.cs             → "I have a base sell value"
│   │   ├── PhysicsSoundPlayer.cs           → "I play sound on collision impact"
│   │   └── PhysicsGib.cs                   → "I'm a debris piece that despawns after time"
│   └── FresnelHighlighter.cs               → "I outline whatever the player looks at"
├── 4-Utils/
│   ├── UtilsPhaseB.cs                      → "I hold physics helpers"
│   └── PhaseBLOG.cs                        → "I format inventory snapshots"
└── 5-Tests/
    ├── DEBUG_CheckB.cs                      → "I test InventoryDataService (plain C#)"
    ├── PlayerMovementTest.cs                → "I test WASD + jump + sprint"
    ├── PlayerGrabTest.cs                    → "I test SpringJoint grab on cubes"
    └── InventoryTest.cs                     → "I test add/remove/switch tools"
```

---

## Script Purpose — One Sentence Each

| Script | Purpose |
|--------|---------|
| `GameEvents.cs` | I deliver Phase B messages (tool switch, pickup, drop, inventory view) |
| `InventoryUI.cs` | I open and close the inventory panel |
| `SO_FootstepSoundDefinition.cs` | I pair left/right footstep sounds |
| `Field_InventorySlot.cs` | I display one inventory slot (icon, name, amount, selection) |
| `IIconItem.cs` | I'm a contract for items with inventory icons |
| `ISaveLoadableObject.cs` | I'm a stub contract for save/load (expanded Phase G) |
| `InventoryDataService.cs` | I manage all inventory slots — add/remove/switch/stack |
| `MagnetToolSelectionMode.cs` | I list magnet grab filter modes |
| `SavableObjectID.cs` | I identify savable objects (stub — expanded Phase G) |
| `HighlightStyle.cs` | I define a fresnel highlight preset (color, power, intensity) |
| `InventoryOrchestrator.cs` | I wire Field_InventorySlot instances to InventoryDataService |
| `PlayerMovement.cs` | I handle walk, sprint, duck, jump, slope sliding |
| `PlayerCamera.cs` | I handle mouse look, FOV, camera bobbing, viewmodel bobbing |
| `PlayerGrab.cs` | I grab physics objects with SpringJoint + LineRenderer rope |
| `PlayerFootsteps.cs` | I play footstep sounds based on movement speed |
| `PlayerSpawnPoint.cs` | I mark where the player spawns |
| `BaseHeldTool.cs` | I'm the base class for all equippable tools |
| `ToolPickaxe.cs` | I swing and raycast-hit with delay |
| `ToolMagnet.cs` | I pull nearby physics objects via spring joints |
| `ToolHammer.cs` | I pick up / pack placed buildings |
| `ToolMiningHat.cs` | I toggle a light on equip/unequip |
| `ToolSupportsWrench.cs` | I toggle building supports on/off |
| `ToolResourceScanner.cs` | I show resource info on raycast hit |
| `ToolBuilder.cs` | I show ghost preview + place buildings (partial — Phase D completes) |
| `BasePhysicsObject.cs` | I accumulate conveyor velocities for FixedUpdate |
| `BaseSellableItem.cs` | I have a base sell value |
| `PhysicsSoundPlayer.cs` | I play sound on collision impact |
| `PhysicsGib.cs` | I'm a debris piece that despawns after time |
| `FresnelHighlighter.cs` | I outline whatever the player looks at |
| `RigidbodyDraggerController.cs` | I auto-release grab when SpringJoint breaks |
| `ToolHardHat.cs` | I'm a separate tool type extending ToolPickaxe |
| `UIEventRelay.cs` | I relay Unity EventSystem events to Action callbacks (drag-drop, pointer) |
| `UtilsPhaseB.cs` | I hold physics helpers (IgnoreAllCollisions, SimpleExplosion, SetLayerRecursively) |
| `PhaseBLOG.cs` | I format inventory + tool snapshots for test logging |

---

## Hand-Typing Order (Compile Groups)

### Group 1 — Pure Data (compiles alone, zero Unity dependency)
1. `MagnetToolSelectionMode.cs`
2. `SavableObjectID.cs`
3. `HighlightStyle.cs`
4. `IIconItem.cs`
5. `ISaveLoadableObject.cs`

**STOP — compile. Zero errors expected.**

### Group 2 — DataService
6. `InventoryDataService.cs`

**STOP — compile. Run DEBUG_CheckB to verify add/remove/switch.**

### Group 3 — SO + Field
7. `SO_FootstepSoundDefinition.cs`
8. `Field_InventorySlot.cs`

**STOP — compile.**

### Group 4 — Physics Chain
9. `BasePhysicsObject.cs`
10. `BaseSellableItem.cs`
11. `PhysicsSoundPlayer.cs`
12. `PhysicsGib.cs`

**STOP — compile.**

### Group 5 — Tools
13. `BaseHeldTool.cs`
14. `ToolPickaxe.cs`
15. `ToolMagnet.cs`
16. `ToolHammer.cs`
17. `ToolMiningHat.cs`
18. `ToolSupportsWrench.cs`
19. `ToolResourceScanner.cs`
20. `ToolBuilder.cs`
21. `ToolHardHat.cs`

**STOP — compile.**

### Group 6 — GameEvents + Utils + UIRelay
22. `GameEvents.cs` (partial)
23. `UtilsPhaseB.cs`
24. `PhaseBLOG.cs`
25. `UIEventRelay.cs`

**STOP — compile.**

### Group 7 — Player Scripts
26. `PlayerMovement.cs`
27. `PlayerCamera.cs`
28. `PlayerGrab.cs`
29. `RigidbodyDraggerController.cs`
30. `PlayerFootsteps.cs`
31. `PlayerSpawnPoint.cs`
32. `FresnelHighlighter.cs`

**STOP — compile. Run PlayerMovementTest.**

### Group 8 — Orchestrator + SubManager
33. `InventoryOrchestrator.cs`
34. `InventoryUI.cs`

**STOP — compile. Run InventoryTest.**

### Group 9 — Tests
35. `DEBUG_CheckB.cs`
36. `PlayerMovementTest.cs`
37. `PlayerGrabTest.cs`
38. `InventoryTest.cs`
39. `ToolActionTest.cs`

**STOP — compile. Run all 5 vertical slice tests + 3 manual tests.**

---

## Vertical Slice Tests (`.cs` — automated bootstrap)

> These scripts fire GameEvents + log to console. Run in Play mode.

### 1. DEBUG_CheckB — InventoryDataService (Data-Level)

**Internal prerequisites:** `InventoryDataService.cs`, `HighlightStyle.cs`
**External prerequisites:** Empty scene, one GO with `DEBUG_CheckB`
**NOT required:** Player, tools, UI, shop, interaction — nothing
**Controls:**
- `Space` → Build 40 slots + log snapshot
- `U` → TryAdd a mock tool at preferred slot
- `I` → Remove tool at slot 0
- `O` → Switch to slot 3
- `P` → Log full snapshot

**Checklist:**
- [ ] Build creates 40 slots (10 hotbar + 30 extended)
- [ ] TryAdd places tool in first empty slot
- [ ] Remove nulls the slot
- [ ] SwitchTo changes activeSlotIndex
- [ ] Scroll wraps within hotbar bounds
- [ ] Swap exchanges two slots
- [ ] Snapshot logs all slot states

### 2. PlayerMovementTest — WASD + Jump + Sprint (UI-Level)

**Internal prerequisites:** `PlayerMovement.cs`, `PlayerCamera.cs`, `GameEvents.cs`
**External prerequisites:**
- Scene with a floor (Plane) + a few walls
- Empty GO "Player" with: CharacterController, PlayerMovement, PlayerCamera
- Child GO "Camera" with Camera component
- Child GO "GroundCheck" positioned at player feet
- Assign: `_playerCam`, `_cc`, `_groundCheck`, `_groundLayer` in inspector
**NOT required:** Inventory, tools, shop, interaction
**Controls:**
- `WASD` → move
- `Space` → jump
- `Shift` → sprint (FOV widens)
- `C` → duck
- `M` → simulate menu open (locks input)
- `N` → simulate menu close (unlocks input)

**Checklist:**
- [ ] WASD moves player
- [ ] Jump works on ground only
- [ ] Sprint increases speed + FOV
- [ ] Duck lowers height, stand-up blocked under ceiling
- [ ] Slope sliding kicks in past slope limit
- [ ] Gravity pulls down when airborne
- [ ] M key → menu open → WASD/look disabled
- [ ] N key → menu close → WASD/look re-enabled
- [ ] Cursor locked in FPS mode, unlocked in menu
- [ ] V key toggles noclip — fly through walls, no gravity
- [ ] Noclip: Space/C for up/down, Shift for fast fly

### 3. PlayerGrabTest — SpringJoint Grab (UI-Level)

**Internal prerequisites:** `PlayerMovement.cs`, `PlayerCamera.cs`, `PlayerGrab.cs`, `GameEvents.cs`
**External prerequisites:**
- Same player setup as PlayerMovementTest
- Add `PlayerGrab` to player GO, assign `_cam`, `_holdPos`, `_dragger`, `_rope`
- Child GO "HoldPosition" in front of camera
- Child GO "RigidbodyDragger" (inactive, has Rigidbody + `RigidbodyDraggerController`, assign `_playerGrab`)
- LineRenderer on player
- 3-4 cubes with Rigidbody + tag "Grabbable" + layer "Interact"
**NOT required:** Inventory, tools, shop
**Controls:**
- `Right-click` → grab/release toggle
- `WASD` → move while holding
- `M/N` → menu toggle

**Checklist:**
- [ ] Right-click on Grabbable → SpringJoint connects
- [ ] LineRenderer rope visible between hand and object
- [ ] Moving player drags object
- [ ] Right-click again → releases, rope disappears
- [ ] Object bounces naturally after release
- [ ] Cannot grab while menu is open
- [ ] Grab auto-releases if object is destroyed
- [ ] Grab auto-releases if SpringJoint breaks (pull object too far)

### 4. InventoryTest — Add/Remove/Switch Tools (UI-Level)

**Internal prerequisites:** `InventoryDataService.cs`, `InventoryOrchestrator.cs`, `InventoryUI.cs`, `Field_InventorySlot.cs`, `BaseHeldTool.cs`, `GameEvents.cs`
**External prerequisites:**
- Canvas with hotbar panel (horizontal layout) + extended panel + selected item info panel (name/desc/icon/amount texts + equip/drop buttons) + drag ghost icon (Image + TMP_Text, starts inactive)
- Empty GO with InventoryOrchestrator, assign `_hotbarContainer`, `_extendedContainer`, `_pfInventorySlot`, `_playerMovement`, drag ghost refs, selected item info refs
- Empty GO with InventoryUI SubManager
- 2-3 BaseHeldTool prefabs in scene (with Rigidbody, WorldModel, ViewModel)
**NOT required:** Player movement, grab, shop, interaction
**Controls:**
- `Space` → fire RaiseToolPickupRequested on first tool
- `1-0` → switch hotbar slots
- `Scroll` → cycle hotbar
- `G` → drop active tool
- `Tab` → toggle inventory panel

**Checklist:**
- [ ] Space picks up tool → appears in hotbar slot
- [ ] 1-0 keys switch active slot (highlight moves)
- [ ] Scroll wheel cycles through occupied slots
- [ ] G drops active tool → world model appears, leaves inventory
- [ ] Tab opens extended inventory panel
- [ ] Multiple pickups fill consecutive slots
- [ ] Drag slot from hotbar to extended → tools swap
- [ ] Drag slot outside UI → tool drops to world
- [ ] Click slot in extended inventory → selected item info panel shows name/desc/icon
- [ ] Equip button → equips tool + closes inventory
- [ ] Drop button → drops tool from info panel
- [ ] Console logs every GameEvents fire

### 5. ToolActionTest — Pickaxe + Magnet + Hammer Usage (UI-Level)

**Internal prerequisites:** `PlayerMovement.cs`, `PlayerCamera.cs`, `InventoryOrchestrator.cs`, `InventoryDataService.cs`, `BaseHeldTool.cs`, `ToolPickaxe.cs`, `ToolMagnet.cs`, `ToolHammer.cs`, `ToolMiningHat.cs`, `GameEvents.cs`
**External prerequisites:**
- Full player setup (PlayerMovement + PlayerCamera on Player GO with Camera child)
- InventoryOrchestrator wired with hotbar panel + Field_InventorySlot prefab
- 1x ToolPickaxe prefab in scene (WorldModel + ViewModel + Animator with Attack1 state)
- 1x ToolMagnet prefab in scene (with `_pullOrigin` child, `_selectionModeText` TMP on ViewModel)
- 1x ToolHammer prefab in scene
- 1x ToolMiningHat prefab in scene (with `_worldModelLight` + `_viewModelLight` children)
- 5-6 cubes with Rigidbody + tag "Grabbable" + layer "Interact" (magnet targets)
- 1 wall/floor object (non-Grabbable, layer "Interact") for pickaxe world-hit test
**NOT required:** Shop, interaction system, ore nodes, buildings
**Controls:**
- `Space` → pickup ToolPickaxe from world
- `U` → pickup ToolMagnet from world
- `I` → pickup ToolHammer from world
- `O` → pickup ToolMiningHat from world
- `1-4` → switch between equipped tools
- `Left-click hold` → pickaxe swing (hold = repeated)
- `Right-click hold` → magnet pull (nearby Grabbables fly toward you)
- `Left-click` → magnet launch (push held objects away)
- `R` → magnet gentle drop
- `Q` → magnet cycle grab mode (Everything → NotInFilter → NotOnConveyors)
- `G` → drop active tool

**Checklist:**
- [ ] Pickaxe: hold left-click → swing animation plays repeatedly at cooldown rate
- [ ] Pickaxe: swing hits Rigidbody cube → cube gets force impulse
- [ ] Pickaxe: swing hits wall → no error (non-Rigidbody surface)
- [ ] Magnet: hold right-click → nearby Grabbable cubes pulled via SpringJoints
- [ ] Magnet: left-click → held cubes launch forward
- [ ] Magnet: R key → held cubes drop gently
- [ ] Magnet: Q key → selection mode cycles, TMP text updates on viewmodel
- [ ] Magnet: pull cube far away → SpringJoint breaks → cube auto-detaches
- [ ] Hammer: left-click → raycast fires (no effect yet — buildings are Phase D)
- [ ] MiningHat: left-click → light toggles on/off on viewmodel
- [ ] All tools: G key → tool drops to world with forward velocity
- [ ] All tools: switching tools shows/hides correct ViewModel
- [ ] Console logs every GameEvents fire

---

## Manual Tests (`5-Tests/Manual/*.md` — hands-on, no script)

> These are `.md` files with DO/EXPECT steps. You follow them by hand in Play mode. They cover visual/UI flows that `.cs` tests can't verify.

| # | File | What to verify |
|---|------|---------------|
| 1 | `InventoryUITest.md` | Full inventory UI: prefab setup (Canvas, slot, info panel, drag ghost), drag-drop hotbar↔extended, selected item info, equip/drop buttons, edge cases |
| 2 | `ToolViewModelTest.md` | ViewModel equip/unequip swap, pickaxe swing animation timing, magnet pull visual, tool switch transitions |
| 3 | `GrabRopeTest.md` | SpringJoint + LineRenderer rope: connects on grab, follows movement, breaks at distance, disappears on release |

> Full setup instructions + test flow + checklist inside each `.md`. Start with `InventoryUITest.md` — it has the densest UI setup guide.

---

## Art & Scene Work (Non-Script)

> These are Unity Editor tasks — assets to create, GOs to set up, inspector wiring.

### Animation Assets

| Asset | Type | Where Used | How to Create |
|-------|------|-----------|--------------|
| `ToolPickaxe_Attack1.anim` | Animation Clip | ToolPickaxe swing | Animate ViewModel child: rotate down 45°→up over 0.3s |
| `ToolPickaxe_Controller` | AnimatorController | ToolPickaxe ViewModel | Create controller, add state named `"Attack1"`, assign clip |
| `ToolMagnet_Attack1.anim` | Animation Clip | ToolMagnet pulse (optional) | Subtle scale pulse on fire |
| `ToolHammer_Attack1.anim` | Animation Clip | ToolHammer swing | Similar to pickaxe but heavier arc |

**Animator Controller State Machine (per tool):**

```
ToolPickaxe_Controller:

  ┌──────────┐    Play("Attack1")    ┌──────────┐
  │   Idle   │ ────────────────────► │ Attack1  │
  │ (empty)  │ ◄──────────────────── │ (swing)  │
  └──────────┘    HasExitTime=true   └──────────┘
                  ExitTime=1.0
                  TransitionDuration=0.1

  - Idle = default state (orange). Empty/no clip — tool just sits in hand.
  - Attack1 = swing clip. Plays once, auto-returns to Idle via HasExitTime.
  - No parameters needed — code calls .Play("Attack1", -1, 0f) directly.
  - TransitionDuration 0.1 = fast blend back to idle after swing finishes.

ToolHammer_Controller: same flow, different Attack1 clip (heavier arc).
ToolMagnet_Controller: optional — Attack1 = subtle pulse. Or skip entirely.
```

**Wiring:** Each tool prefab's ViewModel child GO needs:
1. `Animator` component → assign the controller
2. On the tool script, `_viewModelAnimator` → drag the Animator

### Audio Clips (Phase H wires these — list here so you know what to prepare)

| Clip | Triggered By | When |
|------|-------------|------|
| `Pickaxe_Swing` | `ToolPickaxe.SwingPickaxe()` | Every swing before delayed raycast |
| `Pickaxe_Hit_Node` | `ToolPickaxe.PerformAttack()` | Raycast hits IDamageable (Phase C) |
| `Pickaxe_Hit_World` | `ToolPickaxe.PerformAttack()` | Raycast hits non-damageable surface |
| `Tool_Pickup` | `InventoryOrchestrator.HandleToolPickup()` | Tool enters inventory |
| `Tool_Drop` | `InventoryOrchestrator.HandleDropActiveTool()` | Tool leaves inventory |
| `MiningHat_Toggle` | `ToolMiningHat.ToggleLight()` | Light on/off |
| `Magnet_Cycle` | `ToolMagnet.CycleSelectionMode()` | Selection mode changed |
| `Footstep_Left/Right` | `PlayerFootsteps.Update()` | Walking on ground |
| `Footstep_Water_Left/Right` | `PlayerFootsteps.Update()` | Walking in water |
| `Player_Respawn` | `PlayerMovement.RespawnPlayer()` | Player falls below y=-200 |
| `Physics_Impact` | `PhysicsSoundPlayer.OnCollisionEnter()` | Physics objects collide |

> All marked as `// Phase H:` stubs in scripts. No AudioSource/SoundManager needed until Phase H.

### Highlight Plus Profiles

| Profile Asset | Outline Color | Width | Glow | See-Through | Used By |
|--------------|--------------|-------|------|-------------|---------|
| `HP_Tool` | Cyan (0.25, 0.85, 1) | 1.0 | Off | Off | Tools, terminals, crates |
| `HP_Grabbable` | Cyan (0.25, 0.85, 1) | 0.8 | Off | Off | Physics objects with "Grabbable" tag |
| `HP_Building` | Cyan (0.25, 0.85, 1) | 1.2 | Off | Off | Phase D — buildings when holding hammer |
| `HP_WrenchEnable` | Green (0.3, 1, 0.3) | 1.0 | Off | Off | Phase D — building supports can be enabled |
| `HP_WrenchDisable` | Red (1, 0.3, 0.3) | 1.0 | Off | Off | Phase D — building supports can be disabled |

**How to create:** Unity → Create → Highlight Plus → Profile → set outline color/width → save as `.asset`

### Tool Prefabs (per tool type)

Each tool prefab needs this hierarchy:

```
ToolPickaxe (root)
├── WorldModel (visible when on ground, has Rigidbody + Collider, tag "Grabbable")
│   └── pickaxe_mesh
└── ViewModel (visible when equipped, has Animator)
    └── hands_with_pickaxe_mesh
```

**Inspector wiring per tool prefab:**
- `_worldModel` → WorldModel child
- `_viewModel` → ViewModel child
- `_viewModelAnimator` → Animator on ViewModel
- `_name` → "Pickaxe" / "Magnet" / etc.
- `_inventoryIcon` → sprite for hotbar
- `_savableObjectID` → matching enum value
- `_interactions` → SO_InteractionOption assets ("Take", "Destroy")

### Inventory Slot Prefab

```
InventorySlot (root, has Image for raycastTarget)
├── Background       — colored rectangle behind everything, changes color on select/hover
├── Icon             — tool sprite, disabled when slot is empty, enabled when occupied
├── NameText         — fallback text when tool has no icon sprite (shows tool name instead)
├── AmountText       — shows stack count (e.g. "5"), hidden when qty ≤ 1
├── OrangeBarThing   — thin colored bar at bottom, visible only on hotbar slots (hidden on extended)
└── HideWhenDragged  — wrapper around Icon+Text, hidden during drag so slot looks "picked up"
```

Attach `Field_InventorySlot` to root → wire all refs in inspector.
Root **must** have an `Image` component with `raycastTarget = true` for drag-drop events to fire.

### Layers & Tags

| Name | Type | Used By |
|------|------|---------|
| `Ground` | Layer | PlayerMovement slope/ground check |
| `Interact` | Layer | FresnelHighlighter + InteractionSystem raycast |
| `Grabbable` | Tag | PlayerGrab + FresnelHighlighter |

---

## Scene Setup

### Full Phase B Scene

1. **Player GO** (root)
   - Components: `CharacterController`, `PlayerMovement`, `PlayerCamera`, `PlayerGrab`, `PlayerFootsteps`
   - Wiring: `_playerCam` → Camera, `_cc` → CharacterController (self), `_groundCheck` → GroundCheck child, `_groundLayer` → "Ground", `_characterModel` → CharacterModel child, `_viewModelContainer` → ViewModelContainer, `_holdPosition` → HoldPosition, `_magnetToolPosition` → MagnetToolPosition, `_interactLayerMask` → "Interact", `_nightVisionLight` → NightVisionLight child, `_miningHatLight` → MiningHatLight child

2. **Camera** (child of Player)
   - Components: `Camera`
   - `PlayerCamera` wiring: `_cam` → this Camera, `_movement` → PlayerMovement on parent, `_viewModelContainer` → ViewModelContainer

3. **FresnelHighlighter** (on Camera GO or separate GO)
   - Wiring: `_cam` → Camera, `_interactLayerMask` → "Interact", all 5 HighlightProfile assets

4. **ViewModelContainer** (child of Camera)
   - Tools parent here when equipped

5. **HoldPosition** (child of Camera, offset forward ~1m)
   - Grab target position

6. **MagnetToolPosition** (child of Camera, offset forward ~0.5m)
   - Magnet pull origin target

7. **RigidbodyDragger** (child of Player, starts **inactive**)
   - Components: `Rigidbody` (isKinematic=true), `RigidbodyDraggerController`
   - Wiring: `_playerGrab` → PlayerGrab on parent

8. **LineRenderer** (on Player GO)
   - Material: simple unlit line, start/end width ~0.02

9. **GroundCheck** (child of Player, positioned at feet y=-1)

10. **CharacterModel** (child of Player)
    - Capsule or character mesh, scales with duck height

11. **NightVisionLight** (child of Player, default light)

12. **MiningHatLight** (child of Player, starts inactive, brighter)

13. **Canvas**
    - **HotbarPanel** (HorizontalLayoutGroup) — 10 slots
    - **ExtendedInventoryPanel** (GridLayoutGroup) — 30 slots, inside InventoryUI GO
    - **InventoryUI GO** (starts active, has `InventoryUI` component)
    - **SelectedItemInfoPanel** (name/desc/amount texts + icon Image + Equip/Drop buttons)
    - **DragGhostIcon** (Image + TMP_Text, starts inactive, high sibling index)
    - **BgUI GO**

14. **InventoryOrchestrator** GO
    - Wiring: `_hotbarContainer`, `_extendedContainer`, `_pfInventorySlot` (prefab), `_playerMovement`, `_dragGhostIcon`, `_dragGhostImage`, `_dragGhostAmountText`, `_selectedItemInfo`, `_selectedItemNameText`, `_selectedItemDescText`, `_selectedItemAmountText`, `_selectedItemIcon`, `_equipButtonText`, `_equipButton`, `_dropButton`

15. **Floor** (Plane, layer "Ground")

16. **Test tool prefabs** — 2-3 tools (ToolPickaxe, ToolMagnet, ToolHammer) placed in scene with WorldModel visible, tag "Grabbable", layer "Interact"

17. **Grabbable cubes** — 3-4 cubes with `Rigidbody`, tag "Grabbable", layer "Interact"

18. **PlayerSpawnPoint** GO — position where player starts

---

## Modifications to Earlier Phases

| File (Phase) | How | Change | Why |
|-------------|-----|--------|-----|
| `GameEvents.cs` (A) | **partial extend** in `phase-b/0-Core/GameEvents.cs` | Add `OnToolSwitched`, `OnItemPickedUp`, `OnItemDropped`, `OnOpenInventoryView`, `OnCloseInventoryView`, `OnToolPickupRequested` | No modification to Phase A's file |
| `UIManager.cs` (A) | **direct modify** | Add `GameEvents.RaiseCloseInventoryView()` to `CloseAllSubManager()` | Inventory panel must close with all others |
| `InteractionSystem.cs` (A) | **direct modify** | Add check: `if (PlayerGrab has held object) return` before interact | Grab + interact conflict |
| `SimplePlayerController.cs` (A) | **replaced** | Delete — `PlayerMovement` + `PlayerCamera` supersede it | Split architecture |
| `StartingElevator.cs` (A½) | **direct modify** | Update `TeleportPlayer` to use `Singleton<PlayerMovement>.Ins` | New controller structure |

---

## Source vs Phase Diff

| What | Original Did | What We Did | Why |
|------|-------------|-------------|-----|
| Player controller | Single 888-line `PlayerController.cs` | Split into `PlayerMovement` + `PlayerCamera` + `PlayerGrab` + `FresnelHighlighter` | Each fits one sentence |
| Inventory data | `PlayerInventory.Items` (plain List) | `InventoryDataService` with `Slot` nested type | Testable via `new`, pure C# |
| Inventory UI | `InventorySlotUI` (193 lines, has drag logic + FindObjectOfType) | `Field_InventorySlot` (display only) + `InventoryOrchestrator` (wiring) | Separation of display from logic |
| Tool pickup | `FindObjectOfType<PlayerInventory>().TryAddToInventory()` | `GameEvents.RaiseToolPickupRequested(tool)` → Orchestrator subscribes | Decoupled, no FindObjectOfType |
| Tool drop | `FindObjectOfType<PlayerInventory>().RemoveFromInventory()` | Orchestrator handles drop → fires `RaiseItemDropped` | Owner chain, no FindObjectOfType |
| Tool Owner | `Owner = PlayerController` (set via GetComponent) | `Owner = PlayerMovement` (set by InventoryOrchestrator on equip) | Owner chain pattern |
| Outline logic | Inside `PlayerController.Update()` | Self-contained in `FresnelHighlighter.Update()` | One sentence per script |
| Settings reads | `Singleton<SettingsManager>.Ins.MouseSensitivity` | Hardcoded defaults (Phase H adds settings) | Settings system is Phase H |
| Sound calls | `Singleton<SoundManager>.Ins.PlaySound(...)` | Commented stubs `// Phase H: play sound` | Sound system is Phase H |
| Inventory panel | `InventoryUIManager` (singleton, 187 lines, mixed concerns) | `InventoryUI` (SubManager, lifecycle only) + `InventoryOrchestrator` | Separation |
| Keybinds | `PlayerInputActions` (Input System) | `Input.GetKeyDown` / `INPUT.K.InstantDown` | Keybind rebinding is Phase H |