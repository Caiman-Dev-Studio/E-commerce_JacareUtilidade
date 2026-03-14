import { buildAdminCookie } from './_adminAuth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  try {
    const { password } = req.body || {};

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
