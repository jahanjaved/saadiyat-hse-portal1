const DATA_PATH = 'data/site-data.json';

async function loadData() {
  const res = await fetch(DATA_PATH, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Unable to load data file: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

function normalizeNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const cleaned = String(value).trim();
  if (!cleaned || cleaned === '#VALUE!' || cleaned.toUpperCase() === 'NA' || cleaned.toLowerCase() === 'na') return fallback;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function pct(v) {
  const n = normalizeNumber(v, null);
  return n === null ? '—' : `${(n * 100).toFixed(1)}%`;
}

function num(v, d = 1) {
  const n = normalizeNumber(v, null);
  return n === null ? '—' : n.toFixed(d);
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
  const n = normalizeNumber(v, null);
  if (n === null) return 'mid';
  if (n >= 3.5) return 'high';
  if (n >= 2.5) return 'mid';
  return 'low';
}

function ratingBadge(r) {
  const normalized = String(r || '').trim();
  const map = {
    Good: 'good',
    'Needs Improvement': 'warn',
    'Need improvments': 'warn',
    Poor: 'bad',
    Critical: 'critical'
  };
  return badge(normalized || '—', map[normalized] || 'info');
}

function redFlagBadge(v) {
  return String(v).toUpperCase() === 'YES' ? badge('Red Flag', 'critical') : badge('No', 'good');
}

function trendBadge(delta) {
  const n = normalizeNumber(delta, 0);
  if (Math.abs(n) < 0.05) return badge('Stable', 'info');
  return n > 0 ? badge(`Up ${n.toFixed(1)}`, 'good') : badge(`Down ${Math.abs(n).toFixed(1)}`, 'warn');
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
          <div>
            <h1>${title}</h1>
            <p>${sub}</p>
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

function buildRedFlagDatasets(data) {
  const clusterSet = new Set([
    ...((data.monthlyDashboard?.clusters || []).map(c => c.cluster)),
    ...((data.weeklyDashboard?.clusters || []).map(c => c.cluster))
  ]);

  const weeklyMap = new Map((data.weeklyDashboard?.clusters || []).map(c => [c.cluster, normalizeNumber(c.redFlagsWeek, 0)]));
  const monthlyMap = new Map((data.monthlyDashboard?.clusters || []).map(c => [c.cluster, normalizeNumber(c.redFlagsMonth, 0)]));
  const weekCountMap = new Map((data.weeklyDashboard?.clusters || []).map(c => [c.cluster, normalizeNumber(c.inspectionCountWeek, 0)]));
  const monthCountMap = new Map((data.monthlyDashboard?.clusters || []).map(c => [c.cluster, normalizeNumber(c.inspectionCountMonth, 0)]));

  const combined = Array.from(clusterSet).map(cluster => ({
    cluster,
    weekly: weeklyMap.get(cluster) ?? 0,
    monthly: monthlyMap.get(cluster) ?? 0,
    weekInspections: weekCountMap.get(cluster) ?? 0,
    monthInspections: monthCountMap.get(cluster) ?? 0
  })).sort((a, b) => (b.monthly + b.weekly) - (a.monthly + a.weekly) || a.cluster.localeCompare(b.cluster));

  return combined;
}

function buildOpenVsOverdueDataset(data) {
  const clustersFromMeta = Array.isArray(data.meta?.clusters) ? data.meta.clusters : [];
  const capaRows = Array.isArray(data.capa) ? data.capa : [];
  const map = new Map();

  clustersFromMeta.forEach(cluster => map.set(cluster, { cluster, open: 0, overdue: 0 }));

  capaRows.forEach(row => {
    const cluster = row.Cluster || 'Unknown';
    if (!map.has(cluster)) map.set(cluster, { cluster, open: 0, overdue: 0 });
    map.get(cluster).open += 1;
    if (String(row.Overdue_Flag || '').toUpperCase() === 'YES') {
      map.get(cluster).overdue += 1;
    }
  });

  return Array.from(map.values()).sort((a, b) => b.open - a.open || b.overdue - a.overdue || a.cluster.localeCompare(b.cluster));
}

function createChart(canvasId, config) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  new Chart(canvas, config);
}

function buildDashboard(data) {
  const c = shell(
    'index.html',
    'HSE Dashboard',
    `Week ${esc(data.meta?.selectedWeek ?? '—')} · Month ${esc(data.meta?.selectedMonth ?? '—')} · ${esc(data.meta?.inspectionCount ?? 0)} inspections`
  );

  const inspections = Array.isArray(data.weeklyInspections) ? data.weeklyInspections : [];
  const capaRows = Array.isArray(data.capa) ? data.capa : [];
  const avgRaw = inspections.reduce((a, r) => a + (normalizeNumber(r['Raw_Score_%'], 0) || 0), 0) / Math.max(inspections.length, 1);
  const monthRows = inspections.filter(r => r.Month === data.meta?.selectedMonth);
  const monthAvg = monthRows.reduce((a, r) => a + (normalizeNumber(r['Raw_Score_%'], 0) || 0), 0) / Math.max(monthRows.length, 1);
  const redFlags = inspections.filter(r => String(r.Critical_Red_Flag).toUpperCase() === 'YES').length;
  const redFlagData = buildRedFlagDatasets(data);
  const openVsOverdue = buildOpenVsOverdueDataset(data);

  c.innerHTML += `
    <div class="section grid cards">
      <div class="card"><h3>Total Inspections</h3><div class="metric">${esc(data.meta?.inspectionCount ?? 0)}</div></div>
      <div class="card"><h3>Month Average</h3><div class="metric">${pct(monthAvg)}</div></div>
      <div class="card"><h3>Overall Average</h3><div class="metric">${pct(avgRaw)}</div></div>
      <div class="card"><h3>Critical Red Flags</h3><div class="metric">${redFlags}</div></div>
      <div class="card"><h3>Open Actions</h3><div class="metric">${capaRows.length}</div></div>
      <div class="card"><h3>Overdue Actions</h3><div class="metric">${capaRows.filter(x => String(x.Overdue_Flag).toUpperCase() === 'YES').length}</div></div>
    </div>

    <div class="section">
      <div class="grid kpi-grid">
        ${(data.gapAnalysis?.kpis || []).map(k => {
          const monthAvgValue = normalizeNumber(k.monthAvg, 0) || 0;
          const weekAvgValue = normalizeNumber(k.weekAvg, 0) || 0;
          const gapTo5 = normalizeNumber(k.monthGapTo5, 0) || 0;
          return `
          <div class="card kpi-card">
            <div class="label">${esc(k.label)}</div>
            <div class="score">${num(monthAvgValue)}</div>
            <div class="small">Month average / 5</div>
            <div class="bar"><span style="width:${(monthAvgValue / 5) * 100}%"></span></div>
            <div class="small" style="margin-top:8px">Week ${num(weekAvgValue)} · Gap ${num(gapTo5)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="section grid two-col">
      <div class="card chart-card"><h2>Cluster Performance</h2><canvas id="clusterChart"></canvas></div>
      <div class="card">
        <h2>KPI Comparison</h2>
        <div class="small">Simple week vs month comparison by KPI area.</div>
        <div id="kpiCompareSimple" class="compare-list"></div>
      </div>
    </div>

    <div class="section">
      <div class="card chart-card">
        <h2>Red Flags Overview</h2>
        <div class="small">Weekly and monthly red flags are now combined in one graph.</div>
        <canvas id="redFlagCombinedChart"></canvas>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h2>Action Status Overview</h2>
        <div class="small">Open vs overdue actions and the summary are combined in one section.</div>
        <div class="split-panel">
          <div>
            <div class="subsection-title">Open vs Overdue Actions</div>
            <div id="openVsOverdueSimple" class="action-list"></div>
          </div>
          <div>
            <div class="subsection-title">Open / Overdue Summary</div>
            <div id="openOverdueTable"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="card">
        <h2>Red Flag Summary and Heatmap</h2>
        <div class="small">The red flag summary and heatmap are combined in one section.</div>
        <div class="stack-section">
          <div>
            <div class="subsection-title">Red Flag Summary</div>
            <div id="redFlagTable"></div>
          </div>
          <div>
            <div class="subsection-title">Red Flag Heatmap</div>
            <div class="table-wrap">
              <table class="heat">
                <thead>
                  <tr>
                    <th>Cluster</th>
                    ${(data.gapAnalysis?.kpis || []).map(k => `<th>${esc(k.label)}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${(data.heatmap || []).map(r => `
                    <tr>
                      <td><b>${esc(r.cluster)}</b></td>
                      ${(data.gapAnalysis?.kpis || []).map(k => {
                        const v = normalizeNumber(r[k.field], null);
                        return `<td><span class="score ${scoreClass(v)}">${v === null ? '—' : v.toFixed(1)}</span></td>`;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="card"><h2>Latest Inspections</h2><div id="latestTable"></div></div>
    </div>
  `;

  renderTable(
    document.getElementById('openOverdueTable'),
    ['Cluster', 'Open', 'Overdue'],
    openVsOverdue.map(r => [
      esc(r.cluster),
      badge(r.open, r.open > 0 ? 'warn' : 'good'),
      badge(r.overdue, r.overdue > 0 ? 'critical' : 'good')
    ])
  );

  const kpiHolder = document.getElementById('kpiCompareSimple');
  const kpiRows = (data.gapAnalysis?.kpis || [])
    .slice()
    .sort((a, b) => (normalizeNumber(a.monthAvg, 0) - normalizeNumber(b.monthAvg, 0)) || a.label.localeCompare(b.label));
  kpiHolder.innerHTML = kpiRows.map(k => {
    const week = normalizeNumber(k.weekAvg, 0) || 0;
    const month = normalizeNumber(k.monthAvg, 0) || 0;
    const delta = month - week;
    return `
      <div class="compare-row">
        <div class="compare-head">
          <div class="compare-title">${esc(k.label)}</div>
          <div class="compare-badges">
            ${badge(`Week ${week.toFixed(1)}`, 'info')}
            ${badge(`Month ${month.toFixed(1)}`, 'warn')}
            ${trendBadge(delta)}
          </div>
        </div>
        <div class="compare-bars">
          <div class="mini-bar"><span class="mini-label">Week</span><div class="mini-track"><span class="mini-fill week" style="width:${(week / 5) * 100}%"></span></div></div>
          <div class="mini-bar"><span class="mini-label">Month</span><div class="mini-track"><span class="mini-fill month" style="width:${(month / 5) * 100}%"></span></div></div>
        </div>
      </div>
    `;
  }).join('');

  const actionHolder = document.getElementById('openVsOverdueSimple');
  const maxOpen = Math.max(...openVsOverdue.map(r => Number(r.open || 0)), 1);
  actionHolder.innerHTML = openVsOverdue.map(r => {
    const open = Number(r.open || 0);
    const overdue = Number(r.overdue || 0);
    const ontime = Math.max(open - overdue, 0);
    return `
      <div class="action-row">
        <div class="action-head">
          <div class="action-title">${esc(r.cluster)}</div>
          <div class="compare-badges">
            ${badge(`Open ${open}`, open > 0 ? 'warn' : 'good')}
            ${badge(`Overdue ${overdue}`, overdue > 0 ? 'critical' : 'good')}
          </div>
        </div>
        <div class="stack-track">
          <span class="stack-fill ontime" style="width:${(ontime / maxOpen) * 100}%"></span>
          <span class="stack-fill overdue" style="width:${(overdue / maxOpen) * 100}%"></span>
        </div>
      </div>
    `;
  }).join('');

  renderTable(
    document.getElementById('redFlagTable'),
    ['Cluster', 'Week Red Flags', 'Month Red Flags', 'Week Inspections', 'Month Inspections'],
    redFlagData.map(r => [
      esc(r.cluster),
      badge(r.weekly, r.weekly > 0 ? 'critical' : 'good'),
      badge(r.monthly, r.monthly > 0 ? 'critical' : 'good'),
      esc(r.weekInspections),
      esc(r.monthInspections)
    ])
  );

  renderTable(
    document.getElementById('latestTable'),
    ['Date', 'Cluster', 'Area / Villa', 'Main Activity', 'Raw Score', 'Red Flag', 'Rating'],
    inspections
      .slice()
      .sort((a, b) => String(b.Inspection_Date).localeCompare(String(a.Inspection_Date)))
      .map(r => [
        esc(r.Inspection_Date),
        esc(r.Cluster),
        esc(r.Area_or_Villa),
        esc(r.Main_High_Risk_Activity),
        pct(r['Raw_Score_%']),
        redFlagBadge(r.Critical_Red_Flag),
        ratingBadge(r.Rating_Band)
      ])
  );

  createChart('clusterChart', {
    type: 'bar',
    data: {
      labels: (data.weeklyDashboard?.clusters || []).map(cu => cu.cluster),
      datasets: [
        { label: 'Week Avg %', data: (data.weeklyDashboard?.clusters || []).map(cu => {
          const v = normalizeNumber(cu.weekAvgRawPct, null);
          return v === null ? null : v * 100;
        }) },
        { label: 'Month Avg %', data: (data.weeklyDashboard?.clusters || []).map(cu => {
          const v = normalizeNumber(cu.monthAvgRawPct, null);
          return v === null ? null : v * 100;
        }) }
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

  createChart('redFlagCombinedChart', {
    type: 'bar',
    data: {
      labels: redFlagData.map(r => r.cluster),
      datasets: [
        { label: 'Weekly Red Flags', data: redFlagData.map(r => r.weekly) },
        { label: 'Monthly Red Flags', data: redFlagData.map(r => r.monthly) }
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
  ['q', 'clusterFilter', 'redFlagFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', draw);
  });
}

function buildCapa(data) {
  const c = shell('capa.html', 'CAPA Tracking', 'Corrective and preventive actions');
  c.innerHTML += `<div class="card"><div id="capaTable"></div></div>`;
  renderTable(
    document.getElementById('capaTable'),
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

  renderTable(
    document.getElementById('gapTable'),
    ['KPI', 'Week Avg', 'Month Avg', 'Week Gap to 5', 'Month Gap to 5', 'Focus'],
    (data.gapAnalysis?.kpis || []).map(k => [esc(k.label), num(k.weekAvg), num(k.monthAvg), num(k.weekGapTo5), num(k.monthGapTo5), esc(k.focusArea)])
  );

  renderTable(
    document.getElementById('rootTable'),
    ['Root Cause', 'Count'],
    (data.gapAnalysis?.rootCauses || []).map(r => [esc(r.cause), badge(normalizeNumber(r.count, 0), 'warn')])
  );

  createChart('gapChart', {
    type: 'bar',
    data: {
      labels: (data.gapAnalysis?.kpis || []).map(k => k.label),
      datasets: [{ label: 'Month Gap to 5', data: (data.gapAnalysis?.kpis || []).map(k => normalizeNumber(k.monthGapTo5, 0) || 0) }]
    },
    options: {
      ...baseChartOptions(),
      scales: { x: { ticks: { color: '#bfd2e9' } }, y: { beginAtZero: true, ticks: { color: '#bfd2e9' } } }
    }
  });

  createChart('rootChart', {
    type: 'doughnut',
    data: {
      labels: (data.gapAnalysis?.rootCauses || []).map(r => r.cause),
      datasets: [{ label: 'Count', data: (data.gapAnalysis?.rootCauses || []).map(r => normalizeNumber(r.count, 0) || 0) }]
    },
    options: baseChartOptions()
  });
}

function buildSchedules(data) {
  const c = shell('schedules.html', 'Schedules', 'Monthly programme view');
  const months = Array.from(new Set((data.schedules || []).map(r => r.Month))).sort();
  c.innerHTML += `<div class="tabs">${months.map((m, i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-month="${m}">${m}</button>`).join('')}</div><div id="scheduleContent"></div>`;

  const holder = document.getElementById('scheduleContent');

  function draw(month) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.month === month));
    holder.innerHTML = '';
    renderTable(
      holder,
      ['Month', 'Cluster', 'Planned Inspections'],
      (data.schedules || []).filter(r => r.Month === month).map(r => [esc(r.Month), esc(r.Cluster), esc(r.Planned_Inspections)])
    );
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

function showError(error) {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="container" style="padding-top:24px;">
      <div class="card">
        <h2>Website load error</h2>
        <div class="pre">${esc(error?.message || String(error))}</div>
        <p class="small">Please upload the full folder exactly in this structure: /assets, /scripts, /data, plus all HTML files in root.</p>
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
  } catch (error) {
    console.error(error);
    showError(error);
  }
})();
