
async function loadData() {
  if (window.SITE_DATA) return window.SITE_DATA;
  try {
    const res = await fetch('./data/site-data.json');
    return await res.json();
  } catch (e) {
    return { dashboard:{total_inspections:0,total_actions:0,stop_work_cases:0,avg_score:0}, inspections:[], actions:[], clusters:[] };
  }
}
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '-';
const safe = (v) => (v === null || v === undefined || v === '') ? '-' : v;

function statusBadgeClass(status){
  if(status === 'Critical') return 'critical';
  if(status === 'Action Required') return 'action';
  if(status === 'Monitor') return 'monitor';
  return 'good';
}
function num(v){
  return typeof v === 'number' ? v : 0;
}

function renderSummary(data){
  const cards = [
    { label:'Total inspections', value:data.dashboard.total_inspections, meta:'Loaded from the current workbook build' },
    { label:'Open actions', value:data.dashboard.total_actions, meta:'CAPA items extracted from inspection findings' },
    { label:'Stop-work cases', value:data.dashboard.stop_work_cases, meta:'Critical records that need leadership intervention' },
    { label:'Average score', value:`${data.dashboard.avg_score} / 5`, meta:'Average available KPI score across loaded inspections' },
  ];
  document.getElementById('summaryCards').innerHTML = cards.map(c => `
    <article class="card">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="meta">${c.meta}</div>
    </article>
  `).join('');
}

function renderClusterBars(data){
  const grouped = {};
  data.inspections.forEach(i => {
    if(!i.cluster) return;
    if(!grouped[i.cluster]) grouped[i.cluster] = [];
    grouped[i.cluster].push(num(i.average_score));
  });
  const items = Object.entries(grouped).map(([cluster, vals]) => ({
    cluster, avg: (vals.reduce((a,b)=>a+b,0) / vals.length) || 0
  })).sort((a,b)=>b.avg-a.avg);
  document.getElementById('clusterBars').innerHTML = items.map(item => `
    <div class="bar-row">
      <div class="bar-label">${item.cluster}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(item.avg/5)*100}%"></div></div>
      <div class="bar-score">${item.avg.toFixed(2)}</div>
    </div>
  `).join('') || '<p class="note">No cluster score data found.</p>';
}

function renderKpiFocus(data){
  const map = {};
  data.inspections.forEach(i => {
    Object.entries(i.scores || {}).forEach(([name,val]) => {
      if(!map[name]) map[name] = [];
      map[name].push(num(val));
    });
  });
  const items = Object.entries(map).map(([name, vals]) => ({
    name, avg: vals.reduce((a,b)=>a+b,0) / vals.length
  })).sort((a,b)=>a.avg-b.avg).slice(0,6);
  document.getElementById('kpiFocus').innerHTML = items.map(item => `
    <div class="list-item">
      <strong>${item.name}</strong>
      <span>Average score: ${item.avg.toFixed(2)} / 5</span>
    </div>
  `).join('') || '<p class="note">No KPI score data found.</p>';
}

function inspectionCard(i){
  const photoHtml = (i.photos || []).length ? `
    <div class="photo-strip">
      ${i.photos.map(p => p.type === 'image'
        ? `<div class="photo-card"><img src="${p.src}" alt="${safe(p.caption)}" /><p>${safe(p.caption)}</p></div>`
        : `<div class="photo-card"><div class="ph"></div><p><a href="${p.src}" target="_blank" rel="noreferrer">Open evidence link</a><br>${safe(p.caption)}</p></div>`
      ).join('')}
    </div>` : '';
  const kpis = Object.entries(i.scores || {}).map(([name,val]) => `
    <div class="kpi-row">
      <div class="kpi-name">${name}</div>
      <div class="kpi-val">${num(val).toFixed(1)} / 5</div>
      <div class="kpi-meter"><span style="width:${(num(val)/5)*100}%"></span></div>
    </div>
  `).join('');
  return `
    <article class="inspection-card">
      <div class="inspection-head">
        <div>
          <div class="inspection-title">
            <h3>${i.inspection_id}</h3>
            <span class="badge ${statusBadgeClass(i.status)}">${i.status}</span>
            ${i.stop_work ? '<span class="badge critical">Stop work</span>' : ''}
          </div>
          <p class="sub">${safe(i.cluster)} · Package ${safe(i.package)} · ${safe(i.main_high_risk_activity)} · ${safe(i.area_or_villa)}</p>
        </div>
        <div class="mini-grid">
          <div class="mini"><label>Date</label><strong>${fmtDate(i.inspection_date)}</strong></div>
          <div class="mini"><label>Contractor</label><strong>${safe(i.contractor)}</strong></div>
          <div class="mini"><label>Action owner</label><strong>${safe(i.action_owner)}</strong></div>
          <div class="mini"><label>Target closeout</label><strong>${fmtDate(i.target_closeout_date)}</strong></div>
        </div>
      </div>
      <div class="detail-grid">
        <div class="detail-box">
          <h4>Main findings</h4>
          <p><strong>Root cause:</strong> ${safe(i.likely_root_cause)}</p>
          <p><strong>Top gaps observed:</strong> ${safe(i.top_3_gaps_observed)}</p>
          <p><strong>Immediate action taken:</strong> ${safe(i.immediate_action_taken)}</p>
          <p><strong>Preventive action required:</strong> ${safe(i.preventive_action_required)}</p>
          <p><strong>Positive observations:</strong> ${safe(i.positive_observations)}</p>
          ${photoHtml}
        </div>
        <div class="detail-box">
          <h4>KPI score card</h4>
          <div class="kpi-grid">${kpis || '<p class="note">No KPI scores available.</p>'}</div>
        </div>
      </div>
    </article>
  `;
}

function renderInspections(data){
  const searchInput = document.getElementById('searchInput');
  const clusterFilter = document.getElementById('clusterFilter');
  const statusFilter = document.getElementById('statusFilter');

  const clusters = Array.from(new Set(data.inspections.map(i => i.cluster).filter(Boolean))).sort();
  clusterFilter.innerHTML = '<option value="">All clusters</option>' + clusters.map(c => `<option value="${c}">${c}</option>`).join('');

  function update(){
    const q = searchInput.value.trim().toLowerCase();
    const c = clusterFilter.value;
    const s = statusFilter.value;
    const filtered = data.inspections.filter(i => {
      const hay = [
        i.cluster, i.main_high_risk_activity, i.area_or_villa, i.likely_root_cause,
        i.action_owner, i.contractor, i.inspection_id
      ].join(' ').toLowerCase();
      const searchOk = !q || hay.includes(q);
      const clusterOk = !c || i.cluster === c;
      const statusOk = !s || i.status === s;
      return searchOk && clusterOk && statusOk;
    });
    document.getElementById('inspectionList').innerHTML = filtered.map(inspectionCard).join('') || '<p class="note">No inspection records matched your filter.</p>';
  }
  searchInput.addEventListener('input', update);
  clusterFilter.addEventListener('change', update);
  statusFilter.addEventListener('change', update);
  update();
}

function renderActions(data){
  const tbody = document.querySelector('#actionTable tbody');
  tbody.innerHTML = data.actions.map(a => `
    <tr>
      <td>${safe(a.action_id)}</td>
      <td>${safe(a.cluster)}</td>
      <td>${safe(a.kpi_area)}</td>
      <td><span class="badge ${statusBadgeClass(
        a.status === 'Closed' ? 'Good' :
        a.status === 'In Progress' ? 'Monitor' :
        a.status === 'Open' ? 'Action Required' : 'Monitor'
      )}">${safe(a.status)}</span></td>
      <td>${fmtDate(a.target_date)}</td>
      <td>${fmtDate(a.close_date)}</td>
      <td>${safe(a.action_owner)}</td>
      <td>${safe(a.finding)}</td>
      <td>${safe(a.comments)}</td>
    </tr>
  `).join('');
}

function renderClusters(data){
  const tbody = document.querySelector('#clusterTable tbody');
  tbody.innerHTML = data.clusters.map(c => `
    <tr>
      <td>${safe(c['Package'])}</td>
      <td>${safe(c['Cluster'])}</td>
      <td>${safe(c['Contractor'])}</td>
      <td>${safe(c['Project Director (PD)'])}</td>
      <td>${safe(c['Project Manager (PM)'])}</td>
      <td>${safe(c['Construction Manager (CM)'])}</td>
      <td>${safe(c['HSE Manager (HSEM)'])}</td>
      <td>${safe(c['Section Engineer (SE)'])}</td>
    </tr>
  `).join('');
}

loadData().then(data => {
  renderSummary(data);
  renderClusterBars(data);
  renderKpiFocus(data);
  renderInspections(data);
  renderActions(data);
  renderClusters(data);
});
