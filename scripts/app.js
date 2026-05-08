
const DATA_PATH='data/site-data.json';
const navItems=[['index.html','Dashboard'],['cluster-performance.html','Cluster Performance'],['capa.html','CAPA'],['gap-analysis.html','Gap Analysis']];
const page=location.pathname.split('/').pop()||'index.html';
let chartRefs=[];
async function loadData(){const r=await fetch(DATA_PATH,{cache:'no-store'}); if(!r.ok) throw new Error('Cannot load '+DATA_PATH); return await r.json();}
function esc(v){return v===null||v===undefined?'':String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function nl(v){return esc(v).replace(/\n/g,'<br>')}
function n(v){const x=Number(v);return Number.isFinite(x)?x:null}
function fmt(v,d=1){const x=n(v);return x===null?'—':x.toFixed(d)}
function pct(v){const x=n(v);return x===null?'—':(x*100).toFixed(1)+'%'}
function pct2(v){const x=n(v);return x===null?'—':x.toFixed(1)+'%'}
function badge(t,type='info'){return `<span class="badge ${type}">${esc(t??'—')}</span>`}
function ratingBadge(r){const map={Good:'good','Needs Improvement':'warn',Poor:'bad',Critical:'critical','Not Rated':'info'};return badge(r||'—',map[r]||'info')}
function redBadge(v){return String(v).toUpperCase()==='YES'?badge('YES','critical'):badge('NO','good')}
function avg(arr){const vals=arr.map(n).filter(x=>x!==null); return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null}
function colorPct(v){const x=n(v); if(x===null)return 'rgba(126,150,180,.55)'; if(x>=75)return '#24c486'; if(x>=60)return '#f0b84d'; if(x>=45)return '#ff8b74'; return '#ff5e7e'}
function colorScore(v){const x=n(v); if(x===null)return 'rgba(126,150,180,.55)'; if(x>=3.5)return '#24c486'; if(x>=2.5)return '#f0b84d'; return '#ff5e7e'}
function nav(){return `<div class="topbar"><div class="container"><div class="nav"><div class="brand">Saadiyat Lagoons HSE<small>Performance dashboard and action tracking</small></div>${navItems.map(([h,l])=>`<a class="${page===h?'active':''}" href="${h}">${l}</a>`).join('')}</div></div></div>`}
function shell(title,sub){document.body.insertAdjacentHTML('afterbegin',nav());document.getElementById('app').innerHTML=`<div class="container"><div class="hero"><div class="page-title"><div><h1>${esc(title)}</h1><p class="subtitle">${esc(sub||'')}</p></div></div></div><div id="content"></div><div class="footer"></div></div>`;return document.getElementById('content')}
function table(id,heads,rows){const el=typeof id==='string'?document.getElementById(id):id; el.innerHTML=`<div class="table-wrap"><table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c??''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
const labelPlugin={id:'labelPlugin',afterDatasetsDraw(chart,args,opts){const ctx=chart.ctx;chart.data.datasets.forEach((ds,di)=>{const meta=chart.getDatasetMeta(di);if(!meta||meta.hidden)return;meta.data.forEach((bar,i)=>{const val=n(ds.data[i]);if(val===null)return;const p=bar.getProps(['x','y','base'],true);ctx.save();ctx.fillStyle='#fff';ctx.font='800 10px Inter,Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.translate(p.x,p.y+(p.base-p.y)/2);ctx.rotate(-Math.PI/2);ctx.fillText(opts?.percent?val.toFixed(1)+'%':val.toFixed(1),0,0);ctx.restore();});});}};
if(window.Chart)Chart.register(labelPlugin);
function chart(id,config){const el=document.getElementById(id); if(!el||!window.Chart)return; chartRefs.push(new Chart(el,config));}
function base(){return {responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{labels:{color:'#dce9f7'}}},scales:{x:{ticks:{color:'#bfd2e9'},grid:{color:'rgba(191,210,233,.07)'}},y:{ticks:{color:'#bfd2e9'},grid:{color:'rgba(191,210,233,.08)'}}}}}
function latestRows(data){return [...(data.weeklyInspections||[])].sort((a,b)=>String(b.Inspection_Date).localeCompare(String(a.Inspection_Date)))}
function kpiDefs(data){return data.gapAnalysis?.kpis||[]}
function dashboard(data){const c=shell('HSE Dashboard',`Week ${data.meta.selectedWeek} · Month ${data.meta.selectedMonth} · ${data.meta.inspectionCount} inspections · Cluster 3, 4, 5 and 6 removed`);const inspections=data.weeklyInspections||[], monthRows=inspections.filter(r=>r.Month===data.meta.selectedMonth), weekRows=inspections.filter(r=>Number(r.Week_No)===Number(data.meta.selectedWeek));const overall=avg(inspections.map(r=>r.Raw_Score_Pct)), monthAvg=avg(monthRows.map(r=>r.Raw_Score_Pct)), weekAvg=avg(weekRows.map(r=>r.Raw_Score_Pct));const flags=inspections.filter(r=>String(r.Critical_Red_Flag).toUpperCase()==='YES').length;c.innerHTML=`<div class="section grid cards"><div class="card"><h3>Total Inspections</h3><div class="metric">${data.meta.inspectionCount}</div></div><div class="card"><h3>Week Average</h3><div class="metric">${pct(weekAvg)}</div></div><div class="card"><h3>Month Average</h3><div class="metric">${pct(monthAvg)}</div></div><div class="card"><h3>Overall Average</h3><div class="metric">${pct(overall)}</div></div><div class="card"><h3>Critical Red Flags</h3><div class="metric">${flags}</div></div><div class="card"><h3>Open Actions</h3><div class="metric">${(data.capa||[]).length}</div></div></div><div class="section grid two-col"><div class="card chart-card"><h2>Cluster Performance</h2><div class="chart-box"><canvas id="clusterChart"></canvas></div></div><div class="card chart-card"><h2>KPI Comparison</h2><div class="chart-box"><canvas id="kpiChart"></canvas></div></div></div><div class="section grid two-col"><div class="card chart-card"><h2>Weekly vs Monthly Red Flags</h2><div class="chart-box"><canvas id="redChart"></canvas></div></div><div class="card"><h2>Latest Inspections</h2><div id="latest"></div></div></div><div class="section"><div class="card"><h2>Red Flag Heatmap</h2><div id="heatmap"></div></div></div>`;const wc=data.weeklyDashboard.clusters||[], mc=data.monthlyDashboard.clusters||[];const labels=wc.map(x=>x.cluster), wVals=wc.map(x=>n(x.weekAvgRawPct)!==null?n(x.weekAvgRawPct)*100:null), mVals=wc.map((x,i)=>n(x.monthAvgRawPct)!==null?n(x.monthAvgRawPct)*100:null);chart('clusterChart',{type:'bar',data:{labels,datasets:[{label:'Week Avg %',data:wVals,backgroundColor:wVals.map(colorPct)},{label:'Month Avg %',data:mVals,backgroundColor:mVals.map(colorPct)}]},options:{...base(),plugins:{...base().plugins,labelPlugin:{percent:true}},scales:{x:{ticks:{color:'#bfd2e9',maxRotation:35,minRotation:35,autoSkip:false},grid:{display:false}},y:{beginAtZero:true,max:100,ticks:{color:'#bfd2e9'},grid:{color:'rgba(191,210,233,.08)'}}}}});const k=kpiDefs(data);chart('kpiChart',{type:'bar',data:{labels:k.map(x=>x.label),datasets:[{label:'Week',data:k.map(x=>x.weekAvg),backgroundColor:k.map(x=>colorScore(x.weekAvg))},{label:'Month',data:k.map(x=>x.monthAvg),backgroundColor:k.map(x=>colorScore(x.monthAvg))}]},options:{...base(),plugins:{...base().plugins,labelPlugin:{}},scales:{x:{ticks:{color:'#bfd2e9',maxRotation:75,minRotation:75,autoSkip:false},grid:{display:false}},y:{beginAtZero:true,max:5,ticks:{color:'#bfd2e9'},grid:{color:'rgba(191,210,233,.08)'}}}}});chart('redChart',{type:'bar',data:{labels,datasets:[{label:'Week Red Flags',data:wc.map(x=>x.redFlagsWeek),backgroundColor:'#ff5e7e'},{label:'Month Red Flags',data:mc.map(x=>x.redFlagsMonth),backgroundColor:'#f0b84d'}]},options:{...base(),indexAxis:'y',scales:{x:{beginAtZero:true,ticks:{color:'#bfd2e9',precision:0}},y:{ticks:{color:'#bfd2e9'}}}}});table('latest',['Date','Week','Cluster','Activity','Score','Red Flag','Rating'],latestRows(data).slice(0,14).map(r=>[esc(r.Inspection_Date),esc(r.Week_No),esc(r.Cluster),esc(r.Main_High_Risk_Activity),pct(r.Raw_Score_Pct),redBadge(r.Critical_Red_Flag),ratingBadge(r.Rating_Band)]));const heat=data.heatmap||[];table('heatmap',['Cluster',...k.map(x=>x.label)],heat.map(h=>[`<b>${esc(h.cluster)}</b>`,...k.map(x=>{const v=n(h[x.field]);const cls=v===null?'mid':v>=3.5?'high':v>=2.5?'mid':'low';return `<span class="score ${cls}">${v===null?'—':v.toFixed(1)}</span>`})]));}

function kpiClusterProfile(data, cluster, mode='month'){
  const k=kpiDefs(data);
  const selectedWeek=Number(data.meta.selectedWeek);
  const selectedMonth=String(data.meta.selectedMonth||'');
  let rows=(data.weeklyInspections||[]).filter(r=>r.Cluster===cluster);
  if(mode==='week') rows=rows.filter(r=>Number(r.Week_No)===selectedWeek);
  if(mode==='month') rows=rows.filter(r=>String(r.Month)===selectedMonth);
  return k.map(item=>({field:item.field,label:item.label,value:avg(rows.map(r=>r[item.field]))}));
}
function clusterScoreSummary(data, cluster, mode='month'){
  const selectedWeek=Number(data.meta.selectedWeek);
  const selectedMonth=String(data.meta.selectedMonth||'');
  let rows=(data.weeklyInspections||[]).filter(r=>r.Cluster===cluster);
  if(mode==='week') rows=rows.filter(r=>Number(r.Week_No)===selectedWeek);
  if(mode==='month') rows=rows.filter(r=>String(r.Month)===selectedMonth);
  return {
    count: rows.length,
    avgPct: avg(rows.map(r=>r.Raw_Score_Pct)),
    redFlags: rows.filter(r=>String(r.Critical_Red_Flag).toUpperCase()==='YES').length
  };
}
function detailChartOptions(){
  return {responsive:true,maintainAspectRatio:false,animation:false,indexAxis:'y',plugins:{legend:{display:false},labelPlugin:{}},scales:{x:{beginAtZero:true,max:5,ticks:{color:'#bfd2e9',stepSize:1},grid:{color:'rgba(191,210,233,.08)'}},y:{ticks:{color:'#bfd2e9',font:{size:10}},grid:{display:false}}}};
}

function clusterPerformance(data){
  const c=shell('Cluster Performance',`Detailed KPI performance by cluster · Week ${data.meta.selectedWeek} vs Month ${data.meta.selectedMonth}`);
  const wc=data.weeklyDashboard.clusters||[];
  const mc=data.monthlyDashboard.clusters||[];
  const clusters=data.meta.clusters||wc.map(x=>x.cluster);
  const best=[...wc].filter(x=>n(x.weekAvgRawPct)!==null).sort((a,b)=>(n(b.weekAvgRawPct)||0)-(n(a.weekAvgRawPct)||0))[0];
  const low=[...wc].filter(x=>n(x.weekAvgRawPct)!==null).sort((a,b)=>(n(a.weekAvgRawPct)||0)-(n(b.weekAvgRawPct)||0))[0];
  c.innerHTML=`
    <div class="section grid cards">
      <div class="card"><h3>Active Clusters</h3><div class="metric">${clusters.length}</div></div>
      <div class="card"><h3>Best Week Cluster</h3><div class="metric medium-metric">${esc(best?.cluster||'—')}</div></div>
      <div class="card"><h3>Lowest Week Cluster</h3><div class="metric medium-metric">${esc(low?.cluster||'—')}</div></div>
      <div class="card"><h3>Week Red Flags</h3><div class="metric">${wc.reduce((s,x)=>s+Number(x.redFlagsWeek||0),0)}</div></div>
      <div class="card"><h3>Month Red Flags</h3><div class="metric">${mc.reduce((s,x)=>s+Number(x.redFlagsMonth||0),0)}</div></div>
      <div class="card"><h3>Removed</h3><div class="metric medium-metric">3,4,5,6</div></div>
    </div>
    <div class="section grid two-col">
      <div class="card chart-card"><h2>Week Score by Cluster</h2><div class="chart-box"><canvas id="weekScore"></canvas></div></div>
      <div class="card chart-card"><h2>Month Score by Cluster</h2><div class="chart-box"><canvas id="monthScore"></canvas></div></div>
    </div>
    <div class="section card">
      <div class="section-head">
        <div><h2>Detailed KPI Performance Graphics</h2><p class="small">Each graph shows all KPI values for the selected cluster. Score scale is 0 to 5.</p></div>
        <div class="filters inline-filter">
          <select id="detailMode"><option value="month">Month Average</option><option value="week">Selected Week</option><option value="all">All Records</option></select>
        </div>
      </div>
      <div id="detailCards" class="detail-grid"></div>
    </div>
    <div class="section"><div class="card"><h2>Cluster Ranking</h2><div id="rank"></div></div></div>
    <div class="section"><div class="card"><h2>KPI Value Matrix</h2><div id="kpiMatrix"></div></div></div>
  `;
  const labels=wc.map(x=>x.cluster), w=wc.map(x=>n(x.weekAvgRawPct)!==null?n(x.weekAvgRawPct)*100:null), m=wc.map(x=>n(x.monthAvgRawPct)!==null?n(x.monthAvgRawPct)*100:null);
  chart('weekScore',{type:'bar',data:{labels,datasets:[{label:'Week Score %',data:w,backgroundColor:w.map(colorPct)}]},options:{...base(),plugins:{...base().plugins,labelPlugin:{percent:true}},scales:{x:{ticks:{color:'#bfd2e9',maxRotation:35,minRotation:35,autoSkip:false},grid:{display:false}},y:{beginAtZero:true,max:100,ticks:{color:'#bfd2e9'},grid:{color:'rgba(191,210,233,.08)'}}}}});
  chart('monthScore',{type:'bar',data:{labels,datasets:[{label:'Month Score %',data:m,backgroundColor:m.map(colorPct)}]},options:{...base(),plugins:{...base().plugins,labelPlugin:{percent:true}},scales:{x:{ticks:{color:'#bfd2e9',maxRotation:35,minRotation:35,autoSkip:false},grid:{display:false}},y:{beginAtZero:true,max:100,ticks:{color:'#bfd2e9'},grid:{color:'rgba(191,210,233,.08)'}}}}});
  table('rank',['Cluster','Week Score','Week Inspections','Week Flags','Month Score','Month Inspections','Month Flags'],wc.map((x,i)=>[esc(x.cluster),pct(x.weekAvgRawPct),badge(x.inspectionCountWeek,'info'),badge(x.redFlagsWeek,x.redFlagsWeek?'critical':'good'),pct(x.monthAvgRawPct),badge(x.inspectionCountMonth,'info'),badge((mc[i]?.redFlagsMonth||0),(mc[i]?.redFlagsMonth||0)?'critical':'good')]));

  const k=kpiDefs(data);
  function drawDetail(){
    const mode=document.getElementById('detailMode').value;
    const holder=document.getElementById('detailCards');
    holder.innerHTML=clusters.map((cl,i)=>{
      const s=clusterScoreSummary(data,cl,mode);
      return `<div class="detail-card"><div class="detail-title"><div><h3>${esc(cl)}</h3><span class="small">${mode==='week'?'Selected week':mode==='month'?'Month average':'All records'} · ${s.count} inspection(s)</span></div><div class="detail-score">${pct(s.avgPct)}</div></div><div class="mini-stats"><span>${badge(s.redFlags,'critical')} Red flags</span></div><div class="detail-chart"><canvas id="kpiDetail${i}"></canvas></div></div>`;
    }).join('');
    clusters.forEach((cl,i)=>{
      const profile=kpiClusterProfile(data,cl,mode);
      chart(`kpiDetail${i}`,{type:'bar',data:{labels:profile.map(x=>x.label),datasets:[{label:'KPI Score',data:profile.map(x=>x.value),backgroundColor:profile.map(x=>colorScore(x.value)),borderWidth:0}]},options:detailChartOptions()});
    });
    const matrixRows=clusters.map(cl=>{
      const profile=kpiClusterProfile(data,cl,mode);
      const map=Object.fromEntries(profile.map(x=>[x.field,x.value]));
      return [`<b>${esc(cl)}</b>`,...k.map(x=>{const v=n(map[x.field]);const cls=v===null?'mid':v>=3.5?'high':v>=2.5?'mid':'low';return `<span class="score ${cls}">${v===null?'—':v.toFixed(1)}</span>`})];
    });
    table('kpiMatrix',['Cluster',...k.map(x=>x.label)],matrixRows);
  }
  document.getElementById('detailMode').addEventListener('change',drawDetail);
  drawDetail();
}
function capa(data){const c=shell('CAPA Tracker','Open corrective and preventive action follow-up');c.innerHTML=`<div class="section grid cards"><div class="card"><h3>Total Actions</h3><div class="metric">${(data.capa||[]).length}</div></div><div class="card"><h3>Red Flag Actions</h3><div class="metric">${(data.capa||[]).filter(x=>String(x.Critical_Red_Flag).toUpperCase()==='YES').length}</div></div><div class="card"><h3>Clusters</h3><div class="metric">${data.meta.clusters.length}</div></div></div><div class="filters"><input id="q" placeholder="Search CAPA, cluster, owner"><select id="cluster"><option value="">All clusters</option>${data.meta.clusters.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div class="card"><div id="capaTable"></div></div>`;const draw=()=>{const q=document.getElementById('q').value.toLowerCase(), cl=document.getElementById('cluster').value;const rows=(data.capa||[]).filter(r=>(!cl||r.Cluster===cl)&&(!q||JSON.stringify(r).toLowerCase().includes(q))).map(r=>[esc(r.Date),esc(r.Cluster),esc(r.Activity),esc(r.Action_Owner),nl(r.Immediate_Action),nl(r.Preventive_Action),esc(r.Target_Closeout_Date),redBadge(r.Critical_Red_Flag)]);table('capaTable',['Date','Cluster','Activity','Owner','Immediate Action','Preventive Action','Target Date','Red Flag'],rows)};document.getElementById('q').addEventListener('input',draw);document.getElementById('cluster').addEventListener('change',draw);draw();}
function gap(data){const c=shell('Gap Analysis',`KPI gap analysis for ${data.meta.selectedMonth}`);const k=kpiDefs(data);c.innerHTML=`<div class="section grid two-col"><div class="card chart-card"><h2>KPI Gap to 5</h2><div class="chart-box"><canvas id="gapChart"></canvas></div></div><div class="card chart-card"><h2>Root Cause Distribution</h2><div class="chart-box"><canvas id="rootChart"></canvas></div></div></div><div class="section grid two-col"><div class="card"><h2>KPI Gap Table</h2><div id="gapTable"></div></div><div class="card"><h2>Root Causes</h2><div id="rootTable"></div></div></div>`;chart('gapChart',{type:'bar',data:{labels:k.map(x=>x.label),datasets:[{label:'Month Gap to 5',data:k.map(x=>x.monthGapTo5),backgroundColor:k.map(x=>colorScore(5-(x.monthGapTo5||0)))}]},options:{...base(),plugins:{...base().plugins,labelPlugin:{}},scales:{x:{ticks:{color:'#bfd2e9',maxRotation:75,minRotation:75,autoSkip:false},grid:{display:false}},y:{beginAtZero:true,max:5,ticks:{color:'#bfd2e9'}}}}});const roots=data.gapAnalysis.rootCauses||[];chart('rootChart',{type:'doughnut',data:{labels:roots.map(x=>x.rootCause),datasets:[{data:roots.map(x=>x.count)}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{position:'bottom',labels:{color:'#dce9f7'}}}}});table('gapTable',['KPI','Week Avg','Month Avg','Week Gap','Month Gap','Focus'],k.map(x=>[esc(x.label),fmt(x.weekAvg),fmt(x.monthAvg),fmt(x.weekGapTo5),fmt(x.monthGapTo5),(n(x.monthGapTo5)>=2?badge('Immediate attention','critical'):badge('Monitor','warn'))]));table('rootTable',['Root Cause','Count'],roots.map(x=>[esc(x.rootCause),badge(x.count,'info')]));}
loadData().then(data=>{if(page==='cluster-performance.html')clusterPerformance(data);else if(page==='capa.html')capa(data);else if(page==='gap-analysis.html')gap(data);else dashboard(data);}).catch(e=>{document.getElementById('app').innerHTML=`<div class="container"><div class="section"><div class="card"><h2>Dashboard failed to load</h2><p>${esc(e.message)}</p><p class="small">Please confirm the GitHub folders exist exactly as: assets/styles.css, scripts/app.js, data/site-data.json.</p></div></div></div>`;console.error(e)});
