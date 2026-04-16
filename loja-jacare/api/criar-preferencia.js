// =============================================================
// api/criar-preferencia.js  (Vercel Serverless Function)
// =============================================================
// Instale o SDK: npm install mercadopago
// Adicione no .env:  MP_ACCESS_TOKEN=APP_USR-xxxx...
// =============================================================

import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN // coloque no .env da Vercel
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { codPedido, itens, frete, total, entrega, endereco, pagamento } = req.body;

    if (!codPedido || !itens || !itens.length) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Monta os items no formato do Mercado Pago
    const mpItens = itens.map(item => ({
      id: String(item.id),
      title: item.nome,
      quantity: item.qtd,
      unit_price: Number(item.preco),
      currency_id: 'BRL',
    }));

    // Adiciona o frete como item separado (se houver)
    if (frete > 0) {
      mpItens.push({
        id: 'frete',
        title: `Frete - ${endereco}`,
        quantity: 1,
        unit_price: Number(frete),
        currency_id: 'BRL',
      });
    }

    const preference = new Preference(client);

    const body = {
      items: mpItens,
      external_reference: codPedido, // ID do pedido no seu sistema
      statement_descriptor: 'Jacare Utilidades',

      // URLs de retorno após o pagamento
      back_urls: {
        success: `${process.env.SITE_URL}/pagamento-sucesso.html?pedido=${codPedido}`,
        failure: `${process.env.SITE_URL}/pagamento-falha.html?pedido=${codPedido}`,
        pending: `${process.env.SITE_URL}/pagamento-pendente.html?pedido=${codPedido}`,
      },

      // Redireciona automaticamente após aprovação
      auto_return: 'approved',

      // Webhook para notificações de pagamento
      notification_url: `${process.env.SITE_URL}/api/webhook-mp`,

      // Metadados do pedido
      metadata: {
        pedido: codPedido,
        entrega,
        endereco,
        pagamento,
      },

      // Validade da preferência: 1 hora
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    const result = await preference.create({ body });

    // init_point  = link de produção
    // sandbox_init_point = link de testes
    return res.status(200).json({
      id: result.id,
      init_point: result.init_point,           // use em produção
      sandbox_init_point: result.sandbox_init_point, // use para testar
    });

  } catch (err) {
    console.error('Erro ao criar preferência MP:', err);
    return res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
  }
}
