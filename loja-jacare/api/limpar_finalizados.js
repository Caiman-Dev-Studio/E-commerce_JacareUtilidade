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

function getDataBrasilKey(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

function isMesmoDiaBrasil(value, targetKey) {
  return getDataBrasilKey(value) === targetKey;
}

async function buscarIdsFinalizadosDoDia() {
  const hojeBrasil = getDataBrasilKey(new Date());
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('status', 'FINALIZADO');

  if (error) {
    return { data: null, error };
  }

  const ids = (data || [])
    .filter((pedido) => {
      const referencia = pedido.updated_at || pedido.created_at;
      return isMesmoDiaBrasil(referencia, hojeBrasil);
    })
    .map((pedido) => pedido.id)
    .filter(Boolean);

  return { data: ids, error: null };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ sucesso: false });
  if (!ensureAdminRequest(req, res)) return;

  try {
    const { data, error: selectError } = await buscarIdsFinalizadosDoDia();

    if (selectError) {
      return res.status(500).json({ sucesso: false, erro: selectError.message });
    }

    const ids = data || [];

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
