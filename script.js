const TOOLS = [
    {
        name: "Dependency Graph",
        path: "graph/",
        icon: "◈",
        ac: "var(--blue)",
        status: "ready",
        tags: ["visualizer", "d3", "architecture", "graph", "svg", "unity"]
    },
    {
        name: "Pack The Files In Subfolder",
        path: "https://github.com/an-alch3mist/web-tools/blob/main/pack/pack.md",
        icon: "📄",
        ac: "var(--teal)",
        status: "ready",
        tags: ["docs"]
    },
    {
        name: "unpack the files from given txt",
        path: "view/unpack-viewer.html",
        icon: "📄",
        ac: "var(--teal)",
        status: "ready",
        tags: ["viewer", "markdown"]
    },
    {
        name: "Markdown Viewer",
        path: "view/markdown-viewer.html",
        icon: "📄",
        ac: "var(--teal)",
        status: "ready",
        tags: ["viewer", "markdown", "docs"]
    },
];

// unique tag list — only from tags that appear across all tools
const ALL_TAGS = [...new Set(TOOLS.flatMap(t => t.tags))].sort();

// build filter pills
const ftEl = document.getElementById('filterTags');
ALL_TAGS.forEach(tag => {
  const b = document.createElement('button');
  b.className = 'ftag'; b.textContent = tag; b.dataset.tag = tag;
  b.onclick = () => { b.classList.toggle('active'); filter(); };
  ftEl.appendChild(b);
});

// build cards
const grid = document.getElementById('grid');
TOOLS.forEach((t, i) => {
  const isReady = t.status === 'ready';
  const el = document.createElement(isReady ? 'a' : 'div');
  el.className = 'card' + (isReady ? '' : ' disabled');
  el.style.setProperty('--ac', t.ac);
  el.style.animationDelay = (i * 0.04) + 's';
  if (isReady) el.href = t.path;
  el.dataset.name = t.name.toLowerCase();
  el.dataset.tags = t.tags.join(' ');

  const bc = { ready:'badge-ready', soon:'badge-soon', planned:'badge-planned' }[t.status];
  el.innerHTML = `
    <div class="card-head">
      <div class="card-left">
        <div class="card-icon">${t.icon}</div>
        <div>
          <div class="card-name">${t.name}</div>
          <div class="card-path">${t.path}</div>
        </div>
      </div>
      <span class="badge ${bc}">${t.status}</span>
    </div>
    <div class="card-tags">${t.tags.map(tag =>
      `<span class="tag" onclick="quickFilter(event,'${tag}')">${tag}</span>`
    ).join('')}</div>
    ${isReady ? '<span class="card-arrow">↗</span>' : ''}
  `;
  grid.appendChild(el);
});

function filter() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const active = [...document.querySelectorAll('.ftag.active')].map(b => b.dataset.tag);
  let n = 0;
  document.querySelectorAll('.card').forEach(c => {
    const ok = (!q || c.dataset.name.includes(q) || c.dataset.tags.includes(q))
            && (!active.length || active.every(tag => c.dataset.tags.includes(tag)));
    c.classList.toggle('hidden', !ok);
    if (ok) n++;
  });
  document.getElementById('empty').style.display = n ? 'none' : 'block';
  document.getElementById('count').textContent = `${n} / ${TOOLS.length}`;
}

function quickFilter(e, tag) {
  e.preventDefault();
  const b = [...document.querySelectorAll('.ftag')].find(b => b.dataset.tag === tag);
  if (b) { b.classList.toggle('active'); filter(); }
}

document.addEventListener('keydown', e => {
  const inp = document.getElementById('search');
  if (e.key === '/' && document.activeElement !== inp) { e.preventDefault(); inp.focus(); }
  if (e.key === 'Escape') {
    inp.value = '';
    document.querySelectorAll('.ftag.active').forEach(b => b.classList.remove('active'));
    filter();
  }
});

filter();
