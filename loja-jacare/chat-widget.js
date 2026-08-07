/* ============================================================
   Chat Jacaré Utilidades — Ajuda e Rastreio SEPARADOS
   Requer que script.js (com o supabaseClient global) já tenha
   sido carregado ANTES deste arquivo.
   ============================================================ */

(function () {
  // ------- CONFIGURAÇÃO -------
  // Cole aqui o link de avaliação do Google Meu Negócio da loja
  const LINK_AVALIACAO_GOOGLE = "";

  const POLL_INTERVAL_MS = 4000;

  // ------- ESTADO -------
  let conversaAtual = null; // conversa de AJUDA no Supabase
  let telaAjudaAtual = "inicio";
  let pollingId = null;

  let clienteNome = localStorage.getItem("jac_cliente_nome") || null;
  let clienteTelefone = localStorage.getItem("jac_cliente_telefone") || null;

  // ------- ACOMPANHAMENTO DE PEDIDOS (notificação + tempo real) -------
  const CHAVE_PEDIDOS_ACOMPANHADOS = "jac_pedidos_acompanhados";
  const VERIFICACAO_PERIODICA_MS = 45000; // rede de segurança caso o Realtime caia
  let pedidoExibidoAtualmente = null; // código do pedido aberto no painel agora
  const canaisRealtimeAtivos = {}; // { [code]: canalSupabase }

  const STATUS_TEXTO = {
    PENDENTE: "🟡 Aguardando pagamento",
    PRONTO: "🟢 Em preparação na loja",
    ENTREGA: "🚚 Saiu para entrega",
    FINALIZADO: "✅ Finalizado",
  };

  // ------- ESTILOS -------
  const estilos = `
    #jac-ajuda-bolha, #jac-rastreio-bolha {
      position: fixed;
      left: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      box-shadow: 0 8px 20px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      cursor: pointer;
      border: 2px solid #fff;
      transition: transform 0.15s ease;
      z-index: 9998;
    }
    #jac-ajuda-bolha:hover, #jac-rastreio-bolha:hover { transform: scale(1.06); }

    #jac-ajuda-bolha {
      bottom: 25px;
      background: linear-gradient(145deg, #16a34a, #15803d);
    }
    #jac-rastreio-bolha {
      bottom: 98px;
      background: linear-gradient(145deg, #f59e0b, #d97706);
      font-size: 26px;
    }

    #jac-rastreio-bolha .jac-dica-pulso {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid #f59e0b;
      animation: jac-pulso 1.6s ease-out infinite;
      display: none;
    }
    #jac-rastreio-bolha.jac-chamar-atencao .jac-dica-pulso { display: block; }
    @keyframes jac-pulso {
      0% { transform: scale(1); opacity: 0.9; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    .jac-badge-contagem {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      border-radius: 999px;
      background: #dc2626;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      animation: jac-badge-entrada 0.25s ease-out;
    }
    @keyframes jac-badge-entrada {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }

    .jac-painel {
      position: fixed;
      left: 20px;
      width: 340px;
      max-width: calc(100vw - 32px);
      height: 460px;
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
    .jac-painel.jac-aberto { display: flex; }

    #jac-ajuda-painel { bottom: 92px; }
    #jac-rastreio-painel { bottom: 165px; }

    .jac-painel-header {
      color: #fff;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #jac-ajuda-painel .jac-painel-header { background: linear-gradient(120deg, #16a34a, #15803d); }
    #jac-rastreio-painel .jac-painel-header { background: linear-gradient(120deg, #f59e0b, #d97706); }

    .jac-painel-header .jac-titulo { font-weight: 700; font-size: 15px; }
    .jac-painel-header .jac-subtitulo { font-size: 12px; opacity: 0.85; margin-top: 2px; }
    .jac-fechar {
      background: rgba(255,255,255,0.18);
      border: none;
      color: #fff;
      border-radius: 8px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 14px;
    }

    .jac-corpo {
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

    .jac-opcoes { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
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
    #jac-rastreio-painel .jac-btn-opcao { border-color: #d97706; color: #b45309; }
    #jac-rastreio-painel .jac-btn-opcao:hover { background: #fffbeb; }

    .jac-rodape {
      border-top: 1px solid #e5e7eb;
      padding: 10px;
      display: flex;
      gap: 8px;
      background: #fff;
    }
    .jac-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 13.5px;
      outline: none;
    }
    #jac-ajuda-painel .jac-input:focus { border-color: #16a34a; }
    #jac-rastreio-painel .jac-input:focus { border-color: #d97706; }
    .jac-enviar {
      border: none;
      color: #fff;
      border-radius: 10px;
      width: 40px;
      cursor: pointer;
      font-size: 16px;
    }
    #jac-ajuda-painel .jac-enviar { background: #16a34a; }
    #jac-rastreio-painel .jac-enviar { background: #d97706; }

    .jac-selo-avaliacao { align-self: center; margin-top: 8px; text-align: center; }
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

    #jac-rastreio-dica-balao {
      position: fixed;
      bottom: 98px;
      left: 90px;
      max-width: 220px;
      background: #fff;
      color: #78350f;
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

    @media (max-width: 420px) {
      .jac-painel { left: 16px; right: 16px; width: auto; }
    }
  `;

  function injetarEstilos() {
    const tag = document.createElement("style");
    tag.textContent = estilos;
    document.head.appendChild(tag);
  }

  // ------- HELPERS GERAIS -------
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

  // ------- HELPERS POR PAINEL (Ajuda / Rastreio) -------
  function criarPainelUI(prefixo) {
    function corpo() {
      return document.getElementById(`jac-${prefixo}-corpo`);
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
        el("a", { className: "jac-btn-avaliar", href: LINK_AVALIACAO_GOOGLE, target: "_blank" }, "⭐ Avaliar a loja no Google")
      );
      corpo().appendChild(wrap);
      corpo().scrollTop = corpo().scrollHeight;
    }
    function esconderInput() {
      document.getElementById(`jac-${prefixo}-rodape`).style.display = "none";
    }
    function mostrarInput(placeholder) {
      const rodape = document.getElementById(`jac-${prefixo}-rodape`);
      rodape.style.display = "flex";
      document.getElementById(`jac-${prefixo}-input`).placeholder = placeholder || "Digite sua mensagem...";
    }

    return { corpo, limparCorpo, adicionarMensagemVisual, adicionarBlocoOpcoes, adicionarBotaoAvaliacao, esconderInput, mostrarInput };
  }

  const ajuda = criarPainelUI("ajuda");
  const rastreio = criarPainelUI("rastreio");

  // ============================================================
  // PAINEL DE AJUDA
  // ============================================================

  function abrirFluxoAjuda() {
    const conversaIdSalva = localStorage.getItem("jac_conversa_id");

    if (conversaIdSalva) {
      tentarRetomarConversa(conversaIdSalva).then((retomou) => {
        if (!retomou) mostrarInicioAjuda();
      });
      return;
    }

    mostrarInicioAjuda();
  }

  function mostrarInicioAjuda() {
    telaAjudaAtual = "pergunta";
    pararPolling();
    ajuda.limparCorpo();

    if (!clienteNome) {
      pedirNomeCliente();
      return;
    }

    perguntarDuvida();
  }

  function pedirNomeCliente() {
    telaAjudaAtual = "nome";
    ajuda.limparCorpo();
    ajuda.adicionarMensagemVisual("bot", "Oi! 🐊 Antes de começar, qual é o seu nome?");
    ajuda.mostrarInput("Seu nome");

    window.__jacAjudaProximoEnvio = async (valor) => {
      window.__jacAjudaProximoEnvio = null;
      clienteNome = valor.trim();
      localStorage.setItem("jac_cliente_nome", clienteNome);
      perguntarDuvida();
    };
  }

  function perguntarDuvida() {
    telaAjudaAtual = "pergunta";
    ajuda.limparCorpo();
    ajuda.adicionarMensagemVisual("bot", `Oi, ${clienteNome}! 🐊 Me conta sua dúvida que eu tento te ajudar. Se eu não souber responder, chamo um atendente.`);
    ajuda.mostrarInput("Digite sua dúvida...");
  }

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

  async function processarDuvida(pergunta) {
    ajuda.adicionarMensagemVisual("cliente", pergunta);

    const resposta = await tentarResponderComFaq(pergunta);

    if (resposta) {
      ajuda.adicionarMensagemVisual("bot", resposta);
      ajuda.adicionarBlocoOpcoes([
        ["✅ Isso resolveu, obrigado!", finalizarAtendimento],
        ["🙋 Não, quero falar com atendente", () => iniciarEscalonamento(pergunta)],
      ]);
      return;
    }

    await iniciarEscalonamento(pergunta);
  }

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
    telaAjudaAtual = "conversa-humana";
    const telefone = clienteTelefone;

    if (!telefone) {
      pedirTelefoneParaEscalonamento(mensagemInicial);
      return;
    }

    await abrirEscalonamentoComTelefone(telefone, mensagemInicial);
  }

  function pedirTelefoneParaEscalonamento(mensagemInicial) {
    ajuda.limparCorpo();
    ajuda.adicionarMensagemVisual("bot", "Antes de chamar um atendente, me confirma seu WhatsApp/telefone com DDD:");
    ajuda.mostrarInput("(31) 99999-9999");

    window.__jacAjudaProximoEnvio = async (valor) => {
      window.__jacAjudaProximoEnvio = null;
      await abrirEscalonamentoComTelefone(valor.replace(/\D/g, ""), mensagemInicial);
    };
  }

  async function abrirEscalonamentoComTelefone(telefone, mensagemInicial) {
    const conversa = await garantirConversa(telefone);
    if (!conversa) {
      ajuda.adicionarMensagemVisual("bot", "Deu um erro aqui pra te conectar com o atendente. Tenta de novo em instantes.");
      return;
    }

    await supabaseClient.from("conversas").update({ status: "aguardando_atendente" }).eq("id", conversa.id);

    if (mensagemInicial) {
      await supabaseClient.from("mensagens").insert([{ conversa_id: conversa.id, remetente: "cliente", texto: mensagemInicial }]);
    }

    ajuda.limparCorpo();
    ajuda.adicionarMensagemVisual("bot", "Prontinho! Um atendente vai te responder aqui mesmo, o mais rápido possível. Pode continuar escrevendo se quiser.");
    ajuda.mostrarInput("Escreva sua mensagem...");
    iniciarPolling();
  }

  async function enviarMensagemHumana(texto) {
    ajuda.adicionarMensagemVisual("cliente", texto);
    if (!conversaAtual) return;
    await supabaseClient.from("mensagens").insert([{ conversa_id: conversaAtual.id, remetente: "cliente", texto }]);
  }

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

  let ultimaMensagemId = null;
  async function buscarNovasMensagens() {
    if (!conversaAtual) return;

    const { data, error } = await supabaseClient
      .from("mensagens")
      .select("*")
      .eq("conversa_id", conversaAtual.id)
      .eq("remetente", "funcionario")
      .order("created_at", { ascending: true });

    if (error || !data) return;

    const novas = ultimaMensagemId ? data.filter((m) => new Date(m.created_at) > new Date(ultimaMensagemId)) : data;
    novas.forEach((m) => {
      ajuda.adicionarMensagemVisual("funcionario", m.texto);
      ultimaMensagemId = m.created_at;
    });
  }

  async function tentarRetomarConversa(conversaId) {
    const { data: conversa, error } = await supabaseClient.from("conversas").select("*").eq("id", conversaId).single();

    if (error || !conversa || conversa.status === "encerrada") {
      localStorage.removeItem("jac_conversa_id");
      return false;
    }

    const { data: mensagens } = await supabaseClient
      .from("mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true });

    if (!mensagens || mensagens.length === 0) {
      // conversa vazia (nunca chegou a ter troca de mensagens): não vale a pena retomar
      localStorage.removeItem("jac_conversa_id");
      return false;
    }

    conversaAtual = conversa;
    clienteTelefone = conversa.telefone;
    telaAjudaAtual = "conversa-humana";

    ajuda.limparCorpo();
    ajuda.adicionarMensagemVisual("bot", "Você já tem uma conversa em andamento com a gente. Aqui está o histórico:");
    mensagens.forEach((m) => {
      ajuda.adicionarMensagemVisual(m.remetente, m.texto);
      ultimaMensagemId = m.created_at;
    });
    ajuda.mostrarInput("Escreva sua mensagem...");
    iniciarPolling();
    return true;
  }

  async function finalizarAtendimento() {
    if (conversaAtual) {
      await supabaseClient.from("conversas").update({ status: "encerrada" }).eq("id", conversaAtual.id);
    }
    localStorage.removeItem("jac_conversa_id");
    conversaAtual = null;
    pararPolling();
    ajuda.limparCorpo();
    ajuda.adicionarMensagemVisual("bot", "Obrigado por falar com a gente! Se puder, deixa sua avaliação — isso ajuda muito a loja. 💚");
    ajuda.adicionarBotaoAvaliacao();
    ajuda.adicionarBlocoOpcoes([["🙋 Nova dúvida", perguntarDuvida]]);
  }

  async function tratarEnvioAjuda() {
    const input = document.getElementById("jac-ajuda-input");
    const valor = input.value.trim();
    if (!valor) return;
    input.value = "";

    if (window.__jacAjudaProximoEnvio) {
      const handler = window.__jacAjudaProximoEnvio;
      window.__jacAjudaProximoEnvio = null;
      await handler(valor);
      return;
    }

    if (telaAjudaAtual === "pergunta") {
      await processarDuvida(valor);
    } else if (telaAjudaAtual === "conversa-humana") {
      await enviarMensagemHumana(valor);
    }
  }

  // ============================================================
  // ACOMPANHAMENTO DE PEDIDOS — notificação + atualização em tempo real
  // ============================================================

  function lerPedidosAcompanhados() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_PEDIDOS_ACOMPANHADOS) || "{}");
    } catch {
      return {};
    }
  }

  function salvarPedidosAcompanhados(mapa) {
    localStorage.setItem(CHAVE_PEDIDOS_ACOMPANHADOS, JSON.stringify(mapa));
  }

  // Começa a acompanhar um pedido: guarda no localStorage e abre um canal Realtime pra ele.
  // statusInicial é o status que o cliente "já viu" até agora (ex: PENDENTE ao sair do checkout).
  function registrarPedidoParaAcompanhar(code, statusInicial) {
    if (!code) return;
    const mapa = lerPedidosAcompanhados();
    if (!mapa[code]) {
      mapa[code] = { statusVisto: statusInicial || null, statusAtual: statusInicial || null, criadoEm: Date.now() };
      salvarPedidosAcompanhados(mapa);
    }
    inscreverRealtimePedido(code);
  }

  // Encerra o canal Realtime de um pedido (sem apagar o registro do localStorage).
  function desinscreverRealtimePedido(code) {
    const canal = canaisRealtimeAtivos[code];
    if (canal) {
      supabaseClient.removeChannel(canal);
      delete canaisRealtimeAtivos[code];
    }
  }

  // Apaga totalmente o acompanhamento de um pedido: localStorage + canal Realtime.
  // Usado quando o pedido está FINALIZADO e o cliente já foi avisado — não faz
  // sentido continuar guardando isso, senão vira lixo/estado velho no navegador
  // e pode confundir uma busca ou conversa futura do mesmo cliente.
  function removerAcompanhamento(code) {
    const mapa = lerPedidosAcompanhados();
    if (mapa[code]) {
      delete mapa[code];
      salvarPedidosAcompanhados(mapa);
    }
    desinscreverRealtimePedido(code);
    if (pedidoExibidoAtualmente === code) pedidoExibidoAtualmente = null;
    atualizarBadgeContagem();
  }

  // Limpeza de segurança: se um pedido ficou FINALIZADO mas o cliente nunca
  // voltou pra ver (fechou a aba, etc.), não deixa isso acumular pra sempre —
  // apaga depois de alguns dias mesmo sem ter sido visto.
  const DIAS_PARA_LIMPAR_FINALIZADOS_NAO_VISTOS = 3;
  function limparAcompanhamentosAntigos() {
    const mapa = lerPedidosAcompanhados();
    const agora = Date.now();
    let mudou = false;

    Object.entries(mapa).forEach(([code, registro]) => {
      const passouPrazo =
        registro.criadoEm && agora - registro.criadoEm > DIAS_PARA_LIMPAR_FINALIZADOS_NAO_VISTOS * 24 * 60 * 60 * 1000;
      if (registro.statusAtual === "FINALIZADO" && passouPrazo) {
        delete mapa[code];
        desinscreverRealtimePedido(code);
        mudou = true;
      }
    });

    if (mudou) salvarPedidosAcompanhados(mapa);
  }

  function atualizarBadgeContagem() {
    const mapa = lerPedidosAcompanhados();
    const naoVistos = Object.values(mapa).filter((p) => p.statusAtual && p.statusAtual !== p.statusVisto).length;

    const bolha = document.getElementById("jac-rastreio-bolha");
    if (!bolha) return;

    let badge = document.getElementById("jac-rastreio-badge");
    if (naoVistos > 0) {
      if (!badge) {
        badge = el("span", { id: "jac-rastreio-badge", className: "jac-badge-contagem" });
        bolha.appendChild(badge);
      }
      badge.textContent = String(naoVistos);
    } else if (badge) {
      badge.remove();
    }
  }

  // Chamado sempre que um status novo chega (via Realtime ou via checagem periódica).
  // Atualiza o badge e, se o cliente estiver com o painel aberto olhando ESSE pedido, atualiza a tela na hora.
  function aplicarNovoStatus(pedido) {
    const mapa = lerPedidosAcompanhados();
    const registro = mapa[pedido.code];
    if (!registro) return; // não é um pedido que estamos acompanhando

    const statusMudou = registro.statusAtual !== pedido.status;
    registro.statusAtual = pedido.status;
    salvarPedidosAcompanhados(mapa);
    atualizarBadgeContagem();

    if (pedido.status === "FINALIZADO") {
      // Pedido concluído — não vai mudar mais, não precisa continuar escutando.
      // O registro em si só é apagado depois que o cliente vir a mensagem final (em exibirStatusPedido).
      desinscreverRealtimePedido(pedido.code);
    }

    if (statusMudou && pedidoExibidoAtualmente === pedido.code) {
      exibirStatusPedido(pedido, { statusAnterior: registro.statusVisto });
    }
  }

  function inscreverRealtimePedido(code) {
    if (!code || canaisRealtimeAtivos[code]) return;

    const canal = supabaseClient
      .channel(`jac-pedido-${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `code=eq.${code}` },
        (payload) => aplicarNovoStatus(payload.new)
      )
      .subscribe();

    canaisRealtimeAtivos[code] = canal;
  }

  // Rede de segurança: reconsulta os pedidos acompanhados de tempos em tempos,
  // caso o WebSocket do Realtime caia ou não esteja habilitado na tabela.
  async function verificarNovidadesPedidos() {
    const codigos = Object.keys(lerPedidosAcompanhados());
    if (codigos.length === 0) return;

    const { data, error } = await supabaseClient.from("pedidos").select("code,status,endereco,total,created_at").in("code", codigos);

    if (error || !data) return;
    data.forEach(aplicarNovoStatus);
  }

  // Mostra o status de um pedido no painel de rastreio e marca como "visto".
  function exibirStatusPedido(pedido, opcoes = {}) {
    const mapa = lerPedidosAcompanhados();
    const statusAnteriorVisto = opcoes.statusAnterior !== undefined ? opcoes.statusAnterior : mapa[pedido.code]?.statusVisto;

    pedidoExibidoAtualmente = pedido.code;
    rastreio.limparCorpo();

    const pagamentoAcabouDeSerConfirmado = statusAnteriorVisto === "PENDENTE" && pedido.status === "PRONTO";

    if (pagamentoAcabouDeSerConfirmado) {
      rastreio.adicionarMensagemVisual(
        "bot",
        `✅ Pagamento aprovado!\n\nJá estamos cientes do seu pedido ${pedido.code} e vamos te atualizar por aqui assim que ele avançar. 🐊`
      );
    } else {
      const statusTexto = STATUS_TEXTO[pedido.status] || pedido.status;
      rastreio.adicionarMensagemVisual(
        "bot",
        `Pedido ${pedido.code}\nStatus: ${statusTexto}\nTotal: R$ ${Number(pedido.total || 0).toFixed(2).replace(".", ",")}`
      );
    }

    rastreio.adicionarBlocoOpcoes([["📦 Rastrear outro pedido", abrirFluxoRastreio]]);
    rastreio.adicionarBotaoAvaliacao();

    if (pedido.status === "FINALIZADO") {
      // O cliente acabou de ver que o pedido foi entregue/retirado — não faz sentido
      // continuar guardando isso no navegador dele. Apaga tudo (localStorage + Realtime).
      removerAcompanhamento(pedido.code);
    } else {
      registrarPedidoParaAcompanhar(pedido.code, pedido.status);
      const mapaAtualizado = lerPedidosAcompanhados();
      mapaAtualizado[pedido.code].statusVisto = pedido.status;
      mapaAtualizado[pedido.code].statusAtual = pedido.status;
      salvarPedidosAcompanhados(mapaAtualizado);
      atualizarBadgeContagem();
    }
  }

  // ============================================================
  // PAINEL DE RASTREIO (100% separado da Ajuda)
  // ============================================================

  function abrirFluxoRastreio() {
    pedidoExibidoAtualmente = null; // evita que uma atualização em tempo real do pedido anterior reapareça enquanto o cliente digita outro código
    tirarChamadaAtencaoRastreio();
    rastreio.limparCorpo();
    rastreio.adicionarMensagemVisual("bot", "Me manda o código do pedido (ex: JAC-1234) ou o telefone usado na compra.");
    rastreio.mostrarInput("Código do pedido ou telefone");
  }

  async function processarRastreio(valor) {
    rastreio.adicionarMensagemVisual("cliente", valor);

    const valorLimpo = valor.trim();
    const somenteDigitos = valorLimpo.replace(/\D/g, "");

    let query = supabaseClient
      .from("pedidos")
      .select("code,status,endereco,total,created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    query = somenteDigitos.length >= 10 ? query.ilike("telefone", `%${somenteDigitos}%`) : query.ilike("code", `%${valorLimpo}%`);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      rastreio.adicionarMensagemVisual("bot", "Não encontrei nenhum pedido com esse código/telefone. Confere se digitou certinho.\n\nSe precisar de ajuda, clique no balão verde 🐊 no canto da tela.");
      rastreio.adicionarBlocoOpcoes([["🔁 Tentar de novo", abrirFluxoRastreio]]);
      return;
    }

    exibirStatusPedido(data[0]);
  }

  async function tratarEnvioRastreio() {
    const input = document.getElementById("jac-rastreio-input");
    const valor = input.value.trim();
    if (!valor) return;
    input.value = "";
    await processarRastreio(valor);
  }

  // ============================================================
  // ANIMAÇÃO PÓS-PAGAMENTO: aponta para o balão de RASTREIO
  // ============================================================

  function animarCaixaAteChat() {
    const bolha = document.getElementById("jac-rastreio-bolha");
    if (!bolha) return;

    const destino = bolha.getBoundingClientRect();
    const caixa = el("div", { className: "jac-caixa-voadora" }, "📦");

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

  function chamarAtencaoRastreio() {
    document.getElementById("jac-rastreio-bolha")?.classList.add("jac-chamar-atencao");
  }
  function tirarChamadaAtencaoRastreio() {
    document.getElementById("jac-rastreio-bolha")?.classList.remove("jac-chamar-atencao");
  }

  function mostrarDicaRastreio(codigoPedido) {
    const existente = document.getElementById("jac-rastreio-dica-balao");
    if (existente) existente.remove();

    chamarAtencaoRastreio();

    const balao = el(
      "div",
      {
        id: "jac-rastreio-dica-balao",
        onclick: () => {
          balao.remove();
          abrirPainel("rastreio");
          rastreio.limparCorpo();
          rastreio.mostrarInput("Código do pedido ou telefone");
          processarRastreio(codigoPedido);
        },
      },
      `📦 Pedido ${codigoPedido ? codigoPedido + " " : ""}registrado! Guarde esse código — clique aqui pra acompanhar quando quiser.`
    );

    document.body.appendChild(balao);
    setTimeout(() => balao.remove(), 12000);
  }

  function verificarRetornoDePedido() {
    const params = new URLSearchParams(window.location.search);
    const pedidoRecente = params.get("pedido_recente");
    if (!pedidoRecente) return;

    params.delete("pedido_recente");
    const novaUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
    window.history.replaceState({}, "", novaUrl);

    // Passa a acompanhar esse pedido a partir de agora — status "visto" é PENDENTE,
    // então quando o pagamento for confirmado (PRONTO) o badge acende e a mensagem
    // especial de "pagamento aprovado" aparece na próxima vez que o cliente abrir o rastreio.
    registrarPedidoParaAcompanhar(pedidoRecente, "PENDENTE");

    setTimeout(() => {
      animarCaixaAteChat();
      setTimeout(() => mostrarDicaRastreio(pedidoRecente), 900);
    }, 500);
  }

  // ============================================================
  // MONTAGEM DOS DOIS WIDGETS
  // ============================================================

  function montarPainel(prefixo, tituloEl, subtitulo, onEnviar) {
    const header = el(
      "div",
      { className: "jac-painel-header" },
      el("div", {}, el("div", { className: "jac-titulo" }, tituloEl), el("div", { className: "jac-subtitulo" }, subtitulo)),
      el("button", { className: "jac-fechar", onclick: () => fecharPainel(prefixo), title: "Fechar" }, "✕")
    );

    const painel = el(
      "div",
      { id: `jac-${prefixo}-painel`, className: "jac-painel" },
      header,
      el("div", { id: `jac-${prefixo}-corpo`, className: "jac-corpo" }),
      el(
        "div",
        { id: `jac-${prefixo}-rodape`, className: "jac-rodape" },
        el("input", {
          id: `jac-${prefixo}-input`,
          className: "jac-input",
          type: "text",
          placeholder: "Digite sua mensagem...",
          onkeydown: (e) => {
            if (e.key === "Enter") onEnviar();
          },
        }),
        el("button", { className: "jac-enviar", onclick: onEnviar }, "➤")
      )
    );

    document.body.appendChild(painel);
  }

  function montarWidgets() {
    const bolhaAjuda = el(
      "button",
      { id: "jac-ajuda-bolha", onclick: () => alternarPainel("ajuda"), "aria-label": "Falar com a Jacaré Utilidades" },
      "🐊"
    );

    const bolhaRastreio = el(
      "button",
      { id: "jac-rastreio-bolha", onclick: () => alternarPainel("rastreio"), "aria-label": "Rastrear meu pedido" },
      "📦",
      el("span", { className: "jac-dica-pulso" })
    );

    document.body.appendChild(bolhaAjuda);
    document.body.appendChild(bolhaRastreio);

    montarPainel("ajuda", "Jacaré Utilidades", "Fale com a gente", tratarEnvioAjuda);
    montarPainel("rastreio", "Rastrear pedido", "Acompanhe seu pedido", tratarEnvioRastreio);
  }

  function abrirPainel(prefixo) {
    fecharPainel(prefixo === "ajuda" ? "rastreio" : "ajuda");
    document.getElementById(`jac-${prefixo}-painel`).classList.add("jac-aberto");
  }
  function fecharPainel(prefixo) {
    document.getElementById(`jac-${prefixo}-painel`)?.classList.remove("jac-aberto");
  }

  function alternarPainel(prefixo) {
    const painel = document.getElementById(`jac-${prefixo}-painel`);
    const abrindo = !painel.classList.contains("jac-aberto");

    if (!abrindo) {
      fecharPainel(prefixo);
      return;
    }

    abrirPainel(prefixo);

    const corpoAtual = prefixo === "ajuda" ? ajuda.corpo() : rastreio.corpo();
    if (corpoAtual.children.length === 0) {
      if (prefixo === "ajuda") abrirFluxoAjuda();
      else abrirFluxoRastreio();
    }
  }

  // ------- INICIALIZAÇÃO -------
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof supabaseClient === "undefined") {
      console.error("chat-widget.js: supabaseClient não encontrado. Verifique se script.js foi carregado antes deste arquivo.");
      return;
    }
    injetarEstilos();
    montarWidgets();
    verificarRetornoDePedido();

    // Limpa acompanhamentos velhos (pedidos já finalizados há dias e nunca vistos)
    // antes de decidir quais canais Realtime reabrir.
    limparAcompanhamentosAntigos();

    // Re-inscreve Realtime pros pedidos que o cliente já vinha acompanhando
    // (de visitas anteriores) e confere se algo mudou enquanto ele estava fora.
    Object.keys(lerPedidosAcompanhados()).forEach((code) => inscreverRealtimePedido(code));
    verificarNovidadesPedidos();
    atualizarBadgeContagem();
    setInterval(verificarNovidadesPedidos, VERIFICACAO_PERIODICA_MS);
  });
})();
