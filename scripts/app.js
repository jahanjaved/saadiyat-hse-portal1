const excelUrl =
  "https://keoic-my.sharepoint.com/:x:/g/personal/javed_iqbal_keo_com/IQCGR8a_jdX9Qby3ogTagZkKActIcdhhf4t60NlDh1ARwNM?e=h0caJQ&download=1";

const output = document.getElementById("app-status");

fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(excelUrl)}`)
  .then((res) => {
    if (!res.ok) {
      throw new Error("Could not reach SharePoint Excel file.");
    }
    return res.arrayBuffer();
  })
  .then((data) => {
    const workbook = XLSX.read(data, { type: "array" });

    let html = "";

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      html += `<div class="sheet-block">`;
      html += `<h3>${escapeHtml(sheetName)}</h3>`;
      html += `<div class="sheet-meta">Rows loaded: ${rows.length}</div>`;

      if (!rows.length) {
        html += `<div class="notice">No data found in this sheet.</div>`;
        html += `</div>`;
        return;
      }

      const headers = Object.keys(rows[0]);

      html += `<table>`;
      html += `<thead><tr>`;
      headers.forEach((header) => {
        html += `<th>${escapeHtml(header)}</th>`;
      });
      html += `</tr></thead>`;
      html += `<tbody>`;

      rows.forEach((row) => {
        html += `<tr>`;
        headers.forEach((header) => {
          const value = row[header] ?? "";
          html += `<td>${formatCell(value)}</td>`;
        });
        html += `</tr>`;
      });

      html += `</tbody></table>`;
      html += `</div>`;
    });

    output.innerHTML = html;
  })
  .catch((err) => {
    output.innerHTML = `
      <div class="error">
        <strong>Failed to load Excel data.</strong><br />
        ${escapeHtml(err.message)}
      </div>
    `;
    console.error(err);
  });

function formatCell(value) {
  const text = String(value).trim();

  if (!text) return "";

  if (text.startsWith("http://") || text.startsWith("https://")) {
    return `<a href="${escapeAttr(text)}" target="_blank" rel="noreferrer">Open link</a>`;
  }

  return escapeHtml(text).replace(/\n/g, "<br>");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}
