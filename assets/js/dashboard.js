
function safeNum(value) {
  return value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? null : Number(value);
}

function scoreCell(value, isPercent = false) {
  const num = safeNum(value);
  if (num === null) return '<span class="dash">—</span>';
  const display = isPercent ? `${(num * 100).toFixed(1)}%` : Number(num.toFixed(2));
  let cls = 'good';
  if ((isPercent && num < 0.5) || (!isPercent && num < 3)) cls = 'poor';
  else if ((isPercent && num < 0.65) || (!isPercent && num < 4)) cls = 'watch';
  return `<span class="score-chip ${cls}">${display}</span>`;
}

function parseKpiRowsFromGrid(grid) {
  const rows = [];
  for (let r = 28; r <= grid.length; r++) {
    const row = grid[r - 1] || [];
    const kpi = row[0];
    if (!kpi) continue;
    rows.push({
      KPI: kpi,
      weekScore: row[1],
      monthScore: row[2],
      weekGap: row[3],
      monthGap: row[4],
      rootCause: row[6],
      weekCount: row[7],
      monthCount: row[8]
    });
  }
  return rows;
}

document.addEventListener('DOMContentLoaded', async () => {
  const weekly = await getSheet('Weekly_Dashboard');
  const monthly = await getSheet('Monthly_Dashboard');
  const weeklyRows = (weekly.structured.records || []).filter(r => r.Cluster);
  const monthlyRows = (monthly.structured.records || []).filter(r => r.Cluster);
  const controls = weekly.structured.controls || {};
  const kpiRows = parseKpiRowsFromGrid(weekly.grid || []);
  const rankedWeekly = weeklyRows.filter(r => safeNum(r['Week Avg Raw %']) !== null);
  const rankedMonthly = monthlyRows.filter(r => safeNum(r['Month Avg Raw %']) !== null);
  const bestWeekly = [...rankedWeekly].sort((a,b)=>(b['Week Avg Raw %']||0)-(a['Week Avg Raw %']||0))[0];
  const totalRedFlags = weeklyRows.reduce((acc, row) => acc + Number(row['Month Red Flags'] || 0), 0);
  const awardEligible = weeklyRows.filter(r => /yes/i.test(String(r['Award Eligible'] || ''))).length;

  document.getElementById('dashboard-controls').innerHTML = `
    <div class="excel-control-title">Dashboard controls</div>
    <div class="excel-control-grid">
      <div class="excel-control-box">
        <div class="control-label">Selected week no</div>
        <div class="control-value">${escapeHtml(controls['Selected Week No'] ?? '—')}</div>
      </div>
      <div class="excel-control-box">
        <div class="control-label">Selected month</div>
        <div class="control-value">${escapeHtml(controls['Selected Month (yyyy-mm)'] ?? '—')}</div>
      </div>
      <div class="excel-control-box">
        <div class="control-label">Previous month</div>
        <div class="control-value">${escapeHtml(controls['Previous Month (yyyy-mm)'] ?? '—')}</div>
      </div>
    </div>
    <div class="excel-summary-row">
      <div class="mini-metric"><span>Clusters scored</span><strong>${rankedWeekly.length}</strong></div>
      <div class="mini-metric"><span>Best weekly raw score</span><strong>${bestWeekly ? fmtPercent(bestWeekly['Week Avg Raw %']) : '—'}</strong></div>
      <div class="mini-metric"><span>Month red flags</span><strong>${totalRedFlags}</strong></div>
      <div class="mini-metric"><span>Award eligible</span><strong>${awardEligible}</strong></div>
    </div>
  `;

  const clusterTableRows = weeklyRows.map(row => `
    <tr>
      <td class="sticky-col">${escapeHtml(row.Cluster)}</td>
      <td>${scoreCell(row['Week Avg Raw %'], true)}</td>
      <td>${row['Week Red Flags'] ?? '—'}</td>
      <td>${scoreCell(row['Month Avg Raw %'], true)}</td>
      <td>${row['Month Red Flags'] ?? '—'}</td>
      <td>${badgeFor(row['Award Eligible'] || 'NO')}</td>
      <td>${row.Rank ?? '—'}</td>
    </tr>
  `).join('');

  document.getElementById('cluster-score-table').innerHTML = `
    <div class="table-wrap excel-table-wrap">
      <table class="excel-table">
        <thead>
          <tr>
            <th>Cluster</th>
            <th>Week Avg Raw %</th>
            <th>Week Red Flags</th>
            <th>Month Avg Raw %</th>
            <th>Month Red Flags</th>
            <th>Award Eligible</th>
            <th>Rank</th>
          </tr>
        </thead>
        <tbody>${clusterTableRows}</tbody>
      </table>
    </div>
  `;

  const snapshotRows = kpiRows.map(row => `
    <tr>
      <td class="sticky-col">${escapeHtml(row.KPI)}</td>
      <td>${scoreCell(row.weekScore, false)}</td>
      <td>${scoreCell(row.monthScore, false)}</td>
      <td>${scoreCell(row.weekGap, false)}</td>
      <td>${scoreCell(row.monthGap, false)}</td>
    </tr>
  `).join('');

  document.getElementById('kpi-snapshot-table').innerHTML = `
    <div class="table-wrap excel-table-wrap">
      <table class="excel-table compact">
        <thead>
          <tr>
            <th>KPI</th>
            <th>Selected Week Avg Score</th>
            <th>Selected Month Avg Score</th>
            <th>Gap to 5 (Week)</th>
            <th>Gap to 5 (Month)</th>
          </tr>
        </thead>
        <tbody>${snapshotRows}</tbody>
      </table>
    </div>
  `;

  const rootRows = kpiRows.map(row => `
    <tr>
      <td class="sticky-col">${escapeHtml(row.KPI)}</td>
      <td>${escapeHtml(row.rootCause || '—')}</td>
      <td>${row.weekCount ?? '—'}</td>
      <td>${row.monthCount ?? '—'}</td>
    </tr>
  `).join('');

  document.getElementById('root-cause-table').innerHTML = `
    <div class="table-wrap excel-table-wrap">
      <table class="excel-table compact">
        <thead>
          <tr>
            <th>KPI</th>
            <th>Root Cause</th>
            <th>Selected Week Count</th>
            <th>Selected Month Count</th>
          </tr>
        </thead>
        <tbody>${rootRows}</tbody>
      </table>
    </div>
  `;

  const monthlyClusterRows = rankedMonthly
    .sort((a,b)=>(a.Rank || 999) - (b.Rank || 999))
    .map(row => `
      <tr>
        <td class="sticky-col">${escapeHtml(row.Cluster)}</td>
        <td>${scoreCell(row['Month Avg Raw %'], true)}</td>
        <td>${row['Red Flags'] ?? '—'}</td>
        <td>${row['Open Actions'] ?? '—'}</td>
        <td>${row['Overdue Actions'] ?? '—'}</td>
        <td>${badgeFor(row['Award Eligible'] || 'NO')}</td>
        <td>${row.Rank ?? '—'}</td>
      </tr>
    `).join('');

  document.getElementById('monthly-cluster-table').innerHTML = `
    <div class="table-wrap excel-table-wrap">
      <table class="excel-table compact">
        <thead>
          <tr>
            <th>Cluster</th>
            <th>Month Avg Raw %</th>
            <th>Red Flags</th>
            <th>Open Actions</th>
            <th>Overdue Actions</th>
            <th>Award Eligible</th>
            <th>Rank</th>
          </tr>
        </thead>
        <tbody>${monthlyClusterRows}</tbody>
      </table>
    </div>
  `;
});
