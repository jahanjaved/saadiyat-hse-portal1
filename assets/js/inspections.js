
let inspectionRows = [];
function renderInspections() {
  const search = document.getElementById('search').value.toLowerCase().trim();
  const cluster = document.getElementById('clusterFilter').value;
  const redFlag = document.getElementById('redFlagFilter').value;
  const filtered = inspectionRows.filter(r => {
    const hay = JSON.stringify(r).toLowerCase();
    const matchSearch = !search || hay.includes(search);
    const matchCluster = !cluster || r.Cluster === cluster;
    const matchFlag = !redFlag || String(r['Critical_Red_Flag'] || '') === redFlag;
    return matchSearch && matchCluster && matchFlag;
  });
  makeTable(document.getElementById('inspection-table'), [
    {key:'Inspection_ID', label:'Inspection ID'},
    {key:'Inspection_Date', label:'Date', render:v => fmtDate(v)},
    {key:'Cluster', label:'Cluster'},
    {key:'Main_High_Risk_Activity', label:'High Risk Activity'},
    {key:'Stop_Work', label:'Stop Work', render:v => badgeFor(v)},
    {key:'Raw_Score_%', label:'Raw Score', render:v => fmtPercent(v)},
    {key:'Weighted_Score_%', label:'Weighted Score', render:v => escapeHtml(formatCell(v))},
    {key:'Critical_Red_Flag', label:'Red Flag', render:v => badgeFor(v)},
    {key:'Likely_Root_Cause', label:'Root Cause'},
    {key:'Preventive_Action_Required', label:'Preventive Action'}
  ], filtered, {emptyText:'No inspection matches the current filter.'});
}
document.addEventListener('DOMContentLoaded', async () => {
  const inspections = await getSheet('Weekly_Inspections');
  inspectionRows = inspections.structured.records || [];
  const clusters = [...new Set(inspectionRows.map(r => r.Cluster).filter(Boolean))];
  document.getElementById('clusterFilter').innerHTML = `<option value="">All clusters</option>` + clusters.map(v => `<option>${escapeHtml(v)}</option>`).join('');
  ['search','clusterFilter','redFlagFilter'].forEach(id => document.getElementById(id).addEventListener('input', renderInspections));
  document.getElementById('inspection-cards').innerHTML = [
    cardStat('Inspection records', String(inspectionRows.length)),
    cardStat('Critical red flags', String(inspectionRows.filter(r => /yes/i.test(String(r['Critical_Red_Flag']||''))).length)),
    cardStat('Stop work issued', String(inspectionRows.filter(r => /yes/i.test(String(r['Stop_Work']||''))).length)),
    cardStat('Average raw score', fmtPercent(inspectionRows.reduce((a,r)=>a+Number(r['Raw_Score_%']||0),0) / Math.max(inspectionRows.length,1)))
  ].join('');
  renderInspections();
});
