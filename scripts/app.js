fetch('./data/site-data.json')
  .then((res) => {
    if (!res.ok) {
      throw new Error('Could not load ./data/site-data.json');
    }
    return res.json();
  })
  .then((data) => {
    const inspections = Array.isArray(data.inspections) ? data.inspections : [];
    const actions = Array.isArray(data.actions) ? data.actions : [];

    document.getElementById('summary').innerHTML = `
      <p><strong>Total Inspections:</strong> ${inspections.length}</p>
      <p><strong>Total Actions:</strong> ${actions.length}</p>
    `;

    let inspHtml = '<table><tr><th>ID</th><th>Cluster</th><th>Package</th><th>Activity</th><th>Date</th><th>Status</th></tr>';
    inspections.forEach((i) => {
      inspHtml += `
        <tr>
          <td>${i.id ?? ''}</td>
          <td>${i.cluster ?? ''}</td>
          <td>${i.package ?? ''}</td>
          <td>${i.activity ?? ''}</td>
          <td>${i.date ?? ''}</td>
          <td>${i.status ?? ''}</td>
        </tr>
      `;
    });
    inspHtml += '</table>';
    document.getElementById('inspections').innerHTML = inspections.length ? inspHtml : '<p>No inspection data found.</p>';

    let actHtml = '<table><tr><th>ID</th><th>Status</th><th>Cluster</th><th>Owner</th><th>Target Date</th></tr>';
    actions.forEach((a) => {
      actHtml += `
        <tr>
          <td>${a.id ?? ''}</td>
          <td>${a.status ?? ''}</td>
          <td>${a.cluster ?? ''}</td>
          <td>${a.owner ?? ''}</td>
          <td>${a.target_date ?? ''}</td>
        </tr>
      `;
    });
    actHtml += '</table>';
    document.getElementById('actions').innerHTML = actions.length ? actHtml : '<p>No action data found.</p>';
  })
  .catch((err) => {
    document.getElementById('summary').innerHTML = `
      <p style="color:red;"><strong>Error:</strong> ${err.message}</p>
      <p>Make sure the file is exactly at <code>data/site-data.json</code>.</p>
    `;
    document.getElementById('inspections').innerHTML = '';
    document.getElementById('actions').innerHTML = '';
    console.error(err);
  });
