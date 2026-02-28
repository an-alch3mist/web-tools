/**
 * graph-layouts.js
 * Auto-layout algorithms for the Dependency Graph Builder.
 *
 * Two flavours of algorithm:
 *
 *   Batch    → { id, label, animated:false, fn(ctx) }
 *              fn mutates node .x/.y and returns.
 *
 *   Animated → { id, label, animated:true, defaultIters:N,
 *                init(ctx, iterations),
 *                step() → true if more steps remain }
 *              init sets up internal state.
 *              step() runs one "tick" (several physics sub-steps)
 *              and mutates node .x/.y in-place.
 *              Returns true while still running, false when done.
 *
 * ctx = { nodes, edges, NW, NH, canvasW, canvasH }
 *
 * To add a new algorithm push a new entry into ALGORITHMS below.
 */

window.GraphLayouts = (function () {
  'use strict';

  // ── Shared helpers ──────────────────────────────────────────────────────

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

  // ── ALGORITHM 1 : Layered (by Kind) with crossing reduction ────────────

  function layeredLayout({ nodes, edges, NW, NH, canvasW }) {
    if (!nodes.length) return;

    const KIND_LAYER = { tester: 0, interface: 1, impl: 2, external: 3 };
    const layer = {};
    nodes.forEach(n => { layer[n.id] = KIND_LAYER[n.kind] ?? 2; });

    const byLayer = {};
    nodes.forEach(n => {
      const l = layer[n.id];
      (byLayer[l] || (byLayer[l] = [])).push(n);
    });
    const layerNums = Object.keys(byLayer).map(Number).sort((a, b) => a - b);

    layerNums.forEach(ln =>
      byLayer[ln].sort((a, b) => a.name.localeCompare(b.name))
    );

    const adj = {};
    nodes.forEach(n => { adj[n.id] = []; });
    edges.forEach(e => {
      if (layer[e.s] !== undefined && layer[e.t] !== undefined &&
          layer[e.s] !== layer[e.t]) {
        adj[e.s].push(e.t);
        adj[e.t].push(e.s);
      }
    });

    const rebuildRanks = ln => byLayer[ln].forEach((n, i) => { n._rank = i; });
    layerNums.forEach(rebuildRanks);

    // Barycenter — 8 alternating passes
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

    // Adjacent-swap crossing reduction
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
          if (layerCrossings(li) < before) {
            improved = true;
          } else {
            [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
            rebuildRanks(ln);
          }
        }
      });
    }

    // Position
    const PAD_X = 56, PAD_Y = 76;
    const STEP_X = NW + PAD_X, STEP_Y = NH + PAD_Y;
    layerNums.forEach((ln, li) => {
      const arr = byLayer[ln];
      const totalW = arr.length * STEP_X - PAD_X;
      const startX = canvasW / 2 - totalW / 2;
      arr.forEach((n, i) => {
        n.x = startX + i * STEP_X;
        n.y = 90 + li * STEP_Y;
      });
    });
  }

  // ── ALGORITHM 2 : Force-Directed Spring (animated) ──────────────────────

  const spring = (() => {
    let _nodes, _edges, _NW, _NH, _canvasW, _canvasH;
    let _cx, _cy, _vx, _vy, _idxMap;
    let _remainIters, _stepsPerFrame, _springK;

    function init({ nodes, edges, NW, NH, canvasW, canvasH }, iterations, springK) {
      _nodes   = nodes;
      _edges   = edges;
      _NW = NW; _NH = NH;
      _canvasW = canvasW; _canvasH = canvasH;

      const N = nodes.length;
      _cx = new Float64Array(N);
      _cy = new Float64Array(N);
      _vx = new Float64Array(N);
      _vy = new Float64Array(N);
      _idxMap = {};
      nodes.forEach((n, i) => {
        _cx[i] = n.x + NW / 2;
        _cy[i] = n.y + NH / 2;
        _idxMap[n.id] = i;
      });

      _remainIters   = iterations;
      _springK       = springK ?? 2.2;
      // Target ~120 rendered frames regardless of iteration count
      _stepsPerFrame = Math.max(1, Math.ceil(iterations / 120));
    }

    function physicsStep() {
      const N     = _nodes.length;
      const diag  = Math.sqrt(_NW * _NW + _NH * _NH);
      const IDEAL = diag * _springK;
      const REP   = diag * diag * 14;   // repulsion coefficient
      const K     = 0.034;              // spring stiffness (lower = softer)
      const DAMP  = 0.84;
      const GRAV  = 0.003;
      const ccx   = _canvasW / 2, ccy = _canvasH / 2;

      const fx = new Float64Array(N);
      const fy = new Float64Array(N);

      // Repulsion — all pairs
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = _cx[i] - _cx[j], dy = _cy[i] - _cy[j];
          const d2 = dx * dx + dy * dy || 0.01;
          const d  = Math.sqrt(d2);
          const f  = REP / d2;
          const ffx = f * dx / d, ffy = f * dy / d;
          fx[i] += ffx; fy[i] += ffy;
          fx[j] -= ffx; fy[j] -= ffy;
        }
      }

      // Attraction along edges
      _edges.forEach(e => {
        const si = _idxMap[e.s], ti = _idxMap[e.t];
        if (si === undefined || ti === undefined) return;
        const dx = _cx[ti] - _cx[si], dy = _cy[ti] - _cy[si];
        const d  = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f  = (d - IDEAL) * K;
        const ffx = f * dx / d, ffy = f * dy / d;
        fx[si] += ffx; fy[si] += ffy;
        fx[ti] -= ffx; fy[ti] -= ffy;
      });

      // Gentle gravity toward canvas centre
      for (let i = 0; i < N; i++) {
        fx[i] += (ccx - _cx[i]) * GRAV;
        fy[i] += (ccy - _cy[i]) * GRAV;
      }

      // Integrate
      for (let i = 0; i < N; i++) {
        _vx[i] = (_vx[i] + fx[i]) * DAMP;
        _vy[i] = (_vy[i] + fy[i]) * DAMP;
        _cx[i] += _vx[i];
        _cy[i] += _vy[i];
      }
    }

    function writeBack() {
      const N = _nodes.length;
      // Re-centre result on canvas each tick
      let avgX = 0, avgY = 0;
      for (let i = 0; i < N; i++) { avgX += _cx[i]; avgY += _cy[i]; }
      avgX /= N; avgY /= N;
      const offX = _canvasW / 2 - avgX, offY = _canvasH / 2 - avgY;
      _nodes.forEach((n, i) => {
        n.x = _cx[i] + offX - _NW / 2;
        n.y = _cy[i] + offY - _NH / 2;
      });
    }

    /** Run one animation frame. Returns true while more iterations remain. */
    function step() {
      if (_remainIters <= 0) return false;
      const todo = Math.min(_stepsPerFrame, _remainIters);
      for (let s = 0; s < todo; s++) physicsStep();
      _remainIters -= todo;
      writeBack();
      return _remainIters > 0;
    }

    return { init, step };
  })();

  // ── Registry ─────────────────────────────────────────────────────────────

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
      defaultIters: 300,
      init: spring.init,
      step: spring.step,
    },
  ];

  return { algorithms: ALGORITHMS };
})();