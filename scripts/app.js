const DATA_PATH = 'data/site-data.json';

async function loadData() {
  const res = await fetch(DATA_PATH, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_PATH}`);
  return await res.json();
}

function pct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function pctNum(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n * 100;
}

function num(v, d = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(d);
}

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function nl(v) {
  return esc(v).replace(/\n/g, '<br>');
}

function badge(text, type = 'info') {
  return `<span class="badge ${type}">${esc(text ?? '—')}</span>`;
}

function scoreClass(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'mid';
  if (n >= 3.5) return 'high';
  if (n >= 2.5) return 'mid';
  return 'low';
}

function ratingBadge(r) {
  const map = {
    Good: 'good',
    'Needs Improvement': 'warn',
    Poor: 'bad',
    Critical: 'critical',
    'Need improvments': 'warn'
  };
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
          <div><h1>${title}</h1><p>${sub || ''}</p></div>
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

function getBarColorByKpiScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'rgba(88, 113, 145, 0.65)';
  if (n >= 3.5) return '#1fbe7a';
  if (n >= 2.5) return '#f1b84b';
  return '#ff5d7a';
}

function getBarColorByPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'rgba(88, 113, 145, 0.65)';
  if (n >= 75) return '#1fbe7a';
  if (n >= 65) return '#7da9ff';
  if (n >= 50) return '#f1b84b';
  return '#ff5d7a';
}

const insideBarLabelPlugin = {
  id: 'insideBarLabelPlugin',
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx } = chart;
    const rotate = pluginOptions?.rotate ?? 0;
    const color = pluginOptions?.color ?? '#ffffff';
    const formatter = pluginOptions?.formatter || ((value) => value);

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta || meta.hidden) return;

      meta.data.forEach((bar, index) => {
        const rawValue = dataset.data[index];
        const value = Number(rawValue);
        if (!Number.isFinite(value)) return;

        const props = bar.getProps(['x', 'y', 'base'], true);
        const centerX = props.x;
        const centerY = props.y + (props.base - props.y) / 2;
        const label = formatter(value, index, datasetIndex);

        ctx.save();
        ctx.fillStyle = color;
        ctx.font = 'bold 11px Inter, Segoe UI, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(centerX, centerY);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });
    });
  }
};

if (typeof Chart !== 'undefined') {
  Chart.register(insideBarLabelPlugin);
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
  const avgRaw = inspections.reduce((a, r) => a + (Number(r['Raw_Score_%']) || Number(r.Raw_Score_Pct) || 0), 0) / Math.max(inspections.length, 1);
  const monthRows = inspections.filter(r => r.Month === data.meta.selectedMonth);
  const monthAvg = monthRows.reduce((a, r) => a + (Number(r['Raw_Score_%']) || Number(r.Raw_Score_Pct) || 0), 0) / Math.max(monthRows.length, 1);
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
      <div class="card chart-card" style="height:420px;">
        <h2>Cluster Performance</h2>
        <div style="position:relative;height:320px;width:100%;"><canvas id="clusterChart"></canvas></div>
      </div>
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

  renderTable(document.getElementById('latestTable'), ['Date', 'Cluster', 'Area / Villa', 'Main Activity', 'Raw Score', 'Red Flag', 'Rating'], inspections.slice().sort((a, b) => String(b.Inspection_Date).localeCompare(String(a.Inspection_Date))).slice(0, 20).map(r => [esc(r.Inspection_Date), esc(r.Cluster), esc(r.Area_or_Villa), esc(r.Main_High_Risk_Activity), pct(Number(r['Raw_Score_%']) || Number(r.Raw_Score_Pct)), redFlagBadge(r.Critical_Red_Flag), ratingBadge(r.Rating_Band)]));

  renderTable(document.getElementById('openOverdueTable'), ['Cluster', 'Open Actions', 'Overdue Actions'], openVsOverdue.map(r => [esc(r.cluster), badge(r.open, r.open > 0 ? 'warn' : 'good'), badge(r.overdue, r.overdue > 0 ? 'critical' : 'good')]));

  const heatmapMap = new Map((data.heatmap || []).map(r => [r.cluster, r]));
  const weeklyMap = new Map((data.weeklyDashboard?.clusters || []).map(r => [r.cluster, r]));
  const monthlyMap = new Map((data.monthlyDashboard?.clusters || []).map(r => [r.cluster, r]));
  renderTable(document.getElementById('redFlagMatrix'), ['Cluster', 'Week Red Flags', 'Month Red Flags', 'Week Inspections', 'Month Inspections', ...kpis.map(k => k.label)], (data.meta?.clusters || []).map(cluster => {
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
  }));

  const clusterLabels = (data.weeklyDashboard?.clusters || []).map(cu => cu.cluster);
  const weekClusterValues = (data.weeklyDashboard?.clusters || []).map(cu => Number.isFinite(Number(cu.weekAvgRawPct)) ? Number(cu.weekAvgRawPct) * 100 : null);
  const monthClusterValues = (data.weeklyDashboard?.clusters || []).map(cu => Number.isFinite(Number(cu.monthAvgRawPct)) ? Number(cu.monthAvgRawPct) * 100 : null);

  new Chart(document.getElementById('clusterChart'), {
    type: 'bar',
    data: {
      labels: clusterLabels,
      datasets: [
        { label: 'Week Avg %', data: weekClusterValues, backgroundColor: weekClusterValues.map(getBarColorByPct), borderColor: weekClusterValues.map(getBarColorByPct), borderWidth: 1, categoryPercentage: 0.72, barPercentage: 0.88 },
        { label: 'Month Avg %', data: monthClusterValues, backgroundColor: monthClusterValues.map(getBarColorByPct), borderColor: monthClusterValues.map(getBarColorByPct), borderWidth: 1, categoryPercentage: 0.72, barPercentage: 0.88 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { labels: { color: '#dce9f7' } },
        insideBarLabelPlugin: { rotate: -90, color: '#ffffff', formatter: (value) => `${Number(value).toFixed(1)}%` }
      },
      scales: {
        x: { ticks: { color: '#bfd2e9', maxRotation: 35, minRotation: 35, autoSkip: false }, grid: { display: false } },
        y: { beginAtZero: true, max: 100, ticks: { color: '#bfd2e9' }, grid: { color: 'rgba(191,210,233,0.08)' } }
      }
    }
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
    options: { ...baseChartOptions(), scales: { x: { ticks: { color: '#bfd2e9', maxRotation: 0, minRotation: 0 } }, y: { beginAtZero: true, suggestedMax: 5, ticks: { color: '#bfd2e9' } } } }
  });

  new Chart(document.getElementById('redFlagChart'), {
    type: 'bar',
    data: { labels: redFlagData.labels, datasets: [{ label: 'Weekly Red Flags', data: redFlagData.week }, { label: 'Monthly Red Flags', data: redFlagData.month }] },
    options: { ...baseChartOptions(), indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { color: '#bfd2e9', precision: 0 } }, y: { ticks: { color: '#bfd2e9' } } } }
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
      esc(r.Inspection_Date), esc(r.Week_No), esc(r.Package), esc(r.Cluster), esc(r.Area_or_Villa), esc(r.Main_High_Risk_Activity), esc(r.Stop_Work || '—'), num(r.Work_at_Height), num(r.Edge_Protection), num(r.Falling_Object_Prevention), esc(r.Excavation_Safety), num(r.Scaffolding_Compliance), num(r.PTW_Implementation), num(r.PTW_Field_Verification), num(r.MSRA_Quality), num(r['Lifting/Precast Installation'] ?? r['Lifting_Precast_Installation']), num(r.Traffic_Interface), num(r['Housekeeping/Waste Management'] ?? r['Housekeeping_Waste_Management']), num(r['Welfare Arrangement'] ?? r['Welfare_Arrangement']), num(r.Fire_Readiness), num(r.Supervision_Subcontractor), num(r.Electrical_Tool_Safety), pct(Number(r['Raw_Score_%']) || Number(r.Raw_Score_Pct)), redFlagBadge(r.Critical_Red_Flag), ratingBadge(r.Rating_Band), esc(r.Likely_Root_Cause), `<div class="pre">${nl(r.Top_3_Gaps_Observed)}</div>`, `<div class="pre">${nl(r.Immediate_Action_Taken)}</div>`, `<div class="pre">${nl(r.Preventive_Action_Required)}</div>`
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
  renderTable(document.getElementById('capaTable'), ['Action ID', 'Date Raised', 'Cluster', 'Package', 'KPI Area', 'Root Cause', 'Finding', 'Immediate Action', 'Preventive Action', 'Owner', 'Target', 'Overdue'], (data.capa || []).map(r => [esc(r.Action_ID), esc(r.Date_Raised), esc(r.Cluster), esc(r.Package), esc(r.KPI_Area), esc(r.Root_Cause), `<div class="pre">${nl(r.Finding)}</div>`, `<div class="pre">${nl(r.Immediate_Action)}</div>`, `<div class="pre">${nl(r.Preventive_Action)}</div>`, esc(r.Action_Owner), esc(r.Target_Date), String(r.Overdue_Flag).toUpperCase() === 'YES' ? badge('Overdue', 'critical') : badge('On time', 'good')]));
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
  renderTable(document.getElementById('gapTable'), ['KPI', 'Week Avg', 'Month Avg', 'Week Gap to 5', 'Month Gap to 5', 'Focus'], (data.gapAnalysis?.kpis || []).map(k => [esc(k.label), num(k.weekAvg), num(k.monthAvg), num(k.weekGapTo5), num(k.monthGapTo5), (k.monthGapTo5 >= 2 ? badge('Immediate attention', 'critical') : badge('Monitor', 'warn'))]));
  renderTable(document.getElementById('rootTable'), ['Root Cause', 'Count'], (data.gapAnalysis?.rootCauses || []).map(r => [esc(r.rootCause), esc(r.count)]));
  new Chart(document.getElementById('gapChart'), { type: 'bar', data: { labels: (data.gapAnalysis?.kpis || []).map(k => k.label), datasets: [{ label: 'Month Gap to 5', data: (data.gapAnalysis?.kpis || []).map(k => k.monthGapTo5) }] }, options: { ...baseChartOptions(), scales: { x: { ticks: { color: '#bfd2e9' } }, y: { beginAtZero: true, ticks: { color: '#bfd2e9' } } } } });
  new Chart(document.getElementById('rootChart'), { type: 'doughnut', data: { labels: (data.gapAnalysis?.rootCauses || []).map(r => r.rootCause), datasets: [{ data: (data.gapAnalysis?.rootCauses || []).map(r => r.count) }] }, options: baseChartOptions() });
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

function normalizeClusterName(name) {
  return String(name || '').trim();
}

function getWeekValue(row) {
  const candidates = [row?.['Weighted_Score_%'], row?.Weighted_Score_Pct, row?.weekAvgWeightedPct, row?.weekAvgRawPct, row?.['Raw_Score_%'], row?.Raw_Score_Pct];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getMonthValue(row) {
  const candidates = [row?.['Weighted_Score_%'], row?.Weighted_Score_Pct, row?.monthAvgWeightedPct, row?.monthAvgRawPct];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getKpiFieldMap() {
  return {
    wah: ['Work_at_Height'],
    edge: ['Edge_Protection'],
    falling: ['Falling_Object_Prevention'],
    excavation: ['Excavation_Safety'],
    scaffold: ['Scaffolding_Compliance'],
    ptw: ['PTW_Implementation'],
    ptwv: ['PTW_Field_Verification'],
    msra: ['MSRA_Quality'],
    lifting: ['Lifting/Precast Installation', 'Lifting_Precast_Installation'],
    traffic: ['Traffic_Interface'],
    housekeeping: ['Housekeeping/Waste Management', 'Housekeeping_Waste_Management'],
    welfare: ['Welfare Arrangement', 'Welfare_Arrangement'],
    fire: ['Fire_Readiness'],
    supervision: ['Supervision_Subcontractor'],
    electrical: ['Electrical_Tool_Safety']
  };
}

function getKpiDefinitions() {
  return [
    { key: 'wah', label: 'WAH' },
    { key: 'edge', label: 'Edge' },
    { key: 'falling', label: 'Falling' },
    { key: 'excavation', label: 'Excavation' },
    { key: 'scaffold', label: 'Scaffold' },
    { key: 'ptw', label: 'PTW' },
    { key: 'ptwv', label: 'PTW Verify' },
    { key: 'msra', label: 'MSRA' },
    { key: 'lifting', label: 'Lifting' },
    { key: 'traffic', label: 'Traffic' },
    { key: 'housekeeping', label: 'Housekeeping' },
    { key: 'welfare', label: 'Welfare' },
    { key: 'fire', label: 'Fire' },
    { key: 'supervision', label: 'Supervision' },
    { key: 'electrical', label: 'Electrical' }
  ];
}

function extractMetric(row, fields) {
  for (const field of fields) {
    const raw = row?.[field];
    if (raw === null || raw === undefined || raw === '') continue;
    const text = String(raw).trim().toUpperCase();
    if (text === 'NA' || text === 'N/A' || text === '#VALUE!') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function average(values) {
  const nums = values.filter(v => Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function getScoreBandFromPct(scorePct) {
  const n = Number(scorePct);
  if (!Number.isFinite(n)) return { label: 'No Data', cls: 'info' };
  if (n >= 75) return { label: 'Very Good', cls: 'good' };
  if (n >= 65) return { label: 'Good', cls: 'info' };
  if (n >= 50) return { label: 'Average', cls: 'warn' };
  return { label: 'Unacceptable', cls: 'critical' };
}

function buildClusterPerformance(data) {
  const selectedWeek = data.meta?.selectedWeek;
  const selectedMonth = data.meta?.selectedMonth;
  const c = shell('cluster-performance.html', 'Cluster Performance', `Week ${selectedWeek} vs Month ${selectedMonth}`);

  const allInspections = Array.isArray(data.weeklyInspections) ? data.weeklyInspections : [];
  const kpiDefs = getKpiDefinitions();
  const kpiFieldMap = getKpiFieldMap();
  const filteredWeekRows = allInspections.filter(r => Number(r.Week_No) === Number(selectedWeek));
  const filteredMonthRows = allInspections.filter(r => String(r.Month) === String(selectedMonth));
  const clusterNames = [...new Set([...filteredWeekRows, ...filteredMonthRows].map(r => normalizeClusterName(r.Cluster)).filter(Boolean))];

  const weeklyMap = new Map((data.weeklyDashboard?.clusters || []).map(r => [normalizeClusterName(r.cluster), r]));
  const monthlyMap = new Map((data.monthlyDashboard?.clusters || []).map(r => [normalizeClusterName(r.cluster), r]));

  function buildClusterStats(clusterName) {
    const weekRows = filteredWeekRows.filter(r => normalizeClusterName(r.Cluster) === clusterName);
    const monthRows = filteredMonthRows.filter(r => normalizeClusterName(r.Cluster) === clusterName);
    const weekScoreRaw = average(weekRows.map(getWeekValue));
    const monthScoreRaw = average(monthRows.map(r => getMonthValue(r) ?? getWeekValue(r)));
    const weekScorePct = weekScoreRaw !== null ? weekScoreRaw * 100 : pctNum(weeklyMap.get(clusterName)?.weekAvgRawPct);
    const monthScorePct = monthScoreRaw !== null ? monthScoreRaw * 100 : pctNum(monthlyMap.get(clusterName)?.monthAvgRawPct);
    const weekFlags = weekRows.filter(r => String(r.Critical_Red_Flag).toUpperCase() === 'YES').length;
    const monthFlags = monthRows.filter(r => String(r.Critical_Red_Flag).toUpperCase() === 'YES').length;
    const weekKpis = kpiDefs.map(def => average(weekRows.map(r => extractMetric(r, kpiFieldMap[def.key]))));
    const monthKpis = kpiDefs.map(def => average(monthRows.map(r => extractMetric(r, kpiFieldMap[def.key]))));
    return { cluster: clusterName, weekScorePct, monthScorePct, weekFlags, monthFlags, weekInspections: weekRows.length, monthInspections: monthRows.length, weekBand: getScoreBandFromPct(weekScorePct), monthBand: getScoreBandFromPct(monthScorePct), weekKpis, monthKpis };
  }

  const clusters = clusterNames.map(buildClusterStats).sort((a, b) => {
    const aw = Number.isFinite(a.weekScorePct) ? a.weekScorePct : -1;
    const bw = Number.isFinite(b.weekScorePct) ? b.weekScorePct : -1;
    return bw - aw || a.cluster.localeCompare(b.cluster);
  });

  const weekBest = clusters[0]?.cluster || '—';
  const weekLowest = [...clusters].reverse().find(x => Number.isFinite(x.weekScorePct))?.cluster || '—';
  const weekRedFlags = clusters.reduce((s, x) => s + x.weekFlags, 0);
  const monthRedFlags = clusters.reduce((s, x) => s + x.monthFlags, 0);

  c.innerHTML += `
    <div class="section grid cards">
      <div class="card"><h3>Clusters Assessed</h3><div class="metric">${clusters.length}</div></div>
      <div class="card"><h3>Week Best</h3><div class="metric">${esc(weekBest)}</div></div>
      <div class="card"><h3>Week Lowest</h3><div class="metric">${esc(weekLowest)}</div></div>
      <div class="card"><h3>Week Red Flags</h3><div class="metric">${weekRedFlags}</div></div>
      <div class="card"><h3>Month Red Flags</h3><div class="metric">${monthRedFlags}</div></div>
      <div class="card"><h3>Selected Week</h3><div class="metric">${esc(selectedWeek)}</div></div>
    </div>

    <div class="section grid two-col">
      <div class="card chart-card" style="height:420px;"><h2>Week Score Comparison</h2><div style="position:relative;height:320px;width:100%;"><canvas id="weekClusterScoreChart"></canvas></div></div>
      <div class="card chart-card" style="height:420px;"><h2>Month Score Comparison</h2><div style="position:relative;height:320px;width:100%;"><canvas id="monthClusterScoreChart"></canvas></div></div>
    </div>

    <div class="section">
      <div class="card"><h2>Cluster Ranking Summary</h2><div id="clusterRankingTable"></div></div>
    </div>

    <div id="clusterCardsWrap" class="section"></div>
  `;

  renderTable(document.getElementById('clusterRankingTable'), ['Rank', 'Cluster', 'Week Score', 'Week Band', 'Week Flags', 'Month Score', 'Month Band', 'Month Flags'], clusters.map((row, idx) => [badge(idx + 1, 'info'), `<b>${esc(row.cluster)}</b>`, esc(Number.isFinite(row.weekScorePct) ? `${row.weekScorePct.toFixed(1)}%` : '—'), badge(row.weekBand.label, row.weekBand.cls), badge(row.weekFlags, row.weekFlags > 0 ? 'critical' : 'good'), esc(Number.isFinite(row.monthScorePct) ? `${row.monthScorePct.toFixed(1)}%` : '—'), badge(row.monthBand.label, row.monthBand.cls), badge(row.monthFlags, row.monthFlags > 0 ? 'critical' : 'good')]));

  const labels = clusters.map(r => r.cluster);
  const weekValues = clusters.map(r => Number.isFinite(r.weekScorePct) ? r.weekScorePct : null);
  const monthValues = clusters.map(r => Number.isFinite(r.monthScorePct) ? r.monthScorePct : null);

  new Chart(document.getElementById('weekClusterScoreChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Week Score %', data: weekValues, backgroundColor: weekValues.map(getBarColorByPct), borderColor: weekValues.map(getBarColorByPct), borderWidth: 1, categoryPercentage: 0.72, barPercentage: 0.88 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { labels: { color: '#dce9f7' } }, insideBarLabelPlugin: { rotate: -90, color: '#ffffff', formatter: (value) => `${Number(value).toFixed(1)}%` } }, scales: { x: { ticks: { color: '#bfd2e9', maxRotation: 35, minRotation: 35, autoSkip: false }, grid: { display: false } }, y: { beginAtZero: true, max: 100, ticks: { color: '#bfd2e9' }, grid: { color: 'rgba(191,210,233,0.08)' } } } }
  });

  new Chart(document.getElementById('monthClusterScoreChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Month Score %', data: monthValues, backgroundColor: monthValues.map(getBarColorByPct), borderColor: monthValues.map(getBarColorByPct), borderWidth: 1, categoryPercentage: 0.72, barPercentage: 0.88 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { labels: { color: '#dce9f7' } }, insideBarLabelPlugin: { rotate: -90, color: '#ffffff', formatter: (value) => `${Number(value).toFixed(1)}%` } }, scales: { x: { ticks: { color: '#bfd2e9', maxRotation: 35, minRotation: 35, autoSkip: false }, grid: { display: false } }, y: { beginAtZero: true, max: 100, ticks: { color: '#bfd2e9' }, grid: { color: 'rgba(191,210,233,0.08)' } } } }
  });

  const cardsWrap = document.getElementById('clusterCardsWrap');
  let cardsHtml = '';
  clusters.forEach((cluster, index) => {
    const cardId = `clusterChart_${index}`;
    cardsHtml += `
      <div class="card section">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
          <div>
            <h2 style="margin:0 0 6px 0;">${esc(cluster.cluster)}</h2>
            <div class="small">Week ${selectedWeek} vs Month ${esc(selectedMonth)}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${badge(`Week ${cluster.weekBand.label}`, cluster.weekBand.cls)}
            ${badge(`Month ${cluster.monthBand.label}`, cluster.monthBand.cls)}
            ${badge(`Week ${cluster.weekFlags > 0 ? 'Flagged' : 'Clear'}`, cluster.weekFlags > 0 ? 'critical' : 'good')}
            ${badge(`Month ${cluster.monthFlags > 0 ? 'Flagged' : 'Clear'}`, cluster.monthFlags > 0 ? 'critical' : 'good')}
          </div>
        </div>
        <div class="section grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;">
          <div class="card" style="padding:14px;"><div class="small">Week Score</div><div class="metric">${Number.isFinite(cluster.weekScorePct) ? cluster.weekScorePct.toFixed(1) : '—'}%</div></div>
          <div class="card" style="padding:14px;"><div class="small">Month Score</div><div class="metric">${Number.isFinite(cluster.monthScorePct) ? cluster.monthScorePct.toFixed(1) : '—'}%</div></div>
          <div class="card" style="padding:14px;"><div class="small">Week Inspections</div><div class="metric">${cluster.weekInspections}</div></div>
          <div class="card" style="padding:14px;"><div class="small">Month Inspections</div><div class="metric">${cluster.monthInspections}</div></div>
        </div>
        <div class="section chart-card" style="height:420px;position:relative;">
          <h3 style="margin:0 0 12px 0;">KPI Profile</h3>
          <div style="position:relative;height:340px;width:100%;"><canvas id="${cardId}"></canvas></div>
        </div>
      </div>
    `;
  });
  cardsWrap.innerHTML = cardsHtml;

  clusters.forEach((cluster, index) => {
    const cardId = `clusterChart_${index}`;
    const canvas = document.getElementById(cardId);
    if (!canvas) return;
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: kpiDefs.map(k => k.label),
        datasets: [
          { label: 'Week', data: cluster.weekKpis.map(v => Number.isFinite(Number(v)) ? Number(v) : null), backgroundColor: cluster.weekKpis.map(getBarColorByKpiScore), borderColor: cluster.weekKpis.map(getBarColorByKpiScore), borderWidth: 1, categoryPercentage: 0.72, barPercentage: 0.88 },
          { label: 'Month', data: cluster.monthKpis.map(v => Number.isFinite(Number(v)) ? Number(v) : null), backgroundColor: cluster.monthKpis.map(getBarColorByKpiScore), borderColor: cluster.monthKpis.map(getBarColorByKpiScore), borderWidth: 1, categoryPercentage: 0.72, barPercentage: 0.88 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { top: 10, right: 10, bottom: 10, left: 10 } },
        plugins: { legend: { labels: { color: '#dce9f7' } }, insideBarLabelPlugin: { rotate: -90, color: '#ffffff', formatter: (value) => Number(value).toFixed(1) } },
        scales: {
          x: { ticks: { color: '#bfd2e9', maxRotation: 90, minRotation: 90, autoSkip: false }, grid: { display: false } },
          y: { beginAtZero: true, max: 5, ticks: { color: '#bfd2e9', stepSize: 0.5 }, grid: { color: 'rgba(191,210,233,0.08)' } }
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
            <div class="pre">/assets/styles.css\n/scripts/app.js\n/data/site-data.json</div>
            <p class="small">${esc(err.message || 'Unknown error')}</p>
          </div>
        </div>`;
    }
  }
})();
