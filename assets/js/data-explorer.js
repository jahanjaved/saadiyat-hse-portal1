
let fullExport, summary;
function renderSheetList() {
  const list = document.getElementById('sheet-list');
  list.innerHTML = summary.sheet_summaries.map(s => `
    <button class="btn secondary" style="width:100%;justify-content:space-between" data-sheet="${escapeHtml(s.name)}">
      <span>${escapeHtml(s.name)}</span>
      <span class="small">${s.structured_record_count || 0} records</span>
    </button>`).join('');
  list.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => renderSheet(btn.dataset.sheet)));
}
function renderSheet(name) {
  const sheet = fullExport.sheets.find(s => s.name === name);
  if (!sheet) return;
  const rows = sheet.structured && sheet.structured.records ? sheet.structured.records : [];
  const info = summary.sheet_summaries.find(s => s.name === name);
  document.getElementById('sheet-meta').innerHTML = `
    <div class="stat-list">
      <div class="stat"><div class="small">Sheet</div><div class="n">${escapeHtml(name)}</div></div>
      <div class="stat"><div class="small">Structured records</div><div class="n">${info?.structured_record_count || 0}</div></div>
      <div class="stat"><div class="small">Charts</div><div class="n">${info?.charts_count || 0}</div></div>
      <div class="stat"><div class="small">Issue flags</div><div class="n">${info?.issue_summary?.broken_ref_formula_count || 0}</div></div>
    </div>`;
  if (rows.length) {
    const first = rows[0];
    const cols = Object.keys(first).slice(0, 10).map(k => ({key:k,label:k}));
    makeTable(document.getElementById('sheet-preview'), cols, rows, {maxRows: 50});
  } else {
    const grid = sheet.grid || [];
    const rows2 = grid.slice(0, 20).map(r => {
      const obj = {};
      r.slice(0, 8).forEach((v, i) => obj[`C${i+1}`] = v);
      return obj;
    });
    const cols = rows2[0] ? Object.keys(rows2[0]).map(k => ({key:k,label:k})) : [];
    makeTable(document.getElementById('sheet-preview'), cols, rows2, {emptyText:'No preview available.'});
  }
}
document.addEventListener('DOMContentLoaded', async () => {
  summary = await getSummary();
  fullExport = await loadJSON('data/full_workbook_export.json');
  renderSheetList();
  renderSheet(summary.sheet_order[0]);
});
