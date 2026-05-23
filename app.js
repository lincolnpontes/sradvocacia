const APP_VERSION = "1.0.4";
const STORAGE_KEY = "sr-advocacia-gestao-juridica-v104";
const SESSION_KEY = "sr-advocacia-usuario-ativo";

const ABAS = [
  { id: "dashboard", label: "Painel" },
  { id: "processos", label: "Processos" },
  { id: "clientes", label: "Clientes" },
  { id: "atendimentos", label: "Atendimentos" },
  { id: "agenda", label: "Agenda" },
  { id: "financeiro", label: "Honorários" },
  { id: "configuracoes", label: "Configurações" }
];

const CONFIG_META = {
  status: { titulo: "Status", descricao: "Fases usadas nos processos" },
  areas: { titulo: "Áreas", descricao: "Ramos de atuação do escritório" },
  orgaos: { titulo: "Varas/Fóruns", descricao: "Órgãos, varas, fóruns e tribunais" }
};

const state = normalizarEstado(carregarEstado());
let viewAtual = "dashboard";
let mesAgenda = new Date();
let processoAbertoId = null;
let configAberta = null;
let atendimentoAbertoId = "";
let atendimentoAlterado = false;

const els = {
  app: document.querySelector("#appShell"),
  login: document.querySelector("#loginScreen"),
  formLogin: document.querySelector("#formLogin"),
  loginUsuario: document.querySelector("#loginUsuario"),
  brandButton: document.querySelector("#brandButton"),
  brandPopover: document.querySelector("#brandPopover"),
  usuarioInicial: document.querySelector("#usuarioInicial"),
  popoverInicial: document.querySelector("#popoverInicial"),
  popoverNome: document.querySelector("#popoverNome"),
  popoverEmail: document.querySelector("#popoverEmail"),
  plantaoNome: document.querySelector("#plantaoNome"),
  plantaoResumo: document.querySelector("#plantaoResumo"),
  viewTitle: document.querySelector("#viewTitle"),
  busca: document.querySelector("#buscaGlobal"),
  btnNovo: document.querySelector("#btnNovo"),
  btnNovoTexto: document.querySelector("#btnNovoTexto"),
  topSearchBox: document.querySelector("#topSearchBox"),
  btnForceUpdateTop: document.querySelector("#btnForceUpdateTop"),
  btnForceUpdateLogin: document.querySelector("#btnForceUpdateLogin"),
  filtroArea: document.querySelector("#filtroArea"),
  filtroStatus: document.querySelector("#filtroStatus"),
  ordenacaoClientes: document.querySelector("#ordenacaoClientes"),
  btnModoClientes: document.querySelector("#btnModoClientes"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  modalProcesso: document.querySelector("#modalProcesso"),
  modalCliente: document.querySelector("#modalCliente"),
  modalDetalhe: document.querySelector("#modalDetalheProcesso"),
  modalUsuario: document.querySelector("#modalUsuario"),
  modalConfig: document.querySelector("#modalConfig"),
  modalAvancadas: document.querySelector("#modalAvancadas"),
  modalRecebimento: document.querySelector("#modalRecebimento"),
  formProcesso: document.querySelector("#formProcesso"),
  processoClienteBusca: document.querySelector("#processoClienteBusca"),
  processoClienteId: document.querySelector("#processoClienteId"),
  clienteSugestoes: document.querySelector("#clienteSugestoes"),
  formCliente: document.querySelector("#formCliente"),
  formUsuario: document.querySelector("#formUsuarioDetalhe"),
  formConfigItem: document.querySelector("#formConfigItem"),
  formAvancadas: document.querySelector("#formAvancadas"),
  formRecebimento: document.querySelector("#formRecebimento"),
  formAtendimento: document.querySelector("#formAtendimento"),
  atendimentoCliente: document.querySelector("#atendimentoCliente"),
  atendimentoArea: document.querySelector("#atendimentoArea"),
  atendimentoResponsavel: document.querySelector("#atendimentoResponsavel"),
  atendimentoData: document.querySelector("#atendimentoData"),
  atendimentoAssunto: document.querySelector("#atendimentoAssunto"),
  atendimentoEditor: document.querySelector("#atendimentoEditor"),
  atendimentoStatus: document.querySelector("#atendimentoStatus"),
  listaAtendimentos: document.querySelector("#listaAtendimentos"),
  versoesAtendimento: document.querySelector("#versoesAtendimento"),
  detalheConteudo: document.querySelector("#detalheConteudo"),
  listaConfigModal: document.querySelector("#listaConfigModal"),
  recebimentoResumo: document.querySelector("#recebimentoResumo"),
  recebimentoHistorico: document.querySelector("#recebimentoHistorico"),
  notasPendentes: document.querySelector("#notasPendentes")
};

iniciar();

function iniciar() {
  aplicarTema();
  aplicarSidebar();
  popularLogin();
  configurarEventos();
  atualizarPerfil();
  atualizarAcoesTopo();
  renderizarTudo();

  if (state.usuarioAtivoId) mostrarApp();
  else mostrarLogin();
}

function configurarEventos() {
  els.formLogin.addEventListener("submit", entrar);
  bloquearZoom();
  document.querySelector("#btnSair").addEventListener("click", sair);
  els.brandButton.addEventListener("click", alternarMenuMarca);
  els.brandButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      alternarMenuMarca(event);
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".brand-wrap")) fecharMenuMarca();
  });
  document.addEventListener("click", fecharDialogo);
  document.addEventListener("input", aplicarMascara);
  document.addEventListener("change", atualizarMascaraDocumento);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => trocarView(button.dataset.view));
  });
  document.querySelectorAll("[data-view-shortcut]").forEach((button) => {
    button.addEventListener("click", () => {
      trocarView(button.dataset.viewShortcut);
      fecharMenuMarca();
    });
  });
  document.querySelectorAll("[data-open-client]").forEach((button) => {
    button.addEventListener("click", () => abrirModalCliente());
  });

  els.sidebarToggle.addEventListener("click", alternarSidebar);
  els.btnNovo.addEventListener("click", acaoPrincipal);
  els.btnModoClientes.addEventListener("click", alternarModoClientes);
  els.ordenacaoClientes.addEventListener("change", () => {
    state.clienteOrdenacao = els.ordenacaoClientes.value;
    salvarEstado();
    renderClientes();
  });
  els.btnForceUpdateTop.addEventListener("click", forcarAtualizacao);
  els.btnForceUpdateLogin.addEventListener("click", forcarAtualizacao);
  document.querySelector("#mesAnterior").addEventListener("click", () => mudarMes(-1));
  document.querySelector("#mesProximo").addEventListener("click", () => mudarMes(1));
  document.querySelector("#btnFecharDetalhe").addEventListener("click", () => els.modalDetalhe.close());

  els.busca.addEventListener("input", renderizarTudo);
  els.filtroArea.addEventListener("change", renderizarTudo);
  els.filtroStatus.addEventListener("change", renderizarTudo);
  els.formCliente.addEventListener("submit", salvarCliente);
  els.formProcesso.addEventListener("submit", salvarProcesso);
  els.processoClienteBusca.addEventListener("input", renderSugestoesCliente);
  els.processoClienteBusca.addEventListener("focus", renderSugestoesCliente);
  els.formUsuario.addEventListener("submit", salvarUsuario);
  els.formConfigItem.addEventListener("submit", adicionarItemConfig);
  els.formAvancadas.addEventListener("submit", salvarAvancadas);
  els.formRecebimento.addEventListener("submit", salvarRecebimento);
  els.formAtendimento.addEventListener("submit", salvarAtendimento);
  els.formAtendimento.addEventListener("input", marcarAtendimentoAlterado);
  els.formAtendimento.addEventListener("change", marcarAtendimentoAlterado);
  els.atendimentoEditor.addEventListener("input", marcarAtendimentoAlterado);
  document.querySelector("#editorToolbar").addEventListener("click", aplicarComandoEditor);
  document.querySelector("#settingsLists").addEventListener("click", abrirConfig);
  document.querySelector("#listaUsuarios").addEventListener("click", abrirUsuarioOuExcluir);
  document.querySelector("#temaPicker").addEventListener("click", escolherTema);
  els.listaConfigModal.addEventListener("click", editarOuExcluirConfig);
  els.detalheConteudo.addEventListener("submit", salvarItemProcesso);
  els.detalheConteudo.addEventListener("click", concluirPrazo);
  document.querySelector("#btnNovoUsuario").addEventListener("click", () => abrirModalUsuario());
  document.querySelector("#btnExcluirUsuario").addEventListener("click", excluirUsuarioAberto);
  document.querySelector("#btnForceUpdateConfig").addEventListener("click", forcarAtualizacao);
  document.querySelector("#btnAbrirAvancadas").addEventListener("click", abrirModalAvancadas);
  document.querySelector("#btnNovoAtendimento").addEventListener("click", novoAtendimento);
  document.querySelector("#btnAtendimentoProcesso").addEventListener("click", transformarAtendimentoEmProcesso);
  els.listaAtendimentos.addEventListener("click", abrirAtendimentoDaLista);
  document.addEventListener("click", abrirRecebimentoPorBotao);
  document.addEventListener("click", selecionarClienteSugerido);
  setInterval(salvarRascunhoAtendimento, 10000);
}

function entrar(event) {
  event.preventDefault();
  const usuario = state.usuarios.find((item) => item.id === els.loginUsuario.value);
  const senha = document.querySelector("#loginSenha").value;
  if (!usuario || senha !== usuario.senha) {
    alert("Usuário ou senha inválidos.");
    return;
  }
  state.usuarioAtivoId = usuario.id;
  sessionStorage.setItem(SESSION_KEY, usuario.id);
  salvarEstado();
  atualizarPerfil();
  aplicarPermissoes();
  mostrarApp();
}

function sair() {
  state.usuarioAtivoId = null;
  sessionStorage.removeItem(SESSION_KEY);
  salvarEstado();
  fecharMenuMarca();
  mostrarLogin();
}

function mostrarLogin() {
  els.login.classList.remove("is-hidden");
  els.app.classList.add("is-locked");
}

function mostrarApp() {
  els.login.classList.add("is-hidden");
  els.app.classList.remove("is-locked");
  aplicarPermissoes();
}

function acaoPrincipal() {
  abrirModalProcesso();
}

function abrirModalCliente(id = "") {
  els.formCliente.reset();
  const cliente = id ? obterCliente(id) : null;
  document.querySelector("#tituloModalCliente").textContent = cliente ? "Editar cliente" : "Novo cliente";
  els.formCliente.elements.id.value = cliente?.id || "";
  els.formCliente.nome.value = cliente?.nome || "";
  els.formCliente.tipoDocumento.value = cliente?.tipoDocumento || inferirTipoDocumento(cliente?.documento || cliente?.cpf || "");
  els.formCliente.documento.value = formatarDocumento(cliente?.documento || cliente?.cpf || "", els.formCliente.tipoDocumento.value);
  els.formCliente.email.value = cliente?.email || "";
  els.formCliente.whatsapp.value = formatarTelefone(cliente?.whatsapp || "");
  els.formCliente.estadoCivil.value = cliente?.estadoCivil || "";
  els.formCliente.profissao.value = cliente?.profissao || "";
  els.formCliente.nacionalidade.value = cliente?.nacionalidade || "";
  els.formCliente.rg.value = cliente?.rg || "";
  els.formCliente.nascimento.value = cliente?.nascimento || "";
  els.formCliente.nomeFantasia.value = cliente?.nomeFantasia || "";
  els.formCliente.inscricaoEstadual.value = cliente?.inscricaoEstadual || "";
  els.formCliente.representante.value = cliente?.representante || "";
  els.formCliente.representanteCpf.value = formatarDocumento(cliente?.representanteCpf || "", "CPF");
  els.formCliente.representanteCargo.value = cliente?.representanteCargo || "";
  els.formCliente.domicilio.value = cliente?.domicilio || "";
  els.formCliente.observacoes.value = cliente?.observacoes || "";
  atualizarCamposClientePorTipo();
  els.modalCliente.showModal();
}

function abrirModalProcesso() {
  els.formProcesso.reset();
  popularSelectsProcesso();
  prepararAutocompleteCliente();
  els.formProcesso.prazo.value = hojeIso();
  els.modalProcesso.showModal();
}

function abrirModalUsuario(id = "") {
  els.formUsuario.reset();
  const usuario = id ? obterUsuario(id) : null;
  document.querySelector("#tituloModalUsuario").textContent = usuario ? "Editar usuário" : "Novo usuário";
  document.querySelector("#btnExcluirUsuario").classList.toggle("is-hidden", !usuario || state.usuarios.length <= 1);
  els.formUsuario.elements.id.value = usuario?.id || "";
  els.formUsuario.nome.value = usuario?.nome || "";
  els.formUsuario.email.value = usuario?.email || "";
  els.formUsuario.senha.value = usuario?.senha || "";
  els.formUsuario.cargo.value = usuario?.cargo || "";
  els.formUsuario.telefone.value = formatarTelefone(usuario?.telefone || "");
  els.formUsuario.oab.value = usuario?.oab || "";
  renderPermissoesUsuario(usuario?.permissoes || permissoesPadrao());
  els.modalUsuario.showModal();
}

function salvarCliente(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formCliente));
  const atual = dados.id ? obterCliente(dados.id) : null;
  const cliente = atual || { id: uid(), criadoEm: hojeIso() };

  Object.assign(cliente, {
    nome: dados.nome.trim(),
    tipoDocumento: dados.tipoDocumento,
    documento: formatarDocumento(dados.documento, dados.tipoDocumento),
    cpf: formatarDocumento(dados.documento, dados.tipoDocumento),
    email: dados.email.trim(),
    whatsapp: formatarTelefone(dados.whatsapp),
    estadoCivil: dados.estadoCivil,
    profissao: dados.profissao.trim(),
    nacionalidade: dados.nacionalidade?.trim() || "",
    rg: dados.rg?.trim() || "",
    nascimento: dados.nascimento || "",
    nomeFantasia: dados.nomeFantasia?.trim() || "",
    inscricaoEstadual: dados.inscricaoEstadual?.trim() || "",
    representante: dados.representante?.trim() || "",
    representanteCpf: formatarDocumento(dados.representanteCpf || "", "CPF"),
    representanteCargo: dados.representanteCargo?.trim() || "",
    domicilio: dados.domicilio.trim(),
    observacoes: dados.observacoes.trim()
  });

  if (!atual) state.clientes.unshift(cliente);
  salvarEstado();
  els.modalCliente.close();
  trocarView("clientes");
}

function salvarProcesso(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formProcesso));
  if (!dados.clienteId || !obterCliente(dados.clienteId)) {
    alert("Selecione um cliente da lista sugerida antes de salvar o processo.");
    els.processoClienteBusca.focus();
    return;
  }
  state.processos.unshift({
    id: uid(),
    numero: dados.numero.trim(),
    clienteId: dados.clienteId,
    area: dados.area,
    status: dados.status,
    orgao: dados.orgao,
    prazo: dados.prazo,
    responsavelId: dados.responsavelId,
    honorarios: Number(dados.honorarios || 0),
    recebido: Number(dados.recebido || 0),
    recebimentos: Number(dados.recebido || 0) > 0 ? [{ id: uid(), valor: Number(dados.recebido || 0), data: hojeIso(), forma: "Registro inicial", notaFiscal: "nao", observacoes: "" }] : [],
    descontos: [],
    atendimentos: [],
    resumo: dados.resumo.trim(),
    prazos: [
      {
        id: uid(),
        data: dados.prazo,
        tipo: "Prazo inicial",
        descricao: "Prazo cadastrado na abertura do processo.",
        responsavelId: dados.responsavelId,
        concluido: false
      }
    ],
    movimentacoes: [
      { id: uid(), data: hojeIso(), descricao: "Processo cadastrado no sistema." }
    ]
  });
  salvarEstado();
  els.modalProcesso.close();
  trocarView("processos");
}

function salvarUsuario(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formUsuario));
  const permissoes = [...els.formUsuario.querySelectorAll("[name='permissoes']:checked")].map((input) => input.value);
  if (!permissoes.length) {
    alert("Escolha pelo menos uma aba para o usuário.");
    return;
  }

  const atual = dados.id ? obterUsuario(dados.id) : null;
  const usuario = atual || { id: uid() };
  Object.assign(usuario, {
    nome: dados.nome.trim(),
    email: dados.email.trim(),
    senha: dados.senha,
    cargo: dados.cargo.trim(),
    telefone: formatarTelefone(dados.telefone),
    oab: dados.oab.trim(),
    permissoes
  });

  if (!atual) state.usuarios.push(usuario);
  salvarEstado();
  popularLogin();
  atualizarPerfil();
  aplicarPermissoes();
  renderConfiguracoes();
  els.modalUsuario.close();
}

function excluirUsuarioAberto() {
  const id = els.formUsuario.elements.id.value;
  if (!id || state.usuarios.length <= 1) return;
  const usuario = obterUsuario(id);
  if (!confirm(`Excluir o usuário "${usuario?.nome}"? Os processos dele serão atribuídos ao primeiro usuário disponível.`)) return;

  state.usuarios = state.usuarios.filter((item) => item.id !== id);
  const substituto = state.usuarios[0]?.id || "";
  state.processos.forEach((processo) => {
    if (processo.responsavelId === id) processo.responsavelId = substituto;
    processo.prazos.forEach((prazo) => {
      if (prazo.responsavelId === id) prazo.responsavelId = substituto;
    });
  });
  if (state.usuarioAtivoId === id) state.usuarioAtivoId = substituto;
  salvarEstado();
  popularLogin();
  atualizarPerfil();
  aplicarPermissoes();
  renderizarTudo();
  els.modalUsuario.close();
}

function adicionarItemConfig(event) {
  event.preventDefault();
  const valor = new FormData(els.formConfigItem).get("valor").trim();
  if (!configAberta || !valor) return;
  if (!state.configs[configAberta].includes(valor)) state.configs[configAberta].push(valor);
  els.formConfigItem.reset();
  salvarEstado();
  renderConfigModal();
  renderizarTudo();
}

function abrirConfig(event) {
  const button = event.target.closest("[data-open-config]");
  if (!button) return;
  configAberta = button.dataset.openConfig;
  document.querySelector("#tituloModalConfig").textContent = `Editar ${CONFIG_META[configAberta].titulo}`;
  els.formConfigItem.reset();
  renderConfigModal();
  els.modalConfig.showModal();
}

function editarOuExcluirConfig(event) {
  const salvar = event.target.closest("[data-save-config]");
  const excluir = event.target.closest("[data-delete-config]");
  if (!configAberta || (!salvar && !excluir)) return;
  const row = event.target.closest("[data-config-row]");
  const index = Number(row.dataset.configRow);
  const valorAtual = state.configs[configAberta][index];

  if (salvar) {
    const novoValor = row.querySelector("input").value.trim();
    if (!novoValor) return;
    state.configs[configAberta][index] = novoValor;
  }

  if (excluir) {
    if (state.configs[configAberta].length <= 1) {
      alert("Mantenha pelo menos um item nesta lista.");
      return;
    }
    if (!confirm(`Excluir "${valorAtual}" de ${CONFIG_META[configAberta].titulo}?`)) return;
    state.configs[configAberta].splice(index, 1);
  }

  salvarEstado();
  renderConfigModal();
  renderizarTudo();
}

function salvarItemProcesso(event) {
  const form = event.target.closest("[data-detail-form]");
  if (!form) return;
  event.preventDefault();
  const processo = obterProcesso(processoAbertoId);
  if (!processo) return;

  const dados = Object.fromEntries(new FormData(form));
  if (form.dataset.detailForm === "prazo") {
    processo.prazos.push({
      id: uid(),
      data: dados.data,
      tipo: dados.tipo.trim(),
      descricao: dados.descricao.trim(),
      responsavelId: dados.responsavelId,
      concluido: false
    });
    processo.prazo = proximoPrazoDoProcesso(processo);
  }

  if (form.dataset.detailForm === "movimentacao") {
    processo.movimentacoes.unshift({ id: uid(), data: dados.data, descricao: dados.descricao.trim() });
  }

  form.reset();
  salvarEstado();
  renderizarTudo();
  abrirDetalheProcesso(processo.id);
}

function concluirPrazo(event) {
  const button = event.target.closest("[data-toggle-prazo]");
  if (!button) return;
  const processo = obterProcesso(processoAbertoId);
  const prazo = processo?.prazos.find((item) => item.id === button.dataset.togglePrazo);
  if (!prazo) return;
  prazo.concluido = !prazo.concluido;
  processo.prazo = proximoPrazoDoProcesso(processo);
  salvarEstado();
  abrirDetalheProcesso(processo.id);
  renderizarTudo();
}

function abrirUsuarioOuExcluir(event) {
  const button = event.target.closest("[data-edit-user]");
  if (!button) return;
  abrirModalUsuario(button.dataset.editUser);
}

function fecharDialogo(event) {
  const button = event.target.closest("[data-close-dialog]");
  if (!button) return;
  button.closest("dialog")?.close();
}

function bloquearZoom() {
  const bloquearRoda = (event) => {
    if (event.ctrlKey) event.preventDefault();
  };
  const bloquearTecla = (event) => {
    const tecla = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && ["+", "-", "=", "0"].includes(tecla)) {
      event.preventDefault();
    }
  };
  window.addEventListener("wheel", bloquearRoda, { passive: false, capture: true });
  document.addEventListener("wheel", bloquearRoda, { passive: false, capture: true });
  window.addEventListener("keydown", bloquearTecla, { capture: true });
  document.addEventListener("keydown", bloquearTecla, { capture: true });
  window.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
}

function aplicarMascara(event) {
  const input = event.target;
  if (input.name === "documento") {
    const tipo = input.closest("form")?.querySelector("[name='tipoDocumento']")?.value || inferirTipoDocumento(input.value);
    input.value = formatarDocumento(input.value, tipo);
  }
  if (input.name === "representanteCpf") input.value = formatarDocumento(input.value, "CPF");
  if (input.name === "whatsapp" || input.name === "telefone") input.value = formatarTelefone(input.value);
}

function atualizarMascaraDocumento(event) {
  if (event.target.name !== "tipoDocumento") return;
  const input = event.target.closest("form")?.querySelector("[name='documento']");
  if (input) input.value = formatarDocumento(input.value, event.target.value);
  atualizarCamposClientePorTipo();
}

function atualizarCamposClientePorTipo() {
  const tipo = els.formCliente?.tipoDocumento?.value || "CPF";
  const pessoaJuridica = tipo === "CNPJ";
  const labelNome = document.querySelector("#labelNomeCliente");
  const labelDocumento = document.querySelector("#labelDocumentoCliente");
  const labelDomicilio = document.querySelector("#labelDomicilioCliente");
  const inputDocumento = els.formCliente?.querySelector("[name='documento']");
  if (labelNome) labelNome.textContent = pessoaJuridica ? "Razão social" : "Nome completo";
  if (labelDocumento) labelDocumento.textContent = pessoaJuridica ? "CNPJ" : "CPF";
  if (labelDomicilio) labelDomicilio.textContent = pessoaJuridica ? "Sede" : "Domicílio";
  if (inputDocumento) inputDocumento.placeholder = pessoaJuridica ? "00.000.000/0000-00" : "000.000.000-00";
  els.formCliente?.querySelectorAll("[data-pessoa]").forEach((campo) => {
    campo.classList.toggle("is-hidden", campo.dataset.pessoa === "pf" ? pessoaJuridica : !pessoaJuridica);
  });
}

function alternarModoClientes() {
  state.clienteModo = state.clienteModo === "lista" ? "cards" : "lista";
  salvarEstado();
  renderClientes();
}

function alternarSidebar() {
  state.sidebarRecolhida = !state.sidebarRecolhida;
  salvarEstado();
  aplicarSidebar();
}

function trocarView(view) {
  if (!temAcesso(view)) return;
  viewAtual = view;
  const labels = {
    dashboard: "Painel",
    processos: "Processos",
    clientes: "Clientes",
    atendimentos: "Atendimentos",
    agenda: "Agenda",
    financeiro: "Honorários",
    configuracoes: "Configurações"
  };

  els.viewTitle.textContent = labels[view] || "Painel";
  atualizarAcoesTopo(view);

  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-visible", section.id === `view-${view}`);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  renderizarTudo();
}

function atualizarAcoesTopo(view = viewAtual) {
  const mostrarBusca = ["processos", "clientes", "financeiro"].includes(view);
  els.topSearchBox.classList.toggle("is-hidden", !mostrarBusca);
  els.btnNovo.classList.toggle("is-hidden", view !== "processos");
  els.btnForceUpdateTop.classList.add("is-hidden");
  els.btnNovoTexto.textContent = "Novo processo";

  const placeholders = {
    processos: "Buscar cliente, processo...",
    clientes: "Buscar cliente pelo nome...",
    financeiro: "Buscar cliente pelo nome..."
  };
  els.busca.placeholder = placeholders[view] || "Buscar";
}

function renderizarTudo() {
  aplicarPermissoes();
  popularFiltros();
  renderMetricas();
  renderProcessosDestaque();
  renderTabelaProcessos();
  renderClientes();
  renderAtendimentos();
  renderAgenda();
  renderFinanceiro();
  renderConfiguracoes();
}

function renderMetricas() {
  const processosAtivos = state.processos.filter((processo) => processo.status !== "Encerrado").length;
  const prazosCriticos = eventosAgenda().filter((evento) => !evento.concluido && diasAte(evento.data) <= 3).length;
  const pendente = state.processos.reduce((total, processo) => total + saldoHonorarios(processo), 0);
  const cards = [
    metricCard("Processos ativos", processosAtivos, "Carteira em andamento"),
    metricCard("Clientes", state.clientes.length, "Cadastros no escritório"),
    metricCard("Prazos críticos", prazosCriticos, "Vencidos ou até 3 dias")
  ];
  if (temAcesso("financeiro")) cards.push(metricCard("A receber", moeda(pendente), "Honorários pendentes"));
  document.querySelector("#metricas").innerHTML = cards.join("");
  els.plantaoResumo.textContent = `${prazosCriticos} prazos críticos`;
}

function renderProcessosDestaque() {
  const lista = filtrarProcessos()
    .filter((processo) => processo.status !== "Encerrado")
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    .slice(0, 4);

  document.querySelector("#processosDestaque").innerHTML = vazioOu(lista, (processo) => {
    const cliente = obterCliente(processo.clienteId);
    const responsavel = obterUsuario(processo.responsavelId);
    return `
      <article class="case-item clickable" data-open-process="${processo.id}">
        <div class="case-top">
          <div>
            <div class="case-title">${escapeHtml(cliente?.nome || "Cliente não informado")}</div>
            <div class="case-meta">Processo ${escapeHtml(processo.numero)} · ${escapeHtml(processo.orgao)}</div>
          </div>
          ${badgePrazo(processo)}
        </div>
        <p>${escapeHtml(processo.resumo || "Sem resumo cadastrado.")}</p>
        <div class="case-meta">${escapeHtml(processo.area)} · ${escapeHtml(processo.status)} · Responsável: ${escapeHtml(responsavel?.nome || "")}</div>
      </article>
    `;
  });
  vincularAberturaProcesso();
}

function renderTabelaProcessos() {
  document.querySelector("#tabelaProcessos").innerHTML = vazioOu(filtrarProcessos(), (processo) => {
    const cliente = obterCliente(processo.clienteId);
    const responsavel = obterUsuario(processo.responsavelId);
    return `
      <tr class="clickable" data-open-process="${processo.id}">
        <td><strong>${escapeHtml(processo.numero)}</strong><br><span class="case-meta">${escapeHtml(processo.orgao)}</span></td>
        <td>${escapeHtml(cliente?.nome || "")}<br><span class="case-meta">${escapeHtml(cliente?.documento || cliente?.cpf || "")}</span></td>
        <td>${escapeHtml(processo.area)}</td>
        <td>${badgeStatus(processo.status)}</td>
        <td>${dataCurta(processo.prazo)}<br>${badgePrazo(processo)}</td>
        <td>${escapeHtml(responsavel?.nome || "")}</td>
      </tr>
    `;
  });
  vincularAberturaProcesso();
}

function renderClientes() {
  els.ordenacaoClientes.value = state.clienteOrdenacao;
  els.btnModoClientes.textContent = state.clienteModo === "lista" ? "Ver em caixas" : "Ver em lista";
  const clientes = ordenarClientes(filtrarClientes());
  const container = document.querySelector("#listaClientes");
  container.className = state.clienteModo === "lista" ? "client-list" : "client-grid";

  if (state.clienteModo === "lista") {
    container.innerHTML = clientes.length
      ? `<div class="client-row client-head">
          <span>Cliente</span>
          <span>Contato</span>
          <span>Casos</span>
          <span>Próximo prazo</span>
          <span>Cadastro</span>
        </div>${clientes.map(cardClienteLinha).join("")}`
      : vazioOu(clientes, cardClienteLinha);
    vincularAberturaCliente();
    return;
  }

  container.innerHTML = vazioOu(clientes, cardClienteCaixa);
  vincularAberturaCliente();
}

function cardClienteCaixa(cliente) {
  const stats = estatisticasCliente(cliente);
  return `
    <article class="client-card clickable" data-open-client-id="${cliente.id}">
      <div class="client-top">
        <strong>${escapeHtml(cliente.nome)}</strong>
        <span class="badge">${stats.casos} caso${stats.casos !== 1 ? "s" : ""}</span>
      </div>
      <div class="client-meta">${escapeHtml(cliente.tipoDocumento || inferirTipoDocumento(cliente.documento))}: ${escapeHtml(cliente.documento || cliente.cpf || "")}</div>
      <div class="client-lines">
        <span>${escapeHtml(cliente.email || "E-mail não informado")}</span>
        <span>${escapeHtml(cliente.whatsapp || "Whatsapp não informado")}</span>
        <span>${escapeHtml(cliente.profissao || "Profissão não informada")}</span>
        <span>${escapeHtml(cliente.domicilio || "Domicílio não informado")}</span>
      </div>
      <p>${escapeHtml(cliente.observacoes || "Sem observações.")}</p>
      <div class="client-meta">Cadastro: ${dataCurta(cliente.criadoEm)} · Próximo prazo: ${stats.proximoPrazo ? dataCurta(stats.proximoPrazo) : "sem prazo"}</div>
    </article>
  `;
}

function cardClienteLinha(cliente) {
  const stats = estatisticasCliente(cliente);
  return `
    <button class="client-row" type="button" data-open-client-id="${cliente.id}">
      <span><strong>${escapeHtml(cliente.nome)}</strong><small>${escapeHtml(cliente.documento || cliente.cpf || "")}</small></span>
      <span>${escapeHtml(cliente.whatsapp || "-")}</span>
      <span>${stats.casos} caso${stats.casos !== 1 ? "s" : ""}</span>
      <span>${stats.proximoPrazo ? dataCurta(stats.proximoPrazo) : "Sem prazo"}</span>
      <span>${dataCurta(cliente.criadoEm)}</span>
    </button>
  `;
}

function renderAtendimentos() {
  preencherSelect(els.atendimentoCliente, state.clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome })));
  preencherSelect(els.atendimentoArea, state.configs.areas.map(opcao));
  preencherSelect(els.atendimentoResponsavel, state.usuarios.map((usuario) => ({ value: usuario.id, label: usuario.nome })));
  if (!atendimentoAbertoId && !els.formAtendimento.elements.id.value) carregarRascunhoAtendimento();
  els.listaAtendimentos.innerHTML = vazioOu(state.atendimentos, (atendimento) => {
    const cliente = obterCliente(atendimento.clienteId);
    const responsavel = obterUsuario(atendimento.responsavelId);
    return `
      <button class="attendance-item" type="button" data-open-attendance="${atendimento.id}">
        <strong>${escapeHtml(atendimento.assunto || "Atendimento sem assunto")}</strong>
        <span>${escapeHtml(cliente?.nome || "Cliente não informado")} · ${escapeHtml(atendimento.area)} · ${dataHoraCurta(atendimento.data)}</span>
        <small>Responsável: ${escapeHtml(responsavel?.nome || "")}${atendimento.processoId ? " · Vinculado a processo" : ""}</small>
      </button>
    `;
  });
  renderVersoesAtendimento(atendimentoAberto());
}

function novoAtendimento() {
  atendimentoAbertoId = "";
  atendimentoAlterado = false;
  els.formAtendimento.reset();
  els.formAtendimento.elements.id.value = "";
  els.atendimentoData.value = agoraLocalInput();
  if (state.clientes[0]) els.atendimentoCliente.value = state.clientes[0].id;
  if (state.configs.areas[0]) els.atendimentoArea.value = state.configs.areas[0];
  if (usuarioAtual()) els.atendimentoResponsavel.value = usuarioAtual().id;
  els.atendimentoEditor.innerHTML = modeloAtendimento();
  els.atendimentoStatus.textContent = "Novo atendimento";
  renderVersoesAtendimento(null);
}

function marcarAtendimentoAlterado() {
  atendimentoAlterado = true;
  els.atendimentoStatus.textContent = "Alterações em rascunho";
}

function salvarRascunhoAtendimento() {
  if (viewAtual !== "atendimentos" || !atendimentoAlterado) return;
  const rascunho = dadosAtendimentoDoFormulario();
  if (!rascunho.conteudoHtml.trim()) return;
  state.rascunhoAtendimento = manterTresVersoes(state.rascunhoAtendimento || {}, rascunho);
  Object.assign(state.rascunhoAtendimento, rascunho, { salvoEm: new Date().toISOString() });
  atendimentoAlterado = false;
  els.atendimentoStatus.textContent = `Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  salvarEstado();
}

function salvarAtendimento(event) {
  event.preventDefault();
  const dados = dadosAtendimentoDoFormulario();
  if (!dados.conteudoHtml.trim()) {
    alert("Digite as anotações do atendimento antes de salvar.");
    return;
  }
  let atendimento = dados.id ? state.atendimentos.find((item) => item.id === dados.id) : null;
  if (!atendimento) {
    atendimento = { id: uid(), criadoEm: hojeIso(), versoes: [] };
    state.atendimentos.unshift(atendimento);
  } else {
    atendimento.versoes = manterTresVersoes(atendimento, { ...atendimento }).versoes;
  }
  Object.assign(atendimento, dados, { atualizadoEm: new Date().toISOString() });
  atendimentoAbertoId = atendimento.id;
  els.formAtendimento.elements.id.value = atendimento.id;
  state.rascunhoAtendimento = null;
  atendimentoAlterado = false;
  salvarEstado();
  renderAtendimentos();
  els.atendimentoStatus.textContent = "Atendimento salvo";
}

function dadosAtendimentoDoFormulario() {
  const dados = Object.fromEntries(new FormData(els.formAtendimento));
  return {
    id: dados.id || "",
    clienteId: dados.clienteId,
    area: dados.area,
    responsavelId: dados.responsavelId,
    data: dados.data || agoraLocalInput(),
    assunto: dados.assunto.trim(),
    conteudoHtml: els.atendimentoEditor.innerHTML
  };
}

function abrirAtendimentoDaLista(event) {
  const botao = event.target.closest("[data-open-attendance]");
  if (!botao) return;
  const atendimento = state.atendimentos.find((item) => item.id === botao.dataset.openAttendance);
  if (!atendimento) return;
  preencherFormularioAtendimento(atendimento);
}

function preencherFormularioAtendimento(atendimento) {
  atendimentoAbertoId = atendimento.id || "";
  els.formAtendimento.elements.id.value = atendimento.id || "";
  els.atendimentoCliente.value = atendimento.clienteId || state.clientes[0]?.id || "";
  els.atendimentoArea.value = atendimento.area || state.configs.areas[0] || "";
  els.atendimentoResponsavel.value = atendimento.responsavelId || usuarioAtual()?.id || "";
  els.atendimentoData.value = atendimento.data || agoraLocalInput();
  els.formAtendimento.assunto.value = atendimento.assunto || "";
  els.atendimentoEditor.innerHTML = atendimento.conteudoHtml || modeloAtendimento();
  atendimentoAlterado = false;
  els.atendimentoStatus.textContent = atendimento.id ? "Atendimento carregado" : "Rascunho carregado";
  renderVersoesAtendimento(atendimento);
}

function carregarRascunhoAtendimento() {
  if (state.rascunhoAtendimento?.conteudoHtml) preencherFormularioAtendimento(state.rascunhoAtendimento);
  else novoAtendimento();
}

function renderVersoesAtendimento(atendimento) {
  const versoes = atendimento?.versoes || [];
  els.versoesAtendimento.innerHTML = versoes.length ? `
    <h3>Últimas versões</h3>
    ${versoes.map((versao) => `
      <article>
        <strong>${escapeHtml(versao.assunto || "Versão anterior")}</strong>
        <span>${dataHoraCurta(versao.salvoEm || versao.atualizadoEm || versao.data)}</span>
      </article>
    `).join("")}
  ` : "";
}

function manterTresVersoes(entidade, versao) {
  const versoes = [resumoVersaoAtendimento(versao), ...(entidade.versoes || [])].filter((item) => item.conteudoHtml);
  return { ...entidade, versoes: versoes.slice(0, 3) };
}

function resumoVersaoAtendimento(item) {
  return {
    id: item.id || uid(),
    assunto: item.assunto || "",
    conteudoHtml: item.conteudoHtml || "",
    salvoEm: new Date().toISOString()
  };
}

function aplicarComandoEditor(event) {
  const botao = event.target.closest("[data-editor-command]");
  if (!botao) return;
  event.preventDefault();
  els.atendimentoEditor.focus();
  document.execCommand(botao.dataset.editorCommand, false, botao.dataset.editorValue || null);
  marcarAtendimentoAlterado();
}

function transformarAtendimentoEmProcesso() {
  const dados = dadosAtendimentoDoFormulario();
  let atendimento = dados.id ? state.atendimentos.find((item) => item.id === dados.id) : null;
  if (!atendimento || atendimentoAlterado) {
    salvarAtendimento(new Event("submit"));
    atendimento = state.atendimentos.find((item) => item.id === atendimentoAbertoId);
  }
  if (!atendimento) return;
  if (atendimento.processoId && obterProcesso(atendimento.processoId)) {
    abrirDetalheProcesso(atendimento.processoId);
    return;
  }
  const processo = {
    id: uid(),
    numero: `A distribuir - ${dataCurta(hojeIso())}`,
    clienteId: atendimento.clienteId,
    area: atendimento.area,
    status: "Ativo",
    orgao: state.configs.orgaos[0],
    prazo: somarDiasIso(hojeIso(), 7),
    responsavelId: atendimento.responsavelId,
    honorarios: 0,
    recebido: 0,
    recebimentos: [],
    descontos: [],
    resumo: atendimento.assunto,
    atendimentos: [atendimento.id],
    prazos: [{ id: uid(), data: somarDiasIso(hojeIso(), 7), tipo: "Providência inicial", descricao: "Avaliar documentação e definir estratégia após atendimento.", responsavelId: atendimento.responsavelId, concluido: false }],
    movimentacoes: [{ id: uid(), data: hojeIso(), descricao: "Processo criado a partir de atendimento." }]
  };
  state.processos.unshift(processo);
  atendimento.processoId = processo.id;
  salvarEstado();
  renderizarTudo();
  trocarView("processos");
  abrirDetalheProcesso(processo.id);
}

function modeloAtendimento() {
  return `<p><strong>Resumo da reunião:</strong></p><p><br></p><p><strong>Documentos apresentados:</strong></p><ul><li></li></ul><p><strong>Orientação jurídica:</strong></p><p><br></p><p><strong>Próximas providências:</strong></p><ul><li></li></ul>`;
}

function renderAgenda() {
  const eventos = eventosAgenda().sort((a, b) => new Date(a.data) - new Date(b.data));
  const proximos = eventos.filter((evento) => !evento.concluido).slice(0, 8);
  document.querySelector("#agendaResumo").innerHTML = vazioOu(proximos.slice(0, 6), cardEvento);
  document.querySelector("#agendaLista").innerHTML = vazioOu(proximos, cardEvento);
  renderCalendario(eventos);
}

function renderCalendario(eventos) {
  const ano = mesAgenda.getFullYear();
  const mes = mesAgenda.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const inicio = primeiroDia.getDay();
  const titulo = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(mesAgenda);
  document.querySelector("#tituloMesAgenda").textContent = titulo;

  const celulas = [];
  for (let i = 0; i < inicio; i++) celulas.push(`<div class="calendar-day empty"></div>`);
  for (let dia = 1; dia <= totalDias; dia++) {
    const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const eventosDia = eventos.filter((evento) => evento.data === data).slice(0, 3);
    celulas.push(`
      <div class="calendar-day ${data === hojeIso() ? "today" : ""}">
        <strong>${dia}</strong>
        <div class="calendar-events">
          ${eventosDia.map((evento) => `
            <button type="button" data-open-process="${evento.processoId}">
              ${escapeHtml(evento.cliente)} · ${escapeHtml(evento.tipo)}
            </button>
          `).join("")}
        </div>
      </div>
    `);
  }
  document.querySelector("#gradeAgenda").innerHTML = celulas.join("");
  vincularAberturaProcesso();
}

function cardEvento(evento) {
  return `
    <article class="deadline-item ${evento.concluido ? "is-done" : ""}">
      <div class="deadline-top">
        <strong>${dataCurta(evento.data)}</strong>
        <span class="badge ${evento.concluido ? "ok" : diasAte(evento.data) <= 3 ? "gold" : ""}">${escapeHtml(evento.tipo)}</span>
      </div>
      <div>${escapeHtml(evento.cliente)}</div>
      <div class="deadline-meta">
        Processo: ${escapeHtml(evento.processo)}<br>
        Responsável: ${escapeHtml(evento.responsavel)}<br>
        ${escapeHtml(evento.descricao)}
      </div>
    </article>
  `;
}

function renderFinanceiro() {
  const lista = filtrarProcessosFinanceiro();
  const total = soma(lista, "honorarios");
  const recebido = soma(lista, "recebido");
  const descontos = lista.reduce((valor, processo) => valor + totalDescontos(processo), 0);
  const pendente = lista.reduce((valor, processo) => valor + saldoHonorarios(processo), 0);

  document.querySelector("#financeiroResumo").innerHTML = [
    financeCard("Contratado", total, "Total em honorários"),
    financeCard("Descontos", descontos, "Ajustes concedidos"),
    financeCard("Recebido", recebido, "Entradas registradas"),
    financeCard("Pendente", pendente, "Valores a receber")
  ].join("");

  document.querySelector("#tabelaFinanceiro").innerHTML = vazioOu(lista, (processo) => {
    const cliente = obterCliente(processo.clienteId);
    return `
      <tr>
        <td>${escapeHtml(cliente?.nome || "")}<br><span class="case-meta">${escapeHtml(processo.numero)}</span></td>
        <td>${moeda(processo.honorarios)}</td>
        <td>${moeda(processo.recebido)}</td>
        <td>${moeda(saldoHonorarios(processo))}</td>
        <td>
          <button class="ghost-button table-action" type="button" data-open-receipt="${processo.id}">
            Gerenciar
          </button>
        </td>
      </tr>
    `;
  });
}

function renderConfiguracoes() {
  const temas = [
    { id: "classico", nome: "Clássico", amostra: "charcoal" },
    { id: "vinho", nome: "Vinho", amostra: "wine" },
    { id: "marinho", nome: "Marinho", amostra: "navy" },
    { id: "verde", nome: "Verde", amostra: "green" }
  ];

  document.querySelector("#temaPicker").innerHTML = temas.map((tema) => `
    <button type="button" data-theme="${tema.id}" class="${state.tema === tema.id ? "is-selected" : ""}">
      <span class="swatch ${tema.amostra}"></span>${tema.nome}
    </button>
  `).join("");

  document.querySelector("#settingsLists").innerHTML = Object.entries(CONFIG_META).map(([chave, meta]) => `
    <button class="config-card" type="button" data-open-config="${chave}">
      <span>${meta.titulo}</span>
      <strong>${state.configs[chave].length}</strong>
      <small>${meta.descricao}</small>
    </button>
  `).join("");

  document.querySelector("#listaUsuarios").innerHTML = state.usuarios.map((usuario) => `
    <button class="user-row" type="button" data-edit-user="${usuario.id}">
      <span class="user-avatar">${escapeHtml(inicial(usuario.nome))}</span>
      <span>
        <strong>${escapeHtml(usuario.nome)}</strong>
        <small>${escapeHtml(usuario.cargo || "Cargo não informado")} · ${escapeHtml(usuario.email || "Sem e-mail")}</small>
        <small>Acessos: ${usuario.permissoes.map((aba) => labelAba(aba)).join(", ")}</small>
      </span>
      <span class="edit-hint">Editar</span>
    </button>
  `).join("");
}

function renderConfigModal() {
  if (!configAberta) return;
  els.listaConfigModal.innerHTML = state.configs[configAberta].map((valor, index) => `
    <div class="config-edit-row" data-config-row="${index}">
      <input value="${escapeHtml(valor)}" aria-label="Editar item">
      <button class="ghost-button" type="button" data-save-config>Salvar</button>
      <button class="ghost-button danger-text" type="button" data-delete-config>Excluir</button>
    </div>
  `).join("");
}

function abrirDetalheProcesso(id) {
  const processo = obterProcesso(id);
  if (!processo) return;
  processoAbertoId = id;

  const cliente = obterCliente(processo.clienteId);
  const responsavel = obterUsuario(processo.responsavelId);
  const tipoDocumento = cliente?.tipoDocumento || inferirTipoDocumento(cliente?.documento || cliente?.cpf || "");
  const saldoAtual = saldoHonorarios(processo);
  const whatsappUrl = urlWhatsApp(cliente?.whatsapp || "");
  document.querySelector("#detalheTitulo").textContent = processo.numero;
  els.detalheConteudo.innerHTML = `
    <div class="process-detail">
      <section class="detail-summary">
        <div>
          <p class="eyebrow">Cliente</p>
          <h3>${escapeHtml(cliente?.nome || "Cliente não informado")}</h3>
          <div class="detail-chips">
            <span><strong>${escapeHtml(tipoDocumento || "CPF/CNPJ")}</strong>${escapeHtml(cliente?.documento || cliente?.cpf || "")}</span>
            <span class="chip-with-action"><strong>Whatsapp</strong>${escapeHtml(cliente?.whatsapp || "Não informado")}${whatsappUrl ? `<a class="whatsapp-action" href="${whatsappUrl}" target="_blank" rel="noopener" title="Abrir WhatsApp">Abrir</a>` : ""}</span>
            <span><strong>${tipoDocumento === "CNPJ" ? "Sede" : "Domicílio"}</strong>${escapeHtml(cliente?.domicilio || "Não informado")}</span>
          </div>
        </div>
        ${badgeStatus(processo.status)}
      </section>

      <section class="detail-finance">
        <span><strong>${moeda(processo.honorarios)}</strong><small>Honorários contratados</small></span>
        <span><strong>${moeda(totalDescontos(processo))}</strong><small>Descontos</small></span>
        <span><strong>${moeda(processo.recebido)}</strong><small>Recebido</small></span>
        <span><strong>${moeda(saldoAtual)}</strong><small>Pendente</small></span>
        <button class="ghost-button" type="button" data-open-receipt="${processo.id}">Gerenciar recebimento</button>
      </section>

      <div class="detail-board">
        <section class="detail-panel detail-main">
          <h3>Dados do processo</h3>
          <dl>
            <dt>Área</dt><dd>${escapeHtml(processo.area)}</dd>
            <dt>Vara/Fórum</dt><dd>${escapeHtml(processo.orgao)}</dd>
            <dt>Responsável</dt><dd>${escapeHtml(responsavel?.nome || "")}</dd>
            <dt>Próximo prazo</dt><dd>${dataCurta(processo.prazo)}</dd>
          </dl>
          <p>${escapeHtml(processo.resumo || "Sem resumo cadastrado.")}</p>
        </section>

        <section class="detail-panel detail-form-card">
          <h3>Novo prazo</h3>
          <form class="stack-form" data-detail-form="prazo">
            <input name="data" type="date" required>
            <input name="tipo" required placeholder="Tipo do prazo">
            <select name="responsavelId" required>${state.usuarios.map((u) => `<option value="${u.id}" ${u.id === processo.responsavelId ? "selected" : ""}>${escapeHtml(u.nome)}</option>`).join("")}</select>
            <textarea name="descricao" rows="3" required placeholder="Descrição"></textarea>
            <button class="primary-button" type="submit">Adicionar prazo</button>
          </form>
        </section>

        <section class="detail-panel detail-form-card">
          <h3>Nova movimentação</h3>
          <form class="stack-form" data-detail-form="movimentacao">
            <input name="data" type="date" required value="${hojeIso()}">
            <textarea name="descricao" rows="4" required placeholder="Descrição da movimentação"></textarea>
            <button class="primary-button" type="submit">Adicionar movimentação</button>
          </form>
        </section>

        <section class="detail-panel">
          <h3>Prazos</h3>
          <div class="mini-list">
            ${ordenarPorData(processo.prazos).map((prazo) => {
              const resp = obterUsuario(prazo.responsavelId || processo.responsavelId);
              return `
                <div class="${prazo.concluido ? "is-done" : ""}">
                  <button class="mini-check" type="button" data-toggle-prazo="${prazo.id}" title="Marcar prazo">${prazo.concluido ? "✓" : ""}</button>
                  <div>
                    <strong>${dataCurta(prazo.data)} · ${escapeHtml(prazo.tipo)}</strong>
                    <span>Responsável: ${escapeHtml(resp?.nome || "")}</span>
                    <span>${escapeHtml(prazo.descricao)}</span>
                  </div>
                </div>
              `;
            }).join("") || "<p>Nenhum prazo cadastrado.</p>"}
          </div>
        </section>

        <section class="detail-panel detail-movements">
          <h3>Movimentações</h3>
          <div class="timeline-list">
            ${ordenarPorData(processo.movimentacoes).reverse().map((mov) => `
              <article>
                <time>${dataCurta(mov.data)}</time>
                <p>${escapeHtml(mov.descricao)}</p>
              </article>
            `).join("") || "<p>Nenhuma movimentação cadastrada.</p>"}
          </div>
        </section>

        <section class="detail-panel detail-movements">
          <h3>Atendimentos vinculados</h3>
          <div class="attendance-linked-list">
            ${atendimentosDoProcesso(processo).map((atendimento) => `
              <article>
                <strong>${escapeHtml(atendimento.assunto || "Atendimento")}</strong>
                <span>${dataHoraCurta(atendimento.data)} · ${escapeHtml(obterUsuario(atendimento.responsavelId)?.nome || "")}</span>
                <div>${atendimento.conteudoHtml || ""}</div>
              </article>
            `).join("") || "<p>Nenhum atendimento vinculado a este processo.</p>"}
          </div>
        </section>
      </div>
    </div>
  `;

  if (!els.modalDetalhe.open) els.modalDetalhe.showModal();
}

function renderPermissoesUsuario(permissoes) {
  document.querySelector("#permissoesUsuario").innerHTML = ABAS.map((aba) => `
    <label>
      <input type="checkbox" name="permissoes" value="${aba.id}" ${permissoes.includes(aba.id) ? "checked" : ""}>
      <span>${aba.label}</span>
    </label>
  `).join("");
}

function prepararAutocompleteCliente() {
  els.processoClienteBusca.value = "";
  els.processoClienteId.value = "";
  els.clienteSugestoes.innerHTML = "";
  els.clienteSugestoes.classList.remove("is-open");
}

function renderSugestoesCliente() {
  const termo = normalizar(els.processoClienteBusca.value);
  els.processoClienteId.value = "";
  const clientes = state.clientes
    .filter((cliente) => !termo || normalizar(cliente.nome).includes(termo))
    .slice(0, 8);

  els.clienteSugestoes.innerHTML = clientes.map((cliente) => `
    <button type="button" data-pick-client="${cliente.id}">
      <strong>${escapeHtml(cliente.nome)}</strong>
      <span>${escapeHtml(cliente.tipoDocumento || inferirTipoDocumento(cliente.documento || cliente.cpf || ""))}: ${escapeHtml(cliente.documento || cliente.cpf || "")}</span>
    </button>
  `).join("") || `<p>Nenhum cliente encontrado.</p>`;
  els.clienteSugestoes.classList.add("is-open");
}

function selecionarClienteSugerido(event) {
  const opcao = event.target.closest("[data-pick-client]");
  if (!opcao) {
    if (!event.target.closest(".autocomplete-field")) els.clienteSugestoes?.classList.remove("is-open");
    return;
  }
  const cliente = obterCliente(opcao.dataset.pickClient);
  if (!cliente) return;
  els.processoClienteBusca.value = cliente.nome;
  els.processoClienteId.value = cliente.id;
  els.clienteSugestoes.classList.remove("is-open");
}

function abrirRecebimentoPorBotao(event) {
  const botao = event.target.closest("[data-open-receipt]");
  if (!botao) return;
  event.preventDefault();
  abrirModalRecebimento(botao.dataset.openReceipt);
}

function abrirModalRecebimento(id) {
  const processo = obterProcesso(id);
  if (!processo) return;
  const cliente = obterCliente(processo.clienteId);
  const saldo = saldoHonorarios(processo);
  els.formRecebimento.reset();
  els.formRecebimento.processoId.value = processo.id;
  els.formRecebimento.data.value = hojeIso();
  els.formRecebimento.valor.value = "";
  els.recebimentoResumo.innerHTML = `
    <article>
      <span>Cliente</span>
      <strong>${escapeHtml(cliente?.nome || "Cliente não informado")}</strong>
      <small>${escapeHtml(processo.numero)}</small>
    </article>
    <article>
      <span>Contratado</span>
      <strong>${moeda(processo.honorarios)}</strong>
      <small>Honorários do processo</small>
    </article>
    <article>
      <span>Recebido</span>
      <strong>${moeda(processo.recebido)}</strong>
      <small>${(processo.recebimentos || []).length} lançamento${(processo.recebimentos || []).length !== 1 ? "s" : ""}</small>
    </article>
    <article>
      <span>Descontos</span>
      <strong>${moeda(totalDescontos(processo))}</strong>
      <small>${(processo.descontos || []).length} ajuste${(processo.descontos || []).length !== 1 ? "s" : ""}</small>
    </article>
    <article>
      <span>Pendente</span>
      <strong>${moeda(saldo)}</strong>
      <small>Saldo atual</small>
    </article>
  `;
  renderNotasPendentes(processo);
  renderHistoricoRecebimentos(processo);
  if (!els.modalRecebimento.open) els.modalRecebimento.showModal();
}

function renderNotasPendentes(processo) {
  const pendentes = (processo.recebimentos || []).filter((item) => item.notaFiscal === "sim");
  const titulo = pendentes.length === 1 ? "1 nota fiscal pendente" : `${pendentes.length} notas fiscais pendentes`;
  els.notasPendentes.innerHTML = `
    <div class="invoice-box">
      <strong>${titulo}</strong>
      ${pendentes.length ? `<div>${pendentes.map((item) => `<span>${dataCurta(item.data)} · ${moeda(item.valor)} · ${escapeHtml(item.forma)}</span>`).join("")}</div>` : "<small>Nenhuma nota fiscal pendente neste processo.</small>"}
    </div>
  `;
}

function renderHistoricoRecebimentos(processo) {
  const recebimentos = processo.recebimentos || [];
  const descontos = processo.descontos || [];
  els.recebimentoHistorico.innerHTML = (recebimentos.length || descontos.length) ? `
    <h3>Histórico de recebimentos</h3>
    <div class="receipt-list">
      ${[...recebimentos].reverse().map((item) => `
        <div>
          <strong>${moeda(item.valor)}</strong>
          <span>${dataCurta(item.data)} · ${escapeHtml(item.forma)} · Nota: ${labelNotaFiscal(item.notaFiscal)}</span>
          ${item.observacoes ? `<small>${escapeHtml(item.observacoes)}</small>` : ""}
        </div>
      `).join("")}
      ${[...descontos].reverse().map((item) => `
        <div class="discount-row">
          <strong>-${moeda(item.valor)}</strong>
          <span>${dataCurta(item.data)} · Desconto concedido</span>
          ${item.motivo ? `<small>${escapeHtml(item.motivo)}</small>` : ""}
        </div>
      `).join("")}
    </div>
  ` : `<div class="empty-state compact"><strong>Nenhum recebimento lançado</strong><span>Registre pagamento, desconto e situação da nota fiscal.</span></div>`;
}

function salvarRecebimento(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formRecebimento));
  const processo = obterProcesso(dados.processoId);
  if (!processo) return;
  const valor = Number(String(dados.valor || "0").replace(",", "."));
  const desconto = Number(String(dados.desconto || "0").replace(",", "."));
  if (valor <= 0 && desconto <= 0) {
    alert("Informe um valor recebido ou um desconto.");
    return;
  }
  processo.recebimentos = processo.recebimentos || [];
  processo.descontos = processo.descontos || [];
  if (valor > 0) {
    processo.recebimentos.push({
      id: uid(),
      valor,
      data: dados.data || hojeIso(),
      forma: dados.forma,
      notaFiscal: dados.notaFiscal,
      observacoes: dados.observacoes.trim()
    });
  }
  if (desconto > 0) {
    processo.descontos.push({
      id: uid(),
      valor: desconto,
      data: dados.data || hojeIso(),
      motivo: dados.motivoDesconto.trim() || dados.observacoes.trim()
    });
  }
  recalcularRecebido(processo);
  salvarEstado();
  els.modalRecebimento.close();
  renderizarTudo();
  if (processoAbertoId === processo.id) abrirDetalheProcesso(processo.id);
}

function preencherSaldoRecebimento() {
  const processo = obterProcesso(els.formRecebimento.processoId.value);
  if (!processo) return;
  const saldo = saldoHonorarios(processo);
  els.formRecebimento.valor.value = saldo > 0 ? saldo.toFixed(2) : "";
}

function desfazerUltimoRecebimento() {
  const processo = obterProcesso(els.formRecebimento.processoId.value);
  if (!processo || !(processo.recebimentos || []).length) return;
  if (!confirm("Desfazer o último recebimento deste processo?")) return;
  processo.recebimentos.pop();
  recalcularRecebido(processo);
  salvarEstado();
  abrirModalRecebimento(processo.id);
  renderizarTudo();
  if (processoAbertoId === processo.id) abrirDetalheProcesso(processo.id);
}

function abrirModalAvancadas() {
  els.formAvancadas.googleScriptUrl.value = state.avancadas?.googleScriptUrl || "";
  els.formAvancadas.observacoesTecnicas.value = state.avancadas?.observacoesTecnicas || "";
  els.modalAvancadas.showModal();
}

function salvarAvancadas(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formAvancadas));
  state.avancadas = {
    googleScriptUrl: dados.googleScriptUrl.trim(),
    observacoesTecnicas: dados.observacoesTecnicas.trim()
  };
  salvarEstado();
  els.modalAvancadas.close();
  renderConfiguracoes();
}

function vincularAberturaCliente() {
  document.querySelectorAll("[data-open-client-id]").forEach((elemento) => {
    elemento.onclick = () => abrirModalCliente(elemento.dataset.openClientId);
  });
}

function vincularAberturaProcesso() {
  document.querySelectorAll("[data-open-process]").forEach((elemento) => {
    elemento.onclick = () => abrirDetalheProcesso(elemento.dataset.openProcess);
  });
}

function filtrarClientes() {
  const termo = normalizar(els.busca.value);
  return state.clientes.filter((cliente) => !termo || normalizar(cliente.nome).includes(termo));
}

function ordenarClientes(clientes) {
  return [...clientes].sort((a, b) => {
    const statsA = estatisticasCliente(a);
    const statsB = estatisticasCliente(b);
    if (state.clienteOrdenacao === "prazo") return compararDatas(statsA.proximoPrazo, statsB.proximoPrazo);
    if (state.clienteOrdenacao === "cadastro") return compararDatas(b.criadoEm, a.criadoEm);
    if (state.clienteOrdenacao === "casos") return statsB.casos - statsA.casos;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

function estatisticasCliente(cliente) {
  const processos = state.processos.filter((processo) => processo.clienteId === cliente.id);
  const prazos = processos.flatMap((processo) => processo.prazos.filter((prazo) => !prazo.concluido).map((prazo) => prazo.data));
  return { casos: processos.length, proximoPrazo: prazos.sort()[0] || "" };
}

function filtrarProcessos() {
  const termo = normalizar(els.busca.value);
  return state.processos.filter((processo) => {
    const cliente = obterCliente(processo.clienteId);
    const responsavel = obterUsuario(processo.responsavelId);
    const texto = normalizar([processo.numero, cliente?.nome, cliente?.documento, processo.area, processo.status, processo.orgao, responsavel?.nome, processo.resumo].join(" "));
    const combinaBusca = !termo || texto.includes(termo);
    const combinaArea = !els.filtroArea.value || processo.area === els.filtroArea.value;
    const combinaStatus = !els.filtroStatus.value || processo.status === els.filtroStatus.value;
    return combinaBusca && combinaArea && combinaStatus;
  });
}

function filtrarProcessosFinanceiro() {
  const termo = normalizar(els.busca.value);
  return state.processos.filter((processo) => {
    const cliente = obterCliente(processo.clienteId);
    return !termo || normalizar(cliente?.nome || "").includes(termo);
  });
}

function eventosAgenda() {
  return state.processos.flatMap((processo) => {
    const cliente = obterCliente(processo.clienteId);
    return processo.prazos.map((prazo) => {
      const responsavel = obterUsuario(prazo.responsavelId || processo.responsavelId);
      return { ...prazo, processoId: processo.id, processo: processo.numero, cliente: cliente?.nome || "Cliente não informado", responsavel: responsavel?.nome || "" };
    });
  });
}

function popularLogin() {
  els.loginUsuario.innerHTML = state.usuarios.map((usuario) => `<option value="${usuario.id}">${escapeHtml(usuario.nome)}</option>`).join("");
}

function popularFiltros() {
  const area = els.filtroArea.value;
  const status = els.filtroStatus.value;
  preencherSelect(els.filtroArea, [{ value: "", label: "Todas as áreas" }, ...state.configs.areas.map(opcao)]);
  preencherSelect(els.filtroStatus, [{ value: "", label: "Todos os status" }, ...state.configs.status.map(opcao)]);
  els.filtroArea.value = state.configs.areas.includes(area) ? area : "";
  els.filtroStatus.value = state.configs.status.includes(status) ? status : "";
}

function popularSelectsProcesso() {
  preencherSelect(document.querySelector("#processoArea"), state.configs.areas.map(opcao));
  preencherSelect(document.querySelector("#processoStatus"), state.configs.status.map(opcao));
  preencherSelect(document.querySelector("#processoOrgao"), state.configs.orgaos.map(opcao));
  preencherSelect(document.querySelector("#processoResponsavel"), state.usuarios.map((usuario) => ({ value: usuario.id, label: usuario.nome })));
}

function preencherSelect(select, opcoes) {
  select.innerHTML = opcoes.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join("");
}

function opcao(valor) {
  return { value: valor, label: valor };
}

function alternarMenuMarca(event) {
  event.stopPropagation();
  const aberto = els.brandPopover.classList.toggle("is-open");
  els.brandButton.setAttribute("aria-expanded", aberto ? "true" : "false");
}

function fecharMenuMarca() {
  els.brandPopover.classList.remove("is-open");
  els.brandButton.setAttribute("aria-expanded", "false");
}

function mudarMes(delta) {
  mesAgenda = new Date(mesAgenda.getFullYear(), mesAgenda.getMonth() + delta, 1);
  renderAgenda();
}

function atualizarPerfil() {
  const usuario = obterUsuario(state.usuarioAtivoId) || state.usuarios[0];
  const letra = inicial(usuario?.nome || "S");
  els.usuarioInicial.textContent = letra;
  els.popoverInicial.textContent = letra;
  els.popoverNome.textContent = usuario?.nome || "SR Advocacia";
  els.popoverEmail.textContent = usuario?.cargo || "Perfil local";
  els.plantaoNome.textContent = usuario?.nome || "SR Advocacia";
}

function aplicarTema() {
  document.body.dataset.theme = state.tema || "classico";
}

function escolherTema(event) {
  const botao = event.target.closest("[data-theme]");
  if (!botao) return;
  state.tema = botao.dataset.theme;
  salvarEstado();
  aplicarTema();
  renderConfiguracoes();
}

function forcarAtualizacao() {
  const separador = window.location.href.includes("?") ? "&" : "?";
  window.location.href = `${window.location.href.split("#")[0]}${separador}v=${Date.now()}`;
}

function aplicarSidebar() {
  document.body.classList.toggle("sidebar-collapsed", !!state.sidebarRecolhida);
  els.sidebarToggle.textContent = "";
  els.sidebarToggle.title = state.sidebarRecolhida ? "Expandir menu" : "Recolher menu";
  els.sidebarToggle.setAttribute("aria-label", els.sidebarToggle.title);
}

function aplicarPermissoes() {
  const usuario = usuarioAtual();
  const permissoes = usuario?.permissoes || permissoesPadrao();
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-hidden", !permissoes.includes(button.dataset.view));
  });
  document.querySelectorAll("[data-view-shortcut]").forEach((button) => {
    button.classList.toggle("is-hidden", !permissoes.includes(button.dataset.viewShortcut));
  });
  if (!permissoes.includes(viewAtual)) trocarView(permissoes[0] || "dashboard");
}

function temAcesso(view) {
  return (usuarioAtual()?.permissoes || permissoesPadrao()).includes(view);
}

function usuarioAtual() {
  return obterUsuario(state.usuarioAtivoId) || state.usuarios[0];
}

function carregarEstado() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) return criarEstadoPadrao();
  try {
    return JSON.parse(salvo);
  } catch {
    return criarEstadoPadrao();
  }
}

function migrarTextoParaPb(valor = "") {
  return String(valor)
    .replaceAll("Fortaleza/CE", "João Pessoa/PB")
    .replaceAll("Maracanaú/CE", "Cabedelo/PB")
    .replaceAll("Ceará", "Paraíba")
    .replaceAll("Fortaleza", "João Pessoa")
    .replaceAll("Fórum Clóvis Beviláqua", "Fórum Cível Des. Mário Moacyr Porto")
    .replaceAll("TRT 7ª Região", "TRT 13ª Região")
    .replaceAll("8.06", "8.15")
    .replaceAll("5.07", "5.13")
    .replaceAll("(85)", "(83)")
    .replaceAll("OAB/CE", "OAB/PB");
}

function normalizarEstado(raw) {
  raw = raw || {};
  const padrao = criarEstadoPadrao();
  const estado = { ...padrao, ...raw };
  const orgaosSalvos = raw.configs?.orgaos || [...(raw.configs?.varas || []), ...(raw.configs?.foruns || [])];
  estado.configs = {
    status: raw.configs?.status || padrao.configs.status,
    areas: raw.configs?.areas || padrao.configs.areas,
    orgaos: orgaosSalvos.length ? orgaosSalvos.map(migrarTextoParaPb) : padrao.configs.orgaos
  };
  if (!estado.configs.orgaos.length) estado.configs.orgaos = padrao.configs.orgaos;
  estado.configs.status = estado.configs.status.map(migrarTextoParaPb);
  estado.configs.areas = estado.configs.areas.map(migrarTextoParaPb);
  estado.avancadas = {
    googleScriptUrl: raw.avancadas?.googleScriptUrl || "",
    observacoesTecnicas: raw.avancadas?.observacoesTecnicas || ""
  };
  estado.clienteModo = estado.clienteModo || "cards";
  estado.clienteOrdenacao = estado.clienteOrdenacao || "nome";
  estado.sidebarRecolhida = !!estado.sidebarRecolhida;
  estado.usuarios = (estado.usuarios || padrao.usuarios).map((usuario, index) => ({
    id: usuario.id || uid(),
    nome: usuario.nome || `Usuário ${index + 1}`,
    email: usuario.email || "",
    senha: usuario.senha || "1234",
    cargo: usuario.cargo || "",
    telefone: formatarTelefone(migrarTextoParaPb(usuario.telefone || "")),
    oab: migrarTextoParaPb(usuario.oab || ""),
    permissoes: usuario.permissoes?.length ? usuario.permissoes : permissoesPadrao()
  }));
  estado.clientes = (estado.clientes || []).map((cliente) => ({
    id: cliente.id || uid(),
    criadoEm: cliente.criadoEm || hojeIso(),
    nome: cliente.nome || cliente.cliente || "",
    tipoDocumento: cliente.tipoDocumento || inferirTipoDocumento(cliente.documento || cliente.cpf || ""),
    documento: formatarDocumento(cliente.documento || cliente.cpf || "", cliente.tipoDocumento || inferirTipoDocumento(cliente.documento || cliente.cpf || "")),
    cpf: formatarDocumento(cliente.documento || cliente.cpf || "", cliente.tipoDocumento || inferirTipoDocumento(cliente.documento || cliente.cpf || "")),
    email: cliente.email || "",
    whatsapp: formatarTelefone(migrarTextoParaPb(cliente.whatsapp || "")),
    estadoCivil: cliente.estadoCivil || "",
    profissao: cliente.profissao || "",
    nacionalidade: cliente.nacionalidade || "Brasileiro(a)",
    rg: cliente.rg || "",
    nascimento: cliente.nascimento || "",
    nomeFantasia: cliente.nomeFantasia || "",
    inscricaoEstadual: cliente.inscricaoEstadual || "",
    representante: cliente.representante || "",
    representanteCpf: formatarDocumento(cliente.representanteCpf || "", "CPF"),
    representanteCargo: cliente.representanteCargo || "",
    domicilio: migrarTextoParaPb(cliente.domicilio || ""),
    observacoes: cliente.observacoes || ""
  }));
  estado.atendimentos = (estado.atendimentos || []).map(normalizarAtendimento);
  estado.rascunhoAtendimento = raw.rascunhoAtendimento ? normalizarAtendimento(raw.rascunhoAtendimento) : null;
  estado.processos = (estado.processos || []).map((processo) => normalizarProcesso(processo, estado));
  estado.usuarioAtivoId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SESSION_KEY) : null;
  salvarEstadoNormalizado(estado);
  return estado;
}

function normalizarAtendimento(atendimento = {}) {
  return {
    id: atendimento.id || "",
    criadoEm: atendimento.criadoEm || hojeIso(),
    atualizadoEm: atendimento.atualizadoEm || atendimento.salvoEm || "",
    clienteId: atendimento.clienteId || "",
    area: atendimento.area || "",
    responsavelId: atendimento.responsavelId || "",
    data: atendimento.data || agoraLocalInput(),
    assunto: atendimento.assunto || "",
    conteudoHtml: atendimento.conteudoHtml || "",
    processoId: atendimento.processoId || "",
    versoes: (atendimento.versoes || []).slice(0, 3).map((versao) => ({
      id: versao.id || uid(),
      assunto: versao.assunto || "",
      conteudoHtml: versao.conteudoHtml || "",
      salvoEm: versao.salvoEm || hojeIso()
    }))
  };
}

function normalizarProcesso(processo, estado) {
  let clienteId = processo.clienteId;
  if (!clienteId && processo.cliente) {
    let cliente = estado.clientes.find((item) => item.nome === processo.cliente);
    if (!cliente) {
      cliente = { id: uid(), criadoEm: hojeIso(), nome: processo.cliente, tipoDocumento: inferirTipoDocumento(processo.documento || ""), documento: formatarDocumento(processo.documento || "", inferirTipoDocumento(processo.documento || "")), cpf: processo.documento || "", email: "", whatsapp: "", estadoCivil: "", profissao: "", nacionalidade: "Brasileiro(a)", rg: "", nascimento: "", nomeFantasia: "", inscricaoEstadual: "", representante: "", representanteCpf: "", representanteCargo: "", domicilio: "", observacoes: "" };
      estado.clientes.push(cliente);
    }
    clienteId = cliente.id;
  }
  const responsavelId = processo.responsavelId || estado.usuarios.find((u) => u.nome === processo.responsavel)?.id || estado.usuarios[0]?.id || "";
  const orgao = migrarTextoParaPb(processo.orgao || [processo.vara, processo.forum].filter(Boolean).join(" · ") || estado.configs.orgaos[0]);
  const prazos = (processo.prazos?.length ? processo.prazos : [{ id: uid(), data: processo.prazo || hojeIso(), tipo: "Prazo", descricao: "Prazo principal", concluido: false }]).map((prazo) => ({
    id: prazo.id || uid(),
    data: prazo.data || hojeIso(),
    tipo: prazo.tipo || "Prazo",
    descricao: migrarTextoParaPb(prazo.descricao || ""),
    responsavelId: prazo.responsavelId || responsavelId,
    concluido: !!prazo.concluido
  }));
  const recebimentos = (processo.recebimentos?.length
    ? processo.recebimentos
    : Number(processo.recebido || 0) > 0
      ? [{ id: uid(), valor: Number(processo.recebido || 0), data: processo.recebidoEm || hojeIso(), forma: "Registro anterior", notaFiscal: "nao", observacoes: "Valor migrado do controle anterior." }]
      : []
  ).map((recebimento) => ({
    id: recebimento.id || uid(),
    valor: Number(recebimento.valor || 0),
    data: recebimento.data || hojeIso(),
    forma: recebimento.forma || "Pix",
    notaFiscal: recebimento.notaFiscal || "nao",
    observacoes: recebimento.observacoes || ""
  }));
  const descontos = (processo.descontos || []).map((desconto) => ({
    id: desconto.id || uid(),
    valor: Number(desconto.valor || 0),
    data: desconto.data || hojeIso(),
    motivo: desconto.motivo || ""
  }));
  return {
    id: processo.id || uid(),
    numero: migrarTextoParaPb(processo.numero || ""),
    clienteId,
    area: migrarTextoParaPb(processo.area || estado.configs.areas[0]),
    status: migrarTextoParaPb(processo.status || estado.configs.status[0]),
    orgao,
    prazo: processo.prazo || proximoPrazoLista(prazos),
    responsavelId,
    honorarios: Number(processo.honorarios || 0),
    recebido: soma(recebimentos, "valor"),
    recebimentos,
    descontos,
    resumo: migrarTextoParaPb(processo.resumo || ""),
    prazos,
    atendimentos: processo.atendimentos || [],
    movimentacoes: (processo.movimentacoes?.length ? processo.movimentacoes : [{ id: uid(), data: hojeIso(), descricao: "Registro importado da versão anterior." }]).map((mov) => ({ id: mov.id || uid(), data: mov.data || hojeIso(), descricao: migrarTextoParaPb(mov.descricao || "") }))
  };
}

function criarEstadoPadrao() {
  const usuarios = [
    { id: uid(), nome: "Letícia Ramos", email: "leticia@sradvocacia.com", senha: "1234", cargo: "Advogada", telefone: "(83) 99999-1000", oab: "OAB/PB 00000", permissoes: permissoesPadrao() },
    { id: uid(), nome: "Renato Silva", email: "renato@sradvocacia.com", senha: "1234", cargo: "Advogado", telefone: "(83) 99999-2000", oab: "OAB/PB 00001", permissoes: ["dashboard", "processos", "clientes", "atendimentos", "agenda", "financeiro"] }
  ];
  const clientes = [
    { id: uid(), criadoEm: "2026-05-01", nome: "Mariana Azevedo", tipoDocumento: "CPF", documento: "184.552.930-10", cpf: "184.552.930-10", email: "mariana@email.com", whatsapp: "(83) 99991-1030", estadoCivil: "Casado(a)", profissao: "Arquiteta", nacionalidade: "Brasileira", rg: "3.245.810 SSP/PB", nascimento: "1988-08-14", domicilio: "João Pessoa/PB", observacoes: "Prefere contato por Whatsapp no fim da tarde." },
    { id: uid(), criadoEm: "2026-04-20", nome: "Nobre Serviços LTDA", tipoDocumento: "CNPJ", documento: "22.981.440/0001-70", cpf: "22.981.440/0001-70", email: "juridico@nobre.com", whatsapp: "(83) 98822-4410", estadoCivil: "", profissao: "Pessoa jurídica", nomeFantasia: "Nobre Serviços", inscricaoEstadual: "16.000.000-0", representante: "Roberto Nobre", representanteCpf: "487.321.990-00", representanteCargo: "Sócio-administrador", domicilio: "João Pessoa/PB", observacoes: "Cliente empresarial com demandas trabalhistas recorrentes." },
    { id: uid(), criadoEm: "2026-04-12", nome: "Paulo Henrique Sales", tipoDocumento: "CPF", documento: "039.118.260-54", cpf: "039.118.260-54", email: "paulo@email.com", whatsapp: "(83) 99777-2600", estadoCivil: "Solteiro(a)", profissao: "Engenheiro", nacionalidade: "Brasileiro", rg: "2.998.441 SSP/PB", nascimento: "1991-03-22", domicilio: "Cabedelo/PB", observacoes: "Solicita relatórios mensais do caso." },
    { id: uid(), criadoEm: "2026-05-08", nome: "Clínica Aurora", tipoDocumento: "CNPJ", documento: "31.550.020/0001-88", cpf: "31.550.020/0001-88", email: "financeiro@aurora.com", whatsapp: "(83) 98888-0201", estadoCivil: "", profissao: "Pessoa jurídica", nomeFantasia: "Aurora Saúde", inscricaoEstadual: "16.111.000-0", representante: "Ana Beatriz Lima", representanteCpf: "612.340.880-20", representanteCargo: "Diretora", domicilio: "João Pessoa/PB", observacoes: "Enviar boletos para o financeiro." }
  ];
  return {
    usuarioAtivoId: null,
    tema: "classico",
    clienteModo: "cards",
    clienteOrdenacao: "nome",
    sidebarRecolhida: false,
    rascunhoAtendimento: null,
    avancadas: {
      googleScriptUrl: "",
      observacoesTecnicas: ""
    },
    usuarios,
    configs: {
      status: ["Ativo", "Aguardando audiência", "Recurso", "Suspenso", "Encerrado"],
      areas: ["Cível", "Trabalhista", "Família", "Empresarial", "Previdenciário"],
      orgaos: ["1ª Vara Cível de João Pessoa", "2ª Vara Empresarial de João Pessoa", "3ª Vara de Família de João Pessoa", "12ª Vara do Trabalho de João Pessoa", "Fórum Cível Des. Mário Moacyr Porto", "TRT 13ª Região", "Justiça Federal da Paraíba"]
    },
    clientes,
    atendimentos: [],
    processos: [
      processoPadrao("0804126-31.2026.8.15.2001", clientes[0].id, "Família", "Aguardando audiência", "3ª Vara de Família de João Pessoa", "2026-05-22", usuarios[0].id, 6200, 3200, "Ação de guarda com pedido de regulamentação de convivência.", [
        { data: "2026-05-22", tipo: "Audiência", descricao: "Audiência de conciliação.", responsavelId: usuarios[0].id },
        { data: "2026-05-29", tipo: "Manifestação", descricao: "Juntar documentos complementares.", responsavelId: usuarios[0].id }
      ]),
      processoPadrao("0009824-78.2025.5.13.0012", clientes[1].id, "Trabalhista", "Ativo", "12ª Vara do Trabalho de João Pessoa", "2026-05-27", usuarios[1].id, 9800, 6800, "Defesa em reclamação trabalhista com perícia técnica designada.", [
        { data: "2026-05-27", tipo: "Perícia", descricao: "Acompanhar perícia técnica.", responsavelId: usuarios[1].id }
      ]),
      processoPadrao("3001142-59.2026.8.15.2001", clientes[2].id, "Cível", "Recurso", "1ª Vara Cível de João Pessoa", "2026-06-02", usuarios[0].id, 7500, 7500, "Apelação em ação indenizatória por vício em imóvel.", [
        { data: "2026-06-02", tipo: "Contrarrazões", descricao: "Protocolar contrarrazões.", responsavelId: usuarios[0].id }
      ])
    ]
  };
}

function processoPadrao(numero, clienteId, area, status, orgao, prazo, responsavelId, honorarios, recebido, resumo, prazos) {
  return {
    id: uid(),
    numero,
    clienteId,
    area,
    status,
    orgao,
    prazo,
    responsavelId,
    honorarios,
    recebido,
    recebimentos: recebido > 0 ? [{ id: uid(), valor: recebido, data: hojeIso(), forma: "Registro inicial", notaFiscal: "nao", observacoes: "" }] : [],
    descontos: [],
    resumo,
    atendimentos: [],
    prazos: prazos.map((item) => ({ id: uid(), concluido: false, ...item })),
    movimentacoes: [
      { id: uid(), data: "2026-05-18", descricao: "Movimentação registrada e conferida pela equipe." },
      { id: uid(), data: "2026-05-12", descricao: "Documentos anexados ao acompanhamento interno." }
    ]
  };
}

function salvarEstado() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, usuarioAtivoId: null }));
}

function salvarEstadoNormalizado(estado) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...estado, usuarioAtivoId: null }));
}

function obterCliente(id) {
  return state.clientes.find((cliente) => cliente.id === id);
}

function obterUsuario(id) {
  return state.usuarios.find((usuario) => usuario.id === id);
}

function obterProcesso(id) {
  return state.processos.find((processo) => processo.id === id);
}

function atendimentoAberto() {
  return state.atendimentos.find((atendimento) => atendimento.id === atendimentoAbertoId) || state.rascunhoAtendimento;
}

function atendimentosDoProcesso(processo) {
  const vinculados = new Set(processo.atendimentos || []);
  return state.atendimentos
    .filter((atendimento) => atendimento.processoId === processo.id || vinculados.has(atendimento.id))
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}

function proximoPrazoDoProcesso(processo) {
  return proximoPrazoLista(processo.prazos.filter((prazo) => !prazo.concluido)) || processo.prazo || hojeIso();
}

function proximoPrazoLista(prazos) {
  return [...(prazos || [])].sort((a, b) => new Date(a.data) - new Date(b.data))[0]?.data || "";
}

function ordenarPorData(lista) {
  return [...(lista || [])].sort((a, b) => new Date(a.data) - new Date(b.data));
}

function badgePrazo(processo) {
  const dias = diasAte(processo.prazo);
  if (processo.status === "Encerrado") return `<span class="badge ok">Encerrado</span>`;
  if (dias < 0) return `<span class="badge danger">Vencido</span>`;
  if (dias === 0) return `<span class="badge danger">Hoje</span>`;
  if (dias <= 3) return `<span class="badge gold">${dias} dia${dias > 1 ? "s" : ""}</span>`;
  return `<span class="badge ok">${dias} dias</span>`;
}

function badgeStatus(status) {
  const classe = status === "Encerrado" ? "ok" : status === "Recurso" ? "gold" : status === "Suspenso" ? "danger" : "";
  return `<span class="badge ${classe}">${escapeHtml(status)}</span>`;
}

function metricCard(label, value, caption) {
  return `<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${caption}</small></article>`;
}

function financeCard(label, value, caption) {
  return `<article class="finance-card"><span>${label}</span><strong>${moeda(value)}</strong><p>${caption}</p></article>`;
}

function recalcularRecebido(processo) {
  processo.recebido = soma(processo.recebimentos || [], "valor");
}

function saldoHonorarios(processo) {
  return Math.max(0, Number(processo.honorarios || 0) - totalDescontos(processo) - Number(processo.recebido || 0));
}

function totalDescontos(processo) {
  return soma(processo.descontos || [], "valor");
}

function labelNotaFiscal(status) {
  const labels = {
    sim: "emitir",
    nao: "não precisa emitir",
    emitida: "emitida"
  };
  return labels[status] || status || "não informado";
}

function urlWhatsApp(valor) {
  const digitos = apenasDigitos(valor);
  if (!digitos) return "";
  const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${numero}`;
}

function exportarDados() {
  const blob = new Blob([JSON.stringify({ versao: APP_VERSION, ...state }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sr-advocacia-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatarDocumento(valor, tipo = "CPF") {
  const digitos = apenasDigitos(valor).slice(0, tipo === "CNPJ" ? 14 : 11);
  if (tipo === "CNPJ") {
    return digitos
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatarTelefone(valor) {
  const digitos = apenasDigitos(valor).slice(0, 11);
  if (digitos.length <= 10) {
    return digitos.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digitos.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function apenasDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function inferirTipoDocumento(valor) {
  return apenasDigitos(valor).length > 11 ? "CNPJ" : "CPF";
}

function compararDatas(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a) - new Date(b);
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function agoraLocalInput() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 16);
}

function somarDiasIso(data, dias) {
  const base = new Date(`${String(data).slice(0, 10)}T00:00:00`);
  base.setDate(base.getDate() + dias);
  return base.toISOString().slice(0, 10);
}

function diasAte(data) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${String(data).slice(0, 10)}T00:00:00`);
  return Math.round((alvo - hoje) / 86400000);
}

function dataCurta(data) {
  if (!data) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${String(data).slice(0, 10)}T00:00:00`));
}

function dataHoraCurta(data) {
  if (!data) return "Sem data";
  const valor = String(data);
  const alvo = valor.includes("T") ? new Date(valor) : new Date(`${valor}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(alvo);
}

function moeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor || 0));
}

function soma(lista, campo) {
  return lista.reduce((total, item) => total + Number(item[campo] || 0), 0);
}

function normalizar(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function inicial(nome) {
  return String(nome || "S").trim().charAt(0).toUpperCase();
}

function uid() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function permissoesPadrao() {
  return ABAS.map((aba) => aba.id);
}

function labelAba(id) {
  return ABAS.find((aba) => aba.id === id)?.label || id;
}

function vazioOu(lista, render) {
  if (!lista.length) {
    return `<div class="empty-state"><strong>Nenhum registro encontrado</strong><span>Ajuste os filtros ou cadastre um novo item.</span></div>`;
  }
  return lista.map(render).join("");
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
