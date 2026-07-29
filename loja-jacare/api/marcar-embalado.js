import { createClient } from '@supabase/supabase-js';
import { isValidAdminCookie } from './_adminAuth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, erro: 'Metodo nao permitido' });
  }

  try {
    if (!isValidAdminCookie(req.headers.cookie || '')) {
      return res.status(401).json({ sucesso: false, erro: 'Sessao admin invalida' });
    }

    const { codigo } = req.body || {};

    if (!codigo) {
      return res.status(400).json({ sucesso: false, erro: 'Codigo obrigatorio' });
    }

    const { data, error } = await supabase
      .from('pedidos')
      .update({ embalado: true })
      .eq('code', codigo)
      .eq('status', 'PRONTO') // so faz sentido embalar um pedido ja pago
      .select('id, code, status, embalado');

    if (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Pedido nao encontrado ou nao esta PRONTO' });
    }

    return res.status(200).json({ sucesso: true, pedido: data[0] });
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
}
