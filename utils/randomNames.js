import crypto from 'crypto';

export function randomNameGenerator(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
