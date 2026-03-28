const SUPABASE_URL = 'https://ffmtqfjafolydcdaldap.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BoUeyott9mr3wpDRS4VP7g_mn7mAQx_';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let produtosLocais = [];
let bannersLocais = [];
let carrinho = [];
let valorFreteAtual = 0;
let bannerAtual = 0;
let modalQuantidadeAtual = 1;
let produtoAtualModal = null;
let freteCalculado = false;

// --- CARREGAMENTO ---
async function carregarBanners() {
    const { data, error } = await supabaseClient
        .from('banners')
        .select('imagem_url')
        .eq('ativo', true);

    if (!error && data.length > 0) {
        bannersLocais = data.map(b => b.imagem_url);
        renderizarBanner(0);

        setInterval(() => {
            bannerAtual = (bannerAtual + 1) % bannersLocais.length;
            renderizarBanner(bannerAtual);
        }, 5000);
    }
}

function renderizarBanner(i) {
    const img = document.getElementById('banner-img');
    if (img && bannersLocais[i]) {
        img.style.opacity = 0;
        setTimeout(() => {
            img.src = bannersLocais[i];
            img.style.opacity = 1;
        }, 500);
    }
}

// --- AUTOCOMPLETE DE ENDEREÇO ---
const NOM_VIEWBOX = '-44.35,-19.35,-44.05,-19.55';

let debounceTimer = null;
let enderecoSelecionado = null;

function extrairRuaPrincipal(item) {
    const a = item.address || {};
    return (
        a.road ||
        a.pedestrian ||
        a.cycleway ||
        (item.display_name || '').split(',')[0]?.trim() ||
        ''
    );
}

function obterCidadeSelecionada() {
    return document.getElementById('input-cidade')?.value.trim() || 'Sete Lagoas';
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
    atualizarTotalComFrete();

    const status = document.getElementById('frete-status');
    if (status) {
        status.innerText = 'Frete ainda não calculado.';
        status.style.color = '#666';
    }
}

async function buscarSugestoesEndereco(valor) {
    const lista = document.getElementById('lista-sugestoes');
    if (!lista) return;

    clearTimeout(debounceTimer);
    enderecoSelecionado = null;
    marcarFreteComoPendente();

    if (!valor || valor.trim().length < 3) {
        lista.style.display = 'none';
        lista.innerHTML = '';
        return;
    }

    const cidade = obterCidadeSelecionada();

    lista.innerHTML = '<li style="padding:10px 14px; color:#999; font-size:13px;">🔍 Buscando...</li>';
    lista.style.display = 'block';

    debounceTimer = setTimeout(async () => {
        try {
            const query = encodeURIComponent(`${valor}, ${cidade}, MG`);
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=br&viewbox=${NOM_VIEWBOX}&bounded=0&q=${query}`;

            const resp = await fetch(url, {
                headers: {
                    'Accept-Language': 'pt-BR',
                    'User-Agent': 'Loja-Jacare/1.0'
                }
            });

            const resultados = await resp.json();
            lista.innerHTML = '';

            if (!resultados.length) {
                lista.innerHTML = '<li style="padding:10px 14px; color:#999; font-size:13px;">Nenhum endereço encontrado</li>';
                lista.style.display = 'block';
                return;
            }

            resultados.forEach(item => {
                const principal = extrairRuaPrincipal(item);

                const li = document.createElement('li');
                li.innerHTML = `
                    <div style="font-weight:600; color:#222;">${principal}</div>
                    <div style="font-size:12px; color:#666; margin-top:2px;">${cidade} - MG</div>
                `;
                li.style.cssText = 'padding:10px 14px; cursor:pointer; border-bottom:1px solid #eee; line-height:1.4;';
                li.onmouseenter = () => li.style.background = '#f5f5f5';
                li.onmouseleave = () => li.style.background = '';
                li.onclick = () => {
                    const inputRua = document.getElementById('input-endereco');
                    if (inputRua) inputRua.value = principal;

                    enderecoSelecionado = {
                        texto: principal,
                        lat: Number(item.lat),
                        lng: Number(item.lon)
                    };

                    lista.style.display = 'none';
                    lista.innerHTML = '';
                    marcarFreteComoPendente();
                };
                lista.appendChild(li);
            });

            lista.style.display = 'block';
        } catch (e) {
            console.error('Erro no autocomplete:', e);
            lista.innerHTML = '<li style="padding:10px 14px; color:#999; font-size:13px;">Erro ao buscar endereço</li>';
            lista.style.display = 'block';
        }
    }, 300);
}

// --- FRETE ---
async function calcularFrete() {
    const metodoEntrega = document.getElementById('metodo-entrega')?.value;
    const rua = document.getElementById('input-endereco')?.value.trim() || '';
    const numero = document.getElementById('input-numero')?.value.trim() || '';
    const bairro = document.getElementById('input-bairro')?.value.trim() || '';
    const cidade = obterCidadeSelecionada();
    const enderecoCompleto = montarEnderecoCompleto();
    const status = document.getElementById('frete-status');

    if (metodoEntrega !== 'Entrega') {
        valorFreteAtual = 0;
        freteCalculado = false;
        atualizarTotalComFrete();
        return;
    }

    if (!rua) {
        alert('Informe a rua para calcular o frete.');
        return;
    }

    if (!numero) {
        alert('Informe o número da casa para calcular o frete.');
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
        const btn = document.getElementById('btn-calcular-frete');
        if (btn) {
            btn.disabled = true;
            btn.innerText = 'Calculando...';
        }

        if (status) {
            status.innerText = 'Consultando frete...';
            status.style.color = '#666';
        }

        const body = {
            address: enderecoCompleto,
            street: rua,
            number: numero,
            neighborhood: bairro,
            city: cidade,
            state: 'MG',
            country: 'Brasil',
            full_address: enderecoCompleto
        };

        if (enderecoSelecionado?.lat && enderecoSelecionado?.lng) {
            body.lat = enderecoSelecionado.lat;
            body.lng = enderecoSelecionado.lng;
        }

        const response = await fetch('/api/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erro ao calcular frete:', data);
            valorFreteAtual = 0;
            freteCalculado = false;
            atualizarTotalComFrete();

            if (status) {
                status.innerText = 'Falha ao calcular frete.';
                status.style.color = '#c62828';
            }

            alert(data?.error || 'Erro ao calcular o frete.');
            return;
        }

        if (typeof data.shipping === 'number') {
            valorFreteAtual = data.shipping;
            freteCalculado = true;
            atualizarTotalComFrete();

            if (status) {
                status.innerText = `Frete calculado: R$ ${data.shipping.toFixed(2).replace('.', ',')}${data.eta ? ` | ETA: ${data.eta}` : ''}`;
                status.style.color = 'var(--green)';
            }

            alert(`🛵 Frete: R$ ${data.shipping.toFixed(2).replace('.', ',')}${data.eta ? ` | ETA: ${data.eta}` : ''}`);
        } else {
            valorFreteAtual = 0;
            freteCalculado = false;
            atualizarTotalComFrete();

            if (status) {
                status.innerText = 'Não foi possível calcular o frete.';
                status.style.color = '#c62828';
            }

            alert('Não foi possível calcular o frete.');
        }
    } catch (error) {
        console.error('Erro na chamada /api/quote:', error);
        valorFreteAtual = 0;
        freteCalculado = false;
        atualizarTotalComFrete();

        if (status) {
            status.innerText = 'Erro ao consultar frete.';
            status.style.color = '#c62828';
        }

        alert('Erro ao consultar o frete.');
    } finally {
        const btn = document.getElementById('btn-calcular-frete');
        if (btn) {
            btn.disabled = false;
            btn.innerText = '🛵 Calcular frete';
        }
    }
}

function atualizarTotalComFrete() {
    let total = 0;
    carrinho.forEach(item => total += item.preco);

    const totalFinal = total + valorFreteAtual;
    const resumo = document.getElementById('resumo-total-geral');

    if (resumo) {
        resumo.innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
    }
}

async function carregarProdutos() {
    const { data, error } = await supabaseClient.from('produtos').select('*');
    if (error) return console.error('Erro no Supabase:', error);
    produtosLocais = data;
    renderizarGrids(data);
}

// --- VITRINE ---
function renderizarGrids(lista) {
    const itensDisponiveis = lista.filter(p => p.estoque > 0);

    const itensPromocao = itensDisponiveis.filter(p =>
        String(p.em_promocao).toLowerCase() === 'true' || p.em_promocao === 1
    );

    const itensGerais = itensDisponiveis.filter(p =>
        !(String(p.em_promocao).toLowerCase() === 'true' || p.em_promocao === 1)
    );

    renderizarLista(itensPromocao, 'grid-promocoes');
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

    lista.forEach(p => {
        const ehPromo = String(p.em_promocao).toLowerCase() === 'true' || p.em_promocao === 1;
        const badgeHtml = ehPromo ? `<span class="promo-badge">PROMOÇÃO</span>` : '';
        const precoAntigoHtml = p.preco_antigo
            ? `<span class="price-old">R$ ${p.preco_antigo.toFixed(2).replace('.', ',')}</span>`
            : '';

        grid.innerHTML += `
            <div class="product-card" onclick="abrirDetalhes(${p.id})">
                ${badgeHtml}
                <div class="product-img-bg">
                    <img src="${p.imagem_url}" onerror="handleImageError(this)">
                </div>
                <h3 style="font-size:0.85rem; margin-bottom:5px;">${p.nome}</h3>
                ${precoAntigoHtml}
                <strong style="color:var(--green)">R$ ${p.preco.toFixed(2).replace('.', ',')}</strong>
            </div>
        `;
    });
}

// --- BUSCA ---
function buscarProdutos() {
    const termo = document.getElementById('input-busca').value.toLowerCase().trim();
    const hero = document.querySelector('.hero');
    const categories = document.querySelector('.categories');
    const btnVoltar = document.getElementById('container-busca-voltar');

    if (!termo) {
        limparBusca();
        return;
    }

    if (hero) hero.style.display = 'none';
    if (categories) categories.style.display = 'none';
    if (btnVoltar) btnVoltar.style.display = 'block';

    const filtrados = produtosLocais.filter(p =>
        p.nome.toLowerCase().includes(termo)
    );

    renderizarGrids(filtrados);
}

function limparBusca() {
    document.getElementById('input-busca').value = '';
    const hero = document.querySelector('.hero');
    const categories = document.querySelector('.categories');
    const btnVoltar = document.getElementById('container-busca-voltar');

    if (hero) hero.style.display = 'block';
    if (categories) categories.style.display = 'block';
    if (btnVoltar) btnVoltar.style.display = 'none';

    renderizarGrids(produtosLocais);
}

function filtrarPorCategoria(cat) {
    const filtrados = produtosLocais.filter(p => p.categoria === cat);
    renderizarGrids(filtrados);
}

// --- MODAL ---
function abrirDetalhes(id) {
    const p = produtosLocais.find(item => item.id == id);
    if (!p) return;

    produtoAtualModal = p;
    modalQuantidadeAtual = 1;

    document.getElementById('modal-area-venda').style.display = 'block';
    document.getElementById('modal-area-escolha').style.display = 'none';
    document.getElementById('modal-area-checkout').style.display = 'none';
    document.getElementById('modal-footer-preco').style.display = 'flex';
    document.getElementById('modal-btn-acao').style.display = 'block';
    document.getElementById('modal-titulo').innerText = p.nome;

    const imagens = [p.imagem_url, p.imagem_url2, p.imagem_url3].filter(img => img && img !== '');

    let galeriaHtml = `<img src="${imagens[0]}" id="foto-principal-modal" class="main-modal-img">`;

    if (imagens.length > 1) {
        galeriaHtml += `<div class="thumbnails-container">`;
        imagens.forEach(img => {
            galeriaHtml += `<img src="${img}" class="thumb-img" onclick="document.getElementById('foto-principal-modal').src='${img}'">`;
        });
        galeriaHtml += `</div>`;
    }

    document.getElementById('modal-galeria').innerHTML = galeriaHtml;
    document.getElementById('modal-descricao').innerText = p.descricao || 'É um sucesso!';

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
        let textoPreco = `R$ ${total.toFixed(2).replace('.', ',')}`;

        if (produtoAtualModal.preco_antigo) {
            const totalAntigo = produtoAtualModal.preco_antigo * modalQuantidadeAtual;
            textoPreco = `<span style="font-size:0.9rem; color:#aaa; text-decoration:line-through;">De: R$ ${totalAntigo.toFixed(2).replace('.', ',')}</span><br>Por: R$ ${total.toFixed(2).replace('.', ',')}`;
        }

        document.getElementById('resumo-total-geral').innerHTML = textoPreco;
    }
}

function ajustarQtdModal(delta) {
    const novaQtd = modalQuantidadeAtual + delta;

    if (novaQtd < 1) return;

    if (produtoAtualModal && novaQtd > produtoAtualModal.estoque) {
        alert(`🐊 Opa! Só temos ${produtoAtualModal.estoque} unidades em estoque.`);
        return;
    }

    modalQuantidadeAtual = novaQtd;
    atualizarModalUI();
}

// --- CARRINHO ---
function confirmarAdicaoAoCarrinho() {
    for (let i = 0; i < modalQuantidadeAtual; i++) {
        carrinho.push({ ...produtoAtualModal, presente: false });
    }

    document.getElementById('cart-count').innerText = carrinho.length;
    document.getElementById('modal-area-venda').style.display = 'none';
    document.getElementById('modal-footer-preco').style.display = 'none';
    document.getElementById('modal-btn-acao').style.display = 'none';
    document.getElementById('modal-area-escolha').style.display = 'block';
}

function abrirCarrinho() {
    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    document.getElementById('modal-area-venda').style.display = 'none';
    document.getElementById('modal-area-escolha').style.display = 'none';
    document.getElementById('modal-area-checkout').style.display = 'block';
    document.getElementById('modal-footer-preco').style.display = 'flex';
    document.getElementById('modal-btn-acao').style.display = 'block';
    document.getElementById('modal-titulo').innerText = '🛒 Seus Pedidos';

    const lista = document.getElementById('modal-lista-carrinho');
    lista.innerHTML = '';

    let total = 0;

    carrinho.forEach((item, index) => {
        total += item.preco;

        lista.innerHTML += `
            <div class="cart-item-row">
                <button class="btn-remover-unitario" onclick="removerDoCarrinho(${index})">🗑️</button>
                <div class="cart-item-info">
                    <strong>${item.nome}</strong>
                    <label style="display:block; font-size:0.75rem; color:var(--green); margin-top:5px; cursor:pointer;">
                        <input type="checkbox" onchange="togglePresente(${index}, this.checked)" ${item.presente ? 'checked' : ''}> 🎁 Presente?
                    </label>
                </div>
                <div class="cart-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
            </div>
        `;
    });

    const totalFinal = total + valorFreteAtual;
    document.getElementById('resumo-total-geral').innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;

    const btn = document.getElementById('modal-btn-acao');
    btn.innerText = '🚀 Finalizar no WhatsApp';
    btn.onclick = finalizarPedido;

    document.getElementById('modal-produto').style.display = 'block';
}

function togglePresente(index, valor) {
    carrinho[index].presente = valor;
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    document.getElementById('cart-count').innerText = carrinho.length;

    if (carrinho.length === 0) fecharModal();
    else abrirCarrinho();
}

async function finalizarPedido() {
    const pag = document.getElementById('metodo-pagamento').value;
    const entrega = document.getElementById('metodo-entrega').value;
    const enderecoCompleto = montarEnderecoCompleto();
    const codPedido = 'JAC-' + Math.floor(1000 + Math.random() * 9000);

    if (entrega === 'Entrega') {
        const rua = document.getElementById('input-endereco')?.value.trim() || '';
        const numero = document.getElementById('input-numero')?.value.trim() || '';
        const bairro = document.getElementById('input-bairro')?.value.trim() || '';
        const cidade = obterCidadeSelecionada();

        if (!rua) {
            alert('Informe a rua para entrega.');
            return;
        }

        if (!numero) {
            alert('Informe o número da casa para entrega.');
            return;
        }

        if (!bairro) {
            alert('Informe o bairro para entrega.');
            return;
        }

        if (!cidade) {
            alert('Informe a cidade para entrega.');
            return;
        }

        if (!freteCalculado) {
            alert('Clique em "Calcular frete" antes de finalizar o pedido.');
            return;
        }
    }

    const itensAgrupados = {};

    carrinho.forEach(item => {
        if (!itensAgrupados[item.id]) {
            itensAgrupados[item.id] = { ...item, qtd: 0, presenteQtd: 0 };
        }
        itensAgrupados[item.id].qtd++;
        if (item.presente) itensAgrupados[item.id].presenteQtd++;
    });

    let totalGeral = 0;
    Object.values(itensAgrupados).forEach(i => {
        totalGeral += i.preco * i.qtd;
    });

    const totalFinal = totalGeral + valorFreteAtual;
    const tokenConfirmacao = crypto.randomUUID();

    const { error } = await supabaseClient
        .from('pedidos')
        .insert([
            {
                code: codPedido,
                itens: itensAgrupados,
                endereco: entrega === 'Entrega' ? enderecoCompleto : null,
                frete: valorFreteAtual,
                total: totalFinal,
                status: 'PENDENTE',
                token_confirmacao: tokenConfirmacao
            }
        ]);

    if (error) {
        console.error('Erro ao salvar pedido:', error);
        alert('Erro ao registrar pedido. Tente novamente.');
        return;
    }

    let msg = '';
    msg += '🐊 *PEDIDO JACARÉ UTILIDADES*\n';
    msg += '🆔 *CÓDIGO:* ' + codPedido + '\n\n';

    Object.values(itensAgrupados).forEach(i => {
        const sub = i.preco * i.qtd;
        const txtPresente = i.presenteQtd > 0 ? ` _(🎁 ${i.presenteQtd} para presente)_` : '';
        msg += `• *(${i.qtd}x)* ${i.nome}${txtPresente} - R$ ${sub.toFixed(2).replace('.', ',')}\n`;
    });

    if (entrega === 'Entrega') {
        msg += `\n*FRETE:* R$ ${valorFreteAtual.toFixed(2).replace('.', ',')}\n`;
    }

    msg += `\n*TOTAL:* R$ ${totalFinal.toFixed(2).replace('.', ',')}\n`;
    msg += `*PAGAMENTO:* ${pag}\n`;
    msg += `*TIPO:* ${entrega}\n`;

    if (entrega === 'Entrega') {
        msg += `*ENDEREÇO:* ${enderecoCompleto.toUpperCase()}\n`;
    }

    msg += '\nÉ um sucesso!\n\n';

    const msgCodificada = encodeURIComponent(msg);
    window.open(`https://wa.me/31998997812?text=${msgCodificada}`, '_blank');
}

function fecharModal() {
    document.getElementById('modal-produto').style.display = 'none';
}

function toggleEndereco() {
    const metodo = document.getElementById('metodo-entrega').value;
    const campoEndereco = document.getElementById('campo-endereco');
    const avisoHorario = document.getElementById('aviso-horario');
    const selectPag = document.getElementById('metodo-pagamento');
    const optDinheiro = selectPag.querySelector('option[value="Dinheiro"]');

    if (metodo === 'Entrega') {
        campoEndereco.style.display = 'block';
        if (avisoHorario) avisoHorario.style.display = 'none';
        if (optDinheiro) optDinheiro.style.display = 'none';
        if (selectPag.value === 'Dinheiro') selectPag.value = 'Pix';
        marcarFreteComoPendente();
    } else {
        campoEndereco.style.display = 'none';
        if (avisoHorario) avisoHorario.style.display = 'block';
        if (optDinheiro) optDinheiro.style.display = 'block';
        valorFreteAtual = 0;
        freteCalculado = false;
        atualizarTotalComFrete();
    }
}

function compartilharProduto() {
    if (!produtoAtualModal) return;

    const texto = `🐊 Olhe o que achei na Jacaré Utilidades!\n\n*${produtoAtualModal.nome}*\nPreço: R$ ${produtoAtualModal.preco.toFixed(2).replace('.', ',')}\n\nConfira: ${window.location.href}`;

    if (navigator.share) {
        navigator.share({
            title: 'Jacaré Utilidades',
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
    const btnCalcularFrete = document.getElementById('btn-calcular-frete');

    if (inputEndereco) {
        inputEndereco.addEventListener('input', (e) => buscarSugestoesEndereco(e.target.value));
        inputEndereco.addEventListener('input', marcarFreteComoPendente);
    }

    if (inputNumero) inputNumero.addEventListener('input', marcarFreteComoPendente);
    if (inputBairro) inputBairro.addEventListener('input', marcarFreteComoPendente);
    if (inputComplemento) inputComplemento.addEventListener('input', marcarFreteComoPendente);
    if (inputCidade) inputCidade.addEventListener('change', marcarFreteComoPendente);

    if (metodoEntrega) {
        metodoEntrega.addEventListener('change', toggleEndereco);
    }

    if (btnCalcularFrete) {
        btnCalcularFrete.addEventListener('click', calcularFrete);
    }
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('#campo-endereco')) {
        const lista = document.getElementById('lista-sugestoes');
        if (lista) lista.style.display = 'none';
    }
});

carregarProdutos();
carregarBanners();

document.addEventListener('DOMContentLoaded', () => {
    configurarEventosFrete();
});