
document.addEventListener('DOMContentLoaded', async () => {
  const weekly = await getSheet('Weekly_Dashboard');
  const monthly = await getSheet('Monthly_Dashboard');
  const weeklyRows = weekly.structured.records || [];
  const monthlyRows = monthly.structured.records || [];

  document.getElementById('weekly-cards').innerHTML = [
    cardStat('Clusters ranked this week', String(weeklyRows.filter(r => r.Rank != null).length)),
    cardStat('Best weekly raw score', fmtPercent(Math.max(...weeklyRows.map(r => Number(r['Week Avg Raw %'] || 0))))),
    cardStat('Total weekly red flags', String(weeklyRows.reduce((a,r)=>a+Number(r['Week Red Flags']||0),0))),
    cardStat('Award eligible', String(weeklyRows.filter(r => /yes/i.test(String(r['Award Eligible']||''))).length))
  ].join('');

  makeTable(document.getElementById('weekly-table'), [
    {key:'Rank', label:'Rank'},
    {key:'Cluster', label:'Cluster'},
    {key:'Week Avg Raw %', label:'Week Avg Raw %', render:v => fmtPercent(v)},
    {key:'Week Avg Weighted %', label:'Weighted %', render:v => fmtPercent(v)},
    {key:'Week Red Flags', label:'Week Red Flags'},
    {key:'Month Avg Raw %', label:'Month Avg Raw %', render:v => fmtPercent(v)},
    {key:'Award Eligible', label:'Award Eligible', render:v => badgeFor(v)}
  ], weeklyRows);

  makeTable(document.getElementById('monthly-table'), [
    {key:'Cluster', label:'Cluster'},
    {key:'Month Avg Raw %', label:'Month Avg Raw %', render:v => fmtPercent(v)},
    {key:'Month Avg Weighted %', label:'Weighted %', render:v => fmtPercent(v)},
    {key:'Open Actions', label:'Open Actions'},
    {key:'Overdue Actions', label:'Overdue Actions'},
    {key:'Trend', label:'Trend', render:v => badgeFor(v)}
  ], monthlyRows);

  document.getElementById('chart-gallery').innerHTML = `
    <div class="chart-box"><h4>Weekly Cluster Raw Score %</h4><img src="data/charts/Weekly_Dashboard_chart_1.png" alt="Weekly chart"></div>
    <div class="chart-box"><h4>Month Red Flags by Cluster</h4><img src="data/charts/Weekly_Dashboard_chart_2.png" alt="Weekly red flags chart"></div>
    <div class="chart-box"><h4>Monthly Cluster Raw Score %</h4><img src="data/charts/Monthly_Dashboard_chart_1.png" alt="Monthly chart"></div>
    <div class="chart-box"><h4>Open vs Overdue Actions</h4><img src="data/charts/Monthly_Dashboard_chart_2.png" alt="Monthly actions chart"></div>
  `;
});
