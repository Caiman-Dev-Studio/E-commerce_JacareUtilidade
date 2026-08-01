/* ============================================================
   Chat Jacaré Utilidades
   Requer que script.js (com o supabaseClient global) já tenha
   sido carregado ANTES deste arquivo.
   ============================================================ */

(function () {
  // ------- CONFIGURAÇÃO -------
  // Cole aqui o link de avaliação do Google Meu Negócio da loja
  const LINK_AVALIACAO_GOOGLE = "";

  const POLL_INTERVAL_MS = 4000;

  // ------- ESTADO -------
  let conversaAtual = null; // registro da conversa no Supabase
  let telaAtual = "menu"; // menu | ajuda | rastreio | conversa-humana
  let pollingId = null;
  let ultimaMensagemId = null;

  let clienteNome = localStorage.getItem("jac_cliente_nome") || null;
  let clienteTelefone = localStorage.getItem("jac_cliente_telefone") || null;

  // ------- ESTILOS -------
  const estilos = `
    #jac-chat-bolha {
      position: fixed;
      bottom: 25px;
      left: 20px;
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: linear-gradient(145deg, #16a34a, #15803d);
      box-shadow: 0 8px 20px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      cursor: pointer;
      z-index: 9998;
      border: 2px solid #fff;
      transition: transform 0.15s ease;
    }
    #jac-chat-bolha:hover { transform: scale(1.06); }
    #jac-chat-bolha .jac-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
    }

    #jac-chat-painel {
      position: fixed;
      bottom: 96px;
      left: 20px;
      width: 340px;
      max-width: calc(100vw - 32px);
      height: 480px;
      max-height: calc(100vh - 140px);
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.22);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      font-family: inherit;
    }
    #jac-chat-painel.jac-aberto { display: flex; }

    #jac-chat-header {
      background: linear-gradient(120deg, #16a34a, #15803d);
      color: #fff;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #jac-chat-header .jac-titulo { font-weight: 700; font-size: 15px; }
    #jac-chat-header .jac-subtitulo { font-size: 12px; opacity: 0.85; margin-top: 2px; }
    #jac-chat-fechar, #jac-chat-voltar {
      background: rgba(255,255,255,0.18);
      border: none;
      color: #fff;
      border-radius: 8px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 14px;
    }

    #jac-chat-corpo {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      background: #f7f8f6;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .jac-msg {
      max-width: 85%;
      padding: 9px 12px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .jac-msg.bot, .jac-msg.funcionario {
      background: #fff;
      border: 1px solid #e5e7eb;
      align-self: flex-start;
      border-bottom-left-radius: 2px;
    }
    .jac-msg.cliente {
      background: #16a34a;
      color: #fff;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
    .jac-msg.funcionario::before {
      content: "Atendente";
      display: block;
      font-size: 10px;
      font-weight: 700;
      color: #16a34a;
      margin-bottom: 2px;
    }

    .jac-opcoes {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }
    .jac-btn-opcao {
      background: #fff;
      border: 1.5px solid #16a34a;
      color: #15803d;
      font-weight: 600;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13.5px;
      text-align: left;
    }
    .jac-btn-opcao:hover { background: #f0fdf4; }

    #jac-chat-rodape {
      border-top: 1px solid #e5e7eb;
      padding: 10px;
      display: flex;
      gap: 8px;
      background: #fff;
    }
    #jac-chat-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 13.5px;
      outline: none;
    }
    #jac-chat-input:focus { border-color: #16a34a; }
    #jac-chat-enviar {
      background: #16a34a;
      border: none;
      color: #fff;
      border-radius: 10px;
      width: 40px;
      cursor: pointer;
      font-size: 16px;
    }

    .jac-selo-avaliacao {
      align-self: center;
      margin-top: 8px;
      text-align: center;
    }
    .jac-btn-avaliar {
      display: inline-block;
      background: #fbbf24;
      color: #78350f;
      font-weight: 700;
      padding: 9px 16px;
      border-radius: 999px;
      text-decoration: none;
      font-size: 13px;
    }

    @media (max-width: 420px) {
      #jac-chat-painel { left: 16px; right: 16px; width: auto; }
    }

    #jac-chat-dica-balao {
      position: fixed;
      bottom: 96px;
      left: 20px;
      max-width: 220px;
      background: #fff;
      color: #14532d;
      padding: 12px 14px;
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      box-shadow: 0 10px 28px rgba(0,0,0,0.18);
      font-size: 13px;
      line-height: 1.4;
      z-index: 9997;
      cursor: pointer;
      animation: jac-dica-entrar 0.35s ease;
    }
    @keyframes jac-dica-entrar {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .jac-caixa-voadora {
      position: fixed;
      font-size: 30px;
      z-index: 10000;
      pointer-events: none;
      transition: left 0.9s cubic-bezier(0.3, 0, 0.2, 1), top 0.9s cubic-bezier(0.3, 0, 0.2, 1), transform 0.9s ease, opacity 0.3s ease 0.7s;
    }
  `;

  function injetarEstilos() {
    const tag = document.createElement("style");
    tag.textContent = estilos;
    document.head.appendChild(tag);
  }

  // ------- HELPERS -------
  function el(tag, props, ...filhos) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    filhos.forEach((f) => {
      if (typeof f === "string") node.appendChild(document.createTextNode(f));
      else if (f) node.appendChild(f);
    });
    return node;
  }

  function normalizarTexto(txt) {
    return (txt || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function corpo() {
    return document.getElementById("jac-chat-corpo");
  }

  function limparCorpo() {
    corpo().innerHTML = "";
  }

  function adicionarMensagemVisual(remetente, texto) {
    const bolha = el("div", { className: `jac-msg ${remetente}` }, texto);
    corpo().appendChild(bolha);
    corpo().scrollTop = corpo().scrollHeight;
    return bolha;
  }

  function adicionarBlocoOpcoes(opcoes) {
    const wrap = el("div", { className: "jac-opcoes" });
    opcoes.forEach(([label, handler]) => {
      wrap.appendChild(el("button", { className: "jac-btn-opcao", onclick: handler }, label));
    });
    corpo().appendChild(wrap);
    corpo().scrollTop = corpo().scrollHeight;
  }

  function adicionarBotaoAvaliacao() {
    if (!LINK_AVALIACAO_GOOGLE) return;
    const wrap = el("div", { className: "jac-selo-avaliacao" });
    wrap.appendChild(
      el(
        "a",
        { className: "jac-btn-avaliar", href: LINK_AVALIACAO_GOOGLE, target: "_blank" },
        "⭐ Avaliar a loja no Google"
      )
    );
    corpo().appendChild(wrap);
    corpo().scrollTop = corpo().scrollHeight;
  }

  function esconderInputPadrao() {
    document.getElementById("jac-chat-rodape").style.display = "none";
  }
  function mostrarInputPadrao(placeholder) {
    const rodape = document.getElementById("jac-chat-rodape");
    rodape.style.display = "flex";
    document.getElementById("jac-chat-input").placeholder = placeholder || "Digite sua mensagem...";
  }

  // ------- TELAS -------
  function mostrarMenuPrincipal() {
    telaAtual = "menu";
    pararPolling();
    limparCorpo();
    esconderInputPadrao();
    const saudacao = clienteNome ? `Oi, ${clienteNome}! 🐊` : "Oi! 🐊";
    adicionarMensagemVisual("bot", `${saudacao} Eu sou o assistente da Jacaré Utilidades. Como posso te ajudar hoje?`);
    adicionarBlocoOpcoes([
      ["🙋 Ajuda / Dúvida", mostrarTelaAjuda],
      ["📦 Rastrear meu pedido", mostrarTelaRastreio],
    ]);
  }

  function mostrarTelaNome() {
    telaAtual = "nome";
    limparCorpo();
    adicionarMensagemVisual("bot", "Antes de começar, qual é o seu nome?");
    mostrarInputPadrao("Seu nome");

    window.__jacChatProximoEnvio = async (valor) => {
      window.__jacChatProximoEnvio = null;
      clienteNome = valor.trim();
      localStorage.setItem("jac_cliente_nome", clienteNome);
      mostrarMenuPrincipal();
    };
  }

  function mostrarTelaAjuda() {
    telaAtual = "ajuda";
    limparCorpo();
    adicionarMensagemVisual("bot", "Pode escrever sua dúvida que eu tento te ajudar. Se eu não souber responder, chamo um atendente pra você.");
    mostrarInputPadrao("Digite sua dúvida...");
  }

  function mostrarTelaRastreio() {
    telaAtual = "rastreio";
    limparCorpo();
    esconderInputPadrao();
    adicionarMensagemVisual("bot", "Me manda o código do pedido (ex: JAC-1234) ou o telefone usado na compra.");
    mostrarInputPadrao("Código do pedido ou telefone");
  }

  async function processarRastreio(valor) {
    adicionarMensagemVisual("cliente", valor);

    const valorLimpo = valor.trim();
    const somenteDigitos = valorLimpo.replace(/\D/g, "");

    let query = supabaseClient.from("pedidos").select("code,status,endereco,total,created_at").order("created_at", { ascending: false }).limit(1);

    if (somenteDigitos.length >= 10) {
      query = query.ilike("telefone", `%${somenteDigitos}%`);
    } else {
      query = query.ilike("code", `%${valorLimpo}%`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      adicionarMensagemVisual("bot", "Não encontrei nenhum pedido com esse código/telefone. Confere se digitou certinho, ou fala com um atendente.");
      adicionarBlocoOpcoes([
        ["🙋 Falar com atendente", () => iniciarEscalonamento("Pedido não encontrado no rastreio: " + valor)],
        ["🔁 Tentar de novo", mostrarTelaRastreio],
        ["⬅️ Voltar ao menu", mostrarMenuPrincipal],
      ]);
      return;
    }

    const pedido = data[0];
    const statusTexto = {
      PENDENTE: "🟡 Aguardando pagamento",
      PRONTO: "🟢 Em preparação na loja",
      ENTREGA: "🚚 Saiu para entrega",
      FINALIZADO: "✅ Finalizado",
    }[pedido.status] || pedido.status;

    adicionarMensagemVisual(
      "bot",
      `Pedido ${pedido.code}\nStatus: ${statusTexto}\nTotal: R$ ${Number(pedido.total || 0).toFixed(2).replace(".", ",")}`
    );

    adicionarBlocoOpcoes([
      ["📦 Rastrear outro pedido", mostrarTelaRastreio],
      ["🙋 Preciso de ajuda", mostrarTelaAjuda],
      ["✅ Finalizar", finalizarAtendimento],
    ]);
  }

  // ------- FAQ -------
  async function tentarResponderComFaq(pergunta) {
    const { data, error } = await supabaseClient
      .from("perguntas_frequentes")
      .select("palavras_chave,resposta")
      .eq("ativo", true);

    if (error || !data) return null;

    const perguntaNormalizada = normalizarTexto(pergunta);

    for (const item of data) {
      const chaves = item.palavras_chave.split(",").map((k) => normalizarTexto(k.trim()));
      if (chaves.some((chave) => chave && perguntaNormalizada.includes(chave))) {
        return item.resposta;
      }
    }
    return null;
  }

  async function processarAjuda(pergunta) {
    adicionarMensagemVisual("cliente", pergunta);

    const resposta = await tentarResponderComFaq(pergunta);

    if (resposta) {
      adicionarMensagemVisual("bot", resposta);
      adicionarBlocoOpcoes([
        ["✅ Isso resolveu, obrigado!", finalizarAtendimento],
        ["🙋 Não, quero falar com atendente", () => iniciarEscalonamento(pergunta)],
      ]);
      return;
    }

    await iniciarEscalonamento(pergunta);
  }

  // ------- ESCALONAMENTO PRO FUNCIONÁRIO -------
  async function garantirConversa(telefone) {
    if (conversaAtual) return conversaAtual;

    const { data, error } = await supabaseClient
      .from("conversas")
      .insert([{ telefone, nome: clienteNome, status: "bot" }])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar conversa:", error);
      return null;
    }

    conversaAtual = data;
    clienteTelefone = telefone;
    localStorage.setItem("jac_cliente_telefone", telefone);
    localStorage.setItem("jac_conversa_id", data.id);
    return conversaAtual;
  }

  async function iniciarEscalonamento(mensagemInicial) {
    telaAtual = "conversa-humana";
    const telefone = obterTelefoneCliente();

    if (!telefone) {
      pedirTelefoneParaEscalonamento(mensagemInicial);
      return;
    }

    await abrirEscalonamentoComTelefone(telefone, mensagemInicial);
  }

  function pedirTelefoneParaEscalonamento(mensagemInicial) {
    limparCorpo();
    adicionarMensagemVisual("bot", "Antes de chamar um atendente, me confirma seu WhatsApp/telefone com DDD:");
    mostrarInputPadrao("(31) 99999-9999");

    window.__jacChatProximoEnvio = async (valor) => {
      window.__jacChatProximoEnvio = null;
      await abrirEscalonamentoComTelefone(valor.replace(/\D/g, ""), mensagemInicial);
    };
  }

  async function abrirEscalonamentoComTelefone(telefone, mensagemInicial) {
    const conversa = await garantirConversa(telefone);
    if (!conversa) {
      adicionarMensagemVisual("bot", "Deu um erro aqui pra te conectar com o atendente. Tenta de novo em instantes.");
      return;
    }

    await supabaseClient.from("conversas").update({ status: "aguardando_atendente" }).eq("id", conversa.id);

    if (mensagemInicial) {
      await supabaseClient.from("mensagens").insert([
        { conversa_id: conversa.id, remetente: "cliente", texto: mensagemInicial },
      ]);
    }

    limparCorpo();
    adicionarMensagemVisual("bot", "Prontinho! Um atendente vai te responder aqui mesmo, o mais rápido possível. Pode continuar escrevendo se quiser.");
    mostrarInputPadrao("Escreva sua mensagem...");
    iniciarPolling();
  }

  function obterTelefoneCliente() {
    return clienteTelefone || (conversaAtual ? conversaAtual.telefone : null);
  }

  async function enviarMensagemHumana(texto) {
    adicionarMensagemVisual("cliente", texto);

    if (!conversaAtual) return;

    await supabaseClient.from("mensagens").insert([
      { conversa_id: conversaAtual.id, remetente: "cliente", texto },
    ]);
  }

  // ------- POLLING (aguardando resposta do funcionário) -------
  function iniciarPolling() {
    pararPolling();
    pollingId = setInterval(buscarNovasMensagens, POLL_INTERVAL_MS);
  }

  function pararPolling() {
    if (pollingId) {
      clearInterval(pollingId);
      pollingId = null;
    }
  }

  async function buscarNovasMensagens() {
    if (!conversaAtual) return;

    let query = supabaseClient
      .from("mensagens")
      .select("*")
      .eq("conversa_id", conversaAtual.id)
      .eq("remetente", "funcionario")
      .order("created_at", { ascending: true });

    const { data, error } = await query;
    if (error || !data) return;

    const novas = ultimaMensagemId
      ? data.filter((m) => new Date(m.created_at) > new Date(ultimaMensagemId))
      : data;

    novas.forEach((m) => {
      adicionarMensagemVisual("funcionario", m.texto);
      ultimaMensagemId = m.created_at;
    });
  }

  // ------- FINALIZAÇÃO -------
  async function finalizarAtendimento() {
    if (conversaAtual) {
      await supabaseClient.from("conversas").update({ status: "encerrada" }).eq("id", conversaAtual.id);
    }
    localStorage.removeItem("jac_conversa_id");
    pararPolling();
    limparCorpo();
    adicionarMensagemVisual("bot", "Obrigado por falar com a gente! Se puder, deixa sua avaliação — isso ajuda muito a loja. 💚");
    adicionarBotaoAvaliacao();
    adicionarBlocoOpcoes([["⬅️ Voltar ao menu", () => { conversaAtual = null; mostrarMenuPrincipal(); }]]);
  }

  // ------- ENVIO PELO CAMPO DE TEXTO -------
  async function tratarEnvio() {
    const input = document.getElementById("jac-chat-input");
    const valor = input.value.trim();
    if (!valor) return;
    input.value = "";

    if (window.__jacChatProximoEnvio) {
      const handler = window.__jacChatProximoEnvio;
      window.__jacChatProximoEnvio = null;
      await handler(valor);
      return;
    }

    if (telaAtual === "ajuda") {
      await processarAjuda(valor);
    } else if (telaAtual === "rastreio") {
      await processarRastreio(valor);
    } else if (telaAtual === "conversa-humana") {
      await enviarMensagemHumana(valor);
    }
  }

  // ------- MONTAGEM DO WIDGET -------
  function montarWidget() {
    const bolha = el(
      "button",
      { id: "jac-chat-bolha", onclick: alternarPainel, "aria-label": "Falar com a Jacaré Utilidades" },
      "🐊"
    );

    const header = el(
      "div",
      { id: "jac-chat-header" },
      el("button", { id: "jac-chat-voltar", onclick: mostrarMenuPrincipal, title: "Voltar ao menu" }, "⬅"),
      el(
        "div",
        {},
        el("div", { className: "jac-titulo" }, "Jacaré Utilidades"),
        el("div", { className: "jac-subtitulo" }, "Fale com a gente")
      ),
      el("button", { id: "jac-chat-fechar", onclick: alternarPainel, title: "Fechar" }, "✕")
    );

    const painel = el(
      "div",
      { id: "jac-chat-painel" },
      header,
      el("div", { id: "jac-chat-corpo" }),
      el(
        "div",
        { id: "jac-chat-rodape" },
        el("input", {
          id: "jac-chat-input",
          type: "text",
          placeholder: "Digite sua mensagem...",
          onkeydown: (e) => {
            if (e.key === "Enter") tratarEnvio();
          },
        }),
        el("button", { id: "jac-chat-enviar", onclick: tratarEnvio }, "➤")
      )
    );

    document.body.appendChild(bolha);
    document.body.appendChild(painel);
  }

  function alternarPainel() {
    const painel = document.getElementById("jac-chat-painel");
    const abrindo = !painel.classList.contains("jac-aberto");
    painel.classList.toggle("jac-aberto");

    if (abrindo && corpo().children.length === 0) {
      iniciarFluxoChat();
    }
  }

  async function iniciarFluxoChat() {
    const conversaIdSalva = localStorage.getItem("jac_conversa_id");

    if (conversaIdSalva) {
      const retomou = await tentarRetomarConversa(conversaIdSalva);
      if (retomou) return;
    }

    if (!clienteNome) {
      mostrarTelaNome();
      return;
    }

    mostrarMenuPrincipal();
  }

  async function tentarRetomarConversa(conversaId) {
    const { data: conversa, error } = await supabaseClient
      .from("conversas")
      .select("*")
      .eq("id", conversaId)
      .single();

    if (error || !conversa || conversa.status === "encerrada") {
      localStorage.removeItem("jac_conversa_id");
      return false;
    }

    conversaAtual = conversa;
    clienteTelefone = conversa.telefone;
    telaAtual = "conversa-humana";

    const { data: mensagens } = await supabaseClient
      .from("mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true });

    limparCorpo();
    adicionarMensagemVisual("bot", "Você já tem uma conversa em andamento com a gente. Aqui está o histórico:");
    (mensagens || []).forEach((m) => {
      adicionarMensagemVisual(m.remetente, m.texto);
      ultimaMensagemId = m.created_at;
    });
    mostrarInputPadrao("Escreva sua mensagem...");
    iniciarPolling();
    return true;
  }

  // ------- ANIMAÇÃO: "seu pedido chegou, acompanhe aqui" -------
  function animarCaixaAteChat() {
    const bolha = document.getElementById("jac-chat-bolha");
    if (!bolha) return;

    const destino = bolha.getBoundingClientRect();
    const caixa = el("div", { className: "jac-caixa-voadora" }, "📦");

    // ponto de partida: um pouco acima do centro da tela
    caixa.style.left = `${window.innerWidth / 2 - 15}px`;
    caixa.style.top = `${window.innerHeight / 2 - 120}px`;
    document.body.appendChild(caixa);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        caixa.style.left = `${destino.left + destino.width / 2 - 15}px`;
        caixa.style.top = `${destino.top + destino.height / 2 - 15}px`;
        caixa.style.transform = "scale(0.35)";
        caixa.style.opacity = "0";
      });
    });

    setTimeout(() => caixa.remove(), 1100);
  }

  function mostrarDicaRastreio(codigoPedido) {
    const existente = document.getElementById("jac-chat-dica-balao");
    if (existente) existente.remove();

    const balao = el(
      "div",
      {
        id: "jac-chat-dica-balao",
        onclick: () => {
          balao.remove();
          abrirPainelSeFechado();
          mostrarTelaRastreio();
          const input = document.getElementById("jac-chat-input");
          if (input) input.value = codigoPedido || "";
        },
      },
      `📦 Pedido ${codigoPedido ? codigoPedido + " " : ""}registrado! Clique aqui pra acompanhar quando quiser.`
    );

    document.body.appendChild(balao);
    setTimeout(() => balao.remove(), 9000);
  }

  function abrirPainelSeFechado() {
    const painel = document.getElementById("jac-chat-painel");
    if (!painel.classList.contains("jac-aberto")) {
      painel.classList.add("jac-aberto");
    }
  }

  function verificarRetornoDePedido() {
    const params = new URLSearchParams(window.location.search);
    const pedidoRecente = params.get("pedido_recente");
    if (!pedidoRecente) return;

    // limpa o parâmetro da URL sem recarregar a página
    params.delete("pedido_recente");
    const novaUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
    window.history.replaceState({}, "", novaUrl);

    setTimeout(() => {
      animarCaixaAteChat();
      setTimeout(() => mostrarDicaRastreio(pedidoRecente), 900);
    }, 500);
  }

  // ------- INICIALIZAÇÃO -------
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof supabaseClient === "undefined") {
      console.error("chat-widget.js: supabaseClient não encontrado. Verifique se script.js foi carregado antes deste arquivo.");
      return;
    }
    injetarEstilos();
    montarWidget();
    verificarRetornoDePedido();
  });
})();
