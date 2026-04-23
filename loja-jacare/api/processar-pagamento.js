import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ sucesso: false });

    try {
        const { formData, codPedido } = req.body || {};

        if (!formData || !codPedido) {
            return res.status(400).json({ sucesso: false, erro: 'Dados incompletos.' });
        }

        // Envia o pagamento para o Mercado Pago
        const payment = new Payment(client);
        const resultado = await payment.create({ body: formData });

        const status = resultado.status;
        console.log(`Pagamento criado | Pedido: ${codPedido} | Status: ${status} | ID: ${resultado.id}`);

        if (status === 'approved') {
            // Atualiza pedido para PRONTO direto (pagamento confirmado)
            await supabase
                .from('pedidos')
                .update({ status: 'PRONTO', pagamento_mp_id: String(resultado.id) })
                .eq('code', codPedido);

            return res.status(200).json({ sucesso: true, status: 'approved' });
        }

        if (status === 'pending' || status === 'in_process') {
            // Pix fica pendente até o cliente pagar — o webhook confirma depois
            return res.status(200).json({ sucesso: true, status: 'pending' });
        }

        // Recusado ou outro status negativo
        return res.status(200).json({
            sucesso: false,
            status,
            erro: resultado.status_detail || 'Pagamento nao aprovado.'
        });

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        return res.status(500).json({ sucesso: false, erro: error?.message || 'Erro interno.' });
    }
}
