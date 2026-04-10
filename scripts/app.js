
const DATA_PATH = 'data/site-data.json';

async function loadData() {
  const res = await fetch(DATA_PATH, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load ${DATA_PATH}: ${res.status}`);
  }
  return await res.json();
}

function pct(v) {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—';
  return `${(Number(v) * 100).toFixed(1)}%`;
}

function num(v, d = 1) {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(d);
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
  if (v === null || v === undefined || v === '') return 'mid';
  const n = Number(v);
  if (n >= 3.5) return 'high';
  if (n >= 2.5) return 'mid';
  return 'low';
}

function ratingBadge(r) {
  const map = { Good: 'good', 'Needs Improvement': 'warn', Poor: 'bad', Critical: 'critical' };
  return badge(r || '—', map[r] || 'info');
}

function redFlagBadge(v) {
  return String(v).toUpperCase() === 'YES' ? badge('Red Flag', 'critical') : badge('No', 'good');
}

function nav(active) {
  const items = [
    ['index.html', 'Dashboard'],
    ['inspections.html', 'Weekly Inspections'],
    ['capa.html', 'CAPA'],
    ['gap-analysis.html', 'Gap Analysis'],
    ['schedules.html', 'Schedules'],
    ['raw-data.html', 'All Sheets']
  ];

  return `
    <div class="topbar">
      <div class="container">
        <div class="nav">
          <div class="brand">Saadiyat Lagoons HSE<small>Executive performance dashboard</small></div>
          ${items.map(([href, label]) => `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function shell(active, title, periodText = '') {
  const existingTopbar = document.querySelector('.topbar');
  if (existingTopbar) existingTopbar.remove();

  document.body.insertAdjacentHTML('afterbegin', nav(active));

  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="container">
      <div class="hero">
        <div class="page-title">
          <div>
            <h1>${title}</h1>
            ${periodText ? `<p>${periodText}</p>` : ``}
          </div>
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
        <thead>
          <tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCombinedRedFlagHeatmap(data) {
  const kpis = data.gapAnalysis?.kpis || [];
  const heatmapRows = data.heatmap || [];
  const container = document.getElementById('redFlagMatrix');

  const monthlyMap = new Map((data.monthlyDashboard?.clusters || []).map(r => [r.cluster, r]));
  const weeklyMap = new Map((data.weeklyDashboard?.clusters || []).map(r => [r.cluster, r]));

  container.innerHTML = `
    <div class="table-wrap">
      <table class="heat">
        <thead>
          <tr>
            <th rowspan="2">Cluster</th>
            <th colspan="4">Red Flag Summary</th>
            <th colspan="${kpis.length}">Heatmap</th>
          </tr>
          <tr>
            <th>Week Red Flags</th>
            <th>Month Red Flags</th>
            <th>Week Inspections</th>
            <th>Month Inspections</th>
            ${kpis.map(k => `<th>${esc(k.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${heatmapRows.map(r => {
            const w = weeklyMap.get(r.cluster) || {};
            const m = monthlyMap.get(r.cluster) || {};
            return `
              <tr>
                <td><b>${esc(r.cluster)}</b></td>
                <td>${badge(Number(w.redFlagsWeek || 0), Number(w.redFlagsWeek || 0) > 0 ? 'critical' : 'good')}</td>
                <td>${badge(Number(m.redFlagsMonth || 0), Number(m.redFlagsMonth || 0) > 0 ? 'critical' : 'good')}</td>
                <td>${badge(Number(w.inspectionCountWeek || 0), 'info')}</td>
                <td>${badge(Number(m.inspectionCountMonth || 0), 'info')}</td>
                ${kpis.map(k => {
                  const v = r[k.field];
                  return `<td><span class="score ${scoreClass(v)}">${v === null || v === undefined ? '—' : Number(v).toFixed(1)}</span></td>`;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { labels: { color: '#dce9f7' } }
    }
  };
}

function buildOpenVsOverdueDataset(data) {
  const clustersFromMeta = Array.isArray(data.meta?.clusters) ? data.meta.clusters : [];
  const capaRows = Array.isArray(data.capa) ? data.capa : [];
  const map = new Map();

  clustersFromMeta.forEach(cluster => map.set(cluster, { cluster, open: 0, overdue: 0 }));

  capaRows.forEach(row => {
    const cluster = row.Cluster || 'Unknown';
    if (!map.has(cluster)) map.set(cluster, { cluster, open: 0, overdue: 0 });
    if (String(row.Status || '').toLowerCase() !== 'closed') {
      map.get(cluster).open += 1;
    }
    if (String(row.Overdue_Flag || '').toUpperCase() === 'YES') {
      map.get(cluster).overdue += 1;
    }
  });

  return Array.from(map.values()).sort((a, b) => (b.open + b.overdue) - (a.open + a.overdue) || a.cluster.localeCompare(b.cluster));
}

function buildRedFlagDatasets(data) {
  const monthly = (data.monthlyDashboard?.clusters || []).map(c => ({ cluster: c.cluster, value: Number(c.redFlagsMonth || 0) }));
  const weekly = (data.weeklyDashboard?.clusters || []).map(c => ({ cluster: c.cluster, value: Number(c.redFlagsWeek || 0) }));
  const sortFn = (a, b) => b.value - a.value || a.cluster.localeCompare(b.cluster);
  monthly.sort(sortFn);
  weekly.sort(sortFn);
  return { monthly, weekly };
}

function buildDashboard(data) {
  const c = shell(
    'index.html',
    'HSE Dashboard',
    `Week ${data.meta.selectedWeek} · ${data.meta.selectedMonth} · ${data.meta.inspectionCount} Inspections`
  );

  const inspections = Array.isArray(data.weeklyInspections) ? data.weeklyInspections : [];
  const capaRows = Array.isArray(data.capa) ? data.capa : [];
  const avgRaw = inspections.reduce((a, r) => a + (Number(r.Raw_Score_Pct) || 0), 0) / Math.max(inspections.length, 1);
  const monthRows = inspections.filter(r => r.Month === data.meta.selectedMonth);
  const monthAvg = monthRows.reduce((a, r) => a + (Number(r.Raw_Score_Pct) || 0), 0) / Math.max(monthRows.length, 1);
  const redFlags = inspections.filter(r => String(r.Critical_Red_Flag).toUpperCase() === 'YES').length;
  const redFlagData = buildRedFlagDatasets(data);
  const openVsOverdue = buildOpenVsOverdueDataset(data);

  c.innerHTML += `
    <div class="section grid cards">
      <div class="card"><h3>Total Inspections</h3><div class="metric">${data.meta.inspectionCount}</div></div>
      <div class="card"><h3>Month Average</h3><div class="metric">${pct(monthAvg)}</div></div>
      <div class="card"><h3>Overall Average</h3><div class="metric">${pct(avgRaw)}</div></div>
      <div class="card"><h3>Critical Red Flags</h3><div class="metric">${redFlags}</div></div>
      <div class="card"><h3>Open Actions</h3><div class="metric">${capaRows.filter(x => String(x.Status || '').toLowerCase() !== 'closed').length}</div></div>
      <div class="card"><h3>Overdue Actions</h3><div class="metric">${capaRows.filter(x => String(x.Overdue_Flag).toUpperCase() === 'YES').length}</div></div>
    </div>

    <div class="section grid two-col">
      <div class="card chart-card"><h2>Cluster Performance</h2><canvas id="clusterChart"></canvas></div>
      <div class="card chart-card"><h2>KPI Comparison</h2><canvas id="kpiChart"></canvas></div>
    </div>

    <div class="section grid two-col">
      <div class="card chart-card"><h2>Weekly Red Flags</h2><canvas id="weekRedFlagChart"></canvas></div>
      <div class="card chart-card"><h2>Monthly Red Flags</h2><canvas id="monthRedFlagChart"></canvas></div>
    </div>

    <div class="section">
      <div class="card chart-card"><h2>Open vs Overdue Actions</h2><canvas id="openVsOverdueChart"></canvas></div>
    </div>

    <div class="section">
      <div class="card"><h2>Red Flag Summary and Heatmap</h2><div id="redFlagMatrix"></div></div>
    </div>

    <div class="section">
      <div class="card"><h2>Latest Inspections</h2><div id="latestTable"></div></div>
    </div>
  `;

  renderCombinedRedFlagHeatmap(data);

  renderTable(
    document.getElementById('latestTable'),
    ['Date', 'Cluster', 'Area / Villa', 'Main Activity', 'Raw Score', 'Red Flag', 'Rating'],
    inspections
      .slice()
      .sort((a, b) => String(b.Inspection_Date).localeCompare(String(a.Inspection_Date)))
      .slice(0, 20)
      .map(r => [
        esc(r.Inspection_Date),
        esc(r.Cluster),
        esc(r.Area_or_Villa),
        esc(r.Main_High_Risk_Activity),
        pct(r.Raw_Score_Pct),
        redFlagBadge(r.Critical_Red_Flag),
        ratingBadge(r.Rating_Band)
      ])
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
    options: {
      ...baseChartOptions(),
      scales: {
        x: { ticks: { color: '#bfd2e9' } },
        y: { beginAtZero: true, ticks: { color: '#bfd2e9' } }
      }
    }
  });

  new Chart(document.getElementById('kpiChart'), {
    type: 'radar',
    data: {
      labels: (data.gapAnalysis?.kpis || []).map(k => k.label),
      datasets: [
        { label: 'Week', data: (data.gapAnalysis?.kpis || []).map(k => k.weekAvg) },
        { label: 'Month', data: (data.gapAnalysis?.kpis || []).map(k => k.monthAvg) }
      ]
    },
    options: {
      ...baseChartOptions(),
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,.14)' },
          grid: { color: 'rgba(255,255,255,.14)' },
          pointLabels: { color: '#bfd2e9' },
          ticks: { display: false },
          suggestedMin: 0,
          suggestedMax: 5
        }
      }
    }
  });

  new Chart(document.getElementById('weekRedFlagChart'), {
    type: 'bar',
    data: {
      labels: redFlagData.weekly.map(r => r.cluster),
      datasets: [{ label: 'Weekly Red Flags', data: redFlagData.weekly.map(r => r.value) }]
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

  new Chart(document.getElementById('monthRedFlagChart'), {
    type: 'bar',
    data: {
      labels: redFlagData.monthly.map(r => r.cluster),
      datasets: [{ label: 'Monthly Red Flags', data: redFlagData.monthly.map(r => r.value) }]
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

  new Chart(document.getElementById('openVsOverdueChart'), {
    type: 'bar',
    data: {
      labels: openVsOverdue.map(r => r.cluster),
      datasets: [
        { label: 'Open Actions', data: openVsOverdue.map(r => r.open) },
        { label: 'Overdue Actions', data: openVsOverdue.map(r => r.overdue) }
      ]
    },
    options: {
      ...baseChartOptions(),
      scales: {
        x: { ticks: { color: '#bfd2e9' } },
        y: { beginAtZero: true, ticks: { color: '#bfd2e9', precision: 0 } }
      }
    }
  });
}

function buildInspections(data) {
  const c = shell('inspections.html', 'Weekly Inspections');
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
      num(r.Work_at_Height), num(r.Edge_Protection), num(r.Falling_Object_Prevention), num(r.Excavation_Safety), num(r.Scaffolding_Compliance),
      num(r.PTW_Implementation), num(r.PTW_Field_Verification), num(r.MSRA_Quality), num(r.Lifting_Precast_Installation), num(r.Traffic_Interface),
      num(r.Housekeeping_Waste_Management), num(r.Welfare_Arrangement), num(r.Fire_Readiness), num(r.Supervision_Subcontractor), num(r.Electrical_Tool_Safety),
      pct(r.Raw_Score_Pct), redFlagBadge(r.Critical_Red_Flag), ratingBadge(r.Rating_Band), esc(r.Likely_Root_Cause),
      `<div class="pre">${nl(r.Top_3_Gaps_Observed)}</div>`,
      `<div class="pre">${nl(r.Immediate_Action_Taken)}</div>`,
      `<div class="pre">${nl(r.Preventive_Action_Required)}</div>`
    ]);

    holder.innerHTML = '';
    renderTable(holder, headers, rows);
  }

  draw();
  ['q', 'clusterFilter', 'redFlagFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', draw);
  });
}

function buildCapa(data) {
  const c = shell('capa.html', 'CAPA Tracking');
  c.innerHTML += `<div class="card"><div id="capaTable"></div></div>`;
  renderTable(
    document.getElementById('capaTable'),
    ['Action ID', 'Date Raised', 'Cluster', 'Package', 'KPI Area', 'Root Cause', 'Finding', 'Immediate Action', 'Preventive Action', 'Owner', 'Target', 'Status', 'Overdue'],
    (data.capa || []).map(r => [
      esc(r.Action_ID), esc(r.Date_Raised), esc(r.Cluster), esc(r.Package), esc(r.KPI_Area), esc(r.Root_Cause),
      `<div class="pre">${nl(r.Finding)}</div>`,
      `<div class="pre">${nl(r.Immediate_Action)}</div>`,
      `<div class="pre">${nl(r.Preventive_Action)}</div>`,
      esc(r.Action_Owner), esc(r.Target_Date), esc(r.Status),
      String(r.Overdue_Flag).toUpperCase() === 'YES' ? badge('Overdue', 'critical') : badge('On time', 'good')
    ])
  );
}

function buildGap(data) {
  const c = shell('gap-analysis.html', 'Gap Analysis');
  c.innerHTML += `
    <div class="section grid two-col">
      <div class="card chart-card"><h2>Gap to 5 by KPI</h2><canvas id="gapChart"></canvas></div>
      <div class="card chart-card"><h2>Root Cause Frequency</h2><canvas id="rootChart"></canvas></div>
    </div>
    <div class="section"><div class="card"><div id="gapTable"></div></div></div>
    <div class="section"><div class="card"><div id="rootTable"></div></div></div>
  `;

  renderTable(
    document.getElementById('gapTable'),
    ['KPI', 'Week Avg', 'Month Avg', 'Week Gap to 5', 'Month Gap to 5', 'Focus'],
    (data.gapAnalysis?.kpis || []).map(k => [
      esc(k.label), num(k.weekAvg), num(k.monthAvg), num(k.weekGapTo5), num(k.monthGapTo5),
      (k.monthGapTo5 >= 2 ? badge('Immediate attention', 'critical') : badge('Monitor', 'warn'))
    ])
  );

  renderTable(
    document.getElementById('rootTable'),
    ['Root Cause', 'Count'],
    (data.gapAnalysis?.rootCauses || []).map(r => [esc(r.rootCause), esc(r.count)])
  );

  new Chart(document.getElementById('gapChart'), {
    type: 'bar',
    data: {
      labels: (data.gapAnalysis?.kpis || []).map(k => k.label),
      datasets: [{ label: 'Month Gap to 5', data: (data.gapAnalysis?.kpis || []).map(k => k.monthGapTo5) }]
    },
    options: {
      ...baseChartOptions(),
      scales: {
        x: { ticks: { color: '#bfd2e9' } },
        y: { beginAtZero: true, ticks: { color: '#bfd2e9' } }
      }
    }
  });

  new Chart(document.getElementById('rootChart'), {
    type: 'doughnut',
    data: {
      labels: (data.gapAnalysis?.rootCauses || []).map(r => r.rootCause),
      datasets: [{ data: (data.gapAnalysis?.rootCauses || []).map(r => r.count) }]
    },
    options: baseChartOptions()
  });
}

function buildSchedules(data) {
  const c = shell('schedules.html', 'Schedules');
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
  const c = shell('raw-data.html', 'All Sheets');
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

function buildErrorPage(err) {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="container">
      <div class="hero">
        <div class="page-title">
          <div>
            <h1>Website Load Error</h1>
            <p>${esc(err.message || String(err))}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

(async function () {
  try {
    const data = await loadData();
    const page = location.pathname.split('/').pop() || 'index.html';

    if (page === 'index.html') buildDashboard(data);
    else if (page === 'inspections.html') buildInspections(data);
    else if (page === 'capa.html') buildCapa(data);
    else if (page === 'gap-analysis.html') buildGap(data);
    else if (page === 'schedules.html') buildSchedules(data);
    else if (page === 'raw-data.html') buildRaw(data);
    else buildDashboard(data);
  } catch (err) {
    console.error(err);
    buildErrorPage(err);
  }
})();
