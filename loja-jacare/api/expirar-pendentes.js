import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// mesmo prazo usado no admin.html pra sumir da tela — mantenha os dois iguais
const LIMITE_HORAS_PENDENTE = 3;

export default async function handler(req, res) {
  // A Vercel chama esse endpoint via Cron (ver vercel.json) mandando esse header
  // automaticamente. Confere pra ninguém de fora conseguir disparar a limpeza.
  const authHeader = req.headers['authorization'] || '';
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ sucesso: false, erro: 'Nao autorizado' });
  }

  try {
    const limite = new Date(Date.now() - LIMITE_HORAS_PENDENTE * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('pedidos')
      .update({ status: 'CANCELADO', cancelado_em: new Date().toISOString() })
      .eq('status', 'PENDENTE')
      .lt('created_at', limite)
      .select('id, code');

    if (error) {
      console.error('Erro ao expirar pendentes:', error);
      return res.status(500).json({ sucesso: false, erro: error.message });
    }

    console.log(`Expirou ${data?.length || 0} pedido(s) pendente(s) antigo(s).`);
    return res.status(200).json({ sucesso: true, cancelados: data?.length || 0 });
  } catch (e) {
    return res.status(500).json({ sucesso: false, erro: e.message });
  }
}
