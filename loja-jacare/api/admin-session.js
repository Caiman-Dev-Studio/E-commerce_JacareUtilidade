import { isValidAdminCookie } from './_adminAuth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  try {
    const cookieHeader = req.headers.cookie || '';
    const ok = isValidAdminCookie(cookieHeader);

    return res.status(200).json({ ok });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Erro interno.'
    });
  }
}