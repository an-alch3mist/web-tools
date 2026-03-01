**Improved Prompt:**

---

Analyze [Scripts] and output a Unity3D dependency graph in DSL format.

DSL Rules:
- One relationship per line
- Format: NodeA -(type)-> NodeB
- Arrow direction controls arrowheads:
  - A -(type)-> B — A points to B
  - A <-(type)-> B — bidirectional
  - A <-(type)- B — B points to A
  - A -(type)- B — no arrowheads
- (type) must be one of: `implements`, `extends`, `uses`, `contains`, `injects`, `event`, `calls`
- Use `calls` for direct method invocations, `uses` for typed references/dependencies

Node auto-detection (name accordingly):
- `IFoo` (capital I prefix) → rendered as **interface**
- `FooTester` / `FooSpec` → rendered as **test**
- Unity built-ins (`Image`, `TMP_Text`, `Canvas`, `AudioSource`, `Rigidbody`, `Collider`, `MonoBehaviour`, etc.) → rendered as **built-in**
- Everything else → **class**

Dependency rules (strictly enforce these):
- If a class holds a reference typed as an interface, draw the edge to the **interface**, not the concrete class
- Never add a direct edge from a consumer to a concrete implementation if an interface exists between them
- A class that declares a field or serialized reference to a **built-in** Unity type uses `contains`, not `uses`
- `uses` is reserved for non-built-in typed references and method parameter dependencies
- `event` edges point **from** the event source (the interface or class declaring the event) **to** the subscriber

Output the DSL block only, no explanation, no comments inside the dsl block.