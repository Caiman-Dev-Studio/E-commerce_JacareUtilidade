import { createClient } from '@supabase/supabase-js';
import { ensureAdminRequest } from './_adminAuth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function rangeDiaBrasil() {
  const agora = new Date();
  const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
  const br = new Date(utc - 3 * 60 * 60000);

  const inicio = new Date(br);
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(br);
  fim.setHours(23, 59, 59, 999);

  const inicioUTC = new Date(inicio.getTime() + 3 * 60 * 60000).toISOString();
  const fimUTC = new Date(fim.getTime() + 3 * 60 * 60000).toISOString();

  return { inicioUTC, fimUTC };
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes(columnName.toLowerCase()) && message.includes('column');
}

async function buscarIdsFinalizadosDoDia(inicioUTC, fimUTC) {
  const preferedColumn = 'updated_at';
  let result = await supabase
    .from('pedidos')
    .select('id')
    .eq('status', 'FINALIZADO')
    .gte(preferedColumn, inicioUTC)
    .lte(preferedColumn, fimUTC);

  if (result.error && isMissingColumnError(result.error, preferedColumn)) {
    result = await supabase
      .from('pedidos')
      .select('id')
      .eq('status', 'FINALIZADO')
      .gte('created_at', inicioUTC)
      .lte('created_at', fimUTC);
  }

  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ sucesso: false });
  if (!ensureAdminRequest(req, res)) return;

  try {
    const { inicioUTC, fimUTC } = rangeDiaBrasil();
    const { data, error: selectError } = await buscarIdsFinalizadosDoDia(inicioUTC, fimUTC);

    if (selectError) {
      return res.status(500).json({ sucesso: false, erro: selectError.message });
    }

    const ids = (data || []).map((pedido) => pedido.id).filter(Boolean);

    if (ids.length === 0) {
      return res.status(200).json({ sucesso: true, removidos: 0 });
    }

    const { error, count } = await supabase
      .from('pedidos')
      .delete({ count: 'exact' })
      .in('id', ids);

    if (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }

    return res.status(200).json({ sucesso: true, removidos: count || 0 });
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
}
