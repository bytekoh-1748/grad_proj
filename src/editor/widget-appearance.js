/** Display-only choices are saved with the object, independently of its old media links. */
export function appearanceError(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '표시 설정은 객체여야 합니다.';
  if (Object.keys(value).some(key => !['date', 'time', 'text', 'value'].includes(key))) return '지원하지 않는 표시 설정입니다.';
  if (value.date !== undefined && value.date !== '') {
    if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return '표시 날짜를 확인하세요.';
    const [year, month, day] = value.date.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    if (year < 1900 || year > 2100 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '존재하는 날짜를 사용하세요 (1900–2100).';
  }
  if (value.time !== undefined && value.time !== '' && (typeof value.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time))) return '표시 시간은 00:00–23:59입니다.';
  if (value.text !== undefined && (typeof value.text !== 'string' || value.text.length > 48)) return '문구는 48자 이하입니다.';
  if (value.value !== undefined && (typeof value.value !== 'string' || !/^-?\d{1,7}(\.\d{0,2})?$/.test(value.value))) return '표시 숫자는 정수 7자리, 소수 2자리 이하입니다.';
  return null;
}

export function displayDate(now, appearance = {}) {
  const date = new Date(now);
  if (appearance.date) {
    const [year, month, day] = appearance.date.split('-').map(Number);
    date.setFullYear(year, month - 1, day);
  }
  if (appearance.time) {
    const [hour, minute] = appearance.time.split(':').map(Number);
    date.setHours(hour, minute, 0, 0);
  }
  return date;
}

export function shiftDisplayMonth(appearance = {}, delta, now = new Date()) {
  const date = displayDate(now, appearance), day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + delta);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  return {...appearance, date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`};
}

export const DISPLAY_TEXT = {
  camera: 'AFTER IMAGE', turntable: 'SOFT NOISE', lamp: 'SOFT WEATHER',
  book: 'KEEP WHAT MOVES YOU.', cassette: 'IN BETWEEN', terminal: 'STILL HERE_',
  portal: 'ELSE WHERE', projector: 'MOVE MENT', scope: 'SIGNAL',
};

export function displayWords(appearance, fallback) {
  return (appearance.text?.trim() || fallback).split(/\s+/);
}
