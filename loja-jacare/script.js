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
        setTimeout(() => { img.src = bannersLocais[i]; img.style.opacity = 1; }, 500);
    }
}

async function calcularFrete() {
    const endereco = document.getElementById('input-endereco').value.trim();
    if (!endereco) return;

    const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: endereco })
    });

    const data = await response.json();

    if (data.shipping) {
        valorFreteAtual = data.shipping;
        atualizarTotalComFrete();
        alert(`🛵 Frete: R$ ${data.shipping.toFixed(2)} | ETA: ${data.eta}`);
    }
}

function atualizarTotalComFrete() {
    let total = 0;
    carrinho.forEach(item => total += item.preco);

    const totalFinal = total + valorFreteAtual;

    document.getElementById('resumo-total-geral').innerText =
        `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
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

    if (!termo) { limparBusca(); return; }

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

    // LÓGICA DE GALERIA: Pega as colunas imagem_url, imagem_url2 e imagem_url3
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
    document.getElementById('resumo-total-geral').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    const btn = document.getElementById('modal-btn-acao');
    btn.innerText = "🚀 Finalizar no WhatsApp";
    btn.onclick = finalizarPedido;
    document.getElementById('modal-produto').style.display = 'block';
}

function togglePresente(index, valor) { carrinho[index].presente = valor; }

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    document.getElementById('cart-count').innerText = carrinho.length;
    if (carrinho.length === 0) fecharModal();
    else abrirCarrinho();
}

async function finalizarPedido() {
    const pag = document.getElementById('metodo-pagamento').value;
    const entrega = document.getElementById('metodo-entrega').value;
    const endereco = document.getElementById('input-endereco').value;
    const codPedido = 'JAC-' + Math.floor(1000 + Math.random() * 9000);

    if (entrega === 'Entrega' && !endereco) {
        alert("Informe o endereço para entrega.");
        return;
    }

    // Agrupar itens
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
    
    // 🐊 DEBUG 1: Verificar se o token foi gerado
    console.log("🔍 TOKEN GERADO:", tokenConfirmacao);
    console.log("🔍 TIPO DO TOKEN:", typeof tokenConfirmacao);

    // 🔥 SALVAR NO SUPABASE
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

    // 🟢 MONTAR MENSAGEM WHATSAPP
    let msg = `🐊 *PEDIDO JACARÉ UTILIDADES*%0A`;
    msg += `🆔 *CÓDIGO:* ${codPedido}%0A%0A`;

    Object.values(itensAgrupados).forEach(i => {
        const sub = i.preco * i.qtd;
        let txtPresente = i.presenteQtd > 0 ? ` _(🎁 ${i.presenteQtd} para presente)_` : '';
        msg += `• *(${i.qtd}x)* ${i.nome}${txtPresente} - R$ ${sub.toFixed(2).replace('.', ',')}%0A`;
    });

    msg += `%0A*TOTAL:* R$ ${totalFinal.toFixed(2).replace('.', ',')}%0A`;
    msg += `*PAGAMENTO:* ${pag}%0A*TIPO:* ${entrega}`;

    if (entrega === 'Entrega') {
        msg += `%0A*ENDEREÇO:* ${endereco.toUpperCase()}`;
    }

    msg += `%0A%0A É um sucesso!`;

    // Link com token
    const linkConfirmacao = `https://jacare-utilidades.vercel.app/confirmar.html?codigo=${codPedido}&token=${tokenConfirmacao}`;
    
    // 🐊 DEBUG 2: Verificar o link gerado
    console.log("🔍 LINK GERADO:", linkConfirmacao);
    
    msg += `%0A%0A🔐 Confirmar pedido:%0A${linkConfirmacao}`;
    
    // 🐊 DEBUG 3: Verificar a mensagem completa
    console.log("🔍 MENSAGEM COMPLETA:", msg);
    
    window.open(`https://wa.me/31998997812?text=${msg}`, '_blank');
}

function fecharModal() { document.getElementById('modal-produto').style.display = 'none'; }

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

carregarProdutos();
carregarBanners();