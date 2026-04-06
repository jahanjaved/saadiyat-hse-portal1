
document.addEventListener('DOMContentLoaded', async () => {
  const gap = await getSheet('Gap_Analysis');
  const rows = gap.structured.records || [];
  document.getElementById('gap-cards').innerHTML = [
    cardStat('KPI areas measured', String(rows.length)),
    cardStat('Largest week gap', numberOrDash(Math.max(...rows.map(r => Number(r['Week Gap to 5'] || 0))),1)),
    cardStat('Largest month gap', numberOrDash(Math.max(...rows.map(r => Number(r['Month Gap to 5'] || 0))),1)),
    cardStat('High-focus KPIs', String(rows.filter(r => /focus/i.test(String(r.Focus||''))).length))
  ].join('');
  makeTable(document.getElementById('gap-table'), [
    {key:'KPI', label:'KPI'},
    {key:'Week Avg Score', label:'Week Avg Score', render:v => numberOrDash(v,1)},
    {key:'Month Avg Score', label:'Month Avg Score', render:v => numberOrDash(v,1)},
    {key:'Week Gap to 5', label:'Week Gap to 5', render:v => numberOrDash(v,1)},
    {key:'Month Gap to 5', label:'Month Gap to 5', render:v => numberOrDash(v,1)},
    {key:'Week Red Flags', label:'Week Red Flags'},
    {key:'Month Red Flags', label:'Month Red Flags'},
    {key:'Focus', label:'Focus', render:v => badgeFor(v)}
  ], rows);
});
