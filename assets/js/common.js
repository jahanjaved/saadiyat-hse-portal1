
const DATA_ROOT = 'data';

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function fmtPercent(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}
function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}
function numberOrDash(value, digits = 0) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(digits);
}
function badgeFor(value) {
  const text = String(value ?? 'N/A').trim();
  let cls = 'info';
  if (/critical|overdue|no|red flag|open/i.test(text)) cls = 'danger';
  else if (/good|yes|closed|monitor/i.test(text)) cls = 'ok';
  else if (/check|warning|focus|pending/i.test(text)) cls = 'warn';
  return `<span class="badge ${cls}">${escapeHtml(text || '—')}</span>`;
}
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function cardStat(label, value, hint='') {
  return `<div class="kpi-card card"><div class="label">${escapeHtml(label)}</div><div class="value">${value}</div>${hint ? `<div class="hint">${escapeHtml(hint)}</div>` : ''}</div>`;
}
function makeTable(container, columns, rows, options = {}) {
  const { maxRows = rows.length, emptyText = 'No data found.' } = options;
  if (!rows.length) {
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }
  const limited = rows.slice(0, maxRows);
  const head = columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = limited.map(row => `<tr>${columns.map(c => `<td>${c.render ? c.render(row[c.key], row) : escapeHtml(formatCell(row[c.key]))}</td>`).join('')}</tr>`).join('');
  container.innerHTML = `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function formatCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  return String(value);
}
function activateNav() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === current) link.classList.add('active');
  });
}
async function getSummary() {
  return loadJSON(`${DATA_ROOT}/workbook_summary.json`);
}
async function getSheet(name) {
  return loadJSON(`${DATA_ROOT}/sheets/${name}.json`);
}
function setMetaTitle(title, description) {
  const h = document.getElementById('page-title');
  const p = document.getElementById('page-description');
  if (h) h.textContent = title;
  if (p) p.textContent = description;
}
document.addEventListener('DOMContentLoaded', activateNav);
