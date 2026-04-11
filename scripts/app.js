
const DATA_PATH = 'data/site-data.json';

async function loadData() {
  const res = await fetch(DATA_PATH, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_PATH}`);
  return await res.json();
}

function pct(v) {
  if (v === null || v === undefined || v === '') return '—';
  return `${(Number(v) * 100).toFixed(1)}%`;
}
function num(v, d = 1) {
  if (v === null || v === undefined || v === '') return '—';
  return Number(v).toFixed(d);
}
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
function nl(v) { return esc(v).replace(/\n/g, '<br>'); }
function badge(text, type = 'info') { return `<span class="badge ${type}">${esc(text ?? '—')}</span>`; }
function scoreClass(v) {
  if (v === null || v === undefined || v === '') return 'mid';
  const n = Number(v);
  if (n >= 3.5) return 'high';
  if (n >= 2.5) return 'mid';
  return 'low';
}
function ratingBadge(r) {
  const map = { Good: 'good', 'Needs Improvement': 'warn', Poor: 'bad', Critical: 'critical', 'Need improvments': 'warn' };
  return badge(r || '—', map[r] || 'info');
}
function redFlagBadge(v) {
  return String(v).toUpperCase() === 'YES' ? badge('Red Flag', 'critical') : badge('No', 'good');
}

function nav(active) {
  const items = [
    ['index.html', 'Dashboard'],
    ['inspections.html', 'Weekly Inspections'],
    ['cluster-performance.html', 'Cluster Performance'],
    ['capa.html', 'CAPA'],
    ['gap-analysis.html', 'Gap Analysis'],
    ['schedules.html', 'Schedules'],
    ['raw-data.html', 'All Sheets']
  ];
  return `
    <div class="topbar">
      <div class="container">
        <div class="nav">
          <div class="brand">Saadiyat Lagoons HSE<small>Dashboard and inspection system</small></div>
          ${items.map(([href, label]) => `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`).join('')}
        </div>
      </div>
    </div>
  `;
}
function shell(active, title, sub) {
  const existingTopbar = document.querySelector('.topbar');
  if (existingTopbar) existingTopbar.remove();
  document.body.insertAdjacentHTML('afterbegin', nav(active));
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="container">
      <div class="hero">
        <div class="page-title">
          <div><h1>${title}</h1><p>${sub}</p></div>
        </div>
      </div>
      <div id="content"></div>
      <div class="footer"></div>
    </div>
  `;
  return document.getElementById('content');
}
function renderTable(container, headers, rows) {
  container.innerHTML += `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  `;
}
function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { labels: { color: '#dce9f7' } } }
  };
}

function getKpis(data) {
  return data.gapAnalysis?.kpis || [];
}

function buildCombinedRedFlagDataset(data) {
  const weekly = data.weeklyDashboard?.clusters || [];
  const monthly = data.monthlyDashboard?.clusters || [];
  const clusters = [...new Set([...weekly.map(c => c.cluster), ...monthly.map(c => c.cluster)])];
  clusters.sort((a, b) => {
    const at = Number((weekly.find(x => x.cluster === a) || {}).redFlagsWeek || 0) + Number((monthly.find(x => x.cluster === a) || {}).redFlagsMonth || 0);
    const bt = Number((weekly.find(x => x.cluster === b) || {}).redFlagsWeek || 0) + Number((monthly.find(x => x.cluster === b) || {}).redFlagsMonth || 0);
    return bt - at || a.localeCompare(b);
  });
  return {
    labels: clusters,
    week: clusters.map(c => Number((weekly.find(x => x.cluster === c) || {}).redFlagsWeek || 0)),
    month: clusters.map(c => Number((monthly.find(x => x.cluster === c) || {}).redFlagsMonth || 0))
  };
}
function buildOpenVsOverdueDataset(data) {
  const map = new Map();
  (data.meta?.clusters || []).forEach(cluster => map.set(cluster, { cluster, open: 0, overdue: 0 }));
  (data.capa || []).forEach(row => {
    const cluster = row.Cluster || 'Unknown';
    if (!map.has(cluster)) map.set(cluster, { cluster, open: 0, overdue: 0 });
    map.get(cluster).open += 1;
    if (String(row.Overdue_Flag || '').toUpperCase() === 'YES') map.get(cluster).overdue += 1;
  });
  return Array.from(map.values()).sort((a, b) => (b.open + b.overdue) - (a.open + a.overdue) || a.cluster.localeCompare(b.cluster));
}

function buildDashboard(data) {
  const c = shell('index.html', 'HSE Dashboard', `Week ${data.meta.selectedWeek} · Month ${data.meta.selectedMonth} · ${data.meta.inspectionCount} inspections`);
  const inspections = Array.isArray(data.weeklyInspections) ? data.weeklyInspections : [];
  const capaRows = Array.isArray(data.capa) ? data.capa : [];
  const avgRaw = inspections.reduce((a, r) => a + (Number(r['Raw_Score_%']) || 0), 0) / Math.max(inspections.length, 1);
  const monthRows = inspections.filter(r => r.Month === data.meta.selectedMonth);
  const monthAvg = monthRows.reduce((a, r) => a + (Number(r['Raw_Score_%']) || 0), 0) / Math.max(monthRows.length, 1);
  const redFlags = inspections.filter(r => String(r.Critical_Red_Flag).toUpperCase() === 'YES').length;
  const redFlagData = buildCombinedRedFlagDataset(data);
  const openVsOverdue = buildOpenVsOverdueDataset(data);
  const kpis = getKpis(data);

  c.innerHTML += `
    <div class="section grid cards">
      <div class="card"><h3>Total Inspections</h3><div class="metric">${data.meta.inspectionCount}</div></div>
      <div class="card"><h3>Month Average</h3><div class="metric">${pct(monthAvg)}</div></div>
      <div class="card"><h3>Overall Average</h3><div class="metric">${pct(avgRaw)}</div></div>
      <div class="card"><h3>Critical Red Flags</h3><div class="metric">${redFlags}</div></div>
      <div class="card"><h3>Open Actions</h3><div class="metric">${capaRows.length}</div></div>
      <div class="card"><h3>Overdue Actions</h3><div class="metric">${capaRows.filter(x => String(x.Overdue_Flag).toUpperCase() === 'YES').length}</div></div>
    </div>

    <div class="section grid two-col">
      <div class="card chart-card"><h2>Cluster Performance</h2><canvas id="clusterChart"></canvas></div>
      <div class="card chart-card"><h2>KPI Comparison</h2><canvas id="kpiChart"></canvas></div>
    </div>

    <div class="section">
      <div class="card chart-card"><h2>Red Flags</h2><canvas id="redFlagChart"></canvas></div>
    </div>

    <div class="section">
      <div class="card"><h2>Open vs Overdue Actions</h2><div id="openOverdueTable"></div></div>
    </div>

    <div class="section">
      <div class="card"><h2>Red Flag Summary and Heatmap</h2><div id="redFlagMatrix"></div></div>
    </div>

    <div class="section">
      <div class="card"><h2>Latest Inspections</h2><div id="latestTable"></div></div>
    </div>
  `;

  renderTable(
    document.getElementById('latestTable'),
    ['Date', 'Cluster', 'Area / Villa', 'Main Activity', 'Raw Score', 'Red Flag', 'Rating'],
    inspections.slice().sort((a, b) => String(b.Inspection_Date).localeCompare(String(a.Inspection_Date))).slice(0, 20).map(r => [
      esc(r.Inspection_Date), esc(r.Cluster), esc(r.Area_or_Villa), esc(r.Main_High_Risk_Activity),
      pct(r['Raw_Score_%']), redFlagBadge(r.Critical_Red_Flag), ratingBadge(r.Rating_Band)
    ])
  );

  renderTable(
    document.getElementById('openOverdueTable'),
    ['Cluster', 'Open Actions', 'Overdue Actions'],
    openVsOverdue.map(r => [esc(r.cluster), badge(r.open, r.open > 0 ? 'warn' : 'good'), badge(r.overdue, r.overdue > 0 ? 'critical' : 'good')])
  );

  const heatmapMap = new Map((data.heatmap || []).map(r => [r.cluster, r]));
  const weeklyMap = new Map((data.weeklyDashboard?.clusters || []).map(r => [r.cluster, r]));
  const monthlyMap = new Map((data.monthlyDashboard?.clusters || []).map(r => [r.cluster, r]));
  renderTable(
    document.getElementById('redFlagMatrix'),
    ['Cluster', 'Week Red Flags', 'Month Red Flags', 'Week Inspections', 'Month Inspections', ...kpis.map(k => k.label)],
    (data.meta?.clusters || []).map(cluster => {
      const heat = heatmapMap.get(cluster) || {};
      const week = weeklyMap.get(cluster) || {};
      const month = monthlyMap.get(cluster) || {};
      return [
        `<b>${esc(cluster)}</b>`,
        badge(Number(week.redFlagsWeek || 0), Number(week.redFlagsWeek || 0) > 0 ? 'critical' : 'good'),
        badge(Number(month.redFlagsMonth || 0), Number(month.redFlagsMonth || 0) > 0 ? 'critical' : 'good'),
        badge(Number(week.inspectionCountWeek || 0), 'info'),
        badge(Number(month.inspectionCountMonth || 0), 'info'),
        ...kpis.map(k => {
          const v = heat[k.field];
          return `<span class="score ${scoreClass(v)}">${v === null || v === undefined ? '—' : Number(v).toFixed(1)}</span>`;
        })
      ];
    })
  );

  new Chart(document.getElementById('clusterChart'), {
    type: 'bar',
    data: {
      labels: (data.weeklyDashboard?.clusters || []).map(cu => cu.cluster),
      datasets: [
        { label: 'Week Avg %', data: (data.weeklyDashboard?.clusters || []).map(cu => cu.weekAvgRawPct ? cu.weekAvgRawPct * 100 : null) },
        { label: 'Month Avg %', data: (data.weeklyDashboard?.clusters || []).map(cu => cu.monthAvgRawPct ? cu.monthAvgRawPct * 100 : null) }
      ]
    },
    options: { ...baseChartOptions(), scales: { x: { ticks: { color: '#bfd2e9' } }, y: { beginAtZero: true, ticks: { color: '#bfd2e9' } } } }
  });

  new Chart(document.getElementById('kpiChart'), {
    type: 'line',
    data: {
      labels: kpis.map(k => k.label),
      datasets: [
        { label: 'Week', data: kpis.map(k => k.weekAvg), tension: 0.35, fill: false },
        { label: 'Month', data: kpis.map(k => k.monthAvg), tension: 0.35, fill: false }
      ]
    },
    options: {
      ...baseChartOptions(),
      scales: {
        x: { ticks: { color: '#bfd2e9', maxRotation: 0, minRotation: 0 } },
        y: { beginAtZero: true, suggestedMax: 5, ticks: { color: '#bfd2e9' } }
      }
    }
  });

  new Chart(document.getElementById('redFlagChart'), {
    type: 'bar',
    data: {
      labels: redFlagData.labels,
      datasets: [
        { label: 'Weekly Red Flags', data: redFlagData.week },
        { label: 'Monthly Red Flags', data: redFlagData.month }
      ]
    },
    options: {
      ...baseChartOptions(),
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, ticks: { color: '#bfd2e9', precision: 0 } },
        y: { ticks: { color: '#bfd2e9' } }
      }
    }
  });
}

function buildInspections(data) {
  const c = shell('inspections.html', 'Weekly Inspections', 'Full inspection record');
  c.innerHTML += `
    <div class="filters">
      <input id="q" placeholder="Search cluster, area, activity" />
      <select id="clusterFilter"><option value="">All clusters</option>${(data.meta?.clusters || []).map(cl => `<option>${esc(cl)}</option>`).join('')}</select>
      <select id="redFlagFilter"><option value="">All red flag status</option><option>YES</option><option>NO</option></select>
    </div>
    <div class="card"><div id="inspectionTable"></div></div>
  `;
  const headers = ['Date', 'Week', 'Package', 'Cluster', 'Area / Villa', 'Activity', 'Stop Work', 'WAH', 'Edge', 'Falling', 'Excavation', 'Scaffold', 'PTW Impl', 'PTW Verify', 'MSRA', 'Lifting', 'Traffic', 'Housekeeping', 'Welfare', 'Fire', 'Supervision', 'Electrical', 'Raw %', 'Red Flag', 'Rating', 'Root Cause', 'Top Gaps', 'Immediate Action', 'Preventive Action'];
  const holder = document.getElementById('inspectionTable');
  function draw() {
    const q = document.getElementById('q').value.toLowerCase();
    const cluster = document.getElementById('clusterFilter').value;
    const red = document.getElementById('redFlagFilter').value;
    const rows = (data.weeklyInspections || []).filter(r => {
      const t = JSON.stringify(r).toLowerCase();
      return (!q || t.includes(q)) && (!cluster || r.Cluster === cluster) && (!red || String(r.Critical_Red_Flag).toUpperCase() === red);
    }).map(r => [
      esc(r.Inspection_Date), esc(r.Week_No), esc(r.Package), esc(r.Cluster), esc(r.Area_or_Villa), esc(r.Main_High_Risk_Activity), esc(r.Stop_Work || '—'),
      num(r.Work_at_Height), num(r.Edge_Protection), num(r.Falling_Object_Prevention), esc(r.Excavation_Safety), num(r.Scaffolding_Compliance),
      num(r.PTW_Implementation), num(r.PTW_Field_Verification), num(r.MSRA_Quality), num(r['Lifting/Precast Installation']), num(r.Traffic_Interface),
      num(r['Housekeeping/Waste Management']), num(r['Welfare Arrangement']), num(r.Fire_Readiness), num(r.Supervision_Subcontractor), num(r.Electrical_Tool_Safety),
      pct(r['Raw_Score_%']), redFlagBadge(r.Critical_Red_Flag), ratingBadge(r.Rating_Band), esc(r.Likely_Root_Cause),
      `<div class="pre">${nl(r.Top_3_Gaps_Observed)}</div>`,
      `<div class="pre">${nl(r.Immediate_Action_Taken)}</div>`,
      `<div class="pre">${nl(r.Preventive_Action_Required)}</div>`
    ]);
    holder.innerHTML = '';
    renderTable(holder, headers, rows);
  }
  draw();
  ['q', 'clusterFilter', 'redFlagFilter'].forEach(id => document.getElementById(id).addEventListener('input', draw));
}

function buildCapa(data) {
  const c = shell('capa.html', 'CAPA Tracking', 'Corrective and preventive actions');
  c.innerHTML += `<div class="card"><div id="capaTable"></div></div>`;
  renderTable(document.getElementById('capaTable'),
    ['Action ID', 'Date Raised', 'Cluster', 'Package', 'KPI Area', 'Root Cause', 'Finding', 'Immediate Action', 'Preventive Action', 'Owner', 'Target', 'Overdue'],
    (data.capa || []).map(r => [
      esc(r.Action_ID), esc(r.Date_Raised), esc(r.Cluster), esc(r.Package), esc(r.KPI_Area), esc(r.Root_Cause),
      `<div class="pre">${nl(r.Finding)}</div>`,
      `<div class="pre">${nl(r.Immediate_Action)}</div>`,
      `<div class="pre">${nl(r.Preventive_Action)}</div>`,
      esc(r.Action_Owner), esc(r.Target_Date),
      String(r.Overdue_Flag).toUpperCase() === 'YES' ? badge('Overdue', 'critical') : badge('On time', 'good')
    ])
  );
}

function buildGap(data) {
  const c = shell('gap-analysis.html', 'Gap Analysis', 'KPI gaps and root causes');
  c.innerHTML += `
    <div class="section grid two-col">
      <div class="card chart-card"><h2>Gap to 5 by KPI</h2><canvas id="gapChart"></canvas></div>
      <div class="card chart-card"><h2>Root Cause Frequency</h2><canvas id="rootChart"></canvas></div>
    </div>
    <div class="section"><div class="card"><div id="gapTable"></div></div></div>
    <div class="section"><div class="card"><div id="rootTable"></div></div></div>
  `;
  renderTable(document.getElementById('gapTable'),
    ['KPI', 'Week Avg', 'Month Avg', 'Week Gap to 5', 'Month Gap to 5', 'Focus'],
    (data.gapAnalysis?.kpis || []).map(k => [esc(k.label), num(k.weekAvg), num(k.monthAvg), num(k.weekGapTo5), num(k.monthGapTo5), (k.monthGapTo5 >= 2 ? badge('Immediate attention', 'critical') : badge('Monitor', 'warn'))])
  );
  renderTable(document.getElementById('rootTable'),
    ['Root Cause', 'Count'],
    (data.gapAnalysis?.rootCauses || []).map(r => [esc(r.rootCause), esc(r.count)])
  );
  new Chart(document.getElementById('gapChart'), {
    type: 'bar',
    data: { labels: (data.gapAnalysis?.kpis || []).map(k => k.label), datasets: [{ label: 'Month Gap to 5', data: (data.gapAnalysis?.kpis || []).map(k => k.monthGapTo5) }] },
    options: { ...baseChartOptions(), scales: { x: { ticks: { color: '#bfd2e9' } }, y: { beginAtZero: true, ticks: { color: '#bfd2e9' } } } }
  });
  new Chart(document.getElementById('rootChart'), {
    type: 'doughnut',
    data: { labels: (data.gapAnalysis?.rootCauses || []).map(r => r.rootCause), datasets: [{ data: (data.gapAnalysis?.rootCauses || []).map(r => r.count) }] },
    options: baseChartOptions()
  });
}

function buildSchedules(data) {
  const c = shell('schedules.html', 'Schedules', 'April, May and June');
  const months = Object.keys(data.schedules || {});
  c.innerHTML += `<div class="tabs">${months.map((m, i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-month="${m}">${m}</button>`).join('')}</div><div id="scheduleContent"></div>`;
  const holder = document.getElementById('scheduleContent');
  function draw(month) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.month === month));
    const matrix = data.schedules[month] || [];
    holder.innerHTML = `<div class="card"><div class="table-wrap"><table>${matrix.map((r, ri) => `<tr>${r.map(c => ri === 0 ? `<th>${esc(c ?? '')}</th>` : `<td>${esc(c ?? '')}</td>`).join('')}</tr>`).join('')}</table></div></div>`;
  }
  if (months.length) {
    draw(months[0]);
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => draw(t.dataset.month)));
  }
}

function buildRaw(data) {
  const c = shell('raw-data.html', 'All Sheets', 'Workbook sheets');
  const sheets = Object.keys(data.rawSheets || {});
  c.innerHTML += `<div class="tabs">${sheets.map((s, i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-sheet="${s}">${s}</button>`).join('')}</div><div id="sheetContent"></div>`;
  const holder = document.getElementById('sheetContent');
  function draw(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.sheet === name));
    const matrix = data.rawSheets[name] || [];
    holder.innerHTML = `<div class="card"><div class="table-wrap"><table>${matrix.map((r, ri) => `<tr>${r.map(c => ri === 0 ? `<th>${esc(c ?? '')}</th>` : `<td>${esc(c ?? '')}</td>`).join('')}</tr>`).join('')}</table></div></div>`;
  }
  if (sheets.length) {
    draw(sheets[0]);
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => draw(t.dataset.sheet)));
  }
}

function safeNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t || t.toUpperCase() === 'NA' || t.toUpperCase() === 'N/A' || t === '#VALUE!' || t.toLowerCase() === 'na') return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(values) {
  const nums = values.map(safeNum).filter(v => v !== null);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function performanceBand(score) {
  const n = safeNum(score);
  if (n === null) return { label: 'No Data', type: 'info' };
  if (n < 0.50) return { label: 'Unacceptable', type: 'critical' };
  if (n < 0.65) return { label: 'Average', type: 'warn' };
  if (n < 0.75) return { label: 'Good', type: 'info' };
  return { label: 'Very Good', type: 'good' };
}

function clusterKpiDefs() {
  return [
    ['WAH', 'Work_at_Height'],
    ['Edge', 'Edge_Protection'],
    ['Falling', 'Falling_Object_Prevention'],
    ['Excavation', 'Excavation_Safety'],
    ['Scaffold', 'Scaffolding_Compliance'],
    ['PTW', 'PTW_Implementation'],
    ['PTW Verify', 'PTW_Field_Verification'],
    ['MSRA', 'MSRA_Quality'],
    ['Lifting', 'Lifting/Precast Installation'],
    ['Traffic', 'Traffic_Interface'],
    ['Housekeeping', 'Housekeeping/Waste Management'],
    ['Welfare', 'Welfare Arrangement'],
    ['Fire', 'Fire_Readiness'],
    ['Supervision', 'Supervision_Subcontractor'],
    ['Electrical', 'Electrical_Tool_Safety']
  ];
}

function clusterRows(data) {
  return Array.isArray(data.weeklyInspections) ? data.weeklyInspections : [];
}

function buildClusterPerformance(data) {
  const selectedWeek = data.meta?.selectedWeek;
  const selectedMonth = data.meta?.selectedMonth;
  const c = shell('cluster-performance.html', 'Cluster Performance', `Weekly and monthly cluster performance cards · Week ${selectedWeek} · Month ${selectedMonth}`);

  const rows = clusterRows(data);
  const clusters = (data.meta?.clusters || []).filter(x => /^Cluster\s+/i.test(String(x)));
  const weekRows = rows.filter(r => String(r.Week_No) === String(selectedWeek));
  const monthRows = rows.filter(r => String(r.Month) === String(selectedMonth));
  const kpis = clusterKpiDefs();

  const summary = clusters.map(cluster => {
    const cw = weekRows.filter(r => r.Cluster === cluster);
    const cm = monthRows.filter(r => r.Cluster === cluster);
    const weekScore = avg(cw.map(r => r['Weighted_Score_%'] ?? r['Weighted_Score_Pct'] ?? r['Raw_Score_%'] ?? r['Raw_Score_Pct']));
    const monthScore = avg(cm.map(r => r['Weighted_Score_%'] ?? r['Weighted_Score_Pct'] ?? r['Raw_Score_%'] ?? r['Raw_Score_Pct']));
    const weekRedFlags = cw.filter(r => String(r.Critical_Red_Flag).toUpperCase() === 'YES').length;
    const monthRedFlags = cm.filter(r => String(r.Critical_Red_Flag).toUpperCase() === 'YES').length;
    return {
      cluster,
      weekRows: cw,
      monthRows: cm,
      weekScore,
      monthScore,
      weekRedFlags,
      monthRedFlags,
      weekBand: performanceBand(weekScore),
      monthBand: performanceBand(monthScore),
      kpiWeek: Object.fromEntries(kpis.map(([label, field]) => [field, avg(cw.map(r => r[field]))])),
      kpiMonth: Object.fromEntries(kpis.map(([label, field]) => [field, avg(cm.map(r => r[field]))]))
    };
  }).filter(x => x.weekRows.length || x.monthRows.length)
    .sort((a, b) => (safeNum(b.weekScore) ?? -1) - (safeNum(a.weekScore) ?? -1) || a.cluster.localeCompare(b.cluster));

  c.innerHTML += `
    <div class="section grid cards">
      <div class="card"><h3>Clusters Assessed</h3><div class="metric">${summary.length}</div></div>
      <div class="card"><h3>Week Best</h3><div class="metric">${esc(summary[0]?.cluster || '—')}</div></div>
      <div class="card"><h3>Week Lowest</h3><div class="metric">${esc(summary[summary.length - 1]?.cluster || '—')}</div></div>
      <div class="card"><h3>Week Red Flags</h3><div class="metric">${summary.reduce((a, r) => a + r.weekRedFlags, 0)}</div></div>
      <div class="card"><h3>Month Red Flags</h3><div class="metric">${summary.reduce((a, r) => a + r.monthRedFlags, 0)}</div></div>
      <div class="card"><h3>Selected Week</h3><div class="metric">${esc(selectedWeek)}</div></div>
    </div>
    <div class="section grid two-col">
      <div class="card chart-card"><h2>Week Score Comparison</h2><canvas id="clusterWeekScoreChart"></canvas></div>
      <div class="card chart-card"><h2>Month Score Comparison</h2><canvas id="clusterMonthScoreChart"></canvas></div>
    </div>
    <div class="section">
      <div class="card"><h2>Cluster Ranking Summary</h2><div id="clusterRankingTable"></div></div>
    </div>
    <div class="section" id="clusterCards"></div>
  `;

  renderTable(
    document.getElementById('clusterRankingTable'),
    ['Rank', 'Cluster', 'Week Score', 'Week Band', 'Week Flags', 'Month Score', 'Month Band', 'Month Flags'],
    summary.map((r, i) => [
      badge(i + 1, 'info'),
      `<b>${esc(r.cluster)}</b>`,
      pct(r.weekScore),
      badge(r.weekBand.label, r.weekBand.type),
      badge(r.weekRedFlags, r.weekRedFlags > 0 ? 'critical' : 'good'),
      pct(r.monthScore),
      badge(r.monthBand.label, r.monthBand.type),
      badge(r.monthRedFlags, r.monthRedFlags > 0 ? 'critical' : 'good')
    ])
  );

  new Chart(document.getElementById('clusterWeekScoreChart'), {
    type: 'bar',
    data: {
      labels: summary.map(r => r.cluster),
      datasets: [{ label: 'Week Score %', data: summary.map(r => safeNum(r.weekScore) !== null ? Number((r.weekScore * 100).toFixed(1)) : null) }]
    },
    options: { ...baseChartOptions(), scales: { x: { ticks: { color: '#bfd2e9' } }, y: { beginAtZero: true, max: 100, ticks: { color: '#bfd2e9' } } } }
  });

  new Chart(document.getElementById('clusterMonthScoreChart'), {
    type: 'bar',
    data: {
      labels: summary.map(r => r.cluster),
      datasets: [{ label: 'Month Score %', data: summary.map(r => safeNum(r.monthScore) !== null ? Number((r.monthScore * 100).toFixed(1)) : null) }]
    },
    options: { ...baseChartOptions(), scales: { x: { ticks: { color: '#bfd2e9' } }, y: { beginAtZero: true, max: 100, ticks: { color: '#bfd2e9' } } } }
  });

  const cardsHolder = document.getElementById('clusterCards');
  cardsHolder.className = 'section grid';
  cardsHolder.style.gridTemplateColumns = 'repeat(auto-fit, minmax(420px, 1fr))';

  summary.forEach((r, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    const canvasId = `clusterKpiChart${idx}`;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div>
          <h2 style="margin-bottom:6px;">${esc(r.cluster)}</h2>
          <p class="muted" style="margin:0;">Week ${esc(selectedWeek)} vs Month ${esc(selectedMonth)}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${badge(`Week ${r.weekBand.label}`, r.weekBand.type)}
          ${badge(`Month ${r.monthBand.label}`, r.monthBand.type)}
          ${r.weekRedFlags > 0 ? badge(`Week Flag ${r.weekRedFlags}`, 'critical') : badge('Week Clear', 'good')}
          ${r.monthRedFlags > 0 ? badge(`Month Flag ${r.monthRedFlags}`, 'critical') : badge('Month Clear', 'good')}
        </div>
      </div>
      <div class="section grid cards" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;">
        <div class="card" style="padding:14px;"><h3>Week Score</h3><div class="metric">${pct(r.weekScore)}</div></div>
        <div class="card" style="padding:14px;"><h3>Month Score</h3><div class="metric">${pct(r.monthScore)}</div></div>
        <div class="card" style="padding:14px;"><h3>Week Inspections</h3><div class="metric">${r.weekRows.length}</div></div>
        <div class="card" style="padding:14px;"><h3>Month Inspections</h3><div class="metric">${r.monthRows.length}</div></div>
      </div>
      <div class="chart-card" style="margin-top:14px;"><h3>KPI Profile</h3><canvas id="${canvasId}"></canvas></div>
      <div class="table-wrap" style="margin-top:14px;">
        <table>
          <thead><tr><th>KPI</th><th>Week</th><th>Month</th></tr></thead>
          <tbody>
            ${kpis.map(([label, field]) => `<tr><td>${esc(label)}</td><td><span class="score ${scoreClass(r.kpiWeek[field])}">${num(r.kpiWeek[field])}</span></td><td><span class="score ${scoreClass(r.kpiMonth[field])}">${num(r.kpiMonth[field])}</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
    cardsHolder.appendChild(card);
    new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels: kpis.map(([label]) => label),
        datasets: [
          { label: 'Week', data: kpis.map(([, field]) => r.kpiWeek[field]) },
          { label: 'Month', data: kpis.map(([, field]) => r.kpiMonth[field]) }
        ]
      },
      options: {
        ...baseChartOptions(),
        scales: {
          x: { ticks: { color: '#bfd2e9', maxRotation: 90, minRotation: 90 } },
          y: { beginAtZero: true, suggestedMax: 5, ticks: { color: '#bfd2e9' } }
        }
      }
    });
  });
}


(async function () {
  try {
    const data = await loadData();
    const page = location.pathname.split('/').pop() || 'index.html';
    if (page === 'index.html') buildDashboard(data);
    else if (page === 'inspections.html') buildInspections(data);
    else if (page === 'cluster-performance.html') buildClusterPerformance(data);
    else if (page === 'capa.html') buildCapa(data);
    else if (page === 'gap-analysis.html') buildGap(data);
    else if (page === 'schedules.html') buildSchedules(data);
    else if (page === 'raw-data.html') buildRaw(data);
    else buildDashboard(data);
  } catch (err) {
    console.error(err);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div class="container" style="padding-top:40px;">
          <div class="card">
            <h2>Dashboard failed to load</h2>
            <p>Please confirm these folders exist in GitHub exactly as named:</p>
            <div class="pre">/assets/styles.css
/scripts/app.js
/data/site-data.json</div>
            <p class="muted">${esc(err.message || 'Unknown error')}</p>
          </div>
        </div>`;
    }
  }
})();
