import { createClient } from '@supabase/supabase-js';
import { isValidAdminCookie } from './_adminAuth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STATUS_PERMITIDOS = new Set(['PENDENTE', 'PRONTO', 'ENTREGA', 'FINALIZADO']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, erro: 'Metodo nao permitido' });
  }

  try {
    if (!isValidAdminCookie(req.headers.cookie || '')) {
      return res.status(401).json({ sucesso: false, erro: 'Sessao admin invalida' });
    }

    const { codigo, status } = req.body || {};
    const statusNormalizado = String(status || '').toUpperCase();

    if (!codigo || !STATUS_PERMITIDOS.has(statusNormalizado)) {
      return res.status(400).json({ sucesso: false, erro: 'Codigo ou status invalido' });
    }

    const updateData = { status: statusNormalizado };
    if (statusNormalizado === 'FINALIZADO') {
      updateData.finalizado_em = new Date().toISOString();
    } else {
      updateData.finalizado_em = null;
    }

    const { data, error } = await supabase
      .from('pedidos')
      .update(updateData)
      .eq('code', codigo)
      .select('id, code, status, finalizado_em');

    if (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Pedido nao encontrado' });
    }

    return res.status(200).json({ sucesso: true, pedido: data[0] });
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
}
