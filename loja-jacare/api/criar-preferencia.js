import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

function qtdSegura(valor, minimo = 1) {
    const n = parseInt(valor, 10);
    if (!Number.isFinite(n) || n < minimo) return minimo;
    return Math.min(n, 100); // trava um teto sao pra evitar payloads absurdos
}

// Busca no Supabase o preco REAL de cada produto citado no pedido (itens avulsos
// e itens dentro de kits). Nunca usa o preco que vier do navegador.
async function buscarPrecosReais(idsProdutos) {
    if (idsProdutos.length === 0) return new Map();

    const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, preco, estoque')
        .in('id', idsProdutos);

    if (error) throw new Error(`Erro ao validar produtos no Supabase: ${error.message}`);

    const mapa = new Map();
    (data || []).forEach(produto => {
        mapa.set(String(produto.id), {
            preco: Number(produto.preco || 0),
            nome: produto.nome,
            estoque: Number(produto.estoque || 0)
        });
    });
    return mapa;
}

// Busca a config de desconto de cada kit citado e a lista de produtos que
// realmente pertencem a ele — impede montar um "kit" fake com produtos que
// nao fazem parte dele so pra aproveitar o desconto.
async function buscarConfigKits(idsKits) {
    if (idsKits.length === 0) return new Map();

    const [{ data: kits, error: erroKits }, { data: itensKit, error: erroItens }] = await Promise.all([
        supabase.from('kits')
            .select('id, nome, ativo, desconto_tipo, desconto_min_itens, desconto_percentual')
            .in('id', idsKits),
        supabase.from('kit_itens')
            .select('kit_id, produto_id')
            .in('kit_id', idsKits)
    ]);

    if (erroKits) throw new Error(`Erro ao validar kits: ${erroKits.message}`);
    if (erroItens) throw new Error(`Erro ao validar itens dos kits: ${erroItens.message}`);

    const mapa = new Map();
    (kits || []).forEach(kit => {
        mapa.set(String(kit.id), {
            ativo: kit.ativo,
            nome: kit.nome,
            descontoTipo: kit.desconto_tipo,
            descontoMinItens: kit.desconto_min_itens,
            descontoPercentual: Number(kit.desconto_percentual || 0),
            produtosPermitidos: new Set()
        });
    });

    (itensKit || []).forEach(vinculo => {
        const kit = mapa.get(String(vinculo.kit_id));
        if (kit) kit.produtosPermitidos.add(String(vinculo.produto_id));
    });

    return mapa;
}

async function validarItensDoPedido(itensRecebidos) {
    const itensSimples = itensRecebidos.filter(item => item.tipo !== 'kit');
    const itensKitRecebidos = itensRecebidos.filter(item => item.tipo === 'kit');

    const idsProdutosSimples = itensSimples.map(item => String(item.id));
    const idsProdutosEmKits = itensKitRecebidos.flatMap(
        item => (item.itensKit || []).map(sub => String(sub.id))
    );
    const idsKits = itensKitRecebidos.map(item => String(item.kitId));

    const [precosReais, configKits] = await Promise.all([
        buscarPrecosReais([...new Set([...idsProdutosSimples, ...idsProdutosEmKits])]),
        buscarConfigKits([...new Set(idsKits)])
    ]);

    const itensValidados = [];

    // --- Produtos avulsos ---
    for (const item of itensSimples) {
        const real = precosReais.get(String(item.id));
        if (!real) {
            throw new Error(`Produto ${item.id} nao encontrado ou indisponivel.`);
        }

        itensValidados.push({
            id: String(item.id),
            title: real.nome || item.nome || 'Produto',
            quantity: qtdSegura(item.qtd),
            unit_price: real.preco,
            currency_id: 'BRL'
        });
    }

    // --- Kits (com desconto recalculado a partir dos produtos reais) ---
    for (const item of itensKitRecebidos) {
        const kit = configKits.get(String(item.kitId));
        if (!kit || !kit.ativo) {
            throw new Error(`Kit ${item.kitId} nao encontrado ou indisponivel.`);
        }

        const idsEnviados = (item.itensKit || []).map(sub => String(sub.id));
        if (idsEnviados.length === 0) {
            throw new Error(`Kit ${item.kitId} enviado sem itens.`);
        }

        // Garante que todo item enviado realmente pertence a esse kit
        const idsInvalidos = idsEnviados.filter(id => !kit.produtosPermitidos.has(id));
        if (idsInvalidos.length > 0) {
            throw new Error(`Kit ${item.kitId}: itens invalidos (${idsInvalidos.join(', ')}).`);
        }

        let subtotal = 0;
        idsEnviados.forEach(id => {
            const real = precosReais.get(id);
            if (!real) throw new Error(`Produto ${id} do kit ${item.kitId} nao encontrado.`);
            subtotal += real.preco;
        });

        let desconto = 0;
        if (
            kit.descontoTipo === 'min_items_percent' &&
            idsEnviados.length >= (kit.descontoMinItens || Infinity)
        ) {
            desconto = subtotal * (kit.descontoPercentual / 100);
        }

        const totalKit = Math.max(subtotal - desconto, 0);

        itensValidados.push({
            id: `kit-${item.kitId}`,
            title: `Kit: ${kit.nome}`,
            quantity: 1,
            unit_price: Number(totalKit.toFixed(2)),
            currency_id: 'BRL'
        });
    }

    return itensValidados;
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

        // Preco/valor SEMPRE recalculado a partir do Supabase — o que vier
        // do navegador (item.preco, entrada.totalFinal) e ignorado aqui.
        const itensMercadoPago = await validarItensDoPedido(itens);

        const freteValidado = Number(frete || 0) > 0 ? Number(frete) : 0;
        if (freteValidado > 0) {
            itensMercadoPago.push({
                id: 'frete',
                title: freteDescricao || `Frete - ${endereco}`,
                quantity: 1,
                unit_price: freteValidado,
                currency_id: 'BRL'
            });
        }

        const totalValidado = itensMercadoPago.reduce(
            (soma, item) => soma + (item.unit_price * item.quantity), 0
        );

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

        // Mantem o pedido salvo no Supabase em sincronia com o valor
        // realmente cobrado (evita o "total" do pedido ficar diferente
        // do que o cliente pagou de fato).
        await supabase
            .from('pedidos')
            .update({ total: Number(totalValidado.toFixed(2)) })
            .eq('code', codPedido);

        // Retorna apenas o preference_id — é o que o Checkout Brick precisa
        return res.status(200).json({ preference_id: result.id });

    } catch (error) {
        console.error('Erro ao criar preferencia MP:', error);
        return res.status(400).json({ error: error?.message || 'Erro ao criar preferencia de pagamento.' });
    }
}import { MercadoPagoConfig, Preference } from 'mercadopago';

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
