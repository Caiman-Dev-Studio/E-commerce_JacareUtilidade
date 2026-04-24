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

        const payment = new Payment(client);
        const resultado = await payment.create({ body: formData });

        const status = resultado.status;
        const paymentId = String(resultado.id);
        console.log(`Pagamento | Pedido: ${codPedido} | Status: ${status} | ID: ${paymentId}`);

        if (status === 'approved') {
            // Cartão aprovado na hora — marca como PRONTO
            await supabase
                .from('pedidos')
                .update({ status: 'PRONTO', pagamento_mp_id: paymentId })
                .eq('code', codPedido);

            return res.status(200).json({ sucesso: true, status: 'approved' });
        }

        if (status === 'pending' || status === 'in_process') {
            // Pix gerado mas ainda não pago — salva o ID do pagamento e mantém PENDENTE
            // O webhook vai marcar como PRONTO quando o cliente pagar
            await supabase
                .from('pedidos')
                .update({ pagamento_mp_id: paymentId })
                .eq('code', codPedido);

            // Retorna os dados do Pix para mostrar na tela
            const pixData = resultado.point_of_interaction?.transaction_data;
            return res.status(200).json({
                sucesso: true,
                status: 'pending',
                pix: {
                    qr_code: pixData?.qr_code || null,
                    qr_code_base64: pixData?.qr_code_base64 || null,
                    ticket_url: pixData?.ticket_url || null
                }
            });
        }

        // Recusado
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
