
let capaRows = [];
function renderCapa() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const status = document.getElementById('statusFilter').value;
  const overdue = document.getElementById('overdueFilter').value;
  const filtered = capaRows.filter(r => {
    const hay = JSON.stringify(r).toLowerCase();
    return (!q || hay.includes(q))
      && (!status || String(r.Status||'') === status)
      && (!overdue || String(r['Overdue_Flag']||'') === overdue);
  });
  makeTable(document.getElementById('capa-table'), [
    {key:'Action_ID', label:'Action ID'},
    {key:'Date_Raised', label:'Raised', render:v => fmtDate(v)},
    {key:'Cluster', label:'Cluster'},
    {key:'KPI_Area', label:'KPI Area'},
    {key:'Target_Date', label:'Target', render:v => fmtDate(v)},
    {key:'Status', label:'Status', render:v => badgeFor(v)},
    {key:'Overdue_Flag', label:'Overdue', render:v => badgeFor(v)},
    {key:'Days_Open', label:'Days Open'},
    {key:'Preventive_Action', label:'Preventive Action'}
  ], filtered, {maxRows: 250, emptyText:'No CAPA records match the current filter.'});
  document.getElementById('result-count').textContent = `${filtered.length} records shown`;
}
document.addEventListener('DOMContentLoaded', async () => {
  const capa = await getSheet('CAPA_Tracker');
  capaRows = capa.structured.records || [];
  document.getElementById('capa-cards').innerHTML = [
    cardStat('CAPA records', String(capaRows.length)),
    cardStat('Open actions', String(capaRows.filter(r => /open/i.test(String(r.Status||''))).length)),
    cardStat('Overdue actions', String(capaRows.filter(r => /yes/i.test(String(r['Overdue_Flag']||''))).length)),
    cardStat('Oldest days open', String(Math.max(...capaRows.map(r => Number(r['Days_Open']||0)))))
  ].join('');
  ['search','statusFilter','overdueFilter'].forEach(id => document.getElementById(id).addEventListener('input', renderCapa));
  renderCapa();
});
