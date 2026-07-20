import { createHash } from 'node:crypto';

export function hashSources(parts) {
  const h = createHash('sha256');
  for (const p of parts) {
    h.update(String(p));
    h.update(' '); // separator so ['a','b'] != ['ab']
  }
  return h.digest('hex').slice(0, 12);
}
