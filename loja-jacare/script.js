const SUPABASE_URL = 'https://ffmtqfjafolydcdaldap.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BoUeyott9mr3wpDRS4VP7g_mn7mAQx_';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const FRETE_ECONOMICO_GRUPOS = [
    { grupo: 'Grupo Nova Cidade', ancora: 'Nova Cidade', valor: 6, bairros: ['Nova Cidade', 'Conjunto Habitacional Bernardo Valadares Vasconcelos', 'Cidade Nova', 'Luxemburgo', 'Interlagos I', 'Interlagos II', 'Gloria', 'Funcionarios', 'Aeroporto Industrial', 'Alex Paiva', 'Distrito Industrial', 'Jardim Europa', 'Kwait', 'Iraque'] },
    { grupo: 'Grupo Manoa', ancora: 'Manoa', valor: 12, bairros: ['Manoa', 'Sao Francisco de Assis', 'Nossa Senhora do Carmo', 'Nossa Senhora do Carmo II', 'Nossa Senhora das Gracas', 'Santa Rita de Cassia', 'Santa Cruz'] },
    { grupo: 'Grupo Centro', ancora: 'Centro', valor: 9, bairros: ['Centro', 'Piedade', 'Vila Santa Helena', 'Canaa', 'Braz Filizola', 'Chacara do Paiva'] },
    { grupo: 'Grupo Boa Vista', ancora: 'Boa Vista', valor: 9, bairros: ['Boa Vista', 'New York', 'Panorama', 'Vila Brasil', 'Esperanca', 'Bom Jardim', 'Fatima', 'Santa Marcelina', 'Papavento'] },
    { grupo: 'Grupo Jardim Arizona', ancora: 'Jardim Arizona', valor: 12, bairros: ['Jardim Arizona', 'Mangabeiras', 'Campo de Aviacao', 'Santa Helena', 'Santa Luzia', 'Jardim Cambui', 'Cedro e Cachoeira', 'Vila Ipe'] },
    { grupo: 'Grupo Vale das Palmeiras', ancora: 'Vale das Palmeiras', valor: 15, bairros: ['Vale das Palmeiras', 'Mata Grande', 'Sao Cristovao', 'Sao Cristovao II', 'Catarina', 'Recanto da Serra'] },
    { grupo: 'Grupo Padre Teodoro', ancora: 'Padre Teodoro', valor: 15, bairros: ['Padre Teodoro', 'Padre Teodoro II', 'Iporanga', 'Iporanga II', 'Varzea', 'Varzea da Lagoa II', 'Novo Horizonte', 'Recanto do Cedro', 'Florida'] },
    { grupo: 'Grupo Eldorado', ancora: 'Eldorado', valor: 15, bairros: ['Eldorado', 'Universitario', 'Henrique Nery', 'Jardim Universitario', 'Honorina Pontes', 'Ouro Branco'] },
    { grupo: 'Grupo Brasilia', ancora: 'Brasilia', valor: 12, bairros: ['Brasilia', 'Itapoa', 'Itapoa II', 'Anchieta', 'Industrias', 'Industrias II', 'Esmeraldas', 'Esmeraldas II', 'Santa Maria'] },
    { grupo: 'Grupo Montreal', ancora: 'Montreal', valor: 12, bairros: ['Montreal', 'Montreal II', 'Olinto Alvim', 'Brejinho', 'Sao Vicente', 'Residencial Por do Sol', 'Residencial Por do Sol'] },
    { grupo: 'Grupo CDI', ancora: 'CDI', valor: 12, bairros: ['CDI', 'Canada', 'Canada II', 'Monte Carlo', 'Tamandua'] },
    { grupo: 'Grupo JK', ancora: 'JK', valor: 9, bairros: ['JK', 'Alvorada', 'Planalto', 'Nova Serrana', 'Portal da Serra', 'Titamar'] },
    { grupo: 'Grupo Verde Vale', ancora: 'Verde Vale', valor: 7.5, bairros: ['Verde Vale', 'Jardim dos Pequis', 'Belo Vale', 'Belo Vale II', 'Orozimbo Macedo'] },
    { grupo: 'Grupo Progresso', ancora: 'Progresso', valor: 12, bairros: ['Progresso', 'Progresso II', 'Vapabucu', 'Morro do Claro', 'Residencial Da Vinci', 'Residencial Ermitage', 'Dona Dora', 'Dante Lanza', 'Blue Garden Safira'] },
    { grupo: 'Grupo Jardim Primavera', ancora: 'Jardim Primavera', valor: 12, bairros: ['Jardim Primavera I', 'Jardim Primavera II', 'Bela Vista I', 'Bela Vista II', 'Bela Vista III', 'Santa Felicidade', 'Residencial Campestre', 'Nossa Senhora de Lourdes'] },
    { grupo: 'Grupo Cidade de Deus', ancora: 'Cidade de Deus', valor: 15, bairros: ['Cidade de Deus', 'Ondina Vasconcelos de Oliveira'] },
    { grupo: 'Grupo Bouganvile', ancora: 'Bouganvile', valor: 20, bairros: ['Bouganvile I', 'Bouganvile II', 'Bouganville I', 'Bouganville II', 'Residencial Dona Silvia I', 'Condominio Lago Azul'] },
    { grupo: 'Grupo Sao Geraldo', ancora: 'Sao Geraldo', valor: 12, bairros: ['Sao Geraldo', 'Sao Pedro', 'Sao Jose', 'Santa Rosa', 'Santo Antonio', 'Sao Dimas', 'Sao Jorge'] },
    { grupo: 'Grupo Barreiro', ancora: 'Barreiro', valor: 20, bairros: ['Barreiro', 'Barreiro de Baixo', 'Barreiro de Cima', 'Lontra', 'Lontrinha', 'Silva Xavier', 'Quinducha', 'Brejao', 'Alto Coqueiral', 'Fazenda Velha', 'Paredao', 'Condominio Lagoas do Moinho', 'Quintas da Varginha', 'Quintas do Lago I', 'Quintas do Lago II'] }
];

let produtosLocais = [];
let bannersLocais = [];
let kitsLocais = [];
let carrinho = [];
let valorFreteAtual = 0;
let bannerAtual = 0;
let modalQuantidadeAtual = 1;
let produtoAtualModal = null;
let freteCalculado = false;
let kitAtualProduto = null;
let kitsCarrinhoAbertos = new Set();
let detalhesFreteAtual = {
    modalidade: '',
    grupo: '',
    bairro: '',
    cidade: '',
    descricao: ''
};

const estadoVitrine = {
    modo: 'home',
    termo: '',
    categoria: ''
};

// Estado isolado do modal de kits para manter a interacao previsivel.
const estadoModalKit = {
    kit: null,
    selecionados: new Set(),
    itemExpandidoId: null,
    produtoOrigemId: null
};

function formatarMoeda(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
}

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizarIdentificadorBairro(texto) {
    return normalizarTexto(texto)
        .replace(/^bairro\s+/g, '')
        .replace(/\biii\b/g, '3')
        .replace(/\bii\b/g, '2')
        .replace(/\bi\b/g, '1')
        .replace(/\s+/g, ' ')
        .trim();
}

const MAPA_FRETE_ECONOMICO = FRETE_ECONOMICO_GRUPOS.reduce((mapa, grupo) => {
    grupo.bairros.forEach(bairro => {
        mapa.set(normalizarIdentificadorBairro(bairro), {
            bairro,
            grupo: grupo.grupo,
            ancora: grupo.ancora,
            valor: Number(grupo.valor)
        });
    });
    return mapa;
}, new Map());

const BAIRROS_ECONOMICOS = Array.from(
    new Set(
        FRETE_ECONOMICO_GRUPOS.flatMap(grupo => grupo.bairros.map(bairro => bairro.trim()))
    )
).sort((a, b) => a.localeCompare(b, 'pt-BR'));

function produtoDisponivel(produto) {
    return produto && Number(produto.estoque) > 0;
}

function produtoEmPromocao(produto) {
    const valor = produto?.em_promocao;
    const precoAtual = Number(produto?.preco || 0);
    const precoAntigo = Number(produto?.preco_antigo || 0);

    if (typeof valor === 'boolean') return valor || precoAntigo > precoAtual;
    if (typeof valor === 'number') return valor === 1 || precoAntigo > precoAtual;

    const texto = String(valor || '').trim().toLowerCase();
    return ['1', 'true', 't', 'sim', 'yes', 'y', 'on'].includes(texto) || precoAntigo > precoAtual;
}

function obterTotalEntradaCarrinho(entrada) {
    if (!entrada) return 0;
    return entrada.tipo === 'kit' ? Number(entrada.totalFinal || 0) : Number(entrada.preco || 0);
}

function contarItensCarrinho() {
    return carrinho.reduce((total, entrada) => {
        if (entrada.tipo === 'kit') {
            return total + entrada.itens.length;
        }
        return total + 1;
    }, 0);
}

function atualizarContadorCarrinho() {
    const contador = document.getElementById('cart-count');
    const fab = document.querySelector('.cart-fab');

    if (contador) {
        contador.innerText = contarItensCarrinho();
    }

    if (fab) {
        fab.classList.remove('pulse-cart');
        void fab.offsetWidth;
        fab.classList.add('pulse-cart');
    }
}

function obterResumoFinanceiroCarrinho() {
    return carrinho.reduce((resumo, entrada) => {
        if (entrada.tipo === 'kit') {
            resumo.subtotalBruto += Number(entrada.subtotal || 0);
            resumo.descontoKits += Number(entrada.desconto || 0);
            resumo.subtotalLiquido += Number(entrada.totalFinal || 0);
        } else {
            const preco = Number(entrada.preco || 0);
            resumo.subtotalBruto += preco;
            resumo.subtotalLiquido += preco;
        }

        return resumo;
    }, {
        subtotalBruto: 0,
        descontoKits: 0,
        subtotalLiquido: 0
    });
}

function obterTotalCarrinhoSemFrete() {
    return obterResumoFinanceiroCarrinho().subtotalLiquido;
}

function renderizarResumoCheckout() {
    const resumoBox = document.getElementById('checkout-resumo-pedido');
    if (!resumoBox) return;

    const subtotal = obterTotalCarrinhoSemFrete();
    const totalFinal = subtotal + valorFreteAtual;
    const metodoEntrega = document.getElementById('metodo-entrega')?.value || 'Retirada';
    const bairro = document.getElementById('input-bairro')?.value.trim() || detalhesFreteAtual.bairro || '-';
    const linhas = [
        '<div class="checkout-summary-title">Resumo do pedido</div>',
        `<div class="checkout-summary-row"><span>Subtotal</span><strong>${formatarMoeda(subtotal)}</strong></div>`
    ];

    if (metodoEntrega === 'Retirada') {
        linhas.push('<div class="checkout-summary-row"><span>Entrega</span><strong>Retirada na loja</strong></div>');
        linhas.push('<div class="checkout-summary-row"><span>Frete</span><strong>R$ 0,00</strong></div>');
    } else {
        const modalidade = obterTipoEntregaSelecionado();
        linhas.push(`<div class="checkout-summary-row"><span>Entrega</span><strong>${modalidade ? modalidade.toUpperCase() : 'Selecione'}</strong></div>`);

        if (modalidade === 'Economica') {
            linhas.push(`<div class="checkout-summary-row"><span>Bairro</span><strong>${bairro || '-'}</strong></div>`);
        }

        linhas.push(`<div class="checkout-summary-row"><span>Frete</span><strong>${freteCalculado ? formatarMoeda(valorFreteAtual) : 'A calcular'}</strong></div>`);
    }

    linhas.push(`
        <div class="checkout-summary-total-wrap">
            <div class="checkout-summary-row checkout-summary-total">
                <span>Total final</span>
                <strong>${formatarMoeda(totalFinal)}</strong>
            </div>
            <div class="checkout-summary-total-note">Subtotal + frete do pedido</div>
        </div>
    `);
    resumoBox.innerHTML = linhas.join('');
}

function atualizarTotalComFrete() {
    const totalFinal = obterTotalCarrinhoSemFrete() + valorFreteAtual;
    const resumo = document.getElementById('resumo-total-geral');

    if (resumo) {
        resumo.innerText = formatarMoeda(totalFinal);
    }

    renderizarResumoCheckout();
}

function hidratarCatalogoDeKits() {
    if (!window.KitCatalog) return;
    window.KitCatalog.hidratar({
        produtos: produtosLocais,
        kits: kitsLocais
    });
}

function mostrarHomeVisivel(mostrar) {
    const hero = document.querySelector('.hero');
    const categories = document.querySelector('.categories');
    const btnVoltar = document.getElementById('container-busca-voltar');
    const secaoKitsHome = document.getElementById('secao-kits-home');

    if (hero) hero.style.display = mostrar ? 'block' : 'none';
    if (categories) categories.style.display = mostrar ? 'block' : 'none';
    if (btnVoltar) btnVoltar.style.display = mostrar ? 'none' : 'block';
    if (secaoKitsHome) secaoKitsHome.style.display = mostrar ? 'block' : 'none';
}

function obterCidadeSelecionada() {
    return document.getElementById('input-cidade')?.value.trim() || 'Sete Lagoas';
}

function obterTipoEntregaSelecionado() {
    return document.getElementById('tipo-entrega')?.value || '';
}

function obterLabelTipoEntrega() {
    const tipo = obterTipoEntregaSelecionado();
    return tipo ? tipo.toUpperCase() : 'Selecione';
}

function atualizarSelecaoVisualEntrega() {
    const tipoSelecionado = obterTipoEntregaSelecionado();
    document.querySelectorAll('.delivery-option').forEach(botao => {
        botao.classList.toggle('is-selected', botao.dataset.value === tipoSelecionado);
    });
}

function atualizarInfoTipoEntrega() {
    const info = document.getElementById('tipo-entrega-info');
    if (!info) return;

    const tipo = obterTipoEntregaSelecionado();
    if (!tipo) {
        info.style.display = 'none';
        info.innerHTML = '';
        return;
    }

    if (tipo === 'Turbo') {
        info.innerHTML = '<strong>Turbo</strong><br>Entregas liberadas em ate 2 horas apos a confirmacao do pagamento.';
    } else {
        info.innerHTML = '<strong>Economico</strong><br>Entregas realizadas apos as 16:00. Pedidos confirmados depois desse horario seguem no proximo dia, tambem apos as 16:00.';
    }

    info.style.display = 'block';
}

function limparErroTipoEntrega() {
    const erro = document.getElementById('tipo-entrega-erro');
    if (erro) erro.style.display = 'none';
}

function exibirErroTipoEntrega() {
    const erro = document.getElementById('tipo-entrega-erro');
    if (erro) erro.style.display = 'block';
}

function selecionarTipoEntrega(tipo) {
    const input = document.getElementById('tipo-entrega');
    if (!input) return;

    input.value = tipo;
    limparErroTipoEntrega();
    atualizarSelecaoVisualEntrega();
    atualizarInfoTipoEntrega();
    marcarFreteComoPendente();
}

function definirStatusFrete(mensagem, cor = '#666') {
    const status = document.getElementById('frete-status');
    if (!status) return;

    status.innerText = mensagem;
    status.style.color = cor;
}

function atualizarAjudaFrete() {
    const ajuda = document.getElementById('frete-ajuda');
    if (!ajuda) return;

    if (obterTipoEntregaSelecionado() === 'Economica') {
        ajuda.innerText = 'Digite o bairro e escolha uma sugestao para evitar erros no calculo do frete.';
        return;
    }

    ajuda.innerText = 'Informe o endereco e confirme o frete para seguir ao pagamento.';
}

function limparDetalhesFrete() {
    detalhesFreteAtual = {
        modalidade: '',
        grupo: '',
        bairro: '',
        cidade: '',
        descricao: ''
    };
}

function obterDescricaoFrete() {
    if (!detalhesFreteAtual.modalidade) {
        return 'Sem frete';
    }

    if (detalhesFreteAtual.modalidade === 'Economica') {
        return 'Entrega Economica';
    }

    return 'Entrega Turbo';
}

function calcularDistanciaEdicao(a, b) {
    const origem = normalizarIdentificadorBairro(a);
    const destino = normalizarIdentificadorBairro(b);
    const matriz = Array.from({ length: origem.length + 1 }, () => new Array(destino.length + 1).fill(0));

    for (let i = 0; i <= origem.length; i += 1) matriz[i][0] = i;
    for (let j = 0; j <= destino.length; j += 1) matriz[0][j] = j;

    for (let i = 1; i <= origem.length; i += 1) {
        for (let j = 1; j <= destino.length; j += 1) {
            const custo = origem[i - 1] === destino[j - 1] ? 0 : 1;
            matriz[i][j] = Math.min(
                matriz[i - 1][j] + 1,
                matriz[i][j - 1] + 1,
                matriz[i - 1][j - 1] + custo
            );
        }
    }

    return matriz[origem.length][destino.length];
}

function obterSugestoesDeBairro(termo, limite = 5) {
    const consulta = normalizarIdentificadorBairro(termo);
    if (!consulta) return BAIRROS_ECONOMICOS.slice(0, limite);

    const ranqueados = BAIRROS_ECONOMICOS.map(bairro => {
        const normalizado = normalizarIdentificadorBairro(bairro);
        let pontuacao = calcularDistanciaEdicao(consulta, normalizado);

        if (normalizado.startsWith(consulta)) pontuacao -= 3;
        else if (normalizado.includes(consulta)) pontuacao -= 1;

        return { bairro, pontuacao };
    });

    return ranqueados
        .sort((a, b) => a.pontuacao - b.pontuacao || a.bairro.localeCompare(b.bairro, 'pt-BR'))
        .slice(0, limite)
        .map(item => item.bairro);
}

function atualizarSugestaoDeBairro() {
    const ajuda = document.getElementById('bairro-sugestao');
    const input = document.getElementById('input-bairro');
    const lista = document.getElementById('lista-bairros-sete-lagoas');
    if (!ajuda || !input || !lista) return;

    const sugestoes = obterSugestoesDeBairro(input.value, 8);
    lista.innerHTML = sugestoes.map(bairro => `<option value="${bairro}"></option>`).join('');

    const termo = input.value.trim();
    if (!termo) {
        ajuda.style.display = 'none';
        ajuda.innerHTML = '';
        return;
    }

    const sugestaoPrincipal = sugestoes[0];
    if (!sugestaoPrincipal) {
        ajuda.style.display = 'none';
        ajuda.innerHTML = '';
        return;
    }

    const normalizadoDigitado = normalizarIdentificadorBairro(termo);
    const normalizadoPrincipal = normalizarIdentificadorBairro(sugestaoPrincipal);

    if (normalizadoDigitado === normalizadoPrincipal) {
        ajuda.style.display = 'none';
        ajuda.innerHTML = '';
        return;
    }

    ajuda.style.display = 'block';
    ajuda.innerHTML = `Voce quis dizer <button type="button" onclick="aplicarSugestaoBairro('${sugestaoPrincipal.replace(/'/g, "\\'")}')">${sugestaoPrincipal}</button>?`;
}

function aplicarSugestaoBairro(bairro) {
    const input = document.getElementById('input-bairro');
    if (!input) return;

    input.value = bairro;
    atualizarSugestaoDeBairro();
    marcarFreteComoPendente();
}

function obterFreteEconomicoPorBairro(bairro, cidade) {
    if (normalizarTexto(cidade) !== 'sete lagoas') {
        return {
            ok: false,
            error: 'A entrega economica atende somente bairros de Sete Lagoas.'
        };
    }

    const chave = normalizarIdentificadorBairro(bairro);
    let info = MAPA_FRETE_ECONOMICO.get(chave);

    if (!info) {
        const sugestoes = obterSugestoesDeBairro(bairro, 1);
        const sugestao = sugestoes[0];
        if (sugestao) {
            const infoSugerida = MAPA_FRETE_ECONOMICO.get(normalizarIdentificadorBairro(sugestao));
            const distancia = calcularDistanciaEdicao(chave, sugestao);
            if (infoSugerida && distancia <= 3) {
                info = infoSugerida;
            }
        }
    }

    if (!info) {
        return {
            ok: false,
            error: 'Nao encontramos esse bairro no mapa da entrega economica. Confira o nome informado ou escolha a entrega Turbo.'
        };
    }

    return {
        ok: true,
        ...info
    };
}

function montarEnderecoCompleto() {
    const rua = document.getElementById('input-endereco')?.value.trim() || '';
    const numero = document.getElementById('input-numero')?.value.trim() || '';
    const bairro = document.getElementById('input-bairro')?.value.trim() || '';
    const complemento = document.getElementById('input-complemento')?.value.trim() || '';
    const cidade = obterCidadeSelecionada();

    let endereco = rua;

    if (numero) endereco += `, ${numero}`;
    if (bairro) endereco += `, ${bairro}`;
    if (complemento) endereco += `, ${complemento}`;
    if (cidade) endereco += `, ${cidade} - MG`;

    return endereco;
}

function marcarFreteComoPendente() {
    freteCalculado = false;
    valorFreteAtual = 0;
    limparDetalhesFrete();
    atualizarTotalComFrete();
    definirStatusFrete('Frete ainda nao calculado.');
    atualizarAjudaFrete();
}

function gerarCodigoPedido() {
    return `JAC-${Math.floor(1000 + Math.random() * 9000)}`;
}

function gerarTokenConfirmacao() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `tok-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function obterProdutoAtualizado(produtoId) {
    return produtosLocais.find(produto => Number(produto.id) === Number(produtoId));
}

function quantidadeNoCarrinho(produtoId) {
    return carrinho.reduce((total, entrada) => {
        if (entrada.tipo === 'kit') {
            return total + entrada.itens.filter(item => Number(item.id) === Number(produtoId)).length;
        }

        return Number(entrada.id) === Number(produtoId) ? total + 1 : total;
    }, 0);
}

function configurarBotaoCheckout() {
    const botaoPrincipal = document.getElementById('modal-btn-acao');
    if (!botaoPrincipal) return null;

    botaoPrincipal.style.display = 'block';
    botaoPrincipal.disabled = false;
    botaoPrincipal.innerText = 'Pagar Agora';
    botaoPrincipal.onclick = pagarMercadoPago;

    return botaoPrincipal;
}

function validarCamposDeEntrega() {
    const metodoEntrega = document.getElementById('metodo-entrega')?.value;
    if (metodoEntrega !== 'Entrega') {
        return true;
    }

    const rua = document.getElementById('input-endereco')?.value.trim() || '';
    const numero = document.getElementById('input-numero')?.value.trim() || '';
    const bairro = document.getElementById('input-bairro')?.value.trim() || '';
    const cidade = obterCidadeSelecionada();
    const tipoEntrega = obterTipoEntregaSelecionado();

    if (!tipoEntrega) {
        exibirErroTipoEntrega();
        alert('Escolha Turbo ou Economico para continuar.');
        return false;
    }

    if (!rua) {
        alert('Informe a rua para entrega.');
        return false;
    }

    if (!numero) {
        alert('Informe o numero da casa para entrega.');
        return false;
    }

    if (!bairro) {
        alert('Informe o bairro para entrega.');
        return false;
    }

    if (!cidade) {
        alert('Informe a cidade para entrega.');
        return false;
    }

    if (obterTipoEntregaSelecionado() === 'Economica' && normalizarTexto(cidade) !== 'sete lagoas') {
        alert('A entrega economica atende somente bairros de Sete Lagoas.');
        return false;
    }

    if (!freteCalculado) {
        alert('Clique em "Calcular frete" antes de finalizar o pedido.');
        return false;
    }

    return true;
}

function agruparItensDoCarrinho() {
    const itensAgrupados = {};

    carrinho.forEach(entrada => {
        if (entrada.tipo === 'kit') {
            entrada.itens.forEach(item => {
                if (!itensAgrupados[item.id]) {
                    itensAgrupados[item.id] = { ...item, qtd: 0, presenteQtd: 0 };
                }
                itensAgrupados[item.id].qtd += 1;
            });
            return;
        }

        if (!itensAgrupados[entrada.id]) {
            itensAgrupados[entrada.id] = { ...entrada, qtd: 0, presenteQtd: 0 };
        }

        itensAgrupados[entrada.id].qtd += 1;

        if (entrada.presente) {
            itensAgrupados[entrada.id].presenteQtd += 1;
        }
    });

    return itensAgrupados;
}

function montarItensMercadoPago() {
    const produtosAgrupados = {};
    const itensMercadoPago = [];

    carrinho.forEach((entrada, index) => {
        if (entrada.tipo === 'kit') {
            itensMercadoPago.push({
                id: `kit-${entrada.kitId || index}-${index}`,
                nome: `Kit: ${entrada.nomeKit}`,
                qtd: 1,
                preco: Number(entrada.totalFinal || 0)
            });
            return;
        }

        if (!produtosAgrupados[entrada.id]) {
            produtosAgrupados[entrada.id] = {
                id: entrada.id,
                nome: entrada.nome,
                qtd: 0,
                preco: Number(entrada.preco || 0)
            };
        }

        produtosAgrupados[entrada.id].qtd += 1;
    });

    return [...Object.values(produtosAgrupados), ...itensMercadoPago];
}

function montarPayloadPedido(codPedido = gerarCodigoPedido()) {
    const pagamento = document.getElementById('metodo-pagamento')?.value || 'Pix';
    const entrega = document.getElementById('metodo-entrega')?.value || 'Retirada';
    const modalidadeEntrega = entrega === 'Entrega' ? obterTipoEntregaSelecionado() : 'Retirada';
    const enderecoCompleto = montarEnderecoCompleto();
    const tokenConfirmacao = gerarTokenConfirmacao();
    const itensAgrupados = agruparItensDoCarrinho();
    const resumo = obterResumoFinanceiroCarrinho();

    return {
        codPedido,
        pagamento,
        entrega,
        modalidadeEntrega,
        enderecoCompleto,
        tokenConfirmacao,
        itensAgrupados,
        itensMercadoPago: montarItensMercadoPago(),
        subtotalBruto: resumo.subtotalBruto,
        descontoKits: resumo.descontoKits,
        subtotalLiquido: resumo.subtotalLiquido,
        frete: valorFreteAtual,
        freteDescricao: obterDescricaoFrete(),
        freteGrupo: detalhesFreteAtual.grupo,
        totalFinal: resumo.subtotalLiquido + valorFreteAtual
    };
}

function erroPermiteFallbackDeInsert(error) {
    const mensagem = String(error?.message || '');

    return (
        mensagem.includes('Could not find the function public.criar_pedido_com_baixa_estoque') ||
        mensagem.includes('Could not find the function') ||
        mensagem.includes('schema cache')
    );
}

async function salvarPedidoNoSupabase(payload) {
    const { error: erroRpc } = await supabaseClient.rpc('criar_pedido_com_baixa_estoque', {
        p_code: payload.codPedido,
        p_itens: payload.itensAgrupados,
        p_endereco: payload.entrega === 'Entrega' ? payload.enderecoCompleto : null,
        p_frete: payload.frete,
        p_total: payload.totalFinal,
        p_status: 'PENDENTE',
        p_token_confirmacao: payload.tokenConfirmacao
    });

    if (!erroRpc) {
        return { ok: true, metodo: 'rpc' };
    }

    if (!erroPermiteFallbackDeInsert(erroRpc)) {
        return { ok: false, error: erroRpc };
    }

    console.warn('RPC de baixa de estoque indisponivel. Usando insert simples como fallback.', erroRpc);

    const { error: erroInsert } = await supabaseClient
        .from('pedidos')
        .insert([
            {
                code: payload.codPedido,
                itens: payload.itensAgrupados,
                endereco: payload.entrega === 'Entrega' ? payload.enderecoCompleto : null,
                frete: payload.frete,
                total: payload.totalFinal,
                status: 'PENDENTE',
                token_confirmacao: payload.tokenConfirmacao
            }
        ]);

    if (erroInsert) {
        return { ok: false, error: erroInsert };
    }

    return { ok: true, metodo: 'insert' };
}

function exibirErroAoSalvarPedido(error) {
    console.error('Erro ao salvar pedido:', error);

    const mensagem = String(error?.message || '');
    if (mensagem.includes('Estoque insuficiente')) {
        alert('Um ou mais itens ficaram sem estoque. Atualize a vitrine e tente novamente.');
        carregarProdutos(true);
        return;
    }

    alert('Erro ao registrar pedido. Tente novamente.');
}

async function carregarBanners() {
    const { data, error } = await supabaseClient
        .from('banners')
        .select('imagem_url')
        .eq('ativo', true);

    if (!error && data.length > 0) {
        bannersLocais = data.map(banner => banner.imagem_url);
        renderizarBanner(0);

        setInterval(() => {
            bannerAtual = (bannerAtual + 1) % bannersLocais.length;
            renderizarBanner(bannerAtual);
        }, 5000);
    }
}

function renderizarBanner(indice) {
    const img = document.getElementById('banner-img');
    if (img && bannersLocais[indice]) {
        img.style.opacity = 0;
        setTimeout(() => {
            img.src = bannersLocais[indice];
            img.style.opacity = 1;
        }, 500);
    }
}

async function calcularFrete() {
    const metodoEntrega = document.getElementById('metodo-entrega')?.value;
    const rua = document.getElementById('input-endereco')?.value.trim() || '';
    const numero = document.getElementById('input-numero')?.value.trim() || '';
    const bairro = document.getElementById('input-bairro')?.value.trim() || '';
    const cidade = obterCidadeSelecionada();
    const enderecoCompleto = montarEnderecoCompleto();
    const modalidadeEntrega = obterTipoEntregaSelecionado();
    const btn = document.getElementById('btn-calcular-frete');

    if (metodoEntrega !== 'Entrega') {
        marcarFreteComoPendente();
        return;
    }

    if (!modalidadeEntrega) {
        exibirErroTipoEntrega();
        alert('Escolha Turbo ou Economico antes de calcular o frete.');
        return;
    }

    if (!rua) {
        alert('Informe a rua para calcular o frete.');
        return;
    }

    if (!numero) {
        alert('Informe o numero da casa para calcular o frete.');
        return;
    }

    if (!bairro) {
        alert('Informe o bairro para calcular o frete.');
        return;
    }

    if (!cidade) {
        alert('Informe a cidade para calcular o frete.');
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerText = 'Calculando...';
        }

        definirStatusFrete(
            modalidadeEntrega === 'Economica'
                ? 'Consultando tabela da entrega economica...'
                : 'Consultando frete Turbo...'
        );

        if (modalidadeEntrega === 'Economica') {
            const resultadoEconomico = obterFreteEconomicoPorBairro(bairro, cidade);

            if (!resultadoEconomico.ok) {
                marcarFreteComoPendente();
                definirStatusFrete(resultadoEconomico.error, '#c62828');
                alert(resultadoEconomico.error);
                return;
            }

            const inputBairro = document.getElementById('input-bairro');
            if (inputBairro && resultadoEconomico.bairro) {
                inputBairro.value = resultadoEconomico.bairro;
            }
            atualizarSugestaoDeBairro();

            valorFreteAtual = Number(resultadoEconomico.valor);
            freteCalculado = true;
            detalhesFreteAtual = {
                modalidade: 'Economica',
                grupo: resultadoEconomico.grupo,
                bairro: resultadoEconomico.bairro || bairro,
                cidade,
                descricao: 'Entrega Economica'
            };
            atualizarTotalComFrete();

            definirStatusFrete(
                `Entrega Economica: ${formatarMoeda(valorFreteAtual)}${resultadoEconomico.bairro ? ` | Bairro: ${resultadoEconomico.bairro}` : ''}`,
                'var(--green)'
            );
            return;
        }

        const geoResponse = await fetch(`/api/geocode?address=${encodeURIComponent(enderecoCompleto)}`);
        const geoData = await geoResponse.json();

        if (!geoResponse.ok || geoData.lat == null || geoData.lng == null) {
            console.error('Erro ao geocodificar endereco:', geoData);
            marcarFreteComoPendente();
            definirStatusFrete(geoData?.error || 'Nao foi possivel localizar o endereco.', '#c62828');
            alert(geoData?.error || 'Nao foi possivel localizar o endereco.');
            return;
        }

        const body = {
            address: enderecoCompleto,
            street: rua,
            number: numero,
            neighborhood: bairro,
            city: cidade,
            state: 'MG',
            country: 'Brasil',
            full_address: enderecoCompleto,
            dropoff_lat: Number(geoData.lat),
            dropoff_lng: Number(geoData.lng)
        };

        const response = await fetch('/api/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erro ao calcular frete:', data);
            marcarFreteComoPendente();
            definirStatusFrete(data?.error || 'Falha ao calcular frete Turbo.', '#c62828');
            alert(data?.error || 'Erro ao calcular o frete.');
            return;
        }

        if (typeof data.shipping === 'number') {
            valorFreteAtual = data.shipping;
            freteCalculado = true;
            detalhesFreteAtual = {
                modalidade: 'Turbo',
                grupo: '',
                bairro,
                cidade,
                descricao: 'Entrega Turbo'
            };
            atualizarTotalComFrete();
            definirStatusFrete(
                `Entrega Turbo: ${formatarMoeda(data.shipping)}${data.eta ? ` | ETA: ${data.eta}` : ''}`,
                'var(--green)'
            );
            return;
        }

        marcarFreteComoPendente();
        definirStatusFrete('Nao foi possivel calcular o frete.', '#c62828');
        alert('Nao foi possivel calcular o frete.');
    } catch (error) {
        console.error('Erro na chamada de frete:', error);
        marcarFreteComoPendente();
        definirStatusFrete('Erro ao consultar o frete.', '#c62828');
        alert('Erro ao consultar o frete.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Calcular frete';
        }
    }
}

async function carregarProdutos(forcarAtualizacao = false) {
    if (produtosLocais.length > 0 && !forcarAtualizacao) {
        limparBusca();
        return;
    }

    const [respostaProdutos, respostaKits] = await Promise.all([
        supabaseClient.from('produtos').select('*'),
        carregarKitsDoSupabase()
    ]);

    if (respostaProdutos.error) {
        console.error('Erro no Supabase ao carregar produtos:', respostaProdutos.error);
        return;
    }

    produtosLocais = respostaProdutos.data || [];
    kitsLocais = respostaKits || [];
    hidratarCatalogoDeKits();
    renderizarVitrine(produtosLocais, { modo: 'home' });
}

async function carregarKitsDoSupabase() {
    const { data, error } = await supabaseClient
        .from('kits')
        .select(`
            id,
            slug,
            nome,
            descricao_curta,
            ativo,
            destaque_home,
            desconto_tipo,
            desconto_min_itens,
            desconto_percentual,
            kit_itens (
                produto_id,
                ordem
            ),
            kit_categorias (
                categoria
            )
        `)
        .eq('ativo', true)
        .order('nome', { ascending: true });

    if (error) {
        console.error('Erro no Supabase ao carregar kits:', error);
        return [];
    }

    // Mantem a leitura do banco enxuta: o preco continua vindo apenas da tabela produtos.
    return Array.isArray(data) ? data : [];
}

function renderizarVitrine(lista, contexto = {}) {
    estadoVitrine.modo = contexto.modo || 'home';
    estadoVitrine.termo = contexto.termo || '';
    estadoVitrine.categoria = contexto.categoria || '';

    renderizarGrids(lista);
    renderizarKitsHome();
    renderizarKitsRelacionados(lista, contexto);

    const estaNaHome = estadoVitrine.modo === 'home';
    mostrarHomeVisivel(estaNaHome);
}

function renderizarGrids(lista) {
    const itensDisponiveis = lista.filter(produtoDisponivel);
    const promocoesDisponiveis = produtosLocais
        .filter(produtoDisponivel)
        .filter(produtoEmPromocao);

    const itensGerais = itensDisponiveis.filter(produto => !produtoEmPromocao(produto));

    renderizarLista(promocoesDisponiveis, 'grid-promocoes');
    renderizarLista(itensGerais, 'grid-produtos-geral');
}

function renderizarLista(lista, elementId) {
    const grid = document.getElementById(elementId);
    if (!grid) return;

    grid.innerHTML = '';

    if (lista.length === 0) {
        grid.innerHTML = '<p style="opacity:0.5; padding:20px; width:100%; text-align:center;">Nenhum item encontrado.</p>';
        return;
    }

    lista.forEach(produto => {
        const ehPromo = produtoEmPromocao(produto);
        const badgeHtml = ehPromo ? '<span class="promo-badge">PROMOCAO</span>' : '';
        const precoAntigoHtml = produto.preco_antigo
            ? `<span class="price-old">${formatarMoeda(produto.preco_antigo)}</span>`
            : '';

        grid.innerHTML += `
            <div class="product-card" onclick="abrirDetalhes(${produto.id})">
                ${badgeHtml}
                <div class="product-img-bg">
                    <img src="${produto.imagem_url}" onerror="handleImageError(this)">
                </div>
                <h3 style="font-size:0.85rem; margin-bottom:5px;">${produto.nome}</h3>
                ${precoAntigoHtml}
                <strong style="color:var(--green)">${formatarMoeda(produto.preco)}</strong>
            </div>
        `;
    });
}

function renderizarKitsHome() {
    const secao = document.getElementById('secao-kits-home');
    const grid = document.getElementById('grid-kits-home');
    if (!secao || !grid || !window.KitCatalog) return;

    const kits = window.KitCatalog.obterKitsHome();
    grid.innerHTML = montarHtmlListaDeKits(kits);
    secao.style.display = estadoVitrine.modo === 'home' && kits.length > 0 ? 'block' : 'none';
}

function renderizarKitsRelacionados(lista, contexto) {
    const secao = document.getElementById('secao-kits-relacionados');
    const grid = document.getElementById('grid-kits-relacionados');
    const titulo = document.getElementById('titulo-kits-relacionados');
    const texto = document.getElementById('texto-kits-relacionados');

    if (!secao || !grid || !titulo || !texto || !window.KitCatalog) return;

    // Kits ficam sempre em um bloco separado para nao misturar com a grade principal.
    let kits = [];

    if (contexto.modo === 'categoria' && contexto.categoria) {
        kits = window.KitCatalog.obterKitsPorCategoria(contexto.categoria);
        titulo.innerText = `Kits relacionados a ${contexto.categoria}`;
        texto.innerText = 'Sugestoes de combinacao para acompanhar os produtos desta categoria.';
    } else if (contexto.modo === 'busca' && contexto.termo) {
        kits = window.KitCatalog.obterKitsPorBusca(contexto.termo, lista);
        titulo.innerText = `Kits relacionados a "${contexto.termo}"`;
        texto.innerText = 'Os produtos continuam na vitrine, e estes kits aparecem separados para facilitar a escolha.';
    }

    grid.innerHTML = montarHtmlListaDeKits(kits);
    secao.style.display = kits.length > 0 ? 'block' : 'none';
}

function montarHtmlListaDeKits(kits) {
    if (!kits || kits.length === 0) {
        return '<p style="opacity:0.6; padding:10px 0;">Nenhum kit disponivel neste momento.</p>';
    }

    return kits.map(kit => {
        const regra = kit.desconto?.tipo === 'min_items_percent'
            ? `${kit.desconto.percentual}% OFF a partir de ${kit.desconto.minItens} itens`
            : 'Combinacao flexivel';

        return `
            <article class="kit-card">
                <span class="kit-card-tag">${regra}</span>
                <h3>${kit.nome}</h3>
                <p>${kit.descricao}</p>
                <div class="kit-card-items">${kit.itens.length} item(ns) sugeridos para combinar.</div>
                <button type="button" class="btn-secondary" onclick="abrirModalKit('${kit.id}')">Kits e combinacoes</button>
            </article>
        `;
    }).join('');
}

function buscarProdutos() {
    const termo = document.getElementById('input-busca').value.trim();
    const termoNormalizado = normalizarTexto(termo);

    if (!termoNormalizado) {
        limparBusca();
        return;
    }

    const filtrados = produtosLocais.filter(produto =>
        normalizarTexto(produto.nome).includes(termoNormalizado)
    );

    renderizarVitrine(filtrados, {
        modo: 'busca',
        termo
    });
}

function limparBusca() {
    document.getElementById('input-busca').value = '';
    renderizarVitrine(produtosLocais, { modo: 'home' });
}

function filtrarPorCategoria(categoria) {
    const filtrados = produtosLocais.filter(produto => produto.categoria === categoria);

    renderizarVitrine(filtrados, {
        modo: 'categoria',
        categoria
    });
}

function configurarBlocoKitDoProduto(produto) {
    const bloco = document.getElementById('bloco-kit-produto');
    const texto = document.getElementById('bloco-kit-produto-texto');
    if (!bloco || !texto || !window.KitCatalog) return;

    kitAtualProduto = window.KitCatalog.obterKitParaProduto(produto);

    if (!kitAtualProduto) {
        bloco.style.display = 'none';
        return;
    }

    texto.innerText = `${kitAtualProduto.nome}: comece com este item marcado e ajuste do seu jeito.`;
    bloco.style.display = 'flex';
}

function abrirDetalhes(id) {
    const produto = produtosLocais.find(item => Number(item.id) === Number(id));
    if (!produto) return;

    produtoAtualModal = produto;
    modalQuantidadeAtual = 1;

    document.getElementById('modal-area-venda').style.display = 'block';
    document.getElementById('modal-area-escolha').style.display = 'none';
    document.getElementById('modal-area-checkout').style.display = 'none';
    document.getElementById('modal-footer-preco').style.display = 'flex';
    document.getElementById('modal-btn-acao').style.display = 'block';
    document.getElementById('modal-titulo').innerText = produto.nome;

    const imagens = [produto.imagem_url, produto.imagem_url2, produto.imagem_url3].filter(imagem => imagem && imagem !== '');

    let galeriaHtml = `<img src="${imagens[0]}" id="foto-principal-modal" class="main-modal-img">`;

    if (imagens.length > 1) {
        galeriaHtml += '<div class="thumbnails-container">';
        imagens.forEach(imagem => {
            galeriaHtml += `<img src="${imagem}" class="thumb-img" onclick="document.getElementById('foto-principal-modal').src='${imagem}'">`;
        });
        galeriaHtml += '</div>';
    }

    document.getElementById('modal-galeria').innerHTML = galeriaHtml;
    document.getElementById('modal-descricao').innerText = produto.descricao || 'E um sucesso!';

    configurarBlocoKitDoProduto(produto);
    atualizarModalUI();

    const btn = document.getElementById('modal-btn-acao');
    btn.innerText = 'Adicionar ao Carrinho';
    btn.onclick = confirmarAdicaoAoCarrinho;

    document.getElementById('modal-produto').style.display = 'block';
}

function atualizarModalUI() {
    document.getElementById('modal-qtd-numero').innerText = modalQuantidadeAtual;

    if (produtoAtualModal) {
        const total = produtoAtualModal.preco * modalQuantidadeAtual;
        let textoPreco = formatarMoeda(total);

        if (produtoAtualModal.preco_antigo) {
            const totalAntigo = produtoAtualModal.preco_antigo * modalQuantidadeAtual;
            textoPreco = `<span style="font-size:0.9rem; color:#aaa; text-decoration:line-through;">De: ${formatarMoeda(totalAntigo)}</span><br>Por: ${formatarMoeda(total)}`;
        }

        document.getElementById('resumo-total-geral').innerHTML = textoPreco;
    }
}

function ajustarQtdModal(delta) {
    const novaQtd = modalQuantidadeAtual + delta;

    if (novaQtd < 1) return;

    if (produtoAtualModal) {
        const produtoAtualizado = obterProdutoAtualizado(produtoAtualModal.id) || produtoAtualModal;
        const jaNoCarrinho = quantidadeNoCarrinho(produtoAtualModal.id);
        const estoqueDisponivel = Number(produtoAtualizado.estoque || 0) - jaNoCarrinho;

        if (novaQtd > estoqueDisponivel) {
            alert(`Opa! So temos ${Math.max(estoqueDisponivel, 0)} unidade(s) disponiveis para adicionar agora.`);
            return;
        }
    }

    modalQuantidadeAtual = novaQtd;
    atualizarModalUI();
}

function confirmarAdicaoAoCarrinho() {
    const produtoAtualizado = obterProdutoAtualizado(produtoAtualModal?.id) || produtoAtualModal;
    const jaNoCarrinho = quantidadeNoCarrinho(produtoAtualModal?.id);
    const estoqueDisponivel = Number(produtoAtualizado?.estoque || 0) - jaNoCarrinho;

    if (modalQuantidadeAtual > estoqueDisponivel) {
        alert(`Opa! So temos ${Math.max(estoqueDisponivel, 0)} unidade(s) disponiveis para adicionar agora.`);
        return;
    }

    for (let i = 0; i < modalQuantidadeAtual; i += 1) {
        carrinho.push({ tipo: 'produto', ...produtoAtualModal, presente: false });
    }

    atualizarContadorCarrinho();
    mostrarConfirmacaoAdicaoAoCarrinho();
}

function mostrarConfirmacaoAdicaoAoCarrinho() {
    document.getElementById('modal-area-venda').style.display = 'none';
    document.getElementById('modal-footer-preco').style.display = 'none';
    document.getElementById('modal-btn-acao').style.display = 'none';
    document.getElementById('modal-area-checkout').style.display = 'none';
    document.getElementById('modal-area-escolha').style.display = 'block';
    document.getElementById('modal-produto').style.display = 'block';
}

function abrirKitDoProdutoAtual() {
    if (!produtoAtualModal || !kitAtualProduto) return;
    abrirModalKit(kitAtualProduto.id, { produtoPreSelecionadoId: produtoAtualModal.id });
}

function calcularResumoDoKit(kit, selecionados) {
    // O desconto e calculado apenas sobre os itens marcados pelo cliente.
    const itensSelecionados = kit.itens.filter(item => selecionados.has(Number(item.id)));
    const subtotal = itensSelecionados.reduce((total, item) => total + Number(item.preco || 0), 0);

    let desconto = 0;
    let regraAtiva = null;

    if (kit.desconto?.tipo === 'min_items_percent') {
        regraAtiva = kit.desconto;
        if (itensSelecionados.length >= kit.desconto.minItens) {
            desconto = subtotal * (kit.desconto.percentual / 100);
        }
    }

    return {
        itensSelecionados,
        subtotal,
        desconto,
        total: subtotal - desconto,
        regraAtiva
    };
}

function abrirModalKit(kitId, opcoes = {}) {
    if (!window.KitCatalog) return;

    const produtoOrigem = produtosLocais.find(produto => Number(produto.id) === Number(opcoes.produtoPreSelecionadoId));
    const kit = window.KitCatalog.obterKitPorId(kitId, { produtoAtual: produtoOrigem });

    if (!kit) {
        alert('Este kit nao esta disponivel no momento.');
        return;
    }

    estadoModalKit.kit = kit;
    estadoModalKit.produtoOrigemId = produtoOrigem ? Number(produtoOrigem.id) : null;
    estadoModalKit.selecionados = new Set(produtoOrigem ? [Number(produtoOrigem.id)] : []);
    estadoModalKit.itemExpandidoId = kit.itens[0] ? Number(kit.itens[0].id) : null;

    document.getElementById('modal-kit').style.display = 'block';
    renderizarModalKit();
}

function fecharModalKit() {
    document.getElementById('modal-kit').style.display = 'none';
    estadoModalKit.kit = null;
    estadoModalKit.selecionados = new Set();
    estadoModalKit.itemExpandidoId = null;
    estadoModalKit.produtoOrigemId = null;
}

function renderizarModalKit() {
    const kit = estadoModalKit.kit;
    if (!kit) return;

    document.getElementById('modal-kit-titulo').innerText = kit.nome;
    document.getElementById('modal-kit-descricao').innerText = kit.descricao;

    const lista = document.getElementById('lista-itens-kit');
    // Apenas um item fica expandido por vez, controlado por itemExpandidoId.
    lista.innerHTML = kit.itens.map(item => {
        const itemId = Number(item.id);
        const estaSelecionado = estadoModalKit.selecionados.has(itemId);
        const estaExpandido = estadoModalKit.itemExpandidoId === itemId;

        return `
            <div class="kit-item">
                <div class="kit-item-header">
                    <input
                        class="kit-item-checkbox"
                        type="checkbox"
                        ${estaSelecionado ? 'checked' : ''}
                        onchange="toggleSelecaoItemKit(${itemId})"
                    >
                    <div class="kit-item-name">${item.nome}</div>
                    <button type="button" class="kit-item-toggle" onclick="toggleExpansaoItemKit(${itemId})">
                        ${estaExpandido ? '^' : '&#709;'}
                    </button>
                </div>
                ${estaExpandido ? `
                    <div class="kit-item-body">
                        <img src="${item.imagem_url}" onerror="handleImageError(this)" alt="${item.nome}">
                        <div>
                            <p>${item.descricao || 'Produto pronto para entrar na sua combinacao.'}</p>
                            <div class="kit-item-price">${formatarMoeda(item.preco)}</div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    const resumo = calcularResumoDoKit(kit, estadoModalKit.selecionados);
    document.getElementById('kit-resumo-subtotal').innerText = formatarMoeda(resumo.subtotal);
    document.getElementById('kit-resumo-desconto').innerText = `- ${formatarMoeda(resumo.desconto)}`;
    document.getElementById('kit-resumo-total').innerText = formatarMoeda(resumo.total);

    const regra = document.getElementById('kit-resumo-regra');
    if (resumo.regraAtiva) {
        if (resumo.itensSelecionados.length >= resumo.regraAtiva.minItens) {
            regra.innerText = `Desconto aplicado: ${resumo.regraAtiva.percentual}% ao selecionar ${resumo.itensSelecionados.length} item(ns).`;
        } else {
            const faltam = resumo.regraAtiva.minItens - resumo.itensSelecionados.length;
            regra.innerText = `Selecione mais ${faltam} item(ns) para liberar ${resumo.regraAtiva.percentual}% de desconto neste kit.`;
        }
    } else {
        regra.innerText = 'Este kit funciona apenas como combinacao flexivel, sem desconto adicional.';
    }

    const botao = document.getElementById('modal-kit-btn-acao');
    botao.disabled = resumo.itensSelecionados.length === 0;
    botao.innerText = resumo.itensSelecionados.length === 0
        ? 'Selecione ao menos um item'
        : 'Adicionar kit ao carrinho';
    botao.onclick = adicionarKitAoCarrinho;
}

function toggleSelecaoItemKit(itemId) {
    const itemNormalizado = Number(itemId);
    if (estadoModalKit.selecionados.has(itemNormalizado)) {
        estadoModalKit.selecionados.delete(itemNormalizado);
    } else {
        estadoModalKit.selecionados.add(itemNormalizado);
    }

    renderizarModalKit();
}

function toggleExpansaoItemKit(itemId) {
    const itemNormalizado = Number(itemId);
    estadoModalKit.itemExpandidoId = estadoModalKit.itemExpandidoId === itemNormalizado ? null : itemNormalizado;
    renderizarModalKit();
}

function adicionarKitAoCarrinho() {
    const kit = estadoModalKit.kit;
    if (!kit) return;

    const resumo = calcularResumoDoKit(kit, estadoModalKit.selecionados);
    if (resumo.itensSelecionados.length === 0) return;

    carrinho.push({
        tipo: 'kit',
        kitId: kit.id,
        nomeKit: kit.nome,
        itens: resumo.itensSelecionados.map(item => ({ ...item })),
        subtotal: resumo.subtotal,
        desconto: resumo.desconto,
        totalFinal: resumo.total
    });

    atualizarContadorCarrinho();
    fecharModalKit();
    mostrarConfirmacaoAdicaoAoCarrinho();
}

function abrirCarrinho() {
    if (carrinho.length === 0) {
        alert('Seu carrinho esta vazio!');
        return;
    }

    document.getElementById('modal-area-venda').style.display = 'none';
    document.getElementById('modal-area-escolha').style.display = 'none';
    document.getElementById('modal-area-checkout').style.display = 'flex';
    document.getElementById('modal-footer-preco').style.display = 'none';
    document.getElementById('modal-btn-acao').style.display = 'block';
    document.getElementById('modal-titulo').innerText = 'Seus pedidos';

    const lista = document.getElementById('modal-lista-carrinho');
    lista.innerHTML = '';

    // O carrinho aceita dois formatos: item individual e bloco de kit.
    carrinho.forEach((entrada, index) => {
        if (entrada.tipo === 'kit') {
            const aberto = kitsCarrinhoAbertos.has(index);
            const itensHtml = entrada.itens.map(item => `
                <div class="cart-kit-item">
                    <span>${item.nome}</span>
                    <strong>${formatarMoeda(item.preco)}</strong>
                </div>
            `).join('');

            lista.innerHTML += `
                <div class="cart-kit-block">
                    <div class="cart-kit-header">
                        <div class="cart-kit-title">${entrada.nomeKit}</div>
                        <div class="cart-kit-total">${formatarMoeda(entrada.totalFinal)}</div>
                        <button type="button" class="cart-kit-toggle" onclick="toggleKitCarrinho(${index})">${aberto ? '^' : '&#709;'}</button>
                        <button type="button" class="cart-kit-delete" onclick="removerKitDoCarrinho(${index})">X</button>
                    </div>
                    ${aberto ? `
                        <div class="cart-kit-body">
                            <div class="cart-kit-items">${itensHtml}</div>
                            <div class="cart-kit-summary">
                                <div class="cart-kit-summary-row">
                                    <span>Subtotal</span>
                                    <strong>${formatarMoeda(entrada.subtotal)}</strong>
                                </div>
                                <div class="cart-kit-summary-row">
                                    <span>Desconto</span>
                                    <strong>- ${formatarMoeda(entrada.desconto)}</strong>
                                </div>
                                <div class="cart-kit-summary-row cart-kit-summary-total">
                                    <span>Total final</span>
                                    <strong>${formatarMoeda(entrada.totalFinal)}</strong>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            return;
        }

        lista.innerHTML += `
            <div class="cart-item-row">
                <button class="btn-remover-unitario" onclick="removerDoCarrinho(${index})">X</button>
                <div class="cart-item-info">
                    <strong>${entrada.nome}</strong>
                    <label style="display:block; font-size:0.75rem; color:var(--green); margin-top:5px; cursor:pointer;">
                        <input type="checkbox" onchange="togglePresente(${index}, this.checked)" ${entrada.presente ? 'checked' : ''}> Presente?
                    </label>
                </div>
                <div class="cart-item-price">${formatarMoeda(entrada.preco)}</div>
            </div>
        `;
    });

    atualizarTotalComFrete();

    const btn = document.getElementById('modal-btn-acao');
    if (btn) {
        configurarBotaoCheckout();
    }

    document.getElementById('modal-produto').style.display = 'block';
}

function toggleKitCarrinho(index) {
    if (kitsCarrinhoAbertos.has(index)) {
        kitsCarrinhoAbertos.delete(index);
    } else {
        kitsCarrinhoAbertos.add(index);
    }
    abrirCarrinho();
}

function reajustarIndicesDosKits(indexRemovido) {
    kitsCarrinhoAbertos = new Set(
        [...kitsCarrinhoAbertos]
            .filter(index => index !== indexRemovido)
            .map(index => (index > indexRemovido ? index - 1 : index))
    );
}

function removerKitDoCarrinho(index) {
    carrinho.splice(index, 1);
    reajustarIndicesDosKits(index);
    atualizarContadorCarrinho();

    if (carrinho.length === 0) {
        fecharModal();
        return;
    }

    abrirCarrinho();
}

function togglePresente(index, valor) {
    if (carrinho[index]?.tipo === 'produto') {
        carrinho[index].presente = valor;
    }
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    reajustarIndicesDosKits(index);
    atualizarContadorCarrinho();

    if (carrinho.length === 0) {
        fecharModal();
        return;
    }

    abrirCarrinho();
}

// ================================================================
// CHECKOUT BRICKS — Mercado Pago Transparente
// ⚠️  Troque pela sua PUBLIC KEY real abaixo
// Pegue em: mercadopago.com.br/developers → Credenciais
// ================================================================
const MP_PUBLIC_KEY = 'APP_USR-9b8a62c5-303e-4f34-88d8-9631ec653899';

let brickController = null;

async function pagarMercadoPago() {
    if (carrinho.length === 0) {
        alert('Seu carrinho esta vazio!');
        return;
    }

    if (!validarCamposDeEntrega()) return;

    const payload = montarPayloadPedido();
    const btnMP = document.getElementById('modal-btn-acao');
    if (btnMP) { btnMP.disabled = true; btnMP.innerText = 'Preparando pagamento...'; }

    try {
        // 1. Cria preferência no backend
        const response = await fetch('/api/criar-preferencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codPedido: payload.codPedido,
                itens: payload.itensMercadoPago,
                frete: payload.frete,
                total: payload.totalFinal,
                entrega: payload.entrega,
                modalidadeEntrega: payload.modalidadeEntrega,
                freteDescricao: payload.freteDescricao,
                freteGrupo: payload.freteGrupo,
                endereco: payload.entrega === 'Entrega' ? payload.enderecoCompleto : 'Retirada na loja',
                pagamento: payload.pagamento
            })
        });

        const data = await response.json();

        if (!response.ok || !data.preference_id) {
            alert(data?.error || 'Nao foi possivel iniciar o pagamento. Tente novamente.');
            if (btnMP) { btnMP.disabled = false; btnMP.innerText = 'Pagar Agora'; }
            return;
        }

        // 2. Salva pedido no Supabase como PENDENTE
        const resultadoSalvar = await salvarPedidoNoSupabase(payload);
        if (!resultadoSalvar.ok) {
            exibirErroAoSalvarPedido(resultadoSalvar.error);
            if (btnMP) { btnMP.disabled = false; btnMP.innerText = 'Pagar Agora'; }
            return;
        }

        // 3. Esconde botão e total, mostra Brick
        if (btnMP) btnMP.style.display = 'none';
        const footer = document.getElementById('modal-footer-preco');
        if (footer) footer.style.display = 'none';

        await renderizarBrickPagamento(data.preference_id, payload);

    } catch (error) {
        console.error('Erro ao iniciar pagamento:', error);
        alert('Erro ao conectar com o Mercado Pago. Tente novamente.');
        if (btnMP) { btnMP.disabled = false; btnMP.innerText = 'Pagar Agora'; }
    }
}

async function renderizarBrickPagamento(preferenceId, payload) {
    const areaBrick = document.getElementById('area-brick-pagamento');
    const container = document.getElementById('brick-container');
    if (!areaBrick || !container) {
        console.error('Containers do Brick nao encontrados. Verifique o index.html.');
        return;
    }

    // Destroi brick anterior se existir
    if (brickController) {
        try { await brickController.unmount(); } catch(e) {}
        brickController = null;
    }
    container.innerHTML = '';
    areaBrick.style.display = 'block';

    const metodo = document.getElementById('metodo-pagamento')?.value || 'Pix';
    const isPix = metodo === 'Pix';
    const isCartao = metodo === 'Cartao' || metodo === 'Cartão';

    try {
        const mp = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        const bricks = mp.bricks();

        brickController = await bricks.create('payment', 'brick-container', {
            initialization: {
                amount: payload.totalFinal,
                preferenceId,
                mercadoPago: {
                    customization: {
                        visual: { hidePaymentButton: false },
                        paymentMethods: { maxInstallments: 1 }
                    }
                }
            },
            customization: {
                paymentMethods: {
                    ...(isPix    ? { bankTransfer: 'all' } : {}),
                    ...(isCartao ? { creditCard: 'all', debitCard: 'all' } : {})
                },
                visual: {
                    style: {
                        theme: 'default',
                        customVariables: {
                            baseColor: '#008037',
                            buttonTextColor: '#ffffff'
                        }
                    },
                    hideFormTitle: true
                }
            },
            callbacks: {
                onReady: () => console.log('Brick pronto'),
                onSubmit: async ({ formData }) => {
                    return new Promise((resolve, reject) => {
                        fetch('/api/processar-pagamento', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ formData, codPedido: payload.codPedido })
                        })
                        .then(r => r.json())
                        .then(res => {
                            if (!res.sucesso) {
                                alert(res.erro || 'Pagamento nao aprovado. Tente novamente.');
                                reject(new Error(res.erro));
                                return;
                            }

                            if (res.status === 'approved') {
                                // Cartão aprovado — vai direto para sucesso
                                limparCarrinhoAposCompra();
                                resolve();
                                window.location.href = `/pagamento-sucesso.html?pedido=${payload.codPedido}`;
                                return;
                            }

                            if (res.status === 'pending') {
                                // Pix gerado — mostra QR Code, NÃO redireciona ainda
                                resolve();
                                mostrarQrCodePix(res.pix, payload.codPedido);
                                return;
                            }

                            reject(new Error('Status desconhecido'));
                        })
                        .catch(err => {
                            alert('Erro ao processar pagamento. Tente novamente.');
                            reject(err);
                        });
                    });
                },
                onError: (error) => {
                    console.error('Brick error:', JSON.stringify(error));
                    if (areaBrick) {
                        areaBrick.innerHTML = `
                            <div style="text-align:center;padding:20px;color:#c62828;">
                                <div style="font-size:2rem;">⚠️</div>
                                <p><strong>Erro ao carregar o formulario de pagamento.</strong></p>
                                <p style="font-size:0.8rem;color:#666;margin-top:4px;">${error?.message || ''}</p>
                                <button class="add-btn" style="margin-top:12px;width:auto;padding:12px 24px;"
                                    onclick="voltarParaCheckout()">← Voltar</button>
                            </div>`;
                    }
                }
            }
        });
    } catch(e) {
        console.error('Erro ao criar Brick:', e);
    }
}

function voltarParaCheckout() {
    const areaBrick = document.getElementById('area-brick-pagamento');
    if (areaBrick) {
        areaBrick.style.display = 'none';
        areaBrick.innerHTML = '<div id="brick-container"></div>';
    }
    const btnMP = document.getElementById('modal-btn-acao');
    if (btnMP) { btnMP.style.display = 'block'; btnMP.disabled = false; btnMP.innerText = 'Pagar Agora'; }
    const footer = document.getElementById('modal-footer-preco');
    if (footer) footer.style.display = 'flex';
}

function mostrarQrCodePix(pix, codPedido) {
    const areaBrick = document.getElementById('area-brick-pagamento');
    if (!areaBrick) return;

    limparCarrinhoAposCompra();

    const qrImagem = pix?.qr_code_base64
        ? `<img src="data:image/png;base64,${pix.qr_code_base64}"
               alt="QR Code Pix"
               style="width:200px;height:200px;display:block;margin:0 auto 16px;">`
        : '';

    const copiaCola = pix?.qr_code
        ? `<div style="margin-top:12px;">
               <p style="font-size:0.8rem;color:#666;margin-bottom:6px;">Ou copie o código:</p>
               <div style="display:flex;gap:8px;align-items:center;">
                   <input id="pix-copia-cola" type="text" readonly
                       value="${pix.qr_code}"
                       style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:0.75rem;background:#f9f9f9;">
                   <button class="add-btn" style="width:auto;padding:10px 16px;white-space:nowrap;"
                       onclick="copiarPixCola()">Copiar</button>
               </div>
           </div>`
        : '';

    areaBrick.innerHTML = `
        <div style="text-align:center;padding:16px 8px;">
            <div style="font-size:2.5rem;margin-bottom:8px;">📱</div>
            <h3 style="color:#008037;margin:0 0 4px;">Pix gerado!</h3>
            <p style="color:#666;font-size:0.9rem;margin-bottom:16px;">
                Escaneie o QR Code ou copie o código Pix no seu banco.
            </p>

            ${qrImagem}

            <div id="pix-status-box" style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:10px;padding:12px;margin-bottom:12px;">
                <p style="margin:0;font-size:0.85rem;color:#2e7d32;">
                    ⏳ Aguardando pagamento...<br>
                    <strong>Código do pedido: ${codPedido}</strong>
                </p>
            </div>

            ${copiaCola}

            <p style="font-size:0.75rem;color:#999;margin-top:12px;">
                Após pagar, você será redirecionado automaticamente.
            </p>
        </div>`;

    areaBrick.style.display = 'block';

    const btnMP = document.getElementById('modal-btn-acao');
    if (btnMP) btnMP.style.display = 'none';
    const footer = document.getElementById('modal-footer-preco');
    if (footer) footer.style.display = 'none';

    // Inicia polling — verifica status a cada 5s por até 10 minutos
    iniciarPollingPix(codPedido);
}

function iniciarPollingPix(codPedido) {
    const maxTentativas = 120; // 120 x 5s = 10 minutos
    let tentativas = 0;

    const intervalo = setInterval(async () => {
        tentativas++;

        try {
            const { data, error } = await supabaseClient
                .from('pedidos')
                .select('status')
                .eq('code', codPedido)
                .single();

            if (error) {
                console.error('Erro ao verificar status:', error);
                return;
            }

            if (data?.status === 'PRONTO' || data?.status === 'ENTREGA' || data?.status === 'FINALIZADO') {
                clearInterval(intervalo);
                // Atualiza o box antes de redirecionar
                const box = document.getElementById('pix-status-box');
                if (box) box.innerHTML = '<p style="margin:0;font-size:0.85rem;color:#2e7d32;">✅ Pagamento confirmado! Redirecionando...</p>';
                setTimeout(() => {
                    window.location.href = `/pagamento-sucesso.html?pedido=${codPedido}`;
                }, 1500);
            }
        } catch(e) {
            console.error('Polling erro:', e);
        }

        if (tentativas >= maxTentativas) {
            clearInterval(intervalo);
        }
    }, 5000);
}

function copiarPixCola() {
    const input = document.getElementById('pix-copia-cola');
    if (!input) return;
    input.select();
    navigator.clipboard?.writeText(input.value).then(() => {
        alert('Código Pix copiado!');
    }).catch(() => {
        document.execCommand('copy');
        alert('Código Pix copiado!');
    });
}

function limparCarrinhoAposCompra() {
    carrinho = [];
    kitsCarrinhoAbertos = new Set();
    valorFreteAtual = 0;
    freteCalculado = false;
    limparDetalhesFrete();
    atualizarContadorCarrinho();
}

function fecharModal() {
    document.getElementById('modal-produto').style.display = 'none';

    // Destroi o Brick com segurança
    if (brickController) {
        try { brickController.unmount(); } catch(e) {}
        brickController = null;
    }

    // Reseta area do Brick
    const areaBrick = document.getElementById('area-brick-pagamento');
    if (areaBrick) {
        areaBrick.style.display = 'none';
        areaBrick.innerHTML = '<div id="brick-container"></div>';
    }

    // Restaura botao e total
    const btnMP = document.getElementById('modal-btn-acao');
    if (btnMP) { btnMP.style.display = 'block'; btnMP.disabled = false; }
    const footer = document.getElementById('modal-footer-preco');
    if (footer) footer.style.display = 'flex';
}


function toggleEndereco() {
    const metodo = document.getElementById('metodo-entrega').value;
    const campoEndereco = document.getElementById('campo-endereco');
    const avisoHorario = document.getElementById('aviso-horario');
    const labelTipoEntrega = document.getElementById('label-tipo-entrega');

    if (metodo === 'Entrega') {
        campoEndereco.style.display = 'block';
        if (labelTipoEntrega) labelTipoEntrega.style.display = 'block';
        if (avisoHorario) avisoHorario.style.display = 'none';
        marcarFreteComoPendente();
    } else {
        campoEndereco.style.display = 'none';
        if (labelTipoEntrega) labelTipoEntrega.style.display = 'none';
        if (avisoHorario) avisoHorario.style.display = 'block';
        marcarFreteComoPendente();
    }

    atualizarSelecaoVisualEntrega();
    atualizarInfoTipoEntrega();
    renderizarResumoCheckout();
}

function compartilharProduto() {
    if (!produtoAtualModal) return;

    const texto = `Olhe o que achei na Jacare Utilidades!\n\n${produtoAtualModal.nome}\nPreco: ${formatarMoeda(produtoAtualModal.preco)}\n\nConfira: ${window.location.href}`;

    if (navigator.share) {
        navigator.share({
            title: 'Jacare Utilidades',
            text: texto,
            url: window.location.href
        }).catch(console.error);
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    }
}

function configurarEventosFrete() {
    const inputEndereco = document.getElementById('input-endereco');
    const inputNumero = document.getElementById('input-numero');
    const inputBairro = document.getElementById('input-bairro');
    const inputComplemento = document.getElementById('input-complemento');
    const inputCidade = document.getElementById('input-cidade');
    const metodoEntrega = document.getElementById('metodo-entrega');
    const tipoEntrega = document.getElementById('tipo-entrega');
    const btnCalcularFrete = document.getElementById('btn-calcular-frete');

    if (inputEndereco) inputEndereco.addEventListener('input', marcarFreteComoPendente);
    if (inputNumero) inputNumero.addEventListener('input', marcarFreteComoPendente);
    if (inputBairro) {
        inputBairro.addEventListener('input', () => {
            atualizarSugestaoDeBairro();
            marcarFreteComoPendente();
        });
        inputBairro.addEventListener('blur', atualizarSugestaoDeBairro);
    }
    if (inputComplemento) inputComplemento.addEventListener('input', marcarFreteComoPendente);
    if (inputCidade) inputCidade.addEventListener('change', marcarFreteComoPendente);
    if (tipoEntrega) tipoEntrega.addEventListener('change', marcarFreteComoPendente);

    if (metodoEntrega) {
        metodoEntrega.addEventListener('change', toggleEndereco);
    }

    if (btnCalcularFrete) {
        btnCalcularFrete.addEventListener('click', calcularFrete);
    }

    const lista = document.getElementById('lista-bairros-sete-lagoas');
    if (lista) {
        lista.innerHTML = BAIRROS_ECONOMICOS.map(bairro => `<option value="${bairro}"></option>`).join('');
    }

    toggleEndereco();
    atualizarSelecaoVisualEntrega();
    atualizarInfoTipoEntrega();
    atualizarAjudaFrete();
    atualizarSugestaoDeBairro();
    renderizarResumoCheckout();
}

carregarProdutos(true);
carregarBanners();

document.addEventListener('DOMContentLoaded', () => {
    configurarEventosFrete();
});
