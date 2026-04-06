
function normalizeCalendarRows(weeks) {
  const cards = [];
  weeks.forEach(week => {
    const start = week.find(row => Array.isArray(row) && row.some(v => typeof v === 'string' && /\d{2} \w{3} \d{4}/.test(v)));
    if (!start) return;
    const dayRowIndex = week.indexOf(start);
    const dayRow = week[dayRowIndex];
    const eventRows = week.slice(dayRowIndex + 1);
    for (let i = 0; i < 7; i++) {
      const day = dayRow[i];
      if (!day) continue;
      const events = eventRows.map(r => r[i]).filter(Boolean);
      cards.push({ day, events });
    }
  });
  return cards;
}
function renderCalendar(rootId, title, calendar) {
  const root = document.getElementById(rootId);
  const days = normalizeCalendarRows(calendar.weeks || []);
  root.innerHTML = `<div class="card"><div class="section-title"><h3>${escapeHtml(title)}</h3><span class="small">${escapeHtml(calendar.calendar_title || '')}</span></div>
    <div class="calendar-grid">
      ${(calendar.headers || ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']).map(h => `<div class="calendar-head">${escapeHtml(h)}</div>`).join('')}
      ${days.map(d => `<div class="calendar-cell"><div class="date">${escapeHtml(d.day)}</div>${d.events.length ? d.events.map(e => `<span class="event">${escapeHtml(e)}</span>`).join('') : '<div class="small">No item</div>'}</div>`).join('')}
    </div>
  </div>`;
}
document.addEventListener('DOMContentLoaded', async () => {
  const april = await getSheet('April');
  const may = await getSheet('May');
  const june = await getSheet('June');
  renderCalendar('april', 'April Programme', april.structured);
  renderCalendar('may', 'May Programme', may.structured);
  renderCalendar('june', 'June Programme', june.structured);
});
