## 📋 Prompt to Use with Claude

**"Analyze [Scripts] and output a Unity3D dependency graph in this DSL format so I can paste it into my graph viewer:**

**DSL Rules:**
- One relationship per line
- Format: `NodeA -(type)-> NodeB`
- Arrow direction controls arrowheads:
  - `A -(type)-> B` — A points to B
  - `A <-(type)-> B` — bidirectional
  - `A <-(type)- B` — B points to A
  - `A -(type)- B` — no arrowheads
- `(type)` must be one of: `implements`, `extends`, `uses`, `calls`, `contains`, `injects`, `event` — or any custom word
- Lines starting with `#` are comments (ignored)
- Spaces around `-` and `(type)` are optional

**Node auto-detection (name accordingly):**
- `IFoo` (capital I prefix) → rendered as **interface**
- `FooTester` / `FooSpec` → rendered as **test**
- `Image`, `TMP_Text`, `Canvas`, `AudioSource`, `Rigidbody`, etc. → rendered as **built-in**
- Everything else → **class**

**Example output:**
```
PlayerStats -(extends)-> EntityStats
EntityStats -(implements)-> IHealthSystem
StackedHealthBar -(implements)-> IHealthBarView
StackedHealthBar -(calls)-> EntityStats
EntityStats <-(event)-> StackedHealthBar
HealthSystemTester -(uses)-> IHealthSystem
StackedHealthBar -(contains)-> Image
StackedHealthBar -(contains)-> TMP_Text
```
Output the DSL block only, no explanation.
