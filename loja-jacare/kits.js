function kitNormalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function produtoEstaDisponivel(produto) {
    return produto && Number(produto.estoque) > 0;
}

function ordenarPorNome(produtos) {
    return [...produtos].sort((a, b) =>
        kitNormalizarTexto(a.nome).localeCompare(kitNormalizarTexto(b.nome))
    );
}

function normalizarDesconto(kitBanco) {
    if (!kitBanco || kitBanco.desconto_tipo === 'none') {
        return null;
    }

    return {
        tipo: kitBanco.desconto_tipo,
        minItens: Number(kitBanco.desconto_min_itens || 0),
        percentual: Number(kitBanco.desconto_percentual || 0)
    };
}

function extrairCategoriasDoKit(kitBanco) {
    return (kitBanco.kit_categorias || [])
        .map(item => item.categoria)
        .filter(Boolean);
}

function extrairIdsDosProdutosDoKit(kitBanco) {
    return [...(kitBanco.kit_itens || [])]
        .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
        .map(item => Number(item.produto_id))
        .filter(Boolean);
}

function montarKitHidratado(kitBanco, mapaProdutos, opcoes = {}) {
    const produtoAtual = opcoes.produtoAtual || null;
    const idsDosItens = extrairIdsDosProdutosDoKit(kitBanco);

    let itens = idsDosItens
        .map(produtoId => mapaProdutos.get(Number(produtoId)))
        .filter(produtoEstaDisponivel);

    if (produtoAtual) {
        const jaExiste = itens.some(item => Number(item.id) === Number(produtoAtual.id));
        if (!jaExiste) {
            itens = [produtoAtual, ...itens];
        } else {
            itens = [
                produtoAtual,
                ...itens.filter(item => Number(item.id) !== Number(produtoAtual.id))
            ];
        }
    }

    itens = ordenarPorNome(
        itens.filter((item, index, lista) =>
            lista.findIndex(outro => Number(outro.id) === Number(item.id)) === index
        )
    );

    if (produtoAtual) {
        itens = [
            ...itens.filter(item => Number(item.id) === Number(produtoAtual.id)),
            ...itens.filter(item => Number(item.id) !== Number(produtoAtual.id))
        ];
    }

    if (itens.length === 0) {
        return null;
    }

    return {
        id: String(kitBanco.id),
        slug: kitBanco.slug,
        nome: kitBanco.nome,
        descricao: kitBanco.descricao_curta || 'Monte sua combinacao do seu jeito.',
        categorias: extrairCategoriasDoKit(kitBanco),
        destaqueHome: Boolean(kitBanco.destaque_home),
        desconto: normalizarDesconto(kitBanco),
        itens
    };
}

function criarCatalogoDeKits() {
    let produtosAtuais = [];
    let kitsDoBanco = [];
    let mapaProdutos = new Map();
    let kitsHidratados = [];

    // Recebe produtos e kits do Supabase e prepara tudo para a vitrine.
    function hidratar({ produtos = [], kits = [] } = {}) {
        produtosAtuais = Array.isArray(produtos) ? [...produtos] : [];
        kitsDoBanco = Array.isArray(kits) ? [...kits] : [];
        mapaProdutos = new Map(produtosAtuais.map(produto => [Number(produto.id), produto]));

        kitsHidratados = kitsDoBanco
            .map(kit => montarKitHidratado(kit, mapaProdutos))
            .filter(Boolean);

        return kitsHidratados;
    }

    function obterKitsHome() {
        return kitsHidratados.filter(kit => kit.destaqueHome);
    }

    function obterKitsPorCategoria(categoria) {
        return kitsHidratados.filter(kit => kit.categorias.includes(categoria));
    }

    function obterKitsPorBusca(termo, produtosFiltrados = []) {
        const termoNormalizado = kitNormalizarTexto(termo);
        const categoriasEncontradas = new Set(
            produtosFiltrados
                .map(produto => produto.categoria)
                .filter(Boolean)
        );

        return kitsHidratados.filter(kit => {
            const categoriaCompativel = kit.categorias.some(categoria =>
                categoriasEncontradas.has(categoria) ||
                kitNormalizarTexto(categoria).includes(termoNormalizado)
            );

            const nomeCompativel = kitNormalizarTexto(kit.nome).includes(termoNormalizado);

            return categoriaCompativel || nomeCompativel;
        });
    }

    function obterKitParaProduto(produto) {
        if (!produto) return null;

        const kitBanco = kitsDoBanco.find(kit => {
            const idsDosItens = extrairIdsDosProdutosDoKit(kit);
            const categorias = extrairCategoriasDoKit(kit);

            return idsDosItens.includes(Number(produto.id)) || categorias.includes(produto.categoria);
        });

        if (!kitBanco) return null;
        return montarKitHidratado(kitBanco, mapaProdutos, { produtoAtual: produto });
    }

    function obterKitPorId(kitId, opcoes = {}) {
        const kitBanco = kitsDoBanco.find(kit => String(kit.id) === String(kitId));
        if (!kitBanco) return null;

        return montarKitHidratado(kitBanco, mapaProdutos, opcoes);
    }

    return {
        hidratar,
        obterKitsHome,
        obterKitsPorCategoria,
        obterKitsPorBusca,
        obterKitParaProduto,
        obterKitPorId
    };
}

window.KitCatalog = criarCatalogoDeKits();
