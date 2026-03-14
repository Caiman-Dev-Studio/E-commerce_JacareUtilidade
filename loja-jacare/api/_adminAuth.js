import crypto from 'crypto';

const COOKIE_NAME = 'jacare_admin_session';

function getSessionValue() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.STORE_PANEL_PASSWORD;

  if (!secret || !password) {
    throw new Error('Defina STORE_PANEL_PASSWORD e ADMIN_SESSION_SECRET nas variáveis de ambiente.');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(password)
    .digest('hex');
}

export function buildAdminCookie() {
  const value = getSessionValue();
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=43200`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function isValidAdminCookie(cookieHeader = '') {
  const expected = getSessionValue();
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), part.slice(index + 1)];
      })
  );

  return cookies[COOKIE_NAME] === expected;
}
