import { createClient } from '@supabase/supabase-js';
import { ensureAdminRequest } from './_adminAuth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_STATUS = new Set(['ENTREGA', 'FINALIZADO']);

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes(columnName.toLowerCase()) && message.includes('column');
}

async function updatePedidoStatus(codigo, status) {
  const payload = { status };

  if (status === 'FINALIZADO') {
    payload.updated_at = new Date().toISOString();
  }

  let result = await supabase
    .from('pedidos')
    .update(payload)
    .eq('code', codigo);

  if (status === 'FINALIZADO' && result.error && isMissingColumnError(result.error, 'updated_at')) {
    result = await supabase
      .from('pedidos')
      .update({ status })
      .eq('code', codigo);
  }

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Metodo nao permitido.' });
  }

  if (!ensureAdminRequest(req, res)) return;

  try {
    const { codigo, status } = req.body || {};

    if (!codigo || !status) {
      return res.status(400).json({ ok: false, error: 'Codigo e status sao obrigatorios.' });
    }

    if (!ALLOWED_STATUS.has(status)) {
      return res.status(400).json({ ok: false, error: 'Status invalido.' });
    }

    const { error } = await updatePedidoStatus(codigo, status);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Erro interno.' });
  }
}
