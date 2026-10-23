export const MAX_FRAME = 256 * 1024;
export const MAX_RATE = 120;
export function allowedOrigin(origin) {
  if (origin === 'https://yexiaotingonemt-jpg.github.io') return true;
  try { const u = new URL(origin); return u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname); } catch { return false; }
}
export function roomPath(path) { return /^\/rooms\/([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8})$/.exec(path)?.[1] ?? null; }
export function allowedData(role, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return (role === 'host' ? ['welcome','reject','state','ready','ping','pong','closed'] : ['hello','input','command','ready','ping','pong','closed']).includes(data.type);
}
