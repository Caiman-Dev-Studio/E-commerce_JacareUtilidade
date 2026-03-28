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

// --- CARREGAMENTO ---
async function carregarBanners() {
    const { data, error } = await supabaseClient.from('banners').select('imagem_url').eq('ativo', true);
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

// --- AUTOCOMPLETE DE ENDEREÇO (Photon / OpenStreetMap) ---
// Bounding box restrito a Sete Lagoas - MG
const BBOX = '-44.35,-19.55,-44.05,-19.35';

let debounceTimer = null;
let enderecoSelecionado = null; // guarda lat/lng do endereço escolhido

function formatarEnderecoPhoton(props) {
    const rua    = props.street || props.name || '';
    const numero = props.housenumber ? `, ${props.housenumber}` : '';
    const bairro = props.district || props.suburb || props.neighbourhood || '';
    const cidade = props.city || props.town || props.village || 'Sete Lagoas';
    const estado = props.state ? props.state.replace('Minas Gerais', 'MG') : 'MG';

    let linha = rua + numero;
    if (bairro) linha += ` - ${bairro}`;
    linha += `, ${cidade} - ${estado}`;
    return linha;
}

async function buscarSugestoesEndereco(valor) {
    const lista = document.getElementById('lista-sugestoes');
    if (!lista) return;
    clearTimeout(debounceTimer);
    enderecoSelecionado = null;

    if (!valor || valor.trim().length < 4) {
        lista.style.display = 'none';
        lista.innerHTML = '';
        return;
    }

    debounceTimer = setTimeout(async () => {
        try {
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(valor)}&lang=pt&limit=6&bbox=${BBOX}`;
            const resp = await fetch(url);
            const json = await resp.json();
            const resultados = json.features || [];

            // Filtra apenas resultados com rua definida
            const filtrados = resultados.filter(f => {
                const tipo = f.properties?.type || '';
                return ['house', 'street', 'locality', 'district', 'city'].includes(tipo)
                    || f.properties?.street;
            });

            lista.innerHTML = '';

            if (!filtrados.length) {
                lista.style.display = 'none';
                return;
            }

            filtrados.forEach(item => {
                const props = item.properties;
                const textoFormatado = formatarEnderecoPhoton(props);
                const [lng, lat] = item.geometry.coordinates;

                const li = document.createElement('li');
                li.textContent = textoFormatado;
                li.style.cssText = 'padding:10px 14px; cursor:pointer; font-size:13px; border-bottom:1px solid #eee; color:#222; line-height:1.4;';
                li.onmouseenter = () => li.style.background = '#f5f5f5';
                li.onmouseleave = () => li.style.background = '';
                li.onclick = () => {
                    document.getElementById('input-endereco').value = textoFormatado;
                    // Salva coordenadas para enviar direto à Uber sem geocodificar novamente
                    enderecoSelecionado = { texto: textoFormatado, lat, lng };
                    lista.style.display = 'none';
                    lista.innerHTML = '';
                    calcularFrete();
                };
                lista.appendChild(li);
            });

            lista.style.display = filtrados.length ? 'block' : 'none';
        } catch (e) {
            console.error('Erro no autocomplete:', e);
            lista.style.display = 'none';
        }
    }, 400);
}

// --- FRETE ---
async function calcularFrete() {
    const metodoEntrega = document.getElementById('metodo-entrega')?.value;
    const enderecoInput = document.getElementById('input-endereco');
    const endereco = enderecoInput ? enderecoInput.value.trim() : '';

    if (metodoEntrega !== 'Entrega') {
        valorFreteAtual = 0;
        atualizarTotalComFrete();
        return;
    }

    if (!endereco) {
        valorFreteAtual = 0;
        atualizarTotalComFrete();
        return;
    }

    try {
        // Envia coordenadas junto se o usuário selecionou uma sugestão,
        // evitando nova geocodificação no backend
        const body = { address: endereco };
        if (enderecoSelecionado?.lat) {
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
            alert(data?.error || 'Erro ao calcular o frete.');
            valorFreteAtual = 0;
            atualizarTotalComFrete();
            return;
        }

        if (typeof data.shipping === 'number') {
            valorFreteAtual = data.shipping;
            atualizarTotalComFrete();

            const etaTexto = data.eta ? ` | ETA: ${data.eta}` : '';
            alert(`🛵 Frete: R$ ${data.shipping.toFixed(2).replace('.', ',')}${etaTexto}`);
        } else {
            valorFreteAtual = 0;
            atualizarTotalComFrete();
            alert('Não foi possível calcular o frete.');
        }
    } catch (error) {
        console.error('Erro na chamada /api/quote:', error);
        valorFreteAtual = 0;
        atualizarTotalComFrete();
        alert('Erro ao consultar o frete.');
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
    if (error) return console.error("Erro no Supabase:", error);
    produtosLocais = data;
    renderizarGrids(data);
}

// --- VITRINE (ESTOQUE + PROMOÇÃO) ---
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
    grid.innerHTML = '';
    if (lista.length === 0) {
        grid.innerHTML = '<p style="opacity:0.5; padding:20px; width:100%; text-align:center;">Nenhum item encontrado.</p>';
        return;
    }
    lista.forEach(p => {
        const ehPromo = String(p.em_promocao).toLowerCase() === 'true' || p.em_promocao === 1;
        const badgeHtml = ehPromo ? `<span class="promo-badge">PROMOÇÃO</span>` : '';
        const precoAntigoHtml = p.preco_antigo ? `<span class="price-old">R$ ${p.preco_antigo.toFixed(2).replace('.', ',')}</span>` : '';

        grid.innerHTML += `
            <div class="product-card" onclick="abrirDetalhes(${p.id})">
                ${badgeHtml}
                <div class="product-img-bg"><img src="${p.imagem_url}" onerror="handleImageError(this)"></div>
                <h3 style="font-size:0.85rem; margin-bottom:5px;">${p.nome}</h3>
                ${precoAntigoHtml}
                <strong style="color:var(--green)">R$ ${p.preco.toFixed(2).replace('.', ',')}</strong>
            </div>`;
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

    const filtrados = produtosLocais.filter(p => p.nome.toLowerCase().includes(termo));
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

// --- MODAL COM GALERIA DE FOTOS ---
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

    const imagens = [p.imagem_url, p.imagem_url2, p.imagem_url3].filter(img => img && img !== "");

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
    btn.innerText = "Adicionar ao Carrinho";
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

// --- CARRINHO E WHATSAPP ---
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
    if (carrinho.length === 0) return alert("Seu carrinho está vazio!");
    document.getElementById('modal-area-venda').style.display = 'none';
    document.getElementById('modal-area-escolha').style.display = 'none';
    document.getElementById('modal-area-checkout').style.display = 'block';
    document.getElementById('modal-footer-preco').style.display = 'flex';
    document.getElementById('modal-btn-acao').style.display = 'block';
    document.getElementById('modal-titulo').innerText = "🛒 Seus Pedidos";

    const lista = document.getElementById('modal-lista-carrinho');
    lista.innerHTML = "";
    let total = 0;

    carrinho.forEach((item, index) => {
        total += item.preco;
        lista.innerHTML += `
            <div class="cart-item-row">
                <button class="btn-remover-unitario" onclick="removerDoCarrinho(${index})">🗑️</button>
                <div class="cart-item-info">
                    <strong>${item.nome}</strong>
                    <label style="display:block; font-size: 0.75rem; color: var(--green); margin-top: 5px; cursor:pointer;">
                        <input type="checkbox" onchange="togglePresente(${index}, this.checked)" ${item.presente ? 'checked' : ''}> 🎁 Presente?
                    </label>
                </div>
                <div class="cart-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
            </div>`;
    });

    const totalFinal = total + valorFreteAtual;
    document.getElementById('resumo-total-geral').innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;

    const btn = document.getElementById('modal-btn-acao');
    btn.innerText = "🚀 Finalizar no WhatsApp";
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
    const endereco = document.getElementById('input-endereco').value.trim();
    const codPedido = 'JAC-' + Math.floor(1000 + Math.random() * 9000);

    if (entrega === 'Entrega' && !endereco) {
        alert("Informe o endereço para entrega.");
        return;
    }

    if (entrega === 'Entrega' && valorFreteAtual === 0) {
        await calcularFrete();
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
                endereco: entrega === 'Entrega' ? endereco : null,
                frete: valorFreteAtual,
                total: totalFinal,
                status: 'PENDENTE',
                token_confirmacao: tokenConfirmacao
            }
        ]);

    if (error) {
        console.error("Erro ao salvar pedido:", error);
        alert("Erro ao registrar pedido. Tente novamente.");
        return;
    }

    let msg = "";
    msg += "🐊 *PEDIDO JACARÉ UTILIDADES*\n";
    msg += "🆔 *CÓDIGO:* " + codPedido + "\n\n";

    Object.values(itensAgrupados).forEach(i => {
        const sub = i.preco * i.qtd;
        let txtPresente = i.presenteQtd > 0 ? ` _(🎁 ${i.presenteQtd} para presente)_` : '';
        msg += `• *(${i.qtd}x)* ${i.nome}${txtPresente} - R$ ${sub.toFixed(2).replace('.', ',')}\n`;
    });

    if (entrega === 'Entrega') {
        msg += `\n*FRETE:* R$ ${valorFreteAtual.toFixed(2).replace('.', ',')}\n`;
    }

    msg += `\n*TOTAL:* R$ ${totalFinal.toFixed(2).replace('.', ',')}\n`;
    msg += `*PAGAMENTO:* ${pag}\n`;
    msg += `*TIPO:* ${entrega}\n`;

    if (entrega === 'Entrega') {
        msg += `*ENDEREÇO:* ${endereco.toUpperCase()}\n`;
    }

    msg += `\nÉ um sucesso!\n\n`;

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
    } else {
        campoEndereco.style.display = 'none';
        if (avisoHorario) avisoHorario.style.display = 'block';
        if (optDinheiro) optDinheiro.style.display = 'block';
        valorFreteAtual = 0;
        atualizarTotalComFrete();
    }
}

function compartilharProduto() {
    if (!produtoAtualModal) return;
    const texto = `🐊 Olhe o que achei na Jacaré Utilidades!\n\n*${produtoAtualModal.nome}*\nPreço: R$ ${produtoAtualModal.preco.toFixed(2).replace('.', ',')}\n\nConfira: ${window.location.href}`;
    if (navigator.share) {
        navigator.share({ title: 'Jacaré Utilidades', text: texto, url: window.location.href }).catch(console.error);
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    }
}

function configurarEventosFrete() {
    const inputEndereco = document.getElementById('input-endereco');
    const metodoEntrega = document.getElementById('metodo-entrega');

    if (inputEndereco) {
        inputEndereco.addEventListener('input', (e) => buscarSugestoesEndereco(e.target.value));
    }

    if (metodoEntrega) {
        metodoEntrega.addEventListener('change', toggleEndereco);
    }
}

// Fecha sugestões ao clicar fora
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