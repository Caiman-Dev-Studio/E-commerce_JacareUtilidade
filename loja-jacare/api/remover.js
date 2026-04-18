import { createClient } from '@supabase/supabase-js';
import { ensureAdminRequest } from './_adminAuth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, erro: 'Metodo nao permitido' });
  }
  if (!ensureAdminRequest(req, res)) return;

  try {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({ sucesso: false, erro: 'id obrigatorio' });
    }

    const { error } = await supabase
      .from('pedidos')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }

    return res.status(200).json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
}
