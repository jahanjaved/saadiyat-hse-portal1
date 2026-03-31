fetch('data/site-data.json')
  .then(res => {
    if (!res.ok) {
      throw new Error('Failed to load data/site-data.json');
    }
    return res.json();
  })
  .then(data => {
    document.getElementById('summary').innerHTML = `
      <p><strong>Total Inspections:</strong> ${data.inspections.length}</p>
      <p><strong>Total Actions:</strong> ${data.actions.length}</p>
    `;

    let insp = '<table><tr><th>ID</th><th>Cluster</th></tr>';
    data.inspections.forEach(i => {
      insp += `<tr><td>${i.id}</td><td>${i.cluster}</td></tr>`;
    });
    insp += '</table>';
    document.getElementById('inspections').innerHTML = insp;

    let act = '<table><tr><th>ID</th><th>Status</th></tr>';
    data.actions.forEach(a => {
      act += `<tr><td>${a.id}</td><td>${a.status}</td></tr>`;
    });
    act += '</table>';
    document.getElementById('actions').innerHTML = act;
  })
  .catch(err => {
    document.getElementById('summary').innerHTML = `<p style="color:red;">${err.message}</p>`;
    document.getElementById('inspections').innerHTML = '';
    document.getElementById('actions').innerHTML = '';
    console.error(err);
  });
