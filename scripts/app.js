const fallbackData = {"meta": {"title": "Red Flag Performance Matrix", "subtitle": "Executive Dashboard", "lastUpdated": "10 Apr 2026"}, "summaryColumns": ["Week Red Flags", "Month Red Flags", "Week Inspections", "Month Inspections"], "heatmapColumns": ["Work at Height Control", "Edge Protection", "Falling Object Prevention", "Excavation Safety", "Scaffolding Compliance", "PTW Implementation", "PTW Field Verification", "MSRA Quality", "Lifting/Precast Installation", "Traffic & Man-Machine Interface", "Housekeeping/Waste Management", "Welfare Arrangement", "Fire Readiness", "Supervision & Subcontractor Control", "Temporary Electrical & Tool Safety"], "rows": [{"cluster": "Cluster 6", "weekRedFlags": 1, "monthRedFlags": 2, "weekInspections": 2, "monthInspections": 3, "heatmap": {}}, {"cluster": "Cluster 3", "weekRedFlags": 1, "monthRedFlags": 1, "weekInspections": 2, "monthInspections": 3, "heatmap": {}}, {"cluster": "Cluster 1A", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 1, "monthInspections": 1, "heatmap": {}}, {"cluster": "Cluster 1B", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 1, "monthInspections": 1, "heatmap": {}}, {"cluster": "Cluster 2A", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 0, "monthInspections": 0, "heatmap": {}}, {"cluster": "Cluster 2B", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 0, "monthInspections": 0, "heatmap": {}}, {"cluster": "Cluster 2C", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 0, "monthInspections": 0, "heatmap": {}}, {"cluster": "Cluster 4", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 1, "monthInspections": 2, "heatmap": {}}, {"cluster": "Cluster 5", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 1, "monthInspections": 2, "heatmap": {}}, {"cluster": "Cluster 7A", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 2, "monthInspections": 3, "heatmap": {"Work at Height Control": 3.5, "Edge Protection": 3.3, "Falling Object Prevention": 2.8, "Excavation Safety": 3.0, "Scaffolding Compliance": 3.0, "PTW Implementation": 2.8, "PTW Field Verification": 2.5, "MSRA Quality": 4.0, "Lifting/Precast Installation": 3.0, "Traffic & Man-Machine Interface": 4.0, "Housekeeping/Waste Management": 3.0, "Welfare Arrangement": 4.0, "Fire Readiness": 2.7, "Supervision & Subcontractor Control": 2.7, "Temporary Electrical & Tool Safety": 3.3}}, {"cluster": "Cluster 7B", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 0, "monthInspections": 1, "heatmap": {}}, {"cluster": "Cluster 8A", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 0, "monthInspections": 0, "heatmap": {}}, {"cluster": "Cluster 8B", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 0, "monthInspections": 0, "heatmap": {}}, {"cluster": "Cluster 8C", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 0, "monthInspections": 1, "heatmap": {}}, {"cluster": "Cluster 8D", "weekRedFlags": 0, "monthRedFlags": 0, "weekInspections": 0, "monthInspections": 1, "heatmap": {}}]};

async function getDashboardData() {
  const embedded = document.getElementById("embedded-json");
  if (embedded) embedded.textContent = JSON.stringify(fallbackData);

  try {
    const res = await fetch("site-data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Fetch failed");
    return await res.json();
  } catch (e) {
    return fallbackData;
  }
}

function renderKpis(rows) {
  const totals = {
    weekRedFlags: rows.reduce((s, r) => s + Number(r.weekRedFlags || 0), 0),
    monthRedFlags: rows.reduce((s, r) => s + Number(r.monthRedFlags || 0), 0),
    weekInspections: rows.reduce((s, r) => s + Number(r.weekInspections || 0), 0),
    monthInspections: rows.reduce((s, r) => s + Number(r.monthInspections || 0), 0),
  };

  const items = [
    ["Week Red Flags", totals.weekRedFlags, "Current weekly total"],
    ["Month Red Flags", totals.monthRedFlags, "Current monthly total"],
    ["Week Inspections", totals.weekInspections, "Recorded inspections"],
    ["Month Inspections", totals.monthInspections, "Recorded inspections"],
  ];

  document.getElementById("kpiGrid").innerHTML = items.map(([label, value, sub]) => `
    <article class="kpi">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </article>
  `).join("");
}

function redFlagPill(value) {
  const num = Number(value || 0);
  const cls = num > 0 ? "pill-bad" : "pill-good";
  return `<span class="pill ${cls}">${num}</span>`;
}

function inspectionPill(value) {
  const num = Number(value || 0);
  const cls = num > 0 ? "pill-neutral" : "pill-neutral";
  return `<span class="pill ${cls}">${num}</span>`;
}

function scoreChip(value) {
  if (value === undefined || value === null || value === "") {
    return `<span class="score score-empty">—</span>`;
  }
  const num = Number(value);
  const cls = num >= 3.5 ? "score-good" : num >= 2.5 ? "score-warn" : "score-bad";
  return `<span class="score ${cls}">${num.toFixed(1)}</span>`;
}

function renderTable(data, query = "") {
  const summaryColumns = data.summaryColumns || [];
  const heatmapColumns = data.heatmapColumns || [];
  const rows = (data.rows || []).filter(row => row.cluster.toLowerCase().includes(query.toLowerCase()));

  document.getElementById("tableHead").innerHTML = `
    <tr>
      <th rowspan="2" class="group-head">Cluster</th>
      <th colspan="${summaryColumns.length}" class="group-head">Summary</th>
      <th colspan="${heatmapColumns.length}" class="group-head">Heatmap</th>
    </tr>
    <tr>
      ${summaryColumns.map(col => `<th class="label-head">${col}</th>`).join("")}
      ${heatmapColumns.map(col => `<th class="label-head">${col}</th>`).join("")}
    </tr>
  `;

  document.getElementById("tableBody").innerHTML = rows.map(row => `
    <tr>
      <td>${row.cluster}</td>
      <td>${redFlagPill(row.weekRedFlags)}</td>
      <td>${redFlagPill(row.monthRedFlags)}</td>
      <td>${inspectionPill(row.weekInspections)}</td>
      <td>${inspectionPill(row.monthInspections)}</td>
      ${heatmapColumns.map(col => `<td>${scoreChip(row.heatmap?.[col])}</td>`).join("")}
    </tr>
  `).join("");
}

async function init() {
  const data = await getDashboardData();
  document.title = data.meta?.title || "Red Flag Performance Matrix";
  document.getElementById("pageTitle").textContent = data.meta?.title || "Red Flag Performance Matrix";
  document.getElementById("lastUpdated").textContent = data.meta?.lastUpdated ? `Updated ${data.meta.lastUpdated}` : "";

  renderKpis(data.rows || []);
  renderTable(data);

  const search = document.getElementById("clusterSearch");
  search.addEventListener("input", () => renderTable(data, search.value.trim()));
}

init();
