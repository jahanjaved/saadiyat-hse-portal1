
fetch('data/site-data.json')
.then(res => res.json())
.then(data => {

  document.getElementById('summary').innerHTML =
    `<p>Total Inspections: ${data.inspections.length}</p>
     <p>Total Actions: ${data.actions.length}</p>`;

  let insp = '<table><tr><th>ID</th><th>Cluster</th></tr>';
  data.inspections.forEach(i=>{
    insp += `<tr><td>${i.id}</td><td>${i.cluster}</td></tr>`;
  });
  insp += '</table>';
  document.getElementById('inspections').innerHTML = insp;

  let act = '<table><tr><th>ID</th><th>Status</th></tr>';
  data.actions.forEach(a=>{
    act += `<tr><td>${a.id}</td><td>${a.status}</td></tr>`;
  });
  act += '</table>';
  document.getElementById('actions').innerHTML = act;

});
