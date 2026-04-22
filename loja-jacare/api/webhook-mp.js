import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const { type, data } = req.body || {};

        if (type !== 'payment') {
            return res.status(200).json({ ok: true });
        }

        const paymentId = data?.id;
        if (!paymentId) {
            return res.status(400).json({ error: 'ID de pagamento ausente.' });
        }

        const payment = new Payment(client);
        const pagamento = await payment.get({ id: paymentId });
        const status = pagamento.status;
        const codPedido = pagamento.external_reference || pagamento.metadata?.pedido;

        if (status === 'approved' && codPedido) {
            const { error } = await supabase
                .from('pedidos')
                .update({ status: 'PRONTO', pagamento_mp_id: String(paymentId) })
                .eq('code', codPedido);

            if (error) {
                console.error('Erro ao atualizar pedido pago:', error);
                return res.status(500).json({ error: 'Erro ao atualizar pedido pago.' });
            }
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Erro no webhook MP:', error);
        return res.status(500).json({ error: 'Erro interno no webhook.' });
    }
}
