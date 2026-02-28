/**
 * graph-layouts.js
 * Auto-layout algorithms for the Dependency Graph Builder.
 *
 * Batch    → { id, label, animated:false, fn(ctx) }
 * Animated → { id, label, animated:true, defaultIters:N,
 *              init(ctx, iters, p), step() → bool }
 *
 * ctx = { nodes, edges, NW, NH, canvasW, canvasH }
 *
 * ── Spring params — direct port of Unity C# SerializeFields ─────────────
 *
 *  initialDist        initial_dist_from_worldCenter   default 5
 *    Nodes scatter onto a ring of radius (initialDist × diag) around
 *    canvas centre so the sim starts with clean separation, not a pile.
 *    Ring is capped at 40 % of the smaller canvas dimension.
 *
 *  initIters           init_iter_UpdateDistribute      default 10
 *    Synchronous warm-up steps run inside init() before animation begins.
 *    Gives the graph a head-start so frame 1 already looks reasonable.
 *
 *  repulsionStrength   repulsionStrength               default 0.07
 *    All-pairs repulsion coefficient.
 *    At the default of 0.07 a fully-overlapping pair is pushed apart at
 *    exactly maxMovement pixels/step (see calibration below).
 *    Higher → stronger push, faster separation.
 *
 *  attractionStrength  attractionStrength              default 0.03
 *    Hooke spring stiffness applied to connected-node pairs only.
 *    At 0.03, nodes stretched one rest-length beyond ideal move ≈ 2 px/step.
 *
 *  dampingFactor       dampingFactor                   default 4
 *    Unity semantics: HIGHER = FASTER SETTLE.
 *    Implemented as true divisive damping each step:
 *      displacement = force / dampingFactor
 *    No velocity accumulation → zero oscillation, always convergent.
 *    damp 4 → quarter force each step  (fast, snappy)
 *    damp 1 → full force each step     (slow, drifty)
 *
 *  minDistance         minDistance                     default 1.5
 *    Hard separation floor as a multiple of node diagonal.
 *    Nodes closer than (minDistance × diag) enter Zone 1 and are pushed
 *    apart hard. This is the only zone where nodes can't "choose" to stay.
 *
 *  maxMovement         maxMovement                     default 1
 *    Per-step displacement cap as a multiple of (diag × 0.1).
 *    Mirrors Unity's Vector3.ClampMagnitude — prevents jitter / explosion
 *    on the first few frames when overlap forces are largest.
 *    maxMovement 1 → cap at 0.1 × diag pixels/step  (≈ 17 px for NW=162)
 *
 *  gravityStrength     gravityStrength                 default 1
 *    Pull toward canvas centre each step.
 *    Also scales the strata-band pull in the Y-Strata layout.
 *    0 = no gravity (nodes drift freely once repulsion/attraction balance).
 *
 * ── 3-Zone separation model ─────────────────────────────────────────────
 *
 *   Zone 1  OVERLAP   d < MIN_SEP
 *     Strong linear push, proportional to penetration depth.
 *     F = REPEL × (MIN_SEP − d) / MIN_SEP
 *     Both nodes in a pair receive this force (equal and opposite).
 *
 *   Zone 2  COMFORT   MIN_SEP ≤ d < IDEAL
 *     Soft quadratic falloff repulsion so un-connected nodes don't drift
 *     together in a cluster once they're out of Zone 1.
 *     F = REPEL × 0.10 × (1 − t)²   where t = (d − MIN_SEP) / (IDEAL − MIN_SEP)
 *
 *   Zone 3  STRETCH   d ≥ IDEAL    (edge pairs only)
 *     Hooke spring that pulls connected nodes back toward rest length.
 *     F = SPRING_K × (d − IDEAL)
 *     Unconnected nodes feel nothing here.
 *
 *   Rest length:  IDEAL = MIN_SEP × 2.2  (auto-derived)
 *
 * ── Force calibration ───────────────────────────────────────────────────
 *
 *   maxV   = diag × maxMovement × 0.1           (pixel cap per step)
 *   REPEL  = maxV × dampingFactor × (repulsionStrength / REP_BASE)
 *     REP_BASE = 0.07  → at default rep, Zone-1 full-overlap force = REPEL,
 *     displacement after /dampingFactor = maxV exactly.  Scales linearly.
 *   SPRING_K = attractionStrength               (direct, no extra scaling needed)
 *   GRAV   = gravityStrength × 0.003            (small constant pull)
 *
 * ── Integration (overdamped, Unity-style) ───────────────────────────────
 *
 *   displacement = force / dampingFactor
 *   |displacement| clamped to maxV
 *   position += displacement
 *
 *   No velocity history.  No oscillation.  Always convergent.
 *   This matches the feel of the C# version where dampingFactor directly
 *   controls how quickly the graph relaxes to its equilibrium layout.
 */

window.GraphLayouts = (function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────────────

  function countCrossings(orderA, orderB, edgesAB) {
    const posA = {}, posB = {};
    orderA.forEach((id, i) => { posA[id] = i; });
    orderB.forEach((id, i) => { posB[id] = i; });
    let count = 0;
    const n = edgesAB.length;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const e1 = edgesAB[i], e2 = edgesAB[j];
        const a1 = posA[e1.as], a2 = posA[e2.as];
        const b1 = posB[e1.at], b2 = posB[e2.at];
        if (a1 !== undefined && a2 !== undefined &&
            b1 !== undefined && b2 !== undefined) {
          if ((a1 - a2) * (b1 - b2) < 0) count++;
        }
      }
    }
    return count;
  }

  // ── ALGORITHM 1 : Layered (by Kind) ──────────────────────────────────────

  function layeredLayout({ nodes, edges, NW, NH, canvasW }) {
    if (!nodes.length) return;
    const KIND_LAYER = { tester: 0, interface: 1, impl: 2, external: 3 };
    const layer = {};
    nodes.forEach(n => { layer[n.id] = KIND_LAYER[n.kind] ?? 2; });
    const byLayer = {};
    nodes.forEach(n => { const l = layer[n.id]; (byLayer[l] || (byLayer[l] = [])).push(n); });
    const layerNums = Object.keys(byLayer).map(Number).sort((a, b) => a - b);
    layerNums.forEach(ln => byLayer[ln].sort((a, b) => a.name.localeCompare(b.name)));
    const adj = {};
    nodes.forEach(n => { adj[n.id] = []; });
    edges.forEach(e => {
      if (layer[e.s] !== undefined && layer[e.t] !== undefined && layer[e.s] !== layer[e.t]) {
        adj[e.s].push(e.t); adj[e.t].push(e.s);
      }
    });
    const rebuildRanks = ln => byLayer[ln].forEach((n, i) => { n._rank = i; });
    layerNums.forEach(rebuildRanks);
    for (let pass = 0; pass < 8; pass++) {
      const order = pass % 2 === 0 ? [...layerNums] : [...layerNums].reverse();
      order.forEach(ln => {
        const arr = byLayer[ln];
        arr.forEach(n => {
          const nbrs = adj[n.id];
          if (!nbrs.length) { n._bary = n._rank; return; }
          let sum = 0, cnt = 0;
          nbrs.forEach(id => {
            const peer = byLayer[layer[id]]?.find(nd => nd.id === id);
            if (peer) { sum += peer._rank ?? 0; cnt++; }
          });
          n._bary = cnt ? sum / cnt : n._rank;
        });
        arr.sort((a, b) => a._bary - b._bary);
        rebuildRanks(ln);
      });
    }
    const edgesBetween = (lA, lB) => {
      const res = [];
      edges.forEach(e => {
        const ls = layer[e.s], lt = layer[e.t];
        if (ls === lA && lt === lB) res.push({ as: e.s, at: e.t });
        else if (ls === lB && lt === lA) res.push({ as: e.t, at: e.s });
      });
      return res;
    };
    const layerCrossings = li => {
      const ln = layerNums[li];
      const ids = byLayer[ln].map(n => n.id);
      let total = 0;
      if (li > 0) {
        const prevIds = byLayer[layerNums[li - 1]].map(n => n.id);
        total += countCrossings(prevIds, ids, edgesBetween(layerNums[li - 1], ln));
      }
      if (li < layerNums.length - 1) {
        const nextIds = byLayer[layerNums[li + 1]].map(n => n.id);
        total += countCrossings(ids, nextIds, edgesBetween(ln, layerNums[li + 1]));
      }
      return total;
    };
    let improved = true, sweeps = 0;
    while (improved && sweeps < 40) {
      improved = false; sweeps++;
      layerNums.forEach((ln, li) => {
        const arr = byLayer[ln];
        for (let i = 0; i < arr.length - 1; i++) {
          const before = layerCrossings(li);
          [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
          rebuildRanks(ln);
          if (layerCrossings(li) < before) { improved = true; }
          else { [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; rebuildRanks(ln); }
        }
      });
    }
    const PAD_X = 56, PAD_Y = 76;
    const STEP_X = NW + PAD_X, STEP_Y = NH + PAD_Y;
    layerNums.forEach((ln, li) => {
      const arr = byLayer[ln];
      const totalW = arr.length * STEP_X - PAD_X;
      const startX = canvasW / 2 - totalW / 2;
      arr.forEach((n, i) => { n.x = startX + i * STEP_X; n.y = 90 + li * STEP_Y; });
    });
  }

  // ── Shared physics ────────────────────────────────────────────────────────

  /**
   * Place nodes on an evenly-spaced ring around canvas centre.
   * Ring radius = min(initialDist × diag, 40% of smaller canvas dimension).
   * Nodes already spread out (> 20px from centre) keep their position so
   * re-running layout doesn't scatter a partially-good graph.
   */
  function buildPhysicsState(nodes, NW, NH, canvasW, canvasH, initialDist) {
    const N      = nodes.length;
    const cx     = new Float64Array(N), cy     = new Float64Array(N);
    const dx_    = new Float64Array(N), dy_    = new Float64Array(N); // displacement buffers
    const idxMap = {};
    const diag   = Math.sqrt(NW * NW + NH * NH);
    // Cap ring so nodes always start inside the visible canvas
    const maxR   = Math.min(canvasW, canvasH) * 0.38;
    const radius = Math.min(diag * Math.max(0.5, initialDist), maxR);
    const ccx    = canvasW / 2, ccy = canvasH / 2;

    nodes.forEach((n, i) => {
      const angle  = (i / Math.max(N, 1)) * Math.PI * 2 - Math.PI / 2;
      const existX = n.x + NW / 2, existY = n.y + NH / 2;
      const dist   = Math.sqrt((existX - ccx) ** 2 + (existY - ccy) ** 2);
      if (dist < 20) {
        // Piled at centre — scatter to ring
        cx[i] = ccx + radius * Math.cos(angle);
        cy[i] = ccy + radius * Math.sin(angle);
      } else {
        cx[i] = existX;
        cy[i] = existY;
      }
      idxMap[n.id] = i;
    });
    return { cx, cy, dx: dx_, dy: dy_, idxMap };
  }

  /**
   * Compute 3-zone forces into output arrays fx[], fy[].
   *
   *   REPEL    — calibrated so full-overlap zone-1 force = maxV × dampingFactor
   *   SPRING_K — attractionStrength, applied directly in pixel space
   */
  function computeForces(N, cx, cy, edges, idxMap,
      MIN_SEP, IDEAL, REPEL, SPRING_K, extraForces) {

    const fx = new Float64Array(N);
    const fy = new Float64Array(N);
    const comfortRange = Math.max(IDEAL - MIN_SEP, 0.001);

    // All-pairs: Zone 1 (overlap) + Zone 2 (comfort)
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const ddx = cx[i] - cx[j], ddy = cy[i] - cy[j];
        const d   = Math.sqrt(ddx * ddx + ddy * ddy) || 0.001;
        const nx_ = ddx / d, ny_ = ddy / d;
        let f = 0;
        if (d < MIN_SEP) {
          // Zone 1 — hard push, linear with penetration depth
          f = REPEL * (MIN_SEP - d) / MIN_SEP;
        } else if (d < IDEAL) {
          // Zone 2 — soft quadratic comfort repulsion
          const t = (d - MIN_SEP) / comfortRange;
          f = REPEL * 0.10 * (1 - t) * (1 - t);
        }
        if (f !== 0) {
          fx[i] += f * nx_; fy[i] += f * ny_;
          fx[j] -= f * nx_; fy[j] -= f * ny_;
        }
      }
    }

    // Edge pairs: full Hooke spring (push when compressed, pull when stretched).
    //
    // WHY full Hooke instead of tension-only:
    //   With gravity always pulling nodes toward canvas centre, every node pair
    //   ends up inside IDEAL distance. A tension-only spring (fires only when
    //   d > IDEAL) never fires — the rest-length becomes meaningless and double
    //   springs vs single springs produce identical results for the wrong reason.
    //   A full Hooke spring creates a real equilibrium AT IDEAL: it pushes nodes
    //   apart when d < IDEAL and pulls them together when d > IDEAL, so
    //   connected pairs always settle near their rest-length regardless of gravity.
    //
    // DEDUP — same anchor pair = one spring:
    //   Two edges sharing the exact same (source anchor, target anchor) must count
    //   as ONE spring.  Otherwise parallel springs double the push, so same-anchor
    //   multi-edge pairs settle at a different distance from single-edge pairs.
    //   Direction-canonical key: A→B and B→A are the same physical link.
    //   NOTE: different anchor pairs on the same node pair each keep their own
    //   spring, per the user's explicit requirement.
    const seenAnchorPairs = new Set();
    edges.forEach(e => {
      const si = idxMap[e.s], ti = idxMap[e.t];
      if (si === undefined || ti === undefined) return;
      // Direction-canonical key using physics indices (integers, no string-ID risk)
      const lo = si < ti ? si : ti, hi = si < ti ? ti : si;
      const sLo = si < ti ? (e.sA ?? '') : (e.tA ?? '');
      const sHi = si < ti ? (e.tA ?? '') : (e.sA ?? '');
      const key = `${lo}:${sLo}|${hi}:${sHi}`;
      if (seenAnchorPairs.has(key)) return; // same anchor pair — one spring only
      seenAnchorPairs.add(key);

      const ddx = cx[ti] - cx[si], ddy = cy[ti] - cy[si];
      const d   = Math.sqrt(ddx * ddx + ddy * ddy) || 0.001;
      // Skip if inside hard-separation zone — zone-1 repulsion handles it
      if (d < MIN_SEP) return;
      // Full Hooke: stretch is negative (compressed) or positive (stretched)
      // Force direction: positive stretch → pull toward each other
      //                  negative stretch → push apart (d < IDEAL)
      const f   = SPRING_K * (d - IDEAL);
      const fx_ = f * ddx / d, fy_ = f * ddy / d;
      fx[si] += fx_; fy[si] += fy_;
      fx[ti] -= fx_; fy[ti] -= fy_;
    });

    if (extraForces) extraForces(fx, fy);
    return { fx, fy };
  }

  /**
   * Overdamped integration — Unity-faithful.
   *
   *   displacement = force / dampingFactor    (no velocity memory)
   *   |displacement| ≤ maxV                  (ClampMagnitude)
   *   position += displacement
   *
   * Why overdamped (no velocity history)?
   *   In the C# version, dampingFactor divides the velocity before it is
   *   applied, which means old momentum contributes only 1/damp of its
   *   previous value — effectively killing it after a few steps.
   *   Modelling this as "force / dampingFactor → direct displacement"
   *   is the stable, bounce-free equivalent and produces the same visual
   *   relaxation feel.
   */
  function integrateAndWriteBack(N, nodes, cx, cy, fx, fy,
      dampingFactor, maxMovement, NW, NH, canvasW, canvasH) {

    const diag = Math.sqrt(NW * NW + NH * NH);
    const damp = Math.max(1, dampingFactor);
    // maxV in pixels/step:  maxMovement=1 → 10% of node diagonal
    const maxV = diag * Math.max(0.01, maxMovement) * 0.10;

    for (let i = 0; i < N; i++) {
      // Overdamped: displacement = force / damp  (Unity: vel /= dampingFactor)
      let dispX = fx[i] / damp;
      let dispY = fy[i] / damp;
      // ClampMagnitude (Unity: Vector3.ClampMagnitude)
      const mag = Math.sqrt(dispX * dispX + dispY * dispY);
      if (mag > maxV) { const s = maxV / mag; dispX *= s; dispY *= s; }
      cx[i] += dispX;
      cy[i] += dispY;
    }

    // Re-centre: lock graph centroid to canvas centre
    let avgX = 0, avgY = 0;
    for (let i = 0; i < N; i++) { avgX += cx[i]; avgY += cy[i]; }
    avgX /= N; avgY /= N;
    const offX = canvasW / 2 - avgX, offY = canvasH / 2 - avgY;
    nodes.forEach((n, i) => {
      n.x = cx[i] + offX - NW / 2;
      n.y = cy[i] + offY - NH / 2;
    });
  }

  // ── ALGORITHM 2 : Force-Directed Spring ──────────────────────────────────

  const spring = (() => {
    let _nodes, _edges, _NW, _NH, _canvasW, _canvasH;
    let _cx, _cy, _idxMap;
    let _remainIters, _stepsPerFrame, _p;

    function init({ nodes, edges, NW, NH, canvasW, canvasH }, iterations, p = {}) {
      _nodes = nodes; _edges = edges;
      _NW = NW; _NH = NH; _canvasW = canvasW; _canvasH = canvasH;
      _p = {
        initialDist:        p.initialDist        ?? 5,
        initIters:          Math.max(0, (p.initIters ?? 10) | 0),
        repulsionStrength:  p.repulsionStrength  ?? 0.07,
        attractionStrength: p.attractionStrength ?? 0.03,
        dampingFactor:      p.dampingFactor      ?? 4,
        minDistance:        p.minDistance        ?? 0.7,
        maxMovement:        p.maxMovement        ?? 1,
        gravityStrength:    p.gravityStrength    ?? 1,
      };

      const s = buildPhysicsState(nodes, NW, NH, canvasW, canvasH, _p.initialDist);
      _cx = s.cx; _cy = s.cy; _idxMap = s.idxMap;

      // Synchronous warm-up (init_iter_UpdateDistribute)
      for (let i = 0; i < _p.initIters; i++) physicsStep();

      _remainIters   = iterations;
      _stepsPerFrame = Math.max(1, Math.ceil(iterations / 120));
    }

    function physicsStep() {
      const N    = _nodes.length;
      const diag = Math.sqrt(_NW * _NW + _NH * _NH);

      // Zone boundaries
      const MIN_SEP = diag * Math.max(0.1, _p.minDistance);   // hard floor
      const IDEAL   = MIN_SEP * 2.2;                           // rest length

      // ── Force calibration ─────────────────────────────────────────────
      // maxV = diag × maxMovement × 0.10 (pixels/step cap, same as integrate)
      // REPEL is sized so that at full overlap (d→0), force = maxV × damp,
      // which after /damp = maxV exactly. repulsionStrength scales linearly:
      //   rep 0.07 → REPEL = maxV × damp  (default, clamps at cap)
      //   rep 0.035 → half strength       (slower separation)
      //   rep 0.14  → double strength     (always clamped, same speed as default)
      const REP_BASE = 0.07;
      const maxV     = diag * Math.max(0.01, _p.maxMovement) * 0.10;
      const REPEL    = maxV * _p.dampingFactor * (_p.repulsionStrength / REP_BASE);
      // SPRING_K = attractionStrength directly.
      // At d = IDEAL + MIN_SEP (stretched by one floor-width beyond rest):
      //   F = att × MIN_SEP → disp = att × MIN_SEP / damp
      //   = 0.03 × 255 / 4 ≈ 1.9 px/step  (gentle, convergent)
      const SPRING_K = _p.attractionStrength;

      // Gravity toward canvas centre
      // gravityStrength 1 → 0.003 per pixel of offset per step (after /damp ≈ 0.00075)
      const GRAV = _p.gravityStrength * 0.003;
      const ccx  = _canvasW / 2, ccy = _canvasH / 2;

      const { fx, fy } = computeForces(_nodes.length, _cx, _cy, _edges, _idxMap,
        MIN_SEP, IDEAL, REPEL, SPRING_K,
        (fx, fy) => {
          for (let i = 0; i < N; i++) {
            fx[i] += (ccx - _cx[i]) * GRAV;
            fy[i] += (ccy - _cy[i]) * GRAV;
          }
        });

      integrateAndWriteBack(N, _nodes, _cx, _cy, fx, fy,
        _p.dampingFactor, _p.maxMovement, _NW, _NH, _canvasW, _canvasH);
    }

    function step() {
      if (_remainIters <= 0) return false;
      const todo = Math.min(_stepsPerFrame, _remainIters);
      for (let s = 0; s < todo; s++) physicsStep();
      _remainIters -= todo;
      return _remainIters > 0;
    }

    return { init, step };
  })();

  // ── ALGORITHM 3 : Force-Directed Spring with Y Strata ────────────────────
  //
  // Identical physics to Algorithm 2.  Each node is additionally pulled
  // toward a horizontal band (Y fraction of canvas height) for its Kind.
  // The strata pull strength scales directly with gravityStrength.

  const strataSpring = (() => {
    let _nodes, _edges, _NW, _NH, _canvasW, _canvasH;
    let _cx, _cy, _idxMap;
    let _remainIters, _stepsPerFrame, _p;

    const KIND_Y = { tester: 0.14, interface: 0.32, impl: 0.58, external: 0.80 };

    function init({ nodes, edges, NW, NH, canvasW, canvasH }, iterations, p = {}) {
      _nodes = nodes; _edges = edges;
      _NW = NW; _NH = NH; _canvasW = canvasW; _canvasH = canvasH;
      _p = {
        initialDist:        p.initialDist        ?? 5,
        initIters:          Math.max(0, (p.initIters ?? 10) | 0),
        repulsionStrength:  p.repulsionStrength  ?? 0.07,
        attractionStrength: p.attractionStrength ?? 0.03,
        dampingFactor:      p.dampingFactor      ?? 4,
        minDistance:        p.minDistance        ?? 0.7,
        maxMovement:        p.maxMovement        ?? 1,
        gravityStrength:    p.gravityStrength    ?? 1,
      };

      const s = buildPhysicsState(nodes, NW, NH, canvasW, canvasH, _p.initialDist);
      _cx = s.cx; _cy = s.cy; _idxMap = s.idxMap;

      for (let i = 0; i < _p.initIters; i++) physicsStep();

      _remainIters   = iterations;
      _stepsPerFrame = Math.max(1, Math.ceil(iterations / 120));
    }

    function physicsStep() {
      const N    = _nodes.length;
      const diag = Math.sqrt(_NW * _NW + _NH * _NH);

      const MIN_SEP  = diag * Math.max(0.1, _p.minDistance);
      const IDEAL    = MIN_SEP * 2.2;
      const REP_BASE = 0.07;
      const maxV     = diag * Math.max(0.01, _p.maxMovement) * 0.10;
      const REPEL    = maxV * _p.dampingFactor * (_p.repulsionStrength / REP_BASE);
      const SPRING_K = _p.attractionStrength;

      // gravityStrength scales both the strata pull and horizontal centring
      const STRATA_G = _p.gravityStrength * 0.006;
      const X_GRAV   = _p.gravityStrength * 0.001;

      const { fx, fy } = computeForces(_nodes.length, _cx, _cy, _edges, _idxMap,
        MIN_SEP, IDEAL, REPEL, SPRING_K,
        (fx, fy) => {
          for (let i = 0; i < N; i++) {
            const kind    = _nodes[i].kind || 'impl';
            const targetY = _canvasH * (KIND_Y[kind] ?? 0.55);
            fy[i] += (targetY - _cy[i]) * STRATA_G;
            fx[i] += (_canvasW / 2 - _cx[i]) * X_GRAV;
          }
        });

      integrateAndWriteBack(N, _nodes, _cx, _cy, fx, fy,
        _p.dampingFactor, _p.maxMovement, _NW, _NH, _canvasW, _canvasH);
    }

    function step() {
      if (_remainIters <= 0) return false;
      const todo = Math.min(_stepsPerFrame, _remainIters);
      for (let s = 0; s < todo; s++) physicsStep();
      _remainIters -= todo;
      return _remainIters > 0;
    }

    return { init, step };
  })();

  // ── Registry ──────────────────────────────────────────────────────────────

  const ALGORITHMS = [
    {
      id: 'layered',
      label: 'Layered — by Kind',
      animated: false,
      fn: layeredLayout,
    },
    {
      id: 'spring',
      label: 'Force-Directed (Spring)',
      animated: true,
      defaultIters: 5000,
      init: (ctx, iters, p) => spring.init(ctx, iters, p),
      step: spring.step,
    },
    {
      id: 'strata-spring',
      label: 'Force-Directed (Y Strata)',
      animated: true,
      defaultIters: 5000,
      init: (ctx, iters, p) => strataSpring.init(ctx, iters, p),
      step: strataSpring.step,
    },
  ];

  return { algorithms: ALGORITHMS };
})();