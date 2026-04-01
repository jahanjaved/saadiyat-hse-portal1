
fetch('./data/workbook-data.json')
  .then((res) => {
    if (!res.ok) throw new Error('Could not load ./data/workbook-data.json');
    return res.json();
  })
  .then((data) => {
    renderNav(data.sheet_order || []);
    renderHero(data.summary || {});
    renderSummary(data.summary || {});
    renderSheets(data);
  })
  .catch((err) => {
    document.getElementById('sheetSections').innerHTML = `
      <section class="section">
        <div class="section-card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Error</div>
              <h2>Data failed to load</h2>
              <p class="muted">${err.message}</p>
            </div>
          </div>
        </div>
      </section>
    `;
    console.error(err);
  });

function renderNav(sheetOrder) {
  const nav = document.getElementById('topnav');
  nav.innerHTML = `<a href="#home">Home</a>` + sheetOrder.map(name => `<a href="#${safeId(name)}">${name}</a>`).join('');
}

function renderHero(summary) {
  const heroMeta = document.getElementById('heroMeta');
  heroMeta.innerHTML = `
    <div class="meta-box"><span>Workbook</span><strong>${summary.workbook_name || '-'}</strong></div>
    <div class="meta-box"><span>Generated</span><strong>${summary.generated_at || '-'}</strong></div>
    <div class="meta-box"><span>Sections</span><strong>${summary.sheet_count || 0} workbook sheets</strong></div>
  `;
}

function renderSummary(summary) {
  const el = document.getElementById('summaryGrid');
  const cards = [
    {label:'Workbook Sheets', value:summary.sheet_count || 0, meta:'All available workbook sheets are included below.'},
    {label:'Weekly Inspections', value:summary.inspection_count || 0, meta:'Records loaded from Weekly_Inspections.'},
    {label:'Action Records', value:summary.action_count || 0, meta:'Loaded from CAPA_Tracker or derived from inspections.'},
    {label:'Clusters', value:summary.cluster_count || 0, meta:'Accountability directory loaded from Cluster_Master.'}
  ];
  el.innerHTML = cards.map(c => `<article class="card"><div class="label">${c.label}</div><div class="value">${c.value}</div><div class="meta">${c.meta}</div></article>`).join('');
}

function renderSheets(data) {
  const container = document.getElementById('sheetSections');
  container.innerHTML = '';

  for (const name of data.sheet_order) {
    const sheet = data.sheets[name];
    if (!sheet) continue;

    const section = document.createElement('section');
    section.className = 'section';
    section.id = safeId(name);

    if (sheet.type === 'notes') {
      section.innerHTML = `
        <div class="section-card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Workbook sheet</div>
              <h2>${name}</h2>
              <p>Instructions and workbook guidance.</p>
            </div>
          </div>
          <div class="notes-list">
            ${(sheet.notes || []).map(note => `<div class="note-item">${escapeHtml(String(note))}</div>`).join('')}
          </div>
        </div>
      `;
    } else if (sheet.type === 'inspections') {
      section.innerHTML = `
        <div class="section-card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Workbook sheet</div>
              <h2>${name}</h2>
              <p>Full inspection records from the workbook, with quick filtering for easier review.</p>
            </div>
          </div>
          <div class="filters">
            <input id="search-${safeId(name)}" type="search" placeholder="Search by cluster, activity, role, area, or status" />
            <select id="cluster-${safeId(name)}"><option value="">All clusters</option></select>
            <select id="status-${safeId(name)}"><option value="">All statuses</option></select>
          </div>
          <div class="table-wrap" id="wrap-${safeId(name)}"></div>
        </div>
      `;
      container.appendChild(section);
      setupInspectionTable(sheet, safeId(name));
      continue;
    } else if (sheet.type === 'actions') {
      section.innerHTML = `
        <div class="section-card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Workbook sheet</div>
              <h2>${name}</h2>
              <p>Corrective and preventive action tracking for closeout follow-up.</p>
            </div>
          </div>
          <div class="table-wrap">${renderTable(sheet.headers || [], sheet.rows || [], {type:'actions'})}</div>
        </div>
      `;
    } else {
      section.innerHTML = `
        <div class="section-card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Workbook sheet</div>
              <h2>${name}</h2>
              <p>Workbook data rendered directly from the source sheet.</p>
            </div>
          </div>
          <div class="table-wrap">${renderTable(sheet.headers || [], sheet.rows || [])}</div>
        </div>
      `;
    }
    container.appendChild(section);
  }
}

function setupInspectionTable(sheet, idBase) {
  const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
  const headers = sheet.headers || [];
  const importantHeaders = [
    'Inspection_ID','Inspection_Date','Package','Cluster','Contractor','Your_Role',
    'Area_or_Villa','Main_High_Risk_Activity','Stop_Work','Rating_Band',
    'Likely_Root_Cause','Target_Closeout_Date'
  ].filter(h => headers.includes(h));

  const clusterSelect = document.getElementById(`cluster-${idBase}`);
  const statusSelect = document.getElementById(`status-${idBase}`);
  const searchInput = document.getElementById(`search-${idBase}`);
  const tableWrap = document.getElementById(`wrap-${idBase}`);

  const clusters = [...new Set(rows.map(r => r.Cluster).filter(Boolean))].sort();
  clusterSelect.innerHTML = `<option value="">All clusters</option>` + clusters.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(String(c))}</option>`).join('');

  const statuses = [...new Set(rows.map(r => deriveStatus(r)).filter(Boolean))];
  statusSelect.innerHTML = `<option value="">All statuses</option>` + statuses.map(s => `<option value="${escapeAttr(s)}">${escapeHtml(String(s))}</option>`).join('');

  function update() {
    const q = (searchInput.value || '').toLowerCase().trim();
    const cluster = clusterSelect.value;
    const status = statusSelect.value;

    const filtered = rows.filter(r => {
      const hay = JSON.stringify(r).toLowerCase();
      const qOk = !q || hay.includes(q);
      const cOk = !cluster || r.Cluster === cluster;
      const sOk = !status || deriveStatus(r) === status;
      return qOk && cOk && sOk;
    }).map(r => {
      const copy = {};
      importantHeaders.forEach(h => copy[h] = r[h]);
      copy.Status = deriveStatus(r);
      return copy;
    });

    const displayHeaders = [...importantHeaders, 'Status'].filter((v, i, a) => a.indexOf(v) === i);
    tableWrap.innerHTML = renderTable(displayHeaders, filtered, {type:'inspections'});
  }

  searchInput.addEventListener('input', update);
  clusterSelect.addEventListener('change', update);
  statusSelect.addEventListener('change', update);
  update();
}

function deriveStatus(row) {
  if ((row.Stop_Work || '').toString().toUpperCase() === 'YES') return 'Critical';
  const band = (row.Rating_Band || '').toString();
  if (band.toLowerCase().includes('good')) return 'Good';
  if (band.toLowerCase().includes('monitor')) return 'Monitor';
  if (band.toLowerCase().includes('action')) return 'Action Required';
  return 'Open';
}

function renderTable(headers, rows, options={}) {
  if (!rows || !rows.length) return `<p class="subtle">No rows available for this sheet.</p>`;
  let html = '<table><thead><tr>';
  headers.forEach(h => html += `<th>${escapeHtml(String(h))}</th>`);
  html += '</tr></thead><tbody>';

  rows.forEach(r => {
    html += '<tr>';
    headers.forEach(h => {
      let value = r[h];
      if (h === 'Status') {
        const cls = statusClass(value);
        value = `<span class="badge ${cls}">${escapeHtml(String(value || 'Open'))}</span>`;
        html += `<td>${value}</td>`;
      } else {
        html += `<td>${formatCell(value)}</td>`;
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') return '';
  const s = String(value);
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return `<a href="${escapeAttr(s)}" target="_blank" rel="noreferrer">Open link</a>`;
  }
  return escapeHtml(s).replace(/\\n/g, '<br>');
}

function statusClass(status) {
  const s = (status || '').toString().toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('monitor')) return 'monitor';
  if (s.includes('closed') || s.includes('good')) return 'closed';
  return 'open';
}

function safeId(v) {
  return String(v).replace(/[^a-zA-Z0-9_-]+/g, '_');
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(str) {
  return escapeHtml(str);
}
