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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ sucesso:false });

  try {
    const { inicioUTC, fimUTC } = rangeDiaBrasil();

    // deleta FINALIZADO de hoje (por created_at)
    const { error, count } = await supabase
      .from('pedidos')
      .delete({ count: 'exact' })
      .eq('status', 'FINALIZADO')
      .gte('created_at', inicioUTC)
      .lte('created_at', fimUTC);

    if (error) return res.status(500).json({ sucesso:false, erro:error.message });

    return res.status(200).json({ sucesso:true, removidos: count || 0 });
  } catch (e) {
    return res.status(500).json({ sucesso:false, erro:e.message });
  }
}