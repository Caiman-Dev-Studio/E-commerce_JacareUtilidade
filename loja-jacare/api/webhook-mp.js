// =============================================================
// api/webhook-mp.js  (Vercel Serverless Function)
// =============================================================
// Recebe notificações do Mercado Pago quando um pagamento
// é aprovado, recusado ou fica pendente.
// Configure a URL deste webhook no painel do MP:
//   https://www.mercadopago.com.br/developers/pt/docs/notifications/webhooks
// =============================================================

import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // chave de SERVICE (não a publishable!)
);

export default async function handler(req, res) {
  // Mercado Pago envia POST com o tipo de notificação
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { type, data } = req.body;

    // Só processa notificações de pagamento
    if (type !== 'payment') {
      return res.status(200).json({ ok: true });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return res.status(400).json({ error: 'ID de pagamento ausente' });
    }

    // Busca os detalhes do pagamento na API do MP
    const payment = new Payment(client);
    const pagamento = await payment.get({ id: paymentId });

    const status = pagamento.status;           // approved | rejected | pending
    const codPedido = pagamento.external_reference; // nosso código JAC-XXXX

    console.log(`Pagamento ${paymentId} | Pedido ${codPedido} | Status: ${status}`);

    if (status === 'approved') {
      // Marca o pedido como PRONTO no Supabase
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'PRONTO', pagamento_mp_id: String(paymentId) })
        .eq('code', codPedido);

      if (error) {
        console.error('Erro ao atualizar pedido no Supabase:', error);
        return res.status(500).json({ error: 'Erro ao atualizar pedido' });
      }
    }

    // Para outros status (rejected, pending) você pode registrar
    // ou enviar notificação, mas não muda o status do pedido aqui.

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Erro no webhook MP:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
