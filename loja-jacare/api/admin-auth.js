import { buildAdminCookie, clearAdminCookie, isValidAdminCookie } from './_adminAuth.js';

// Substitui admin-login.js, admin-logout.js e admin-session.js num arquivo só,
// pra economizar funções (a Vercel Hobby permite no máximo 12 no total).
//
// GET  /api/admin-auth                       -> checa se a sessão é válida
// POST /api/admin-auth {password}             -> login
// POST /api/admin-auth {acao:'logout'}         -> logout
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const ok = isValidAdminCookie(req.headers.cookie || '');
      return res.status(200).json({ ok });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message || 'Erro interno.' });
    }
  }

  if (req.method === 'POST') {
    const { acao, password } = req.body || {};

    if (acao === 'logout') {
      res.setHeader('Set-Cookie', clearAdminCookie());
      return res.status(200).json({ ok: true });
    }

    try {
      if (!password) {
        return res.status(400).json({ ok: false, error: 'Senha obrigatória.' });
      }
      if (password !== process.env.STORE_PANEL_PASSWORD) {
        return res.status(401).json({ ok: false, error: 'Senha inválida.' });
      }
      res.setHeader('Set-Cookie', buildAdminCookie());
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message || 'Erro interno.' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Método não permitido.' });
}
