import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Permitir CORS (opcional, mas ajuda)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { codigo, token } = req.body;

    if (!codigo || !token) {
      return res.status(400).json({ sucesso: false, erro: 'Código e token obrigatórios' });
    }

    console.log('Buscando pedido:', { codigo, token });

    const { data, error } = await supabase
      .from('pedidos')
      .update({ status: 'CONFIRMADO' })
      .eq('code', codigo)
      .eq('token_confirmacao', token)
      .select();

    if (error) {
      console.error('Erro Supabase:', error);
      return res.status(500).json({ sucesso: false, erro: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Pedido não encontrado' });
    }

    return res.status(200).json({ sucesso: true });
    
  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
}