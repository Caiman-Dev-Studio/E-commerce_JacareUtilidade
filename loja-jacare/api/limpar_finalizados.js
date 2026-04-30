import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// dia atual no Brasil (UTC-3)
function rangeDiaBrasil() {
  const agora = new Date();
  const utc = agora.getTime() + (agora.getTimezoneOffset() * 60000);
  const br = new Date(utc - 3 * 60 * 60000);

  const inicio = new Date(br); inicio.setHours(0,0,0,0);
  const fim = new Date(br); fim.setHours(23,59,59,999);

  const inicioUTC = new Date(inicio.getTime() + 3*60*60000).toISOString();
  const fimUTC = new Date(fim.getTime() + 3*60*60000).toISOString();

  return { inicioUTC, fimUTC };
}

function erroColunaFinalizadoEm(error) {
  return String(error?.message || '').includes('finalizado_em');
}

async function buscarIdsFinalizadosDoDia(inicioUTC, fimUTC) {
  const porFinalizacao = await supabase
    .from('pedidos')
    .select('id')
    .eq('status', 'FINALIZADO')
    .gte('finalizado_em', inicioUTC)
    .lte('finalizado_em', fimUTC);

  if (porFinalizacao.error) {
    if (!erroColunaFinalizadoEm(porFinalizacao.error)) {
      return { ids: [], error: porFinalizacao.error, fallbackCreatedAt: false };
    }

    return { ids: [], error: null, fallbackCreatedAt: true };
  }

  const legados = await supabase
    .from('pedidos')
    .select('id')
    .eq('status', 'FINALIZADO')
    .is('finalizado_em', null)
    .gte('created_at', inicioUTC)
    .lte('created_at', fimUTC);

  if (legados.error) return { ids: [], error: legados.error, fallbackCreatedAt: false };

  const ids = [...(porFinalizacao.data || []), ...(legados.data || [])]
    .map((pedido) => pedido.id)
    .filter(Boolean);

  return { ids: [...new Set(ids)], error: null, fallbackCreatedAt: false };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ sucesso:false });

  try {
    const { inicioUTC, fimUTC } = rangeDiaBrasil();

    const resultadoBusca = await buscarIdsFinalizadosDoDia(inicioUTC, fimUTC);
    if (resultadoBusca.error) {
      return res.status(500).json({ sucesso:false, erro:resultadoBusca.error.message });
    }

    let query = supabase
      .from('pedidos')
      .delete({ count: 'exact' })
      .eq('status', 'FINALIZADO');

    if (resultadoBusca.fallbackCreatedAt) {
      query = query
        .gte('created_at', inicioUTC)
        .lte('created_at', fimUTC);
    } else if (resultadoBusca.ids.length > 0) {
      query = query.in('id', resultadoBusca.ids);
    } else {
      return res.status(200).json({ sucesso:true, removidos: 0 });
    }

    const { error, count } = await query;

    if (error) return res.status(500).json({ sucesso:false, erro:error.message });

    return res.status(200).json({ sucesso:true, removidos: count || 0 });
  } catch (e) {
    return res.status(500).json({ sucesso:false, erro:e.message });
  }
}
