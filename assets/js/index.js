
document.addEventListener('DOMContentLoaded', async () => {
  const summary = await getSummary();
  const inspections = await getSheet('Weekly_Inspections');
  const dashboard = await getSheet('Weekly_Dashboard');
  const capa = await getSheet('CAPA_Tracker');

  const iRows = inspections.structured.records || [];
  const dRows = dashboard.structured.records || [];
  const cRows = capa.structured.records || [];

  const redFlags = iRows.filter(r => /yes/i.test(String(r['Critical_Red_Flag'] || ''))).length;
  const stopWork = iRows.filter(r => /yes/i.test(String(r['Stop_Work'] || ''))).length;
  const overdue = cRows.filter(r => /yes/i.test(String(r['Overdue_Flag'] || ''))).length;
  const goodClusters = dRows.filter(r => /yes/i.test(String(r['Award Eligible'] || ''))).length;
  const topCluster = [...dRows].filter(r => r['Week Avg Raw %'] != null).sort((a,b)=>(b['Week Avg Raw %']||0)-(a['Week Avg Raw %']||0))[0];
  const attentionCluster = [...iRows].filter(r => /yes/i.test(String(r['Critical_Red_Flag'] || ''))).sort((a,b)=>(a['Raw_Score_%']||9)-(b['Raw_Score_%']||9))[0];

  document.getElementById('hero-stats').innerHTML = [
    cardStat('Sheets in workbook', String(summary.sheet_order.length), 'All workbook tabs included'),
    cardStat('Weekly inspections', String(iRows.length), `${redFlags} critical red flags`),
    cardStat('Open / overdue actions', `${cRows.length} / ${overdue}`, 'From CAPA Tracker'),
    cardStat('Award eligible clusters', String(goodClusters), topCluster ? `Top this week: ${topCluster.Cluster}` : '')
  ].join('');

  document.getElementById('summary-note').innerHTML = `
    <div class="note">
      The workbook export includes all sheets, chart images, CSV files, and structured JSON. A few source workbook cells still contain broken Excel references, so some weighted and linked values remain blank in the source data.
    </div>`;

  makeTable(document.getElementById('latest-inspections'), [
    {key:'Inspection_Date', label:'Date', render:v => fmtDate(v)},
    {key:'Cluster', label:'Cluster'},
    {key:'Main_High_Risk_Activity', label:'Main Risk'},
    {key:'Raw_Score_%', label:'Raw Score', render:v => fmtPercent(v)},
    {key:'Critical_Red_Flag', label:'Red Flag', render:v => badgeFor(v)},
    {key:'Likely_Root_Cause', label:'Root Cause'}
  ], iRows, {maxRows: 8});

  makeTable(document.getElementById('priority-actions'), [
    {key:'Target_Date', label:'Target', render:v => fmtDate(v)},
    {key:'Cluster', label:'Cluster'},
    {key:'KPI_Area', label:'KPI Area'},
    {key:'Status', label:'Status', render:v => badgeFor(v)},
    {key:'Overdue_Flag', label:'Overdue', render:v => badgeFor(v)},
    {key:'Finding', label:'Finding'}
  ], cRows.filter(r => /yes/i.test(String(r['Overdue_Flag']||''))).slice(0,10), {emptyText:'No overdue actions found.'});

  const insight = document.getElementById('insight-list');
  insight.innerHTML = `
    <div class="stat"><div class="small">Best weekly raw score</div><div class="n">${topCluster ? fmtPercent(topCluster['Week Avg Raw %']) : '—'}</div><div class="small">${topCluster ? topCluster.Cluster : 'No ranking available'}</div></div>
    <div class="stat"><div class="small">Immediate intervention</div><div class="n">${attentionCluster ? attentionCluster.Cluster.replace('Cluster ','') : '—'}</div><div class="small">${attentionCluster ? attentionCluster['Likely_Root_Cause'] : 'No critical record'}</div></div>
    <div class="stat"><div class="small">Stop work cases</div><div class="n">${stopWork}</div><div class="small">Current weekly inspection records</div></div>
    <div class="stat"><div class="small">Workbook coverage</div><div class="n">${summary.sheet_summaries.reduce((a,s)=>a+(s.structured_record_count||0),0)}</div><div class="small">Structured records across all sheets</div></div>
  `;
});
