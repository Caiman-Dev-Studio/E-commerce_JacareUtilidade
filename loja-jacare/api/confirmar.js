import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { codigo, token } = req.body;

  const { data, error } = await supabase
    .from('pedidos')
    .update({ status: 'CONFIRMADO' })
    .eq('codigo', codigo)
    .eq('token_confirmacao', token)
    .select();

  if (error || data.length === 0) {
    return res.status(400).json({ sucesso: false });
  }

  return res.status(200).json({ sucesso: true });
}