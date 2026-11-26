function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

function normalizeDateInput(value) {
  if (!value) return null;
  const s = String(value);
  const normalized = s.endsWith('Z') || s.includes('+')
    ? s
    : s.replace(' ', 'T') + 'Z';
  return new Date(normalized);
}

export function formatNairobiDate(value) {
  const date = normalizeDateInput(value);
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function nairobiCalendarDay(value) {
  const date = normalizeDateInput(value);
  if (!date || isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const [year, month, day] = parts.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysUntilNairobi(expiresAt) {
  const target = nairobiCalendarDay(expiresAt);
  if (target === null) return null;
  const today = nairobiCalendarDay(new Date());
  return Math.round((target - today) / 86_400_000);
}

export { escapeHtml, normalizeDateInput };