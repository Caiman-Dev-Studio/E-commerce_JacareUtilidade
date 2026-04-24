import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // MP também envia GET para validar a URL — responde 200
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    // Log completo do que chegou — ver no Vercel Functions → Logs
    console.log('=== WEBHOOK MP RECEBIDO ===');
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Body:', JSON.stringify(req.body));

    const body = req.body || {};

    // O MP pode enviar de dois formatos diferentes
    // Formato 1: { type: 'payment', data: { id: '123' } }
    // Formato 2: { topic: 'payment', id: '123' }
    const type = body.type || body.topic;
    const paymentId = body.data?.id || body.id;

    console.log(`Tipo: ${type} | Payment ID: ${paymentId}`);

    if (type !== 'payment') {
      console.log('Ignorando notificação não relacionada a pagamento:', type);
      return res.status(200).json({ ok: true });
    }

    if (!paymentId) {
      console.error('ID de pagamento ausente no body:', body);
      return res.status(200).json({ ok: true }); // retorna 200 para MP não retentar
    }

    // Busca detalhes do pagamento
    const payment = new Payment(client);
    const pagamento = await payment.get({ id: paymentId });

    const status = pagamento.status;
    const codPedido = pagamento.external_reference;

    console.log(`Status: ${status} | Pedido: ${codPedido} | ID: ${paymentId}`);

    if (status === 'approved') {
      let codPedido = pagamento.external_reference;

      // Se external_reference vier nulo, busca pelo pagamento_mp_id que salvamos antes
      if (!codPedido) {
        console.log('external_reference nulo, buscando pedido pelo pagamento_mp_id...');
        const { data: pedidoEncontrado } = await supabase
          .from('pedidos')
          .select('code')
          .eq('pagamento_mp_id', String(paymentId))
          .single();

        codPedido = pedidoEncontrado?.code;
        console.log('Pedido encontrado pelo ID do pagamento:', codPedido);
      }

      if (!codPedido) {
        console.error('Nao foi possivel identificar o pedido para o pagamento:', paymentId);
        return res.status(200).json({ ok: false, error: 'Pedido nao encontrado' });
      }

      const { data, error } = await supabase
        .from('pedidos')
        .update({ status: 'PRONTO', pagamento_mp_id: String(paymentId) })
        .eq('code', codPedido)
        .select();

      if (error) {
        console.error('Erro Supabase:', JSON.stringify(error));
        return res.status(200).json({ ok: false, error: error.message });
      }

      console.log(`Pedido ${codPedido} atualizado para PRONTO. Rows afetadas:`, data?.length);
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Erro no webhook:', err.message, err.stack);
    return res.status(200).json({ ok: false, error: err.message });
  }
}