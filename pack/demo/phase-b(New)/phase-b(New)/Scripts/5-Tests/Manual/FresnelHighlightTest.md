# Fresnel Highlight — Manual Test Flow

> Verifies Highlight Plus outlines appear on hover, correct profile per object type, clears on look away.

---

## Prerequisites

- Highlight Plus asset imported
- Player GO with PlayerMovement + PlayerCamera
- FresnelHighlighter on Camera GO (or separate GO)
- 5 HighlightProfile assets created (see setup below)

---

## Setup Guide

### Step 1 — Create HighlightProfile Assets

In Unity Project panel: Create → Highlight Plus → Profile

| Asset Name | Outline Color | Outline Width | Glow | See-Through |
|-----------|--------------|---------------|------|-------------|
| `HP_Tool` | Cyan (0.25, 0.85, 1) | 1.0 | Off | Off |
| `HP_Grabbable` | Cyan (0.25, 0.85, 1) | 0.8 | Off | Off |
| `HP_Building` | Cyan (0.25, 0.85, 1) | 1.2 | Off | Off |
| `HP_WrenchEnable` | Green (0.3, 1, 0.3) | 1.0 | Off | Off |
| `HP_WrenchDisable` | Red (1, 0.3, 0.3) | 1.0 | Off | Off |

> Phase B only uses HP_Tool + HP_Grabbable. Others are for Phase D.

### Step 2 — FresnelHighlighter Component

1. Select Camera GO (or create separate GO)
2. Add `FresnelHighlighter` component
3. Wire:

| Field | Assign |
|-------|--------|
| `_cam` | Camera component |
| `_interactRange` | 2 |
| `_interactLayerMask` | "Interact" layer |
| `_toolProfile` | HP_Tool asset |
| `_grabbableProfile` | HP_Grabbable asset |
| `_buildingProfile` | HP_Building asset (Phase D, can leave empty) |
| `_wrenchEnableProfile` | HP_WrenchEnable asset (Phase D, can leave empty) |
| `_wrenchDisableProfile` | HP_WrenchDisable asset (Phase D, can leave empty) |

### Step 3 — Test Objects in Scene

Place these in front of player spawn:

1. **Tool on ground** — any BaseHeldTool prefab (e.g. ToolPickaxe)
   - Has WorldModel with Collider, layer "Interact"
   
2. **Grabbable cube** — Cube with Rigidbody
   - Tag: "Grabbable"
   - Layer: "Interact"

3. **Non-interactable wall** — Cube, layer "Default" (NOT "Interact")
   - No tag, no Rigidbody

4. **Non-grabbable interactable** — Cube, layer "Interact"
   - No "Grabbable" tag, no BaseHeldTool
   - Tests: should NOT highlight (no matching type)

---

## 1. Initial State

**DO:** Press Play, look at empty space (floor/sky)
**EXPECT:**
- No outlines visible anywhere
- No console errors from FresnelHighlighter

---

## 2. Look At Tool

**DO:** Aim crosshair at ToolPickaxe on ground (within 2m)
**EXPECT:**
- Cyan **outline appears** around pickaxe mesh (HP_Tool profile)
- Outline follows mesh shape — visible on all child renderers
- Outline is solid cyan, no glow, no see-through

**DO:** Move crosshair slightly off the tool (still nearby but not hitting collider)
**EXPECT:**
- Outline **disappears immediately** — no fade, instant clear

---

## 3. Look At Grabbable Cube

**DO:** Aim at Grabbable cube (within 2m)
**EXPECT:**
- Cyan outline appears (HP_Grabbable profile)
- Slightly thinner than tool outline (width 0.8 vs 1.0)

---

## 4. Look Away → Clear

**DO:** Look at Grabbable → quickly look at sky
**EXPECT:**
- Outline gone **within 1 frame** — ClearAll() runs every Update before OutlineLookedAtThing

**DO:** Look at Tool → look at Grabbable (switch between two objects)
**EXPECT:**
- Previous outline clears, new outline appears — only ONE object highlighted at a time

---

## 5. Out of Range

**DO:** Stand 5m away from tool → aim at it
**EXPECT:**
- No outline — `_interactRange` is 2m, raycast doesn't reach

**DO:** Walk closer until within 2m → aim at it
**EXPECT:**
- Outline appears as soon as raycast reaches

---

## 6. Non-Interactable Object (Wrong Layer)

**DO:** Aim at wall (layer "Default")
**EXPECT:**
- No outline — raycast uses `_interactLayerMask` which only hits "Interact" layer
- No console errors

---

## 7. Interactable But No Matching Type

**DO:** Aim at non-grabbable, non-tool cube (layer "Interact" but no tag, no BaseHeldTool)
**EXPECT:**
- No outline — FresnelHighlighter checks for `BaseHeldTool` component and "Grabbable" tag, neither matches
- Raycast hits but no highlight applied

---

## 8. Multiple Renderers (Child Meshes)

**DO:** Aim at a tool prefab that has multiple child mesh renderers in WorldModel
**EXPECT:**
- ALL child renderers get outlined — `GetComponentsInChildren<Renderer>()` catches all
- ParticleSystemRenderers are **excluded** (if any exist on the tool)

---

## 9. Rapid Look Switching

**DO:** Quickly alternate looking between Tool and Grabbable (wiggle mouse between them)
**EXPECT:**
- Outlines switch cleanly — no double-highlight, no stuck outlines
- No console errors or performance stutter
- ClearAll + OutlineLookedAtThing runs every frame

---

## 10. HighlightEffect Component Lifecycle

**DO:** Look at a cube that has never been highlighted → aim at it
**EXPECT:**
- `HighlightEffect` component **added at runtime** to the cube (check Inspector during Play mode)
- `highlighted = true`

**DO:** Look away
**EXPECT:**
- `HighlightEffect` component still on the cube but `highlighted = false`
- Component is reused next time you look at it (not re-added)

---

## Summary Checklist

- [ ] Tool on ground → cyan outline (HP_Tool profile)
- [ ] Grabbable cube → cyan outline (HP_Grabbable profile, slightly thinner)
- [ ] Look away → outline clears within 1 frame
- [ ] Only ONE object highlighted at a time
- [ ] Out of range (>2m) → no outline
- [ ] Wrong layer → no outline, no error
- [ ] Correct layer but no matching type → no outline
- [ ] Multiple child renderers → all outlined
- [ ] Rapid switching → no stuck outlines
- [ ] HighlightEffect added at runtime, reused on re-look
- [ ] Zero console errors throughout