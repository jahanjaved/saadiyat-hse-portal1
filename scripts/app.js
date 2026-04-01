fetch('./data/workbook-data.json')
  .then((res) => {
    if (!res.ok) throw new Error('Could not load workbook-data.json');
    return res.json();
  })
  .then((data) => {
    renderNav(data.sheet_order || []);
    renderSummary(data.summary || {});
    renderSheets(data);
  })
  .catch((err) => {
    document.getElementById('sheetSections').innerHTML = `
      <section class="section">
        <div class="section-card">
          <h2 class="sheet-title">Error</h2>
          <p class="empty-note">${err.message}</p>
        </div>
      </section>
    `;
    console.error(err);
  });

function renderNav(sheetOrder) {
  const nav = document.getElementById('topnav');
  nav.innerHTML = `<a href="#home">Home</a>` + sheetOrder.map(name => `<a href="#${safeId(name)}">${escapeHtml(name)}</a>`).join('');
}

function renderSummary(summary) {
  document.getElementById('summaryLine').textContent =
    `${summary.workbook_name || ''} · ${summary.generated_at || ''}`;

  const boxes = [
    { label: 'Sheets', value: summary.sheet_count || 0 },
    { label: 'Inspections', value: summary.inspection_count || 0 },
    { label: 'Actions', value: summary.action_count || 0 }
  ];

  document.getElementById('summaryBoxes').innerHTML = boxes.map(b => `
    <div class="metric">
      <div class="label">${b.label}</div>
      <div class="value">${b.value}</div>
    </div>
  `).join('');
}

function renderSheets(data) {
  const container = document.getElementById('sheetSections');
  container.innerHTML = '';

  for (const name of data.sheet_order) {
    const sheet = data.sheets[name];
    if (!sheet) continue;

    const section = document.createElement('section');
    section.className = 'section';
    section.id = safeId(name);

    let html = `<div class="section-card"><h2 class="sheet-title">${escapeHtml(name)}</h2>`;

    if (Array.isArray(sheet.notes) && sheet.notes.length) {
      if (sheet.type === 'notes') {
        html += `<div class="notes-list">` +
          sheet.notes.map(n => `<div class="note-item">${escapeHtml(String(n))}</div>`).join('') +
          `</div>`;
      } else {
        html += `<div class="meta-strip">` +
          sheet.notes.map(row => `<div class="meta-item">${row.filter(v => String(v).trim() !== '').map(v => escapeHtml(String(v))).join(' — ')}</div>`).join('') +
          `</div>`;
      }
    }

    if (sheet.rows && sheet.rows.length && sheet.headers && sheet.headers.length) {
      html += renderTable(sheet.headers, sheet.rows);
    } else if (sheet.type !== 'notes') {
      html += `<p class="empty-note">No rows found for this sheet.</p>`;
    }

    html += `</div>`;
    section.innerHTML = html;
    container.appendChild(section);
  }
}

function renderTable(headers, rows) {
  let html = '<div class="table-wrap"><table><thead><tr>';
  headers.forEach(h => html += `<th>${escapeHtml(String(h))}</th>`);
  html += '</tr></thead><tbody>';

  rows.forEach(r => {
    html += '<tr>';
    headers.forEach(h => {
      html += `<td>${formatCell(r[h])}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

function formatCell(value) {
  const text = value == null ? '' : String(value);
  if (!text.trim()) return '';
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return `<a href="${escapeAttr(text)}" target="_blank" rel="noreferrer">Open link</a>`;
  }
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function safeId(str) {
  return String(str).replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}
