import { MercadoPagoConfig, Preference } from 'mercadopago';

function obterBaseUrl(req) {
    const valorBruto =
        process.env.SITE_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL;

    if (valorBruto) {
        return valorBruto.startsWith('http') ? valorBruto : `https://${valorBruto}`;
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    return host ? `${proto}://${host}` : '';
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo nao permitido' });
    }

    try {
        if (!process.env.MP_ACCESS_TOKEN) {
            return res.status(500).json({ error: 'MP_ACCESS_TOKEN nao configurado.' });
        }

        const client = new MercadoPagoConfig({
            accessToken: process.env.MP_ACCESS_TOKEN
        });

        const {
            codPedido, itens, frete, entrega, endereco,
            pagamento, modalidadeEntrega, freteDescricao, freteGrupo
        } = req.body || {};

        if (!codPedido || !Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({ error: 'Dados invalidos para gerar a preferencia.' });
        }

        const itensMercadoPago = itens.map(item => ({
            id: String(item.id),
            title: item.nome,
            quantity: Number(item.qtd || 1),
            unit_price: Number(item.preco || 0),
            currency_id: 'BRL'
        }));

        if (Number(frete || 0) > 0) {
            itensMercadoPago.push({
                id: 'frete',
                title: freteDescricao || `Frete - ${endereco}`,
                quantity: 1,
                unit_price: Number(frete),
                currency_id: 'BRL'
            });
        }

        const preference = new Preference(client);
        const siteUrl = obterBaseUrl(req);

        const body = {
            items: itensMercadoPago,
            external_reference: codPedido,
            statement_descriptor: 'Jacare Utilidades',
            metadata: { pedido: codPedido, entrega, modalidadeEntrega, freteGrupo, endereco, pagamento },
            expires: true,
            expiration_date_from: new Date().toISOString(),
            expiration_date_to: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        };

        if (siteUrl) {
            body.notification_url = `${siteUrl}/api/webhook-mp`;
        }

        const result = await preference.create({ body });

        // Retorna apenas o preference_id — é o que o Checkout Brick precisa
        return res.status(200).json({ preference_id: result.id });

    } catch (error) {
        console.error('Erro ao criar preferencia MP:', error);
        return res.status(500).json({ error: error?.message || 'Erro ao criar preferencia de pagamento.' });
    }
}
