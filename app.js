const APP_VERSION = "1.0.25";
const STORAGE_KEY = "sr-advocacia-gestao-juridica-v125";
const LEGACY_STORAGE_KEYS = ["sr-advocacia-gestao-juridica-v124", "sr-advocacia-gestao-juridica-v123", "sr-advocacia-gestao-juridica-v122", "sr-advocacia-gestao-juridica-v121", "sr-advocacia-gestao-juridica-v120", "sr-advocacia-gestao-juridica-v119", "sr-advocacia-gestao-juridica-v118", "sr-advocacia-gestao-juridica-v117", "sr-advocacia-gestao-juridica-v116", "sr-advocacia-gestao-juridica-v115", "sr-advocacia-gestao-juridica-v114", "sr-advocacia-gestao-juridica-v113", "sr-advocacia-gestao-juridica-v112", "sr-advocacia-gestao-juridica-v111", "sr-advocacia-gestao-juridica-v110", "sr-advocacia-gestao-juridica-v109", "sr-advocacia-gestao-juridica-v108", "sr-advocacia-gestao-juridica-v107", "sr-advocacia-gestao-juridica-v106", "sr-advocacia-gestao-juridica-v105", "sr-advocacia-gestao-juridica-v104"];
const SESSION_KEY = "sr-advocacia-usuario-ativo";
const DEFAULT_HIGHLIGHT_COLOR = "#fff0b8";
const ATTENDANCE_PAGE_SIZE = Object.freeze({ width: "794px", height: "1123px", mobileHeight: "720px" });
const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
const ATTENDANCE_INDENT_CM = 1.25;
const MAX_DOCUMENT_FILE_BYTES = 3 * 1024 * 1024;
const MAX_DOCUMENT_TOTAL_BYTES = 3 * 1024 * 1024;
const FERIADOS_FIXOS_BRASIL = Object.freeze([
  { mes: 1, dia: 1, nome: "Confraternização Universal" },
  { mes: 4, dia: 21, nome: "Tiradentes" },
  { mes: 5, dia: 1, nome: "Dia do Trabalho" },
  { mes: 9, dia: 7, nome: "Independência do Brasil" },
  { mes: 10, dia: 12, nome: "Nossa Senhora Aparecida" },
  { mes: 11, dia: 2, nome: "Finados" },
  { mes: 11, dia: 15, nome: "Proclamação da República" },
  { mes: 11, dia: 20, nome: "Consciência Negra" },
  { mes: 12, dia: 25, nome: "Natal" }
]);

const ABAS = [
  { id: "dashboard", label: "Painel" },
  { id: "atendimentos", label: "Atendimentos" },
  { id: "processos", label: "Processos" },
  { id: "clientes", label: "Clientes" },
  { id: "agenda", label: "Agenda" },
  { id: "financeiro", label: "Honorários" },
  { id: "configuracoes", label: "Configurações" }
];

const CONFIG_META = {
  status: { titulo: "Status", descricao: "Fases usadas nos processos" },
  areas: { titulo: "Áreas", descricao: "Ramos de atuação do escritório" },
  orgaos: { titulo: "Varas/Fóruns", descricao: "Órgãos, varas, fóruns e tribunais" },
  movimentacoes: { titulo: "Movimentações", descricao: "Motivos rápidos para andamentos e providências" }
};

const state = normalizarEstado(carregarEstado());
let viewAtual = "dashboard";
let mesAgenda = new Date();
let processoAbertoId = null;
let configAberta = null;
let atendimentoAbertoId = "";
let atendimentoAlterado = false;
let atendimentoModoEditor = false;
let selecaoAtendimento = null;
let feriadoPendenteData = "";
let atendimentoZoom = 100;
let imagemAtivaAtendimento = null;
let documentosAtendimento = [];

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
  btnAgendarAtendimento: document.querySelector("#btnAgendarAtendimento"),
  topSearchBox: document.querySelector("#topSearchBox"),
  clientTopControls: document.querySelector("#clientTopControls"),
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
  modalContrato: document.querySelector("#modalContrato"),
  modalTema: document.querySelector("#modalTema"),
  modalAgendarAtendimento: document.querySelector("#modalAgendarAtendimento"),
  formProcesso: document.querySelector("#formProcesso"),
  processoClienteBusca: document.querySelector("#processoClienteBusca"),
  processoClienteId: document.querySelector("#processoClienteId"),
  clienteSugestoes: document.querySelector("#clienteSugestoes"),
  formCliente: document.querySelector("#formCliente"),
  clientePainel: document.querySelector("#clientePainel"),
  formUsuario: document.querySelector("#formUsuarioDetalhe"),
  formConfigItem: document.querySelector("#formConfigItem"),
  formAvancadas: document.querySelector("#formAvancadas"),
  formRecebimento: document.querySelector("#formRecebimento"),
  formContrato: document.querySelector("#formContrato"),
  formAtendimento: document.querySelector("#formAtendimento"),
  formAgendarAtendimento: document.querySelector("#formAgendarAtendimento"),
  atendimentoCliente: document.querySelector("#atendimentoCliente"),
  atendimentoArea: document.querySelector("#atendimentoArea"),
  atendimentoResponsavel: document.querySelector("#atendimentoResponsavel"),
  atendimentoData: document.querySelector("#atendimentoData"),
  atendimentoAgendar: document.querySelector("#atendimentoAgendar"),
  atendimentoAgendaCampo: document.querySelector("#atendimentoAgendaCampo"),
  atendimentoAgendadoEm: document.querySelector("#atendimentoAgendadoEm"),
  atendimentoAssunto: document.querySelector("#atendimentoAssunto"),
  atendimentoDocumentoInput: document.querySelector("#atendimentoDocumentoInput"),
  btnAdicionarDocumentoAtendimento: document.querySelector("#btnAdicionarDocumentoAtendimento"),
  atendimentoDocumentosPanel: document.querySelector("#atendimentoDocumentosPanel"),
  atendimentoDocumentosResumo: document.querySelector("#atendimentoDocumentosResumo"),
  atendimentoDocumentosLista: document.querySelector("#atendimentoDocumentosLista"),
  atendimentoEditor: document.querySelector("#atendimentoEditor"),
  atendimentoStatus: document.querySelector("#atendimentoStatus"),
  attendanceLayout: document.querySelector("#attendanceLayout"),
  attendanceEditorPanel: document.querySelector("#attendanceEditorPanel"),
  rascunhoAtendimento: document.querySelector("#rascunhoAtendimento"),
  listaAtendimentos: document.querySelector("#listaAtendimentos"),
  versoesAtendimento: document.querySelector("#versoesAtendimento"),
  btnVersoesAtendimento: document.querySelector("#btnVersoesAtendimento"),
  btnFecharAtendimento: document.querySelector("#btnFecharAtendimento"),
  btnToolbarSalvarAtendimento: document.querySelector("#btnToolbarSalvarAtendimento"),
  btnToolbarFecharAtendimento: document.querySelector("#btnToolbarFecharAtendimento"),
  btnExportarAtendimento: document.querySelector("#btnExportarAtendimento"),
  menuExportarAtendimento: document.querySelector("#menuExportarAtendimento"),
  btnImprimirAtendimento: document.querySelector("#btnImprimirAtendimento"),
  btnAtendimentoProcessoRodape: document.querySelector("#btnAtendimentoProcessoRodape"),
  btnExpandirAtendimento: document.querySelector("#btnExpandirAtendimento"),
  btnZoomMenos: document.querySelector("#btnZoomMenos"),
  btnZoomMais: document.querySelector("#btnZoomMais"),
  atendimentoZoomRange: document.querySelector("#atendimentoZoomRange"),
  atendimentoZoomValor: document.querySelector("#atendimentoZoomValor"),
  imageLayoutPopover: document.querySelector("#imageLayoutPopover"),
  imageResizeOverlay: document.querySelector("#imageResizeOverlay"),
  btnFecharLayoutImagem: document.querySelector("#btnFecharLayoutImagem"),
  modalFecharAtendimento: document.querySelector("#modalFecharAtendimento"),
  modalExcluirAtendimento: document.querySelector("#modalExcluirAtendimento"),
  textoExcluirAtendimento: document.querySelector("#textoExcluirAtendimento"),
  btnConfirmarExcluirAtendimento: document.querySelector("#btnConfirmarExcluirAtendimento"),
  agendaCliente: document.querySelector("#agendaCliente"),
  agendaArea: document.querySelector("#agendaArea"),
  agendaResponsavel: document.querySelector("#agendaResponsavel"),
  agendaData: document.querySelector("#agendaData"),
  agendaAssunto: document.querySelector("#agendaAssunto"),
  agendaConteudo: document.querySelector("#agendaConteudo"),
  agendaModo: document.querySelector("#agendaModo"),
  gradeAgenda: document.querySelector("#gradeAgenda"),
  agendaDetalheDia: document.querySelector("#agendaDetalheDia"),
  btnAdicionarFeriado: document.querySelector("#btnAdicionarFeriado"),
  holidayPopover: document.querySelector("#holidayPopover"),
  btnAbrirConfirmarFeriado: document.querySelector("#btnAbrirConfirmarFeriado"),
  modalConfirmarFeriado: document.querySelector("#modalConfirmarFeriado"),
  textoConfirmarFeriado: document.querySelector("#textoConfirmarFeriado"),
  btnConfirmarDesmarcarFeriado: document.querySelector("#btnConfirmarDesmarcarFeriado"),
  modalFeriadoExtra: document.querySelector("#modalFeriadoExtra"),
  formFeriadoExtra: document.querySelector("#formFeriadoExtra"),
  agendaFeriadoData: document.querySelector("#agendaFeriadoData"),
  btnUnorderedListTool: document.querySelector("#btnUnorderedListTool"),
  btnOrderedListTool: document.querySelector("#btnOrderedListTool"),
  editorFontSize: document.querySelector("#editorFontSize"),
  contratoProcesso: document.querySelector("#contratoProcesso"),
  temaModalGrid: document.querySelector("#temaModalGrid"),
  detalheConteudo: document.querySelector("#detalheConteudo"),
  listaConfigModal: document.querySelector("#listaConfigModal"),
  recebimentoResumo: document.querySelector("#recebimentoResumo"),
  recebimentoHistorico: document.querySelector("#recebimentoHistorico"),
  notasPendentes: document.querySelector("#notasPendentes")
};

iniciar();

function iniciar() {
  aplicarTamanhoPaginaAtendimento();
  aplicarZoomAtendimento();
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
    if (!event.target.closest("#editorToolbar")) fecharMenusEditor();
    if (!event.target.closest(".toolbar-export-wrap")) fecharMenuExportarAtendimento();
    if (!event.target.closest(".version-popover-wrap")) fecharVersoesAtendimento();
    if (!event.target.closest(".holiday-popover") && !event.target.closest("[data-toggle-holiday]")) fecharPopoverFeriado();
    if (!event.target.closest(".image-layout-popover") && !event.target.closest(".image-resize-overlay") && !event.target.closest(".attendance-editor img")) fecharOpcoesImagemAtendimento();
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
  els.btnAgendarAtendimento.addEventListener("click", abrirModalAgendarAtendimento);
  els.btnModoClientes.addEventListener("click", alternarModoClientes);
  els.ordenacaoClientes.addEventListener("change", () => {
    state.clienteOrdenacao = els.ordenacaoClientes.value;
    salvarEstado();
    renderClientes();
  });
  els.btnForceUpdateTop?.addEventListener("click", forcarAtualizacao);
  els.btnForceUpdateLogin.addEventListener("click", forcarAtualizacao);
  document.querySelector("#mesAnterior").addEventListener("click", () => mudarMes(-1));
  document.querySelector("#mesProximo").addEventListener("click", () => mudarMes(1));
  els.agendaModo.addEventListener("click", mudarModoAgenda);
  els.gradeAgenda.addEventListener("click", selecionarDiaAgenda);
  els.agendaDetalheDia.addEventListener("click", abrirItemDetalheAgenda);
  els.btnAdicionarFeriado.addEventListener("click", abrirModalFeriadoExtra);
  els.formFeriadoExtra.addEventListener("submit", salvarFeriadoExtra);
  els.btnAbrirConfirmarFeriado.addEventListener("click", abrirConfirmacaoFeriado);
  els.btnConfirmarDesmarcarFeriado.addEventListener("click", confirmarDesmarcarFeriado);
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
  els.formContrato.addEventListener("submit", salvarContratoHonorarios);
  els.formAgendarAtendimento.addEventListener("submit", salvarAgendamentoAtendimento);
  els.contratoProcesso.addEventListener("change", () => preencherContratoHonorarios(els.contratoProcesso.value));
  els.formAtendimento.addEventListener("submit", salvarAtendimento);
  els.formAtendimento.addEventListener("input", marcarAtendimentoAlterado);
  els.formAtendimento.addEventListener("change", marcarAtendimentoAlterado);
  els.atendimentoEditor.addEventListener("input", marcarAtendimentoAlterado);
  els.atendimentoEditor.addEventListener("keyup", atualizarSelecaoEditor);
  els.atendimentoEditor.addEventListener("mouseup", atualizarSelecaoEditor);
  els.atendimentoEditor.addEventListener("focus", atualizarSelecaoEditor);
  els.atendimentoEditor.addEventListener("keydown", atalhosEditorAtendimento);
  els.atendimentoEditor.addEventListener("paste", colarImagemAtendimento);
  els.atendimentoEditor.addEventListener("drop", soltarImagemAtendimento);
  els.atendimentoEditor.addEventListener("pointerdown", iniciarArrasteImagemDireto);
  els.atendimentoEditor.addEventListener("click", selecionarImagemAtendimento);
  els.atendimentoAgendar.addEventListener("change", sincronizarAgendaAtendimento);
  els.btnAdicionarDocumentoAtendimento.addEventListener("click", () => els.atendimentoDocumentoInput.click());
  els.atendimentoDocumentoInput.addEventListener("change", adicionarDocumentosAtendimento);
  els.atendimentoDocumentosLista.addEventListener("click", gerenciarDocumentoAtendimento);
  document.querySelector("#editorToolbar").addEventListener("mousedown", manterSelecaoAoClicarToolbar);
  document.querySelector("#editorToolbar").addEventListener("click", aplicarComandoEditor);
  els.editorFontSize.addEventListener("change", aplicarTamanhoFonteSelecionado);
  document.addEventListener("selectionchange", atualizarSelecaoEditor);
  els.btnFecharAtendimento.addEventListener("click", solicitarFechamentoAtendimento);
  els.btnToolbarSalvarAtendimento.addEventListener("click", () => salvarAtendimentoAtual());
  els.btnToolbarFecharAtendimento.addEventListener("click", solicitarFechamentoAtendimento);
  els.btnExportarAtendimento.addEventListener("click", alternarMenuExportarAtendimento);
  els.menuExportarAtendimento.addEventListener("click", exportarAtendimentoPeloMenu);
  els.btnImprimirAtendimento.addEventListener("click", () => imprimirAtendimentoAtual());
  els.btnAtendimentoProcessoRodape.addEventListener("click", transformarAtendimentoEmProcesso);
  els.btnZoomMenos.addEventListener("click", () => alterarZoomAtendimento(-5));
  els.btnZoomMais.addEventListener("click", () => alterarZoomAtendimento(5));
  els.atendimentoZoomRange.addEventListener("input", (event) => definirZoomAtendimento(Number(event.target.value)));
  els.imageLayoutPopover.addEventListener("click", aplicarLayoutImagemAtendimento);
  els.imageResizeOverlay.addEventListener("pointerdown", iniciarAjusteImagemAtendimento);
  els.btnFecharLayoutImagem.addEventListener("click", fecharOpcoesImagemAtendimento);
  els.btnVersoesAtendimento.addEventListener("click", alternarVersoesAtendimento);
  els.versoesAtendimento.addEventListener("click", restaurarVersaoAtendimento);
  document.querySelector("#btnAtendimentoCancelarFechar").addEventListener("click", () => els.modalFecharAtendimento.close());
  document.querySelector("#btnAtendimentoFecharSemSalvar").addEventListener("click", fecharAtendimentoSemSalvar);
  document.querySelector("#btnAtendimentoSalvarEFechar").addEventListener("click", () => salvarAtendimentoPeloDialogo(true));
  els.modalExcluirAtendimento.addEventListener("click", (event) => {
    if (event.target.closest("#btnConfirmarExcluirAtendimento")) confirmarExclusaoAtendimento(event);
  });
  document.querySelector("#settingsLists").addEventListener("click", abrirConfig);
  document.querySelector("#listaUsuarios").addEventListener("click", abrirUsuarioOuExcluir);
  document.querySelector("#temaPicker").addEventListener("click", escolherTema);
  els.temaModalGrid.addEventListener("click", escolherTema);
  els.listaConfigModal.addEventListener("click", editarOuExcluirConfig);
  els.detalheConteudo.addEventListener("submit", salvarItemProcesso);
  els.detalheConteudo.addEventListener("click", concluirPrazo);
  document.querySelector("#btnNovoUsuario").addEventListener("click", () => abrirModalUsuario());
  document.querySelector("#btnExcluirUsuario").addEventListener("click", excluirUsuarioAberto);
  document.querySelector("#btnForceUpdateConfig").addEventListener("click", forcarAtualizacao);
  document.querySelector("#btnAbrirAvancadas").addEventListener("click", abrirModalAvancadas);
  els.btnExpandirAtendimento.addEventListener("click", alternarFocoAtendimento);
  document.querySelector("#btnToggleArquivados").addEventListener("click", alternarArquivadosAtendimento);
  document.querySelector("#btnAtendimentoProcesso").addEventListener("click", transformarAtendimentoEmProcesso);
  els.rascunhoAtendimento.addEventListener("click", abrirAtendimentoDaLista);
  els.listaAtendimentos.addEventListener("click", abrirAtendimentoDaLista);
  document.addEventListener("click", abrirRecebimentoPorBotao);
  document.addEventListener("click", abrirContratoPorBotao);
  document.addEventListener("click", abrirAtendimentoPorAgenda);
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
  if (viewAtual === "atendimentos") {
    novoAtendimento();
    return;
  }
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
  renderPainelCliente(cliente);
  els.modalCliente.showModal();
}

function aplicarTamanhoPaginaAtendimento() {
  document.documentElement.style.setProperty("--attendance-page-width", ATTENDANCE_PAGE_SIZE.width);
  document.documentElement.style.setProperty("--attendance-page-height", ATTENDANCE_PAGE_SIZE.height);
  document.documentElement.style.setProperty("--attendance-page-mobile-height", ATTENDANCE_PAGE_SIZE.mobileHeight);
}

function definirZoomAtendimento(valor) {
  atendimentoZoom = Math.max(75, Math.min(140, Number(valor) || 100));
  aplicarZoomAtendimento();
}

function alterarZoomAtendimento(delta) {
  definirZoomAtendimento(atendimentoZoom + delta);
}

function aplicarZoomAtendimento() {
  document.documentElement.style.setProperty("--attendance-editor-zoom", String(atendimentoZoom / 100));
  if (els.atendimentoZoomRange) els.atendimentoZoomRange.value = String(atendimentoZoom);
  if (els.atendimentoZoomValor) els.atendimentoZoomValor.textContent = `${atendimentoZoom}%`;
}

function abrirModalProcesso() {
  els.formProcesso.reset();
  els.formProcesso.elements.atendimentoOrigemId.value = "";
  document.querySelector("#modalProcesso h2").textContent = "Novo processo";
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
  const atendimentoOrigem = dados.atendimentoOrigemId ? state.atendimentos.find((item) => item.id === dados.atendimentoOrigemId) : null;
  const processo = {
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
    descontoHonorarios: 0,
    descontos: [],
    observacaoHonorarios: "",
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
      { id: uid(), data: hojeIso(), descricao: atendimentoOrigem ? "Processo criado a partir de atendimento." : "Processo cadastrado no sistema." }
    ]
  };
  if (atendimentoOrigem) {
    processo.atendimentos = [atendimentoOrigem.id];
    atendimentoOrigem.processoId = processo.id;
  }
  state.processos.unshift(processo);
  salvarEstado();
  if (els.modalCliente.open && els.formCliente.elements.id.value === processo.clienteId) {
    renderPainelCliente(obterCliente(processo.clienteId));
  }
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
  if (form.dataset.detailForm === "andamento") {
    const tipoSelecionado = dados.tipoMovimentacao === "Outro" ? dados.tipoOutro?.trim() : dados.tipoMovimentacao;
    const movimentacao = {
      id: uid(),
      data: dados.data || hojeIso(),
      tipo: tipoSelecionado || "Andamento",
      descricao: dados.descricao?.trim() || "",
      prazoId: ""
    };

    if (dados.gerarPrazo === "sim") {
      if (!dados.prazoData || !dados.prazoTipo?.trim()) {
        alert("Informe a data e o tipo do prazo para registrar a providência.");
        return;
      }
      const prazo = {
        id: uid(),
        data: dados.prazoData,
        tipo: dados.prazoTipo.trim(),
        descricao: dados.prazoDescricao?.trim() || movimentacao.descricao || movimentacao.tipo,
        responsavelId: dados.responsavelId || processo.responsavelId,
        concluido: false
      };
      processo.prazos.push(prazo);
      processo.prazo = proximoPrazoDoProcesso(processo);
      movimentacao.prazoId = prazo.id;
    }

    processo.movimentacoes.unshift(movimentacao);
  }

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
  salvarRascunhoAtendimento(true);
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
  const mostrarBusca = ["processos", "clientes", "financeiro", "atendimentos"].includes(view);
  els.topSearchBox.classList.toggle("is-hidden", !mostrarBusca);
  els.btnNovo.classList.toggle("is-hidden", !["processos", "atendimentos"].includes(view));
  els.btnAgendarAtendimento.classList.toggle("is-hidden", view !== "atendimentos");
  els.clientTopControls.classList.toggle("is-hidden", view !== "clientes");
  els.btnForceUpdateTop?.classList.toggle("is-hidden", true);
  els.btnNovoTexto.textContent = view === "atendimentos" ? "Novo atendimento" : "Novo processo";

  const placeholders = {
    processos: "Buscar cliente, processo...",
    clientes: "Buscar cliente pelo nome...",
    financeiro: "Buscar cliente pelo nome...",
    atendimentos: "Buscar atendimento por cliente..."
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
  const atendimentosAbertos = state.atendimentos.filter((atendimento) => !atendimento.arquivado && !atendimento.processoId).length;
  const pendente = state.processos.reduce((total, processo) => total + saldoHonorarios(processo), 0);
  const cards = [
    metricCard("Processos ativos", processosAtivos, "Carteira em andamento"),
    metricCard("Clientes", state.clientes.length, "Cadastros no escritório"),
    metricCard("Prazos críticos", prazosCriticos, "Vencidos ou a vencer"),
    metricCard("Atendimentos", atendimentosAbertos, "Abertos sem processo")
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
      ? `<table class="client-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contato</th>
              <th>Casos/atend.</th>
              <th>Próximo prazo</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>${clientes.map(cardClienteLinha).join("")}</tbody>
        </table>`
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
        <span class="client-badges">
          <span class="badge">${stats.casos} caso${stats.casos !== 1 ? "s" : ""}</span>
          <span class="badge gold">${pluralAtendimentos(stats.atendimentosAbertos)}</span>
        </span>
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
    <tr class="clickable" data-open-client-id="${cliente.id}">
      <td><strong>${escapeHtml(cliente.nome)}</strong><br><small>${escapeHtml(cliente.documento || cliente.cpf || "")}</small></td>
      <td>${escapeHtml(cliente.whatsapp || "-")}</td>
      <td>${stats.casos} caso${stats.casos !== 1 ? "s" : ""}<br><small>${pluralAtendimentos(stats.atendimentosAbertos)}</small></td>
      <td>${stats.proximoPrazo ? dataCurta(stats.proximoPrazo) : "Sem prazo"}</td>
      <td>${dataCurta(cliente.criadoEm)}</td>
    </tr>
  `;
}

function renderPainelCliente(cliente) {
  if (!els.clientePainel) return;
  els.clientePainel.classList.toggle("is-hidden", !cliente);
  if (!cliente) {
    els.clientePainel.innerHTML = "";
    return;
  }

  const processos = state.processos
    .filter((processo) => processo.clienteId === cliente.id)
    .sort((a, b) => compararDatas(a.prazo, b.prazo));
  const atendimentos = state.atendimentos
    .filter((atendimento) => atendimento.clienteId === cliente.id)
    .sort((a, b) => new Date(b.atualizadoEm || b.data) - new Date(a.atualizadoEm || a.data));
  const atendimentosAbertos = atendimentos.filter((atendimento) => !atendimento.arquivado && !atendimento.processoId).length;

  els.clientePainel.innerHTML = `
    <div class="client-overview-header">
      <div>
        <span class="eyebrow">Painel do cliente</span>
        <strong>${processos.length} processo${processos.length !== 1 ? "s" : ""} · ${atendimentos.length} atendimento${atendimentos.length !== 1 ? "s" : ""} · ${pluralAtendimentos(atendimentosAbertos)} abertos</strong>
      </div>
      <small>${escapeHtml(cliente.nome)}</small>
    </div>
    <div class="client-overview-grid">
      <section class="client-overview-block">
        <h3>Processos</h3>
        ${processos.length ? processos.map((processo) => `
          <button class="client-overview-item" type="button" data-open-client-process="${processo.id}">
            <strong>${escapeHtml(processo.numero || "Processo sem número")}</strong>
            <span>${escapeHtml(processo.area)} · ${escapeHtml(processo.status)}</span>
            <small>Prazo: ${dataCurta(processo.prazo)} · ${moeda(valorHonorariosLiquido(processo))}</small>
          </button>
        `).join("") : `<div class="client-overview-item"><span>Nenhum processo cadastrado para este cliente.</span></div>`}
      </section>
      <section class="client-overview-block">
        <h3>Atendimentos</h3>
        ${atendimentos.length ? atendimentos.map((atendimento) => `
          <button class="client-overview-item" type="button" data-open-client-attendance="${atendimento.id}">
            <strong>${rotuloAtendimento(atendimento)} ${escapeHtml(atendimento.assunto || "Atendimento sem assunto")}</strong>
            <span>${escapeHtml(atendimento.area || "Área não informada")} · ${dataHoraCurta(atendimento.data)}</span>
            <small>${atendimento.processoId ? "Vinculado a processo" : "Sem processo vinculado"}</small>
          </button>
        `).join("") : `<div class="client-overview-item"><span>Nenhum atendimento cadastrado para este cliente.</span></div>`}
      </section>
    </div>
  `;
  vincularPainelCliente();
}

function renderAtendimentos() {
  const valores = {
    clienteId: els.atendimentoCliente.value,
    area: els.atendimentoArea.value,
    responsavelId: els.atendimentoResponsavel.value
  };
  preencherSelect(els.atendimentoCliente, [{ value: "", label: "Selecione" }, ...state.clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome }))]);
  preencherSelect(els.atendimentoArea, [{ value: "", label: "Selecione" }, ...state.configs.areas.map(opcao)]);
  preencherSelect(els.atendimentoResponsavel, state.usuarios.map((usuario) => ({ value: usuario.id, label: usuario.nome })));
  els.atendimentoCliente.value = state.clientes.some((cliente) => cliente.id === valores.clienteId) ? valores.clienteId : "";
  els.atendimentoArea.value = state.configs.areas.includes(valores.area) ? valores.area : "";
  if (state.usuarios.some((usuario) => usuario.id === valores.responsavelId)) els.atendimentoResponsavel.value = valores.responsavelId;
  document.querySelector("#btnToggleArquivados").textContent = state.atendimentoMostrarArquivados ? "Ver ativos" : "Arquivados";
  renderPainelEditorAtendimento();
  renderRascunhoAtendimento();
  const atendimentos = filtrarAtendimentos();
  els.listaAtendimentos.innerHTML = vazioOu(atendimentos, (atendimento) => {
    const cliente = obterCliente(atendimento.clienteId);
    const responsavel = obterUsuario(atendimento.responsavelId);
    const agenda = atendimento.agendadoEm ? ` · Agendado: ${dataHoraCurta(atendimento.agendadoEm)}` : "";
    return `
      <article class="attendance-item clickable ${atendimento.arquivado ? "is-archived" : ""}" data-open-attendance="${atendimento.id}">
        <strong><span class="attendance-number">${rotuloAtendimento(atendimento)}</span>${escapeHtml(atendimento.assunto || "Atendimento sem assunto")}</strong>
        <span>${escapeHtml(cliente?.nome || "Cliente não informado")} · ${escapeHtml(atendimento.area)} · ${dataHoraCurta(atendimento.data)}</span>
        <small>Responsável: ${escapeHtml(responsavel?.nome || "")}${agenda}</small>
        <div class="attendance-actions">
          <button class="ghost-button table-action" type="button" data-toggle-archive-attendance="${atendimento.id}">
            ${atendimento.arquivado ? "Desarquivar" : "Arquivar"}
          </button>
          ${atendimento.arquivado ? `<button class="danger-button table-action" type="button" data-delete-attendance="${atendimento.id}">Excluir</button>` : ""}
        </div>
      </article>
    `;
  });
  renderVersoesAtendimento(atendimentoAberto());
}

function abrirModalAgendarAtendimento() {
  preencherSelect(els.agendaCliente, state.clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome })));
  preencherSelect(els.agendaArea, [{ value: "", label: "Sem area definida" }, ...state.configs.areas.map(opcao)]);
  preencherSelect(els.agendaResponsavel, state.usuarios.map((usuario) => ({ value: usuario.id, label: usuario.nome })));
  els.formAgendarAtendimento.reset();
  if (usuarioAtual()) els.agendaResponsavel.value = usuarioAtual().id;
  els.agendaData.value = agoraLocalInput();
  els.modalAgendarAtendimento.showModal();
}

function salvarAgendamentoAtendimento(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formAgendarAtendimento));
  const atendimento = {
    id: uid(),
    numero: proximoNumeroAtendimento(),
    criadoEm: hojeIso(),
    salvoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    clienteId: dados.clienteId,
    area: dados.area || "",
    responsavelId: dados.responsavelId,
    data: agoraLocalInput(),
    agendar: "sim",
    agendadoEm: dados.agendadoEm,
    assunto: dados.assunto?.trim() || "Atendimento agendado",
    conteudoHtml: textoParaHtml(dados.conteudo || ""),
    anexos: [],
    arquivado: false,
    processoId: "",
    versoes: []
  };
  state.atendimentos.unshift(atendimento);
  salvarEstado();
  els.modalAgendarAtendimento.close();
  renderizarTudo();
}

function renderPainelEditorAtendimento() {
  els.attendanceEditorPanel.classList.toggle("is-hidden", !atendimentoModoEditor);
  els.attendanceLayout.classList.toggle("is-list-mode", !atendimentoModoEditor);
}

function renderRascunhoAtendimento() {
  const rascunho = state.rascunhoAtendimento;
  els.rascunhoAtendimento.innerHTML = rascunho?.conteudoHtml?.trim() ? `
    <button class="draft-card" type="button" data-open-draft>
      <span>Rascunho automático</span>
      <strong>${rascunho.id ? `<span class="attendance-number">${rotuloAtendimento(rascunho)}</span>` : ""}${escapeHtml(rascunho.assunto || "Atendimento em rascunho")}</strong>
      <small>${escapeHtml(obterCliente(rascunho.clienteId)?.nome || "Cliente não informado")} · salvo ${dataHoraCurta(rascunho.salvoEm || rascunho.atualizadoEm || rascunho.data)}</small>
    </button>
  ` : "";
}

function filtrarAtendimentos() {
  const termo = normalizar(els.busca.value);
  return state.atendimentos
    .filter((atendimento) => !atendimento.processoId)
    .filter((atendimento) => !!atendimento.arquivado === !!state.atendimentoMostrarArquivados)
    .filter((atendimento) => {
      if (!termo) return true;
      const cliente = obterCliente(atendimento.clienteId);
      return normalizar(cliente?.nome).includes(termo) || normalizar(atendimento.assunto).includes(termo);
    })
    .sort((a, b) => new Date(b.atualizadoEm || b.data) - new Date(a.atualizadoEm || a.data));
}

function novoAtendimento() {
  salvarRascunhoAtendimento(true);
  atendimentoAbertoId = "";
  atendimentoAlterado = false;
  atendimentoModoEditor = true;
  els.formAtendimento.reset();
  els.formAtendimento.elements.id.value = "";
  els.atendimentoData.value = agoraLocalInput();
  els.atendimentoCliente.value = "";
  els.atendimentoArea.value = "";
  els.atendimentoAgendar.checked = false;
  els.atendimentoAgendadoEm.value = "";
  if (usuarioAtual()) els.atendimentoResponsavel.value = usuarioAtual().id;
  els.atendimentoEditor.innerHTML = "";
  documentosAtendimento = [];
  renderDocumentosAtendimento();
  els.atendimentoStatus.textContent = "Novo atendimento";
  sincronizarAgendaAtendimento();
  renderVersoesAtendimento(null);
  renderPainelEditorAtendimento();
  els.atendimentoEditor.focus();
}

function marcarAtendimentoAlterado() {
  atendimentoAlterado = true;
  els.atendimentoStatus.textContent = "Alterações em rascunho";
}

function salvarRascunhoAtendimento(forcar = false) {
  if (!atendimentoModoEditor) return;
  if (!forcar && (viewAtual !== "atendimentos" || !atendimentoAlterado)) return;
  const rascunho = dadosAtendimentoDoFormulario();
  if (!rascunho.id && atendimentoAbertoId) rascunho.id = atendimentoAbertoId;
  if (forcar && rascunho.id && !atendimentoAlterado) return;
  if (!conteudoAtendimentoPreenchido(rascunho.conteudoHtml)) return;
  const atendimentoExistente = rascunho.id ? state.atendimentos.find((item) => item.id === rascunho.id) : null;
  if (atendimentoExistente?.numero) rascunho.numero = atendimentoExistente.numero;
  state.rascunhoAtendimento = manterTresVersoes(state.rascunhoAtendimento || {}, rascunho);
  Object.assign(state.rascunhoAtendimento, rascunho, { salvoEm: new Date().toISOString() });
  atendimentoAlterado = false;
  els.atendimentoStatus.textContent = `Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  salvarEstado();
  if (viewAtual === "atendimentos") renderRascunhoAtendimento();
}

function salvarAtendimento(event) {
  event.preventDefault();
  salvarAtendimentoAtual();
}

function salvarAtendimentoAtual({ fechar = false } = {}) {
  const dados = dadosAtendimentoDoFormulario();
  if (!dados.clienteId || !dados.area || !dados.responsavelId || !dados.assunto) {
    alert("Preencha cliente, área, responsável e assunto antes de salvar.");
    return null;
  }
  if (!conteudoAtendimentoPreenchido(dados.conteudoHtml)) {
    alert("Digite as anotações do atendimento antes de salvar.");
    return null;
  }
  const idReferencia = dados.id || atendimentoAbertoId || state.rascunhoAtendimento?.id || "";
  let atendimento = idReferencia ? state.atendimentos.find((item) => item.id === idReferencia) : null;
  if (!dados.id && atendimento) dados.id = atendimento.id;
  if (!atendimento) {
    atendimento = { id: uid(), numero: proximoNumeroAtendimento(), criadoEm: hojeIso(), versoes: [] };
    dados.id = atendimento.id;
    state.atendimentos.unshift(atendimento);
  } else {
    if (assinaturaAtendimento(atendimento) === assinaturaAtendimento(dados)) {
      atendimentoAbertoId = atendimento.id;
      els.formAtendimento.elements.id.value = atendimento.id;
      atendimentoAlterado = false;
      els.atendimentoStatus.textContent = `Atendimento ${rotuloAtendimento(atendimento)} sem alterações`;
      if (fechar) fecharEditorAtendimento();
      return atendimento;
    }
    atendimento.versoes = manterTresVersoes(atendimento, { ...atendimento }).versoes;
  }
  Object.assign(atendimento, dados, { numero: atendimento.numero || proximoNumeroAtendimento(), arquivado: !!atendimento.arquivado, salvoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() });
  atendimentoAbertoId = atendimento.id;
  els.formAtendimento.elements.id.value = atendimento.id;
  state.rascunhoAtendimento = null;
  atendimentoAlterado = false;
  salvarEstado();
  renderizarTudo();
  els.atendimentoStatus.textContent = `Atendimento ${rotuloAtendimento(atendimento)} salvo`;
  if (fechar) fecharEditorAtendimento();
  return atendimento;
}

function solicitarFechamentoAtendimento() {
  sairFocoAtendimento();
  if (atendimentoPrecisaConfirmarFechamento()) {
    els.modalFecharAtendimento.showModal();
    return;
  }
  fecharEditorAtendimento();
}

function atendimentoPrecisaConfirmarFechamento() {
  const dados = dadosAtendimentoDoFormulario();
  const temDados = dados.clienteId || dados.area || dados.assunto || conteudoAtendimentoPreenchido(dados.conteudoHtml);
  return atendimentoAlterado || (!dados.id && temDados);
}

function salvarAtendimentoPeloDialogo(fechar) {
  const salvo = salvarAtendimentoAtual({ fechar });
  if (!salvo) return;
  els.modalFecharAtendimento.close();
}

function fecharAtendimentoSemSalvar() {
  atendimentoAlterado = false;
  els.modalFecharAtendimento.close();
  fecharEditorAtendimento();
}

function fecharEditorAtendimento() {
  sairFocoAtendimento();
  atendimentoModoEditor = false;
  atendimentoAbertoId = "";
  atendimentoAlterado = false;
  selecaoAtendimento = null;
  els.formAtendimento.reset();
  els.formAtendimento.elements.id.value = "";
  els.atendimentoEditor.innerHTML = "";
  documentosAtendimento = [];
  renderDocumentosAtendimento();
  els.atendimentoStatus.textContent = "Rascunho pronto";
  fecharVersoesAtendimento();
  renderVersoesAtendimento(null);
  sincronizarAgendaAtendimento();
  renderPainelEditorAtendimento();
}

function dadosAtendimentoDoFormulario() {
  const dados = Object.fromEntries(new FormData(els.formAtendimento));
  return {
    id: dados.id || "",
    clienteId: dados.clienteId,
    area: dados.area,
    responsavelId: dados.responsavelId,
    data: dados.data || agoraLocalInput(),
    agendar: els.atendimentoAgendar.checked ? "sim" : "nao",
    agendadoEm: els.atendimentoAgendar.checked ? (dados.agendadoEm || dados.data || agoraLocalInput()) : "",
    assunto: dados.assunto.trim(),
    anexos: documentosAtendimento.map((anexo) => ({ ...anexo })),
    conteudoHtml: els.atendimentoEditor.innerHTML
  };
}

function assinaturaAtendimento(atendimento = {}) {
  return JSON.stringify({
    clienteId: atendimento.clienteId || "",
    area: atendimento.area || "",
    responsavelId: atendimento.responsavelId || "",
    data: atendimento.data || "",
    agendar: atendimento.agendar || "nao",
    agendadoEm: atendimento.agendadoEm || "",
    assunto: (atendimento.assunto || "").trim(),
    anexos: JSON.stringify((atendimento.anexos || []).map((anexo) => ({
      id: anexo.id || "",
      nome: anexo.nome || "",
      tipo: anexo.tipo || "",
      tamanho: anexo.tamanho || 0,
      dataUrl: anexo.dataUrl || ""
    }))),
    conteudoHtml: normalizarHtmlComparacao(atendimento.conteudoHtml || "")
  });
}

function normalizarHtmlComparacao(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerHTML.replace(/\sdata-indent-level="[^"]*"/g, "").replace(/\s+/g, " ").trim();
}

function abrirAtendimentoDaLista(event) {
  const excluir = event.target.closest("[data-delete-attendance]");
  if (excluir) {
    pedirExclusaoAtendimento(excluir.dataset.deleteAttendance);
    return;
  }
  const arquivar = event.target.closest("[data-toggle-archive-attendance]");
  if (arquivar) {
    alternarArquivoAtendimento(arquivar.dataset.toggleArchiveAttendance);
    return;
  }
  if (event.target.closest("[data-open-draft]")) {
    carregarRascunhoAtendimento();
    return;
  }
  const botao = event.target.closest("[data-open-attendance]");
  if (!botao) return;
  const atendimento = state.atendimentos.find((item) => item.id === botao.dataset.openAttendance);
  if (!atendimento) return;
  preencherFormularioAtendimento(atendimento);
}

function preencherFormularioAtendimento(atendimento) {
  atendimentoModoEditor = true;
  atendimentoAbertoId = atendimento.id || "";
  els.formAtendimento.elements.id.value = atendimento.id || "";
  els.atendimentoCliente.value = atendimento.clienteId || state.clientes[0]?.id || "";
  els.atendimentoArea.value = atendimento.area || "";
  els.atendimentoResponsavel.value = atendimento.responsavelId || usuarioAtual()?.id || "";
  els.atendimentoData.value = atendimento.data || agoraLocalInput();
  els.atendimentoAgendar.checked = atendimento.agendadoEm ? true : (atendimento.agendar || "nao") === "sim";
  els.atendimentoAgendadoEm.value = atendimento.agendadoEm || "";
  els.formAtendimento.assunto.value = atendimento.assunto || "";
  els.atendimentoEditor.innerHTML = atendimento.conteudoHtml || modeloAtendimento();
  documentosAtendimento = (atendimento.anexos || []).map((anexo) => ({ ...anexo }));
  renderDocumentosAtendimento();
  atendimentoAlterado = false;
  els.atendimentoStatus.textContent = atendimento.id ? `Atendimento ${rotuloAtendimento(atendimento)} carregado` : "Rascunho carregado";
  renderVersoesAtendimento(atendimento);
  renderPainelEditorAtendimento();
  sincronizarAgendaAtendimento();
}

function carregarRascunhoAtendimento() {
  if (state.rascunhoAtendimento?.conteudoHtml) preencherFormularioAtendimento(state.rascunhoAtendimento);
  else novoAtendimento();
}

async function adicionarDocumentosAtendimento(event) {
  const arquivos = Array.from(event.target.files || []);
  if (!arquivos.length) return;
  const permitidos = [];
  const recusados = [];
  let total = documentosAtendimento.reduce((soma, anexo) => soma + Number(anexo.tamanho || 0), 0);
  arquivos.forEach((arquivo) => {
    if (arquivo.size > MAX_DOCUMENT_FILE_BYTES) recusados.push(arquivo.name);
    else if (total + arquivo.size > MAX_DOCUMENT_TOTAL_BYTES) recusados.push(arquivo.name);
    else {
      total += arquivo.size;
      permitidos.push(arquivo);
    }
  });
  if (recusados.length) {
    alert(`Documento grande demais para guardar com segurança neste navegador: ${recusados.join(", ")}. Para documentos maiores, use o Drive pelo Apps Script.`);
  }
  const anexos = await Promise.all(permitidos.map(lerArquivoComoAnexo));
  documentosAtendimento = [...documentosAtendimento, ...anexos];
  event.target.value = "";
  renderDocumentosAtendimento();
  if (anexos.length) marcarAtendimentoAlterado();
}

function lerArquivoComoAnexo(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve({
      id: uid(),
      nome: arquivo.name,
      tipo: arquivo.type || "application/octet-stream",
      tamanho: arquivo.size,
      dataUrl: leitor.result,
      adicionadoEm: new Date().toISOString()
    });
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

function renderDocumentosAtendimento() {
  const total = documentosAtendimento.length;
  els.atendimentoDocumentosPanel.classList.toggle("is-hidden", !total);
  els.atendimentoDocumentosResumo.textContent = `${total} documento${total !== 1 ? "s" : ""}`;
  els.atendimentoDocumentosLista.innerHTML = total ? documentosAtendimento.map((anexo) => `
    <article class="document-card">
      <button class="document-preview" type="button" data-open-document="${anexo.id}" title="Visualizar documento">
        ${iconeDocumento(anexo)}
      </button>
      <div>
        <strong>${escapeHtml(anexo.nome)}</strong>
        <span>${escapeHtml(tipoDocumentoAmigavel(anexo.tipo))} · ${formatarTamanhoArquivo(anexo.tamanho)} · ${dataHoraCurta(anexo.adicionadoEm)}</span>
      </div>
      <button class="ghost-button table-action" type="button" data-open-document="${anexo.id}">Abrir</button>
      <button class="danger-button table-action" type="button" data-remove-document="${anexo.id}">Excluir</button>
    </article>
  `).join("") : "";
}

function gerenciarDocumentoAtendimento(event) {
  const abrir = event.target.closest("[data-open-document]");
  if (abrir) {
    abrirDocumentoAtendimento(abrir.dataset.openDocument);
    return;
  }
  const remover = event.target.closest("[data-remove-document]");
  if (!remover) return;
  const anexo = documentosAtendimento.find((item) => item.id === remover.dataset.removeDocument);
  if (!anexo) return;
  if (!confirm(`Excluir o documento "${anexo.nome}" deste atendimento?`)) return;
  documentosAtendimento = documentosAtendimento.filter((item) => item.id !== anexo.id);
  renderDocumentosAtendimento();
  marcarAtendimentoAlterado();
}

function abrirDocumentoAtendimento(id) {
  const anexo = documentosAtendimento.find((item) => item.id === id);
  if (!anexo?.dataUrl) return;
  const janela = window.open("", "_blank", "noopener,noreferrer");
  if (!janela) return;
  if (anexo.tipo?.startsWith("image/")) {
    janela.document.write(`<title>${escapeHtml(anexo.nome)}</title><img src="${anexo.dataUrl}" alt="${escapeHtml(anexo.nome)}" style="max-width:100%;height:auto;display:block;margin:24px auto;">`);
    return;
  }
  janela.location.href = anexo.dataUrl;
}

function iconeDocumento(anexo) {
  if (anexo.tipo?.startsWith("image/") && anexo.dataUrl) return `<img src="${anexo.dataUrl}" alt="">`;
  const texto = anexo.tipo?.includes("pdf") ? "PDF" : anexo.nome.split(".").pop()?.slice(0, 4).toUpperCase() || "DOC";
  return `<span>${escapeHtml(texto)}</span>`;
}

function tipoDocumentoAmigavel(tipo = "") {
  if (tipo.includes("pdf")) return "PDF";
  if (tipo.startsWith("image/")) return "Imagem";
  if (tipo.includes("word") || tipo.includes("document")) return "Documento";
  if (tipo.includes("sheet") || tipo.includes("excel")) return "Planilha";
  return "Arquivo";
}

function formatarTamanhoArquivo(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function renderVersoesAtendimento(atendimento) {
  const versoes = atendimento?.versoes || [];
  els.btnVersoesAtendimento.classList.toggle("is-hidden", !versoes.length);
  els.btnVersoesAtendimento.textContent = versoes.length ? `Últimas versões (${versoes.length})` : "Últimas versões";
  fecharVersoesAtendimento();
  els.versoesAtendimento.innerHTML = versoes.length ? `
    ${versoes.map((versao, index) => `
      <article>
        <div>
          <strong>${escapeHtml(versao.assunto || "Versão anterior")}</strong>
          <span>${dataHoraCurta(versao.salvoEm || versao.atualizadoEm || versao.data)}</span>
        </div>
        <button class="ghost-button table-action" type="button" data-restore-version="${index}">Restaurar</button>
      </article>
    `).join("")}
  ` : "";
}

function alternarVersoesAtendimento(event) {
  event.preventDefault();
  els.versoesAtendimento.classList.toggle("is-hidden");
}

function fecharVersoesAtendimento() {
  els.versoesAtendimento.classList.add("is-hidden");
}

function restaurarVersaoAtendimento(event) {
  const botao = event.target.closest("[data-restore-version]");
  if (!botao) return;
  const atendimento = atendimentoAberto();
  const versao = atendimento?.versoes?.[Number(botao.dataset.restoreVersion)];
  if (!versao) return;

  const atual = dadosAtendimentoDoFormulario();
  if (conteudoAtendimentoPreenchido(atual.conteudoHtml) && atendimento) {
    atendimento.versoes = manterTresVersoes(atendimento, atual).versoes;
  }

  els.formAtendimento.assunto.value = versao.assunto || atual.assunto;
  els.atendimentoEditor.innerHTML = versao.conteudoHtml || "";
  atendimentoAlterado = true;
  els.atendimentoStatus.textContent = "Versão restaurada em rascunho";
  renderVersoesAtendimento(atendimento);
  fecharVersoesAtendimento();
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
  const menu = event.target.closest("[data-editor-menu]");
  if (menu) {
    event.preventDefault();
    alternarMenuEditor(menu.dataset.editorMenu);
    return;
  }
  const botao = event.target.closest("[data-editor-command]");
  if (!botao) return;
  event.preventDefault();
  const valor = botao.dataset.editorValue || null;
  if (valor && botao.dataset.editorCommand === "toggleHighlight") atualizarCorDestaque(valor);
  executarComandoEditor(botao.dataset.editorCommand, valor, botao.dataset.listStyle || "", botao.dataset.listType || "");
  atualizarIconeListaToolbar(botao);
  fecharMenusEditor();
  marcarAtendimentoAlterado();
}

function atualizarIconeListaToolbar(botao) {
  const tipo = botao.dataset.listType;
  const estilo = botao.dataset.listStyle;
  if (!tipo || !estilo) return;
  const alvo = tipo === "ul" ? els.btnUnorderedListTool : els.btnOrderedListTool;
  if (!alvo) return;
  alvo.dataset.listStyle = estilo;
  alvo.dataset.listType = tipo;
  alvo.title = botao.title || alvo.title;
  alvo.setAttribute("aria-label", botao.getAttribute("aria-label") || alvo.getAttribute("aria-label") || "");
  alvo.innerHTML = tipo === "ul" ? iconeMarcadorNaoOrdenado(estilo) : iconeMarcadorOrdenado(estilo);
}

function iconeMarcadorNaoOrdenado(estilo) {
  const classe = {
    disc: "list-bullets",
    circle: "list-circles",
    square: "list-squares"
  }[estilo] || "list-bullets";
  return `<span class="list-icon ${classe}" aria-hidden="true"><i></i><i></i><i></i></span>`;
}

function iconeMarcadorOrdenado(estilo) {
  const itens = {
    decimal: ["1", "2", "3"],
    "decimal-paren": ["1)", "2)", "3)"],
    "upper-roman": ["I", "II", "III"],
    "upper-alpha": ["A", "B", "C"],
    "lower-alpha-paren": ["a)", "b)", "c)"],
    "lower-alpha": ["a", "b", "c"],
    "lower-roman": ["i", "ii", "iii"]
  }[estilo] || ["1", "2", "3"];
  return `<span class="list-icon list-numbers" aria-hidden="true"><i>${itens[0]}</i><i>${itens[1]}</i><i>${itens[2]}</i></span>`;
}

function manterSelecaoAoClicarToolbar(event) {
  if (event.target.closest("button")) event.preventDefault();
}

function executarComandoEditor(comando, valor = null, listStyle = "", listType = "") {
  restaurarSelecaoEditor();
  if (comando === "toggleHighlight") {
    alternarDestaqueTexto(valor || corDestaqueSelecionada());
    guardarSelecaoEditor();
    return;
  }
  if (comando === "fontSizeStep") {
    ajustarTamanhoFonte(Number(valor || 0));
    guardarSelecaoEditor();
    return;
  }
  if (comando === "lineSpacing") {
    aplicarEspacamentoLinha(valor || "1.5");
    guardarSelecaoEditor();
    return;
  }
  if (comando === "removeList") {
    removerListaSelecionada();
    guardarSelecaoEditor();
    return;
  }
  document.execCommand(comando, false, valor);
  if (listStyle) aplicarEstiloLista(listStyle, listType);
  guardarSelecaoEditor();
}

function aplicarTamanhoFonteSelecionado(event) {
  aplicarTamanhoFonte(Number(event.target.value || 12));
  marcarAtendimentoAlterado();
}

function aplicarTamanhoFonte(tamanho) {
  restaurarSelecaoEditor();
  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!els.atendimentoEditor.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== els.atendimentoEditor) return;
  if (range.collapsed) {
    document.execCommand("fontSize", false, "7");
    substituirFontesTemporarias(tamanho);
    guardarSelecaoEditor();
    atualizarControleTamanhoFonte();
    return;
  }

  const marcadorInicio = document.createElement("span");
  const marcadorFim = document.createElement("span");
  marcadorInicio.setAttribute("data-editor-marker", "start");
  marcadorFim.setAttribute("data-editor-marker", "end");
  const finalRange = range.cloneRange();
  finalRange.collapse(false);
  finalRange.insertNode(marcadorFim);
  range.insertNode(marcadorInicio);

  const intervalo = document.createRange();
  intervalo.setStartAfter(marcadorInicio);
  intervalo.setEndBefore(marcadorFim);
  aplicarTamanhoFonteNoIntervalo(intervalo, tamanho);

  const novaSelecao = document.createRange();
  novaSelecao.setStartAfter(marcadorInicio);
  novaSelecao.setEndBefore(marcadorFim);
  selection.removeAllRanges();
  selection.addRange(novaSelecao);
  marcadorInicio.remove();
  marcadorFim.remove();
  substituirFontesTemporarias(tamanho);
  guardarSelecaoEditor();
  atualizarControleTamanhoFonte();
}

function aplicarTamanhoFonteNoIntervalo(range, tamanho) {
  const raiz = range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? range.commonAncestorContainer.parentElement : range.commonAncestorContainer;
  const textos = [];
  const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim() && node.nodeValue !== " ") return NodeFilter.FILTER_REJECT;
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  while (walker.nextNode()) textos.push(walker.currentNode);
  textos.reverse().forEach((node) => {
    const inicio = node === range.startContainer ? range.startOffset : 0;
    const fim = node === range.endContainer ? range.endOffset : node.nodeValue.length;
    if (inicio >= fim) return;
    const trecho = document.createRange();
    trecho.setStart(node, inicio);
    trecho.setEnd(node, fim);
    const span = document.createElement("span");
    span.style.fontSize = `${tamanho}pt`;
    try {
      trecho.surroundContents(span);
    } catch {
      const conteudo = trecho.extractContents();
      span.appendChild(conteudo);
      trecho.insertNode(span);
    }
  });
}

function substituirFontesTemporarias(tamanho) {
  els.atendimentoEditor.querySelectorAll('font[size="7"]').forEach((font) => {
    const span = document.createElement("span");
    span.style.fontSize = `${tamanho}pt`;
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
}

function atualizarSelecaoEditor() {
  guardarSelecaoEditor();
  atualizarControleTamanhoFonte();
  atualizarControleEspacamento();
}

function atualizarControleTamanhoFonte() {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount || !els.editorFontSize) return;
  const origem = selection.anchorNode;
  const node = origem?.nodeType === Node.TEXT_NODE ? origem.parentElement : origem;
  if (!node || (node !== els.atendimentoEditor && !els.atendimentoEditor.contains(node))) return;
  const tamanhoPx = parseFloat(window.getComputedStyle(node).fontSize);
  const tamanhoPt = tamanhoPx ? Math.round(tamanhoPx * 0.75) : 12;
  const maisProximo = FONT_SIZE_OPTIONS.reduce((melhor, atual) => Math.abs(atual - tamanhoPt) < Math.abs(melhor - tamanhoPt) ? atual : melhor, 12);
  els.editorFontSize.value = String(maisProximo);
}

function alternarMenuEditor(nome) {
  const grupoAlvo = document.querySelector(`[data-editor-menu="${nome}"]`)?.closest(".editor-dropdown");
  const abrir = grupoAlvo && !grupoAlvo.classList.contains("is-open");
  fecharMenusEditor();
  if (abrir) grupoAlvo.classList.add("is-open");
}

function fecharMenusEditor() {
  document.querySelectorAll(".editor-dropdown.is-open").forEach((grupo) => grupo.classList.remove("is-open"));
}

function atualizarCorDestaque(cor) {
  document.querySelector(".editor-highlight-group")?.style.setProperty("--highlight-color", cor);
  document.querySelector(".color-swatch.is-current")?.style.setProperty("--swatch-color", cor);
}

function guardarSelecaoEditor() {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount || !els.atendimentoEditor) return;
  const range = selection.getRangeAt(0);
  const origem = range.commonAncestorContainer;
  if (origem === els.atendimentoEditor || els.atendimentoEditor.contains(origem)) {
    selecaoAtendimento = range.cloneRange();
  }
}

function restaurarSelecaoEditor() {
  els.atendimentoEditor.focus();
  if (!selecaoAtendimento) return;
  const selection = window.getSelection?.();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(selecaoAtendimento);
}

function corDestaqueSelecionada() {
  return document.querySelector(".editor-highlight-group")?.style.getPropertyValue("--highlight-color") || DEFAULT_HIGHLIGHT_COLOR;
}

function alternarDestaqueTexto(cor) {
  document.execCommand("backColor", false, selecaoTemDestaque() ? "transparent" : cor);
}

function ajustarTamanhoFonte(delta) {
  const atual = Number(document.queryCommandValue("fontSize")) || 3;
  const proximo = Math.min(7, Math.max(1, atual + delta));
  document.execCommand("fontSize", false, String(proximo));
}

function aplicarEspacamentoLinha(valor) {
  const espacamento = String(valor).replace(",", ".");
  const blocos = blocosSelecionadosEditor();
  if (!blocos.length) {
    document.execCommand("formatBlock", false, "p");
    const bloco = blocoEditorAtual();
    if (bloco && bloco !== els.atendimentoEditor) bloco.style.lineHeight = espacamento;
    return;
  }
  blocos.forEach((bloco) => {
    bloco.style.lineHeight = espacamento;
  });
  atualizarControleEspacamento(espacamento);
}

function atualizarControleEspacamento(valorAtual = "") {
  const bloco = blocoEditorAtual();
  const valor = normalizarEspacamentoLinha(valorAtual || bloco?.style.lineHeight || "1.5");
  document.querySelectorAll(".spacing-menu [data-editor-command='lineSpacing']").forEach((button) => {
    button.classList.toggle("is-active", normalizarEspacamentoLinha(button.dataset.editorValue) === valor);
  });
}

function normalizarEspacamentoLinha(valor = "") {
  const numero = Number(String(valor).replace(",", "."));
  if (!Number.isFinite(numero) || numero <= 0) return "1.5";
  return String(numero);
}

function blocosSelecionadosEditor() {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return [];
  const range = selection.getRangeAt(0);
  if (!els.atendimentoEditor.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== els.atendimentoEditor) return [];
  const atual = blocoEditorAtual();
  if (range.collapsed) return atual && atual !== els.atendimentoEditor ? [atual] : [];
  const candidatos = Array.from(els.atendimentoEditor.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6, blockquote"));
  const blocos = candidatos.filter((bloco) => {
    try {
      return range.intersectsNode(bloco);
    } catch {
      return false;
    }
  });
  return blocos.length ? blocos : (atual && atual !== els.atendimentoEditor ? [atual] : []);
}

function selecaoTemDestaque() {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return false;
  let node = selection.anchorNode;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
  while (node && node !== els.atendimentoEditor) {
    const background = window.getComputedStyle(node).backgroundColor;
    if (background && background !== "rgba(0, 0, 0, 0)" && background !== "transparent" && background !== "rgb(255, 255, 255)") {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function aplicarEstiloLista(listStyle, listType = "") {
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  const elemento = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  const lista = elemento?.closest?.(listType || "ol, ul");
  if (!lista) return;
  lista.dataset.listFormat = "";
  const customFormats = {
    "decimal-paren": "decimal-paren",
    "lower-alpha-paren": "lower-alpha-paren"
  };
  if (customFormats[listStyle]) {
    lista.dataset.listFormat = customFormats[listStyle];
    lista.style.listStyleType = "none";
    return;
  }
  lista.removeAttribute("data-list-format");
  lista.style.listStyleType = listStyle;
}

function removerListaSelecionada() {
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  const elemento = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  const lista = elemento?.closest?.("ol, ul");
  if (!lista || !els.atendimentoEditor.contains(lista)) return;
  const fragmento = document.createDocumentFragment();
  Array.from(lista.children).forEach((item) => {
    if (item.tagName !== "LI") return;
    const p = document.createElement("p");
    p.innerHTML = item.innerHTML || "<br>";
    fragmento.appendChild(p);
  });
  lista.replaceWith(fragmento);
}

function colarImagemAtendimento(event) {
  const item = [...(event.clipboardData?.items || [])].find((entrada) => entrada.type.startsWith("image/"));
  if (!item) return;
  event.preventDefault();
  inserirArquivoImagemAtendimento(item.getAsFile());
}

function soltarImagemAtendimento(event) {
  const arquivo = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith("image/"));
  if (!arquivo) return;
  event.preventDefault();
  inserirArquivoImagemAtendimento(arquivo);
}

function inserirArquivoImagemAtendimento(arquivo) {
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = () => inserirImagemAtendimento(leitor.result);
  leitor.readAsDataURL(arquivo);
}

function inserirImagemAtendimento(src) {
  restaurarSelecaoEditor();
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.className = "editor-image image-layout-block";
  img.draggable = false;
  img.dataset.imageLayout = "block";
  const selection = window.getSelection?.();
  if (selection?.rangeCount) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    els.atendimentoEditor.appendChild(img);
  }
  imagemAtivaAtendimento = img;
  marcarAtendimentoAlterado();
}

function selecionarImagemAtendimento(event) {
  const img = event.target.closest("img");
  if (!img || !els.atendimentoEditor.contains(img)) return;
  img.classList.add("editor-image");
  img.draggable = false;
  if (!img.dataset.imageLayout || img.dataset.imageLayout === "inline") img.dataset.imageLayout = "block";
  if (!img.dataset.rotation) img.dataset.rotation = "0";
  if (!img.dataset.offsetX) img.dataset.offsetX = "0";
  if (!img.dataset.offsetY) img.dataset.offsetY = "0";
  aplicarTransformImagemAtendimento(img);
  abrirOpcoesImagemAtendimento(img);
}

function abrirOpcoesImagemAtendimento(img) {
  imagemAtivaAtendimento = img;
  els.atendimentoEditor.querySelectorAll("img.is-selected").forEach((item) => item.classList.remove("is-selected"));
  img.classList.add("is-selected");
  const rect = img.getBoundingClientRect();
  posicionarOverlayImagem(img);
  els.imageLayoutPopover.style.left = `${Math.max(8, Math.min(rect.right + 14, window.innerWidth - 250))}px`;
  els.imageLayoutPopover.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - 330))}px`;
  els.imageLayoutPopover.classList.remove("is-hidden");
  atualizarOpcoesLayoutImagem(img.dataset.imageLayout || "block");
}

function fecharOpcoesImagemAtendimento() {
  els.imageLayoutPopover?.classList.add("is-hidden");
  els.imageResizeOverlay?.classList.add("is-hidden");
  els.atendimentoEditor?.querySelectorAll("img.is-selected").forEach((img) => {
    if (img.classList.contains("is-cropping")) {
      const rect = img.getBoundingClientRect();
      finalizarCorteImagem(img, rect.width, rect.height, false);
    }
    img.classList.remove("is-cropping");
    img.classList.remove("is-selected");
  });
}

function aplicarLayoutImagemAtendimento(event) {
  const cortar = event.target.closest("[data-image-crop-toggle]");
  if (cortar && imagemAtivaAtendimento) {
    alternarCorteImagemAtendimento();
    return;
  }
  const botao = event.target.closest("[data-image-layout]");
  if (!botao || !imagemAtivaAtendimento) return;
  const layout = botao.dataset.imageLayout;
  imagemAtivaAtendimento.classList.remove("image-layout-inline", "image-layout-left", "image-layout-tight-left", "image-layout-right", "image-layout-bottom-left", "image-layout-center", "image-layout-full", "image-layout-wrap", "image-layout-block");
  imagemAtivaAtendimento.classList.add(`image-layout-${layout}`);
  imagemAtivaAtendimento.dataset.imageLayout = layout;
  atualizarOpcoesLayoutImagem(layout);
  posicionarOverlayImagem(imagemAtivaAtendimento);
  marcarAtendimentoAlterado();
}

function atualizarOpcoesLayoutImagem(layout) {
  els.imageLayoutPopover?.querySelectorAll("[data-image-layout]").forEach((botao) => {
    botao.classList.toggle("is-active", botao.dataset.imageLayout === layout);
  });
}

function posicionarOverlayImagem(img) {
  if (!img || !els.imageResizeOverlay) return;
  const rect = img.getBoundingClientRect();
  els.imageResizeOverlay.style.left = `${rect.left}px`;
  els.imageResizeOverlay.style.top = `${rect.top}px`;
  els.imageResizeOverlay.style.width = `${rect.width}px`;
  els.imageResizeOverlay.style.height = `${rect.height}px`;
  els.imageResizeOverlay.classList.toggle("is-cropping", img.classList.contains("is-cropping"));
  els.imageLayoutPopover?.querySelector("[data-image-crop-toggle]")?.classList.toggle("is-active", img.classList.contains("is-cropping"));
  els.imageResizeOverlay.classList.remove("is-hidden");
}

function alternarCorteImagemAtendimento() {
  if (!imagemAtivaAtendimento) return;
  if (imagemAtivaAtendimento.classList.contains("is-cropping")) {
    const rect = imagemAtivaAtendimento.getBoundingClientRect();
    finalizarCorteImagem(imagemAtivaAtendimento, rect.width, rect.height);
    marcarAtendimentoAlterado();
    return;
  }
  imagemAtivaAtendimento.classList.add("is-cropping");
  posicionarOverlayImagem(imagemAtivaAtendimento);
}

function dadosCorteImagem(img) {
  return {
    top: Number(img.dataset.cropTop || 0),
    right: Number(img.dataset.cropRight || 0),
    bottom: Number(img.dataset.cropBottom || 0),
    left: Number(img.dataset.cropLeft || 0)
  };
}

function limitarCorte(valor) {
  return Math.max(0, Math.min(85, valor));
}

function aplicarCorteImagem(img, corte) {
  const top = limitarCorte(corte.top);
  const right = limitarCorte(corte.right);
  const bottom = limitarCorte(corte.bottom);
  const left = limitarCorte(corte.left);
  img.dataset.cropTop = String(top);
  img.dataset.cropRight = String(right);
  img.dataset.cropBottom = String(bottom);
  img.dataset.cropLeft = String(left);
  img.style.clipPath = top || right || bottom || left ? `inset(${top}% ${right}% ${bottom}% ${left}%)` : "";
}

function finalizarCorteImagem(img, larguraBase, alturaBase, reposicionar = true) {
  const corte = dadosCorteImagem(img);
  const left = limitarCorte(corte.left);
  const right = limitarCorte(corte.right);
  const top = limitarCorte(corte.top);
  const bottom = limitarCorte(corte.bottom);
  const larguraVisivelPct = Math.max(5, 100 - left - right);
  const alturaVisivelPct = Math.max(5, 100 - top - bottom);
  const larguraRenderizada = Number.parseFloat(img.style.width) || larguraBase;
  const alturaRenderizada = Number.parseFloat(img.style.height) || alturaBase;

  if (!left && !right && !top && !bottom) {
    img.classList.remove("is-cropping");
    if (reposicionar) posicionarOverlayImagem(img);
    return;
  }

  const novaLargura = Math.max(40, Math.round(larguraRenderizada * larguraVisivelPct / 100));
  const novaAltura = Math.max(30, Math.round(alturaRenderizada * alturaVisivelPct / 100));

  try {
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    if (!img.complete || !naturalW || !naturalH) throw new Error("Imagem ainda nao carregada");
    const sx = Math.min(naturalW - 1, Math.max(0, Math.round(naturalW * left / 100)));
    const sy = Math.min(naturalH - 1, Math.max(0, Math.round(naturalH * top / 100)));
    const sw = Math.max(1, Math.min(naturalW - sx, Math.round(naturalW * larguraVisivelPct / 100)));
    const sh = Math.max(1, Math.min(naturalH - sy, Math.round(naturalH * alturaVisivelPct / 100)));
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponivel");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    img.src = canvas.toDataURL("image/png");
  } catch {
    // Mantem a imagem editavel mesmo quando o navegador ainda nao liberou o bitmap para canvas.
  }

  img.style.width = `${novaLargura}px`;
  img.style.height = `${novaAltura}px`;
  img.style.clipPath = "";
  delete img.dataset.cropTop;
  delete img.dataset.cropRight;
  delete img.dataset.cropBottom;
  delete img.dataset.cropLeft;
  img.classList.remove("is-cropping");
  if (reposicionar) setTimeout(() => posicionarOverlayImagem(img), 0);
}

function iniciarAjusteImagemAtendimento(event) {
  if (!imagemAtivaAtendimento) return;
  const handle = event.target.closest("[data-resize-handle]");
  const rotacionar = event.target.closest("[data-image-rotate]");
  const moverImagem = event.target === els.imageResizeOverlay;
  if (!handle && !rotacionar && !moverImagem) return;
  iniciarInteracaoImagemAtendimento(event, imagemAtivaAtendimento, { handle, rotacionar, moverImagem });
}

function iniciarArrasteImagemDireto(event) {
  const img = event.target.closest("img.editor-image");
  if (!img || !els.atendimentoEditor.contains(img)) return;
  if (event.button !== 0) return;
  if (!img.classList.contains("is-selected")) return;
  iniciarInteracaoImagemAtendimento(event, img, { moverImagem: true });
}

function iniciarInteracaoImagemAtendimento(event, img, acao) {
  event.preventDefault();
  imagemAtivaAtendimento = img;
  if (acao.moverImagem) els.atendimentoEditor.classList.add("is-image-moving");
  const inicioX = event.clientX;
  const inicioY = event.clientY;
  const rect = img.getBoundingClientRect();
  const larguraInicial = rect.width;
  const alturaInicial = rect.height;
  const larguraEstiloInicial = Number.parseFloat(img.style.width) || larguraInicial;
  const alturaEstiloInicial = Number.parseFloat(img.style.height) || alturaInicial;
  const offsetInicialX = Number(img.dataset.offsetX || 0);
  const offsetInicialY = Number(img.dataset.offsetY || 0);
  const corteInicial = dadosCorteImagem(img);
  const centroX = rect.left + rect.width / 2;
  const centroY = rect.top + rect.height / 2;
  const proporcao = alturaInicial / larguraInicial || 1;

  const mover = (moveEvent) => {
    if (acao.rotacionar) {
      const angulo = Math.atan2(moveEvent.clientY - centroY, moveEvent.clientX - centroX) * 180 / Math.PI + 90;
      const rotacao = Math.round(angulo / 5) * 5;
      img.dataset.rotation = String(rotacao);
      aplicarTransformImagemAtendimento(img);
      posicionarOverlayImagem(img);
      return;
    }
    const deltaXOriginal = moveEvent.clientX - inicioX;
    const deltaYOriginal = moveEvent.clientY - inicioY;
    if (acao.moverImagem) {
      img.dataset.offsetX = String(Math.round(offsetInicialX + deltaXOriginal));
      img.dataset.offsetY = String(Math.round(offsetInicialY + deltaYOriginal));
      aplicarTransformImagemAtendimento(img);
      posicionarOverlayImagem(img);
      return;
    }
    const direcao = acao.handle.dataset.resizeHandle;
    if (img.classList.contains("is-cropping")) {
      const corte = { ...corteInicial };
      if (direcao.includes("n")) corte.top = corteInicial.top + (deltaYOriginal / alturaInicial * 100);
      if (direcao.includes("s")) corte.bottom = corteInicial.bottom - (deltaYOriginal / alturaInicial * 100);
      if (direcao.includes("w")) corte.left = corteInicial.left + (deltaXOriginal / larguraInicial * 100);
      if (direcao.includes("e")) corte.right = corteInicial.right - (deltaXOriginal / larguraInicial * 100);
      aplicarCorteImagem(img, corte);
      posicionarOverlayImagem(img);
      return;
    }
    const deltaX = direcao.includes("w") ? -deltaXOriginal : deltaXOriginal;
    const deltaY = direcao.includes("n") ? -deltaYOriginal : deltaYOriginal;
    let largura = larguraEstiloInicial;
    let altura = alturaEstiloInicial;

    if (["nw", "ne", "sw", "se"].includes(direcao)) {
      largura = Math.max(80, Math.round(larguraEstiloInicial + deltaX));
      altura = Math.max(40, Math.round(largura * proporcao));
    } else if (direcao === "e" || direcao === "w") {
      largura = Math.max(80, Math.round(larguraEstiloInicial + deltaX));
    } else if (direcao === "n" || direcao === "s") {
      altura = Math.max(40, Math.round(alturaEstiloInicial + deltaY));
    }

    if (direcao.includes("w")) img.dataset.offsetX = String(Math.round(offsetInicialX + deltaXOriginal));
    if (direcao.includes("n")) img.dataset.offsetY = String(Math.round(offsetInicialY + deltaYOriginal));
    img.style.width = `${largura}px`;
    img.style.height = `${altura}px`;
    posicionarOverlayImagem(img);
  };

  const soltar = () => {
    document.removeEventListener("pointermove", mover);
    document.removeEventListener("pointerup", soltar);
    els.atendimentoEditor.classList.remove("is-image-moving");
    if (img.classList.contains("is-cropping") && acao.handle) finalizarCorteImagem(img, larguraInicial, alturaInicial);
    marcarAtendimentoAlterado();
    guardarSelecaoEditor();
  };

  document.addEventListener("pointermove", mover);
  document.addEventListener("pointerup", soltar, { once: true });
}

function aplicarTransformImagemAtendimento(img) {
  const x = Number(img.dataset.offsetX || 0);
  const y = Number(img.dataset.offsetY || 0);
  const rotacao = Number(img.dataset.rotation || 0);
  img.style.transform = `translate(${x}px, ${y}px) rotate(${rotacao}deg)`;
}

function atalhosEditorAtendimento(event) {
  if (event.key === "Tab") {
    event.preventDefault();
    alterarRecuoAtendimento(event.shiftKey ? -1 : 1);
    marcarAtendimentoAlterado();
    return;
  }
  if (event.key === "Backspace" && removerRecuoAoApagar()) {
    event.preventDefault();
    marcarAtendimentoAlterado();
    return;
  }
  if (event.key === "Enter") {
    const nivel = nivelRecuoBloco(blocoEditorAtual());
    if (nivel > 0) {
      setTimeout(() => {
        const bloco = blocoEditorAtual();
        if (bloco) aplicarNivelRecuo(bloco, nivel);
      }, 0);
    }
  }
  if (!(event.ctrlKey || event.metaKey)) return;
  const tecla = event.key.toLowerCase();
  const comandos = { n: "bold", s: "underline", i: "italic", d: "toggleHighlight" };
  if (!comandos[tecla]) return;
  event.preventDefault();
  executarComandoEditor(comandos[tecla], tecla === "d" ? corDestaqueSelecionada() : null);
  marcarAtendimentoAlterado();
}

function alterarRecuoAtendimento(delta) {
  restaurarSelecaoEditor();
  let bloco = blocoEditorAtual();
  if (!bloco || bloco === els.atendimentoEditor) {
    document.execCommand("formatBlock", false, "p");
    bloco = blocoEditorAtual();
  }
  if (!bloco || bloco === els.atendimentoEditor) return;
  aplicarNivelRecuo(bloco, nivelRecuoBloco(bloco) + delta);
  guardarSelecaoEditor();
}

function removerRecuoAoApagar() {
  const bloco = blocoEditorAtual();
  if (!bloco || bloco === els.atendimentoEditor || nivelRecuoBloco(bloco) <= 0 || !cursorNoInicioDoBloco(bloco)) return false;
  aplicarNivelRecuo(bloco, nivelRecuoBloco(bloco) - 1);
  guardarSelecaoEditor();
  return true;
}

function blocoEditorAtual() {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return null;
  const origem = selection.anchorNode;
  let node = origem?.nodeType === Node.TEXT_NODE ? origem.parentElement : origem;
  if (!node || (node !== els.atendimentoEditor && !els.atendimentoEditor.contains(node))) return null;
  return node.closest?.("p, div, li, h1, h2, h3, h4, h5, h6") || els.atendimentoEditor;
}

function nivelRecuoBloco(bloco) {
  if (!bloco || bloco === els.atendimentoEditor) return 0;
  const salvo = Number(bloco.dataset.indentLevel || 0);
  if (Number.isFinite(salvo) && salvo > 0) return salvo;
  const recuo = parseFloat(bloco.style.textIndent || bloco.style.marginLeft || "0");
  return recuo ? Math.round(recuo / ATTENDANCE_INDENT_CM) : 0;
}

function aplicarNivelRecuo(bloco, nivel) {
  if (!bloco || bloco === els.atendimentoEditor) return;
  const proximo = Math.max(0, Math.min(8, nivel));
  if (!proximo) {
    bloco.style.textIndent = "";
    bloco.style.marginLeft = "";
    delete bloco.dataset.indentLevel;
    return;
  }
  bloco.dataset.indentLevel = String(proximo);
  bloco.style.textIndent = `${(proximo * ATTENDANCE_INDENT_CM).toFixed(2)}cm`;
  bloco.style.marginLeft = "";
}

function cursorNoInicioDoBloco(bloco) {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0).cloneRange();
  const inicio = range.cloneRange();
  inicio.selectNodeContents(bloco);
  inicio.setEnd(range.startContainer, range.startOffset);
  return inicio.toString().length === 0;
}

function sincronizarAgendaAtendimento() {
  const ativo = els.atendimentoAgendar.checked;
  els.atendimentoAgendaCampo?.classList.toggle("is-hidden", !ativo);
  if (ativo && !els.atendimentoAgendadoEm.value) {
    els.atendimentoAgendadoEm.value = els.atendimentoData.value || agoraLocalInput();
  }
  if (!ativo) els.atendimentoAgendadoEm.value = "";
}

function alternarFocoAtendimento() {
  document.body.classList.toggle("attendance-focus-mode");
  atualizarBotaoFocoAtendimento();
}

function sairFocoAtendimento() {
  document.body.classList.remove("attendance-focus-mode");
  atualizarBotaoFocoAtendimento();
}

function atualizarBotaoFocoAtendimento() {
  const emFoco = document.body.classList.contains("attendance-focus-mode");
  els.btnExpandirAtendimento.textContent = "⛶";
  els.btnExpandirAtendimento.title = emFoco ? "Sair do modo foco" : "Expandir atendimento";
  els.btnExpandirAtendimento.setAttribute("aria-label", emFoco ? "Sair do modo foco" : "Expandir atendimento");
}

function alternarArquivadosAtendimento() {
  state.atendimentoMostrarArquivados = !state.atendimentoMostrarArquivados;
  salvarEstado();
  renderAtendimentos();
}

function alternarArquivoAtendimento(id) {
  const atendimento = state.atendimentos.find((item) => item.id === id);
  if (!atendimento) return;
  atendimento.arquivado = !atendimento.arquivado;
  atendimento.atualizadoEm = new Date().toISOString();
  salvarEstado();
  renderAtendimentos();
}

function transformarAtendimentoEmProcesso() {
  const dados = dadosAtendimentoDoFormulario();
  let atendimento = dados.id ? state.atendimentos.find((item) => item.id === dados.id) : null;
  if (!atendimento || atendimentoAlterado) {
    atendimento = salvarAtendimentoAtual();
    if (!atendimento) return;
    atendimento = state.atendimentos.find((item) => item.id === atendimentoAbertoId);
  }
  if (!atendimento) return;
  if (atendimento.processoId && obterProcesso(atendimento.processoId)) {
    abrirDetalheProcesso(atendimento.processoId);
    return;
  }
  abrirModalProcessoPorAtendimento(atendimento);
}

function modeloAtendimento() {
  return "";
}

function conteudoAtendimentoPreenchido(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  return !!div.textContent.replace(/\u00a0/g, " ").trim();
}

function abrirModalProcessoPorAtendimento(atendimento) {
  const cliente = obterCliente(atendimento.clienteId);
  abrirModalProcesso();
  document.querySelector("#modalProcesso h2").textContent = "Processo a partir do atendimento";
  els.formProcesso.elements.atendimentoOrigemId.value = atendimento.id;
  els.processoClienteBusca.value = cliente?.nome || "";
  els.processoClienteId.value = atendimento.clienteId;
  els.formProcesso.area.value = atendimento.area || state.configs.areas[0] || "";
  els.formProcesso.status.value = state.configs.status.includes("Ativo") ? "Ativo" : state.configs.status[0];
  els.formProcesso.responsavelId.value = atendimento.responsavelId || usuarioAtual()?.id || "";
  els.formProcesso.prazo.value = atendimento.agendadoEm ? atendimento.agendadoEm.slice(0, 10) : somarDiasIso(hojeIso(), 7);
  els.formProcesso.resumo.value = atendimento.assunto || textoPlanoAtendimento(atendimento.conteudoHtml).slice(0, 280);
  els.formProcesso.honorarios.value = "";
  els.formProcesso.recebido.value = "";
}

function textoPlanoAtendimento(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent.replace(/\s+/g, " ").trim();
}

function renderAgenda() {
  const eventos = eventosAgenda().sort((a, b) => new Date(a.data) - new Date(b.data));
  const proximos = eventos.filter((evento) => !evento.concluido).slice(0, 8);
  document.querySelector("#agendaResumo").innerHTML = vazioOu(proximos.slice(0, 6), cardEvento);
  document.querySelector("#agendaLista").innerHTML = vazioOu(proximos, cardEvento);
  state.agendaModo = state.agendaModo || "mes";
  state.agendaDiaSelecionado = state.agendaDiaSelecionado || hojeIso();
  renderModoAgenda();
  renderCalendario(eventos);
  renderDetalheDiaAgenda(state.agendaDiaSelecionado, eventos);
  vincularAberturaProcesso();
  vincularAberturaAtendimentoAgenda();
}

function renderCalendario(eventos) {
  const modo = state.agendaModo || "mes";
  const selecionado = state.agendaDiaSelecionado || hojeIso();
  els.gradeAgenda.className = `calendar-grid calendar-${modo}-mode`;
  els.gradeAgenda.closest(".calendar-shell")?.setAttribute("data-agenda-mode", modo);
  document.querySelector("#tituloMesAgenda").textContent = tituloAgenda(modo, selecionado);

  if (modo === "mes") {
    const ano = mesAgenda.getFullYear();
    const mes = mesAgenda.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const inicio = primeiroDia.getDay();
    const celulas = [];
    for (let i = 0; i < inicio; i++) celulas.push(`<div class="calendar-day empty"></div>`);
    for (let dia = 1; dia <= totalDias; dia++) {
      const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      celulas.push(celulaAgenda(data, eventos));
    }
    els.gradeAgenda.innerHTML = celulas.join("");
    return;
  }

  const datas = modo === "semana" ? datasSemanaAgenda(selecionado) : [selecionado];
  els.gradeAgenda.innerHTML = datas.map((data) => celulaAgenda(data, eventos)).join("");
}

function renderModoAgenda() {
  els.agendaModo.querySelectorAll("[data-agenda-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.agendaMode === (state.agendaModo || "mes"));
  });
}

function tituloMesAgenda(data) {
  return capitalizarPrimeira(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(data));
}

function tituloSemanaAgenda(inicio, fim) {
  const dataInicio = dataLocalAgenda(inicio);
  const dataFim = dataLocalAgenda(fim);
  const mesInicio = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(dataInicio);
  const mesFim = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(dataFim);
  if (dataInicio.getFullYear() === dataFim.getFullYear() && dataInicio.getMonth() === dataFim.getMonth()) {
    return `${dataInicio.getDate()} a ${dataFim.getDate()} de ${mesFim} de ${dataFim.getFullYear()}`;
  }
  if (dataInicio.getFullYear() === dataFim.getFullYear()) {
    return `${dataInicio.getDate()} de ${mesInicio} a ${dataFim.getDate()} de ${mesFim} de ${dataFim.getFullYear()}`;
  }
  return `${dataInicio.getDate()} de ${mesInicio} de ${dataInicio.getFullYear()} a ${dataFim.getDate()} de ${mesFim} de ${dataFim.getFullYear()}`;
}

function capitalizarPrimeira(texto = "") {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
}

function tituloAgenda(modo, dataSelecionada) {
  if (modo === "mes") return tituloMesAgenda(mesAgenda);
  if (modo === "semana") {
    const semana = datasSemanaAgenda(dataSelecionada);
    return tituloSemanaAgenda(semana[0], semana[6]);
  }
  return capitalizarPrimeira(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(dataLocalAgenda(dataSelecionada)));
}

function celulaAgenda(data, eventos) {
  const eventosDia = eventos.filter((evento) => evento.data === data);
  const feriado = feriadoAgenda(data);
  const dia = dataLocalAgenda(data).getDate();
  const selecionado = data === state.agendaDiaSelecionado;
  const limite = state.agendaModo === "mes" ? 3 : 12;
  return `
    <div class="calendar-day ${data === hojeIso() ? "today" : ""} ${selecionado ? "is-selected" : ""} ${feriado ? "is-holiday" : ""}" data-calendar-day="${data}">
      <strong>${dia}</strong>
      ${feriado ? `<button class="holiday-badge" type="button" data-toggle-holiday="${data}" title="Clique para desmarcar como feriado">${escapeHtml(feriado.nome)}</button>` : ""}
      <div class="calendar-events">
        ${eventosDia.slice(0, limite).map((evento) => `
          <button type="button" data-calendar-date="${data}">
            ${escapeHtml(evento.cliente)} · ${escapeHtml(evento.tipo)}
          </button>
        `).join("")}
        ${eventosDia.length > limite ? `<span class="calendar-more">+${eventosDia.length - limite}</span>` : ""}
      </div>
    </div>
  `;
}

function renderDetalheDiaAgenda(data, eventos) {
  if (!els.agendaDetalheDia) return;
  const eventosDia = eventos.filter((evento) => evento.data === data);
  const feriado = feriadoAgenda(data);
  els.agendaDetalheDia.classList.remove("is-hidden");
  els.agendaDetalheDia.innerHTML = `
    <div class="calendar-detail-header">
      <div>
        <span>Dia selecionado</span>
        <strong>${capitalizarPrimeira(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(dataLocalAgenda(data)))}</strong>
      </div>
      <small>${eventosDia.length} compromisso${eventosDia.length !== 1 ? "s" : ""}</small>
    </div>
    ${feriado ? `<button type="button" class="holiday-detail" data-toggle-holiday="${data}">Feriado: ${escapeHtml(feriado.nome)} · clicar para desmarcar</button>` : ""}
    <div class="calendar-detail-list">
      ${eventosDia.length ? eventosDia.map((evento) => `
        <button type="button" class="calendar-detail-item" ${evento.processoId ? `data-detail-open-process="${evento.processoId}"` : `data-detail-open-attendance="${evento.atendimentoId}"`}>
          <strong>${escapeHtml(evento.tipo)} · ${escapeHtml(evento.cliente)}</strong>
          <span>${escapeHtml(evento.processo)} · Responsável: ${escapeHtml(evento.responsavel)}</span>
          <small>${escapeHtml(evento.descricao || "")}</small>
        </button>
      `).join("") : `<p>Nenhum prazo ou atendimento agendado neste dia.</p>`}
    </div>
  `;
}

function mudarModoAgenda(event) {
  const botao = event.target.closest("[data-agenda-mode]");
  if (!botao) return;
  state.agendaModo = botao.dataset.agendaMode;
  state.agendaDiaSelecionado = state.agendaDiaSelecionado || hojeIso();
  mesAgenda = dataLocalAgenda(state.agendaDiaSelecionado);
  salvarEstado();
  renderAgenda();
}

function selecionarDiaAgenda(event) {
  const feriado = event.target.closest("[data-toggle-holiday]");
  if (feriado) {
    abrirPopoverFeriado(feriado.dataset.toggleHoliday, feriado);
    return;
  }
  const alvo = event.target.closest("[data-calendar-date], [data-calendar-day]");
  if (!alvo) return;
  const data = alvo.dataset.calendarDate || alvo.dataset.calendarDay;
  if (!data) return;
  state.agendaDiaSelecionado = data;
  mesAgenda = dataLocalAgenda(data);
  salvarEstado();
  renderAgenda();
}

function abrirModalFeriadoExtra() {
  els.formFeriadoExtra.reset();
  els.agendaFeriadoData.value = state.agendaDiaSelecionado || hojeIso();
  els.modalFeriadoExtra.showModal();
}

function salvarFeriadoExtra(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formFeriadoExtra));
  const inicio = dados.dataInicio;
  const fim = dados.dataFim || dados.dataInicio;
  if (compararDatas(inicio, fim) > 0) {
    alert("A data final precisa ser igual ou posterior à data inicial.");
    return;
  }
  state.feriadosExtras.push({
    id: uid(),
    tipo: dados.tipo,
    nome: dados.nome.trim(),
    dataInicio: inicio,
    dataFim: fim
  });
  salvarEstado();
  els.modalFeriadoExtra.close();
  renderAgenda();
}

function alternarFeriadoAgenda(data) {
  const set = new Set(state.feriadosDesmarcados || []);
  if (set.has(data)) set.delete(data);
  else set.add(data);
  state.feriadosDesmarcados = [...set];
  salvarEstado();
  renderAgenda();
}

function abrirPopoverFeriado(data, ancora) {
  if (!data || !ancora || !els.holidayPopover) return;
  feriadoPendenteData = data;
  const rect = ancora.getBoundingClientRect();
  els.holidayPopover.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 210))}px`;
  els.holidayPopover.style.top = `${rect.bottom + 8}px`;
  els.holidayPopover.classList.remove("is-hidden");
}

function fecharPopoverFeriado() {
  els.holidayPopover?.classList.add("is-hidden");
}

function abrirConfirmacaoFeriado(event) {
  event.preventDefault();
  if (!feriadoPendenteData) return;
  const feriado = feriadoAgenda(feriadoPendenteData);
  els.textoConfirmarFeriado.textContent = feriado
    ? `O dia ${dataCurta(feriadoPendenteData)} deixará de aparecer como "${feriado.nome}" no calendário.`
    : `O dia ${dataCurta(feriadoPendenteData)} deixará de aparecer como feriado no calendário.`;
  fecharPopoverFeriado();
  els.modalConfirmarFeriado.showModal();
}

function confirmarDesmarcarFeriado(event) {
  event.preventDefault();
  if (!feriadoPendenteData) return;
  alternarFeriadoAgenda(feriadoPendenteData);
  feriadoPendenteData = "";
  els.modalConfirmarFeriado.close();
}

function abrirItemDetalheAgenda(event) {
  const feriado = event.target.closest("[data-toggle-holiday]");
  if (feriado) {
    abrirPopoverFeriado(feriado.dataset.toggleHoliday, feriado);
    return;
  }
  const processo = event.target.closest("[data-detail-open-process]");
  if (processo) {
    abrirDetalheProcesso(processo.dataset.detailOpenProcess);
    return;
  }
  const atendimento = event.target.closest("[data-detail-open-attendance]");
  if (atendimento) abrirAtendimentoPorId(atendimento.dataset.detailOpenAttendance);
}

function cardEvento(evento) {
  return `
    <button class="deadline-item ${evento.concluido ? "is-done" : ""}" type="button" ${evento.processoId ? `data-open-process="${evento.processoId}"` : `data-open-attendance-view="${evento.atendimentoId}"`}>
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
    </button>
  `;
}

function renderFinanceiro() {
  const lista = filtrarProcessosFinanceiro();
  const total = lista.reduce((valor, processo) => valor + valorHonorariosLiquido(processo), 0);
  const bruto = soma(lista, "honorarios");
  const recebido = soma(lista, "recebido");
  const descontos = lista.reduce((valor, processo) => valor + totalDescontos(processo), 0);
  const pendente = lista.reduce((valor, processo) => valor + saldoHonorarios(processo), 0);

  document.querySelector("#financeiroResumo").innerHTML = [
    financeCard("Contratado", total, descontos ? `Valor com desconto · bruto ${moeda(bruto)}` : "Total em honorários"),
    financeCard("Recebido", recebido, "Entradas registradas"),
    financeCard("Pendente", pendente, "Valores a receber")
  ].join("");

  document.querySelector("#tabelaFinanceiro").innerHTML = vazioOu(lista, (processo) => {
    const cliente = obterCliente(processo.clienteId);
    return `
      <tr>
        <td>${escapeHtml(cliente?.nome || "")}<br><span class="case-meta">${escapeHtml(processo.numero)}</span></td>
        <td>
          <button class="inline-link" type="button" data-open-contract="${processo.id}">
            ${moeda(valorHonorariosLiquido(processo))}
          </button>
          ${totalDescontos(processo) ? `<br><span class="case-meta">Bruto: ${moeda(processo.honorarios)} · desconto: ${moeda(totalDescontos(processo))}</span>` : ""}
        </td>
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
  document.querySelector("#temaPicker").innerHTML = `
    <button type="button" data-open-themes>
      <span class="swatch ${temaAtual().amostra}"></span>Aparência e temas
    </button>
  `;
  renderModalTemas();

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

function temasDisponiveis() {
  return [
    { id: "classico", nome: "Clássico grafite", amostra: "charcoal", descricao: "Lateral grafite, fundo creme e ícones em creme escuro." },
    { id: "vinho", nome: "Vinho clássico", amostra: "wine", descricao: "Lateral vinho com ícones dourados inspirados na logo." },
    { id: "marinho", nome: "Marinho", amostra: "navy", descricao: "Azul profundo com fundo frio e discreto." },
    { id: "verde", nome: "Verde escritório", amostra: "green", descricao: "Verde fechado, fundo suave e leitura confortável." },
    { id: "dourado", nome: "Dourado sóbrio", amostra: "gold", descricao: "Grafite aquecido, detalhes dourados e fundo elegante." },
    { id: "petroleo", nome: "Petróleo claro", amostra: "teal", descricao: "Azul petróleo, verde suave e contraste calmo." }
  ];
}

function temaAtual() {
  return temasDisponiveis().find((tema) => tema.id === state.tema) || temasDisponiveis()[0];
}

function renderModalTemas() {
  if (!els.temaModalGrid) return;
  els.temaModalGrid.innerHTML = temasDisponiveis().map((tema) => `
    <button type="button" data-theme="${tema.id}" class="theme-card ${state.tema === tema.id ? "is-selected" : ""}">
      <span class="swatch ${tema.amostra}"></span>
      <strong>${tema.nome}</strong>
      <small>${tema.descricao}</small>
      <span class="theme-icon-preview" aria-hidden="true"><span>✎</span><span>◷</span><span>$</span></span>
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
        <span><strong>${moeda(valorHonorariosLiquido(processo))}</strong><small>Honorários com desconto${totalDescontos(processo) ? ` · bruto ${moeda(processo.honorarios)}` : ""}</small></span>
        <span><strong>${moeda(processo.recebido)}</strong><small>Recebido</small></span>
        <span><strong>${moeda(saldoAtual)}</strong><small>Pendente</small></span>
        <button class="ghost-button" type="button" data-open-contract="${processo.id}">Contrato/desconto</button>
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

        <section class="detail-panel detail-form-card movement-form-card">
          <h3>Andamento e providência</h3>
          <form class="stack-form movement-form" data-detail-form="andamento">
            <div class="movement-grid">
              <input name="data" type="date" required value="${hojeIso()}">
              <select name="tipoMovimentacao" required>
                ${state.configs.movimentacoes.map((tipo) => `<option value="${escapeHtml(tipo)}">${escapeHtml(tipo)}</option>`).join("")}
              </select>
            </div>
            <input name="tipoOutro" placeholder="Outro motivo, se precisar">
            <textarea name="descricao" rows="3" required placeholder="Resumo do andamento, publicação, contato ou conferência"></textarea>
            <label class="check-line">
              <input name="gerarPrazo" type="checkbox" value="sim">
              <span>Esta movimentação gera prazo/providência</span>
            </label>
            <div class="movement-deadline">
              <input name="prazoData" type="date" aria-label="Data do prazo">
              <input name="prazoTipo" placeholder="Tipo do prazo/providência">
              <select name="responsavelId">${state.usuarios.map((u) => `<option value="${u.id}" ${u.id === processo.responsavelId ? "selected" : ""}>${escapeHtml(u.nome)}</option>`).join("")}</select>
              <textarea name="prazoDescricao" rows="2" placeholder="Observação da providência, se for diferente do andamento"></textarea>
            </div>
            <button class="primary-button" type="submit">Registrar andamento</button>
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
            ${ordenarPorData(processo.movimentacoes).reverse().map((mov) => {
              const prazoVinculado = processo.prazos.find((prazo) => prazo.id === mov.prazoId);
              return `
                <article>
                  <time>${dataCurta(mov.data)}</time>
                  <div>
                    <strong>${escapeHtml(mov.tipo || "Andamento")}</strong>
                    <p>${escapeHtml(mov.descricao)}</p>
                    ${prazoVinculado ? `<small>Prazo gerado: ${dataCurta(prazoVinculado.data)} · ${escapeHtml(prazoVinculado.tipo)}</small>` : `<small>Sem novo prazo vinculado</small>`}
                  </div>
                </article>
              `;
            }).join("") || "<p>Nenhuma movimentação cadastrada.</p>"}
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

function abrirContratoPorBotao(event) {
  const botao = event.target.closest("[data-open-contract]");
  if (!botao) return;
  event.preventDefault();
  abrirModalContrato(botao.dataset.openContract || "");
}

function abrirModalContrato(id = "") {
  const processos = filtrarProcessosFinanceiro();
  preencherSelect(els.contratoProcesso, processos.map((processo) => {
    const cliente = obterCliente(processo.clienteId);
    return { value: processo.id, label: `${cliente?.nome || "Cliente"} · ${processo.numero}` };
  }));
  const processo = obterProcesso(id) || processos[0];
  if (!processo) return;
  els.formContrato.reset();
  els.contratoProcesso.value = processo.id;
  preencherContratoHonorarios(processo.id);
  if (!els.modalContrato.open) els.modalContrato.showModal();
}

function preencherContratoHonorarios(id) {
  const processo = obterProcesso(id);
  if (!processo) return;
  els.formContrato.honorarios.value = Number(processo.honorarios || 0);
  els.formContrato.descontoHonorarios.value = Number(processo.descontoHonorarios || totalDescontosLegado(processo) || 0);
  els.formContrato.observacaoHonorarios.value = processo.observacaoHonorarios || "";
}

function salvarContratoHonorarios(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formContrato));
  const processo = obterProcesso(dados.processoId);
  if (!processo) return;
  processo.honorarios = Number(String(dados.honorarios || "0").replace(",", "."));
  processo.descontoHonorarios = Number(String(dados.descontoHonorarios || "0").replace(",", "."));
  processo.observacaoHonorarios = dados.observacaoHonorarios.trim();
  processo.descontos = [];
  salvarEstado();
  els.modalContrato.close();
  renderizarTudo();
  if (processoAbertoId === processo.id) abrirDetalheProcesso(processo.id);
  if (els.modalCliente.open && els.formCliente.elements.id.value === processo.clienteId) {
    renderPainelCliente(obterCliente(processo.clienteId));
  }
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
    <button class="receipt-summary-card clickable" type="button" data-open-contract="${processo.id}" title="Abrir contrato/desconto deste processo">
      <span>Contratado</span>
      <strong>${moeda(valorHonorariosLiquido(processo))}</strong>
      <small>Honorários do processo${totalDescontos(processo) ? ` · bruto ${moeda(processo.honorarios)}` : ""}</small>
    </button>
    <article>
      <span>Recebido</span>
      <strong>${moeda(processo.recebido)}</strong>
      <small>${(processo.recebimentos || []).length} lançamento${(processo.recebimentos || []).length !== 1 ? "s" : ""}</small>
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
  if (valor <= 0) {
    alert("Informe o valor recebido.");
    return;
  }
  processo.recebimentos = processo.recebimentos || [];
  processo.recebimentos.push({
    id: uid(),
    valor,
    data: dados.data || hojeIso(),
    forma: dados.forma,
    notaFiscal: dados.notaFiscal,
    observacoes: dados.observacoes.trim()
  });
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

function vincularPainelCliente() {
  document.querySelectorAll("[data-open-client-process]").forEach((elemento) => {
    elemento.onclick = () => {
      els.modalCliente.close();
      abrirDetalheProcesso(elemento.dataset.openClientProcess);
    };
  });
  document.querySelectorAll("[data-open-client-attendance]").forEach((elemento) => {
    elemento.onclick = () => {
      els.modalCliente.close();
      abrirAtendimentoPorId(elemento.dataset.openClientAttendance);
    };
  });
}

function vincularAberturaProcesso() {
  document.querySelectorAll("[data-open-process]").forEach((elemento) => {
    elemento.onclick = () => abrirDetalheProcesso(elemento.dataset.openProcess);
  });
}

function vincularAberturaAtendimentoAgenda() {
  document.querySelectorAll("[data-open-attendance-view]").forEach((elemento) => {
    elemento.onclick = () => abrirAtendimentoPorId(elemento.dataset.openAttendanceView);
  });
}

function abrirAtendimentoPorAgenda(event) {
  const botao = event.target.closest("[data-open-attendance-view]");
  if (!botao) return;
  abrirAtendimentoPorId(botao.dataset.openAttendanceView);
}

function abrirAtendimentoPorId(id) {
  const atendimento = state.atendimentos.find((item) => item.id === id);
  if (!atendimento) return;
  trocarView("atendimentos");
  preencherFormularioAtendimento(atendimento);
}

function pedirExclusaoAtendimento(id) {
  const atendimento = state.atendimentos.find((item) => item.id === id && item.arquivado);
  if (!atendimento) return;
  els.btnConfirmarExcluirAtendimento.dataset.confirmDeleteAttendance = atendimento.id;
  els.textoExcluirAtendimento.textContent = `O atendimento ${rotuloAtendimento(atendimento)} será removido definitivamente. Essa ação não pode ser desfeita.`;
  els.modalExcluirAtendimento.showModal();
}

function confirmarExclusaoAtendimento(event) {
  event?.preventDefault();
  const id = els.btnConfirmarExcluirAtendimento.dataset.confirmDeleteAttendance;
  if (!id) return;
  state.atendimentos = state.atendimentos.filter((atendimento) => atendimento.id !== id);
  if (state.rascunhoAtendimento?.id === id) state.rascunhoAtendimento = null;
  if (atendimentoAbertoId === id) fecharEditorAtendimento();
  delete els.btnConfirmarExcluirAtendimento.dataset.confirmDeleteAttendance;
  salvarEstado();
  els.modalExcluirAtendimento.close();
  renderizarTudo();
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
  const atendimentosAbertos = state.atendimentos.filter((atendimento) => atendimento.clienteId === cliente.id && !atendimento.arquivado && !atendimento.processoId).length;
  return { casos: processos.length, proximoPrazo: prazos.sort()[0] || "", atendimentosAbertos };
}

function pluralAtendimentos(total) {
  return `${total} atendimento${total !== 1 ? "s" : ""}`;
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
  const eventosProcessos = state.processos.flatMap((processo) => {
    const cliente = obterCliente(processo.clienteId);
    return processo.prazos.map((prazo) => {
      const responsavel = obterUsuario(prazo.responsavelId || processo.responsavelId);
      return { ...prazo, processoId: processo.id, processo: processo.numero, cliente: cliente?.nome || "Cliente não informado", responsavel: responsavel?.nome || "" };
    });
  });
  const eventosAtendimentos = state.atendimentos
    .filter((atendimento) => atendimento.agendadoEm && !atendimento.arquivado && !atendimento.processoId)
    .map((atendimento) => {
      const cliente = obterCliente(atendimento.clienteId);
      const responsavel = obterUsuario(atendimento.responsavelId);
      return {
        id: atendimento.id,
        atendimentoId: atendimento.id,
        data: atendimento.agendadoEm.slice(0, 10),
        tipo: "Atendimento",
        descricao: atendimento.assunto || "Atendimento agendado.",
        processo: "Atendimento sem processo",
        cliente: cliente?.nome || "Cliente não informado",
        responsavel: responsavel?.nome || "",
        concluido: false
      };
    });
  return [...eventosProcessos, ...eventosAtendimentos];
}

function feriadoAgenda(data) {
  if ((state.feriadosDesmarcados || []).includes(data)) return null;
  const ano = dataLocalAgenda(data).getFullYear();
  const nacionais = feriadosNacionaisBrasil(ano);
  const fixo = nacionais.find((feriado) => feriado.data === data);
  if (fixo) return { ...fixo, tipo: "Feriado nacional" };
  const extra = (state.feriadosExtras || []).find((feriado) => compararDatas(data, feriado.dataInicio) >= 0 && compararDatas(data, feriado.dataFim) <= 0);
  return extra ? { data, nome: extra.nome, tipo: extra.tipo } : null;
}

function feriadosNacionaisBrasil(ano) {
  const pascoa = calcularPascoa(ano);
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);
  return [
    ...FERIADOS_FIXOS_BRASIL.map((feriado) => ({
      data: `${ano}-${String(feriado.mes).padStart(2, "0")}-${String(feriado.dia).padStart(2, "0")}`,
      nome: feriado.nome
    })),
    { data: isoLocalAgenda(sextaSanta), nome: "Sexta-feira Santa" }
  ];
}

function calcularPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
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
  const modo = state.agendaModo || "mes";
  if (modo === "semana" || modo === "dia") {
    const base = dataLocalAgenda(state.agendaDiaSelecionado || hojeIso());
    base.setDate(base.getDate() + delta * (modo === "semana" ? 7 : 1));
    state.agendaDiaSelecionado = isoLocalAgenda(base);
    mesAgenda = new Date(base.getFullYear(), base.getMonth(), 1);
    salvarEstado();
    renderAgenda();
    return;
  }
  mesAgenda = new Date(mesAgenda.getFullYear(), mesAgenda.getMonth() + delta, 1);
  state.agendaDiaSelecionado = isoLocalAgenda(mesAgenda);
  salvarEstado();
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
  if (event.target.closest("[data-open-themes]")) {
    renderModalTemas();
    els.modalTema.showModal();
    return;
  }
  const botao = event.target.closest("[data-theme]");
  if (!botao) return;
  state.tema = botao.dataset.theme;
  salvarEstado();
  aplicarTema();
  renderConfiguracoes();
  if (els.modalTema.open) els.modalTema.close();
}

async function forcarAtualizacao() {
  try {
    if ("serviceWorker" in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registros.map((registro) => registro.unregister()));
    }
    if ("caches" in window) {
      const nomes = await caches.keys();
      await Promise.all(nomes.map((nome) => caches.delete(nome)));
    }
  } catch {
    // A atualização por URL ainda resolve quando o navegador não expõe cache/service worker.
  }
  const base = window.location.href.split("#")[0].split("?")[0];
  window.location.replace(`${base}?v=${APP_VERSION}-${Date.now()}`);
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
  const salvo = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
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
    orgaos: orgaosSalvos.length ? orgaosSalvos.map(migrarTextoParaPb) : padrao.configs.orgaos,
    movimentacoes: raw.configs?.movimentacoes?.length ? raw.configs.movimentacoes : padrao.configs.movimentacoes
  };
  if (!estado.configs.orgaos.length) estado.configs.orgaos = padrao.configs.orgaos;
  estado.configs.status = estado.configs.status.map(migrarTextoParaPb);
  estado.configs.areas = estado.configs.areas.map(migrarTextoParaPb);
  estado.configs.movimentacoes = estado.configs.movimentacoes.map(migrarTextoParaPb);
  estado.avancadas = {
    googleScriptUrl: raw.avancadas?.googleScriptUrl || "",
    observacoesTecnicas: raw.avancadas?.observacoesTecnicas || ""
  };
  estado.clienteModo = estado.clienteModo || "cards";
  estado.clienteOrdenacao = estado.clienteOrdenacao || "nome";
  estado.atendimentoMostrarArquivados = !!estado.atendimentoMostrarArquivados;
  estado.sidebarRecolhida = !!estado.sidebarRecolhida;
  estado.agendaModo = ["mes", "semana", "dia"].includes(raw.agendaModo) ? raw.agendaModo : "mes";
  estado.agendaDiaSelecionado = raw.agendaDiaSelecionado || hojeIso();
  estado.feriadosDesmarcados = Array.isArray(raw.feriadosDesmarcados) ? raw.feriadosDesmarcados : [];
  estado.feriadosExtras = Array.isArray(raw.feriadosExtras) ? raw.feriadosExtras.map((feriado) => ({
    id: feriado.id || uid(),
    tipo: feriado.tipo || "Feriado extra",
    nome: feriado.nome || "Feriado extra",
    dataInicio: feriado.dataInicio || feriado.data || hojeIso(),
    dataFim: feriado.dataFim || feriado.dataInicio || feriado.data || hojeIso()
  })) : [];
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
  normalizarNumeracaoAtendimentos(estado.atendimentos);
  estado.rascunhoAtendimento = raw.rascunhoAtendimento ? normalizarAtendimento(raw.rascunhoAtendimento) : null;
  if (estado.rascunhoAtendimento?.id && !estado.rascunhoAtendimento.numero) {
    estado.rascunhoAtendimento.numero = estado.atendimentos.find((atendimento) => atendimento.id === estado.rascunhoAtendimento.id)?.numero || "";
  }
  estado.processos = (estado.processos || []).map((processo) => normalizarProcesso(processo, estado));
  estado.usuarioAtivoId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SESSION_KEY) : null;
  salvarEstadoNormalizado(estado);
  return estado;
}

function normalizarAtendimento(atendimento = {}) {
  return {
    id: atendimento.id || "",
    numero: atendimento.numero || "",
    criadoEm: atendimento.criadoEm || hojeIso(),
    salvoEm: atendimento.salvoEm || "",
    atualizadoEm: atendimento.atualizadoEm || atendimento.salvoEm || "",
    clienteId: atendimento.clienteId || "",
    area: atendimento.area || "",
    responsavelId: atendimento.responsavelId || "",
    data: atendimento.data || agoraLocalInput(),
    agendar: atendimento.agendadoEm ? "sim" : (atendimento.agendar || "nao"),
    agendadoEm: atendimento.agendadoEm || "",
    assunto: atendimento.assunto || "",
    conteudoHtml: atendimento.conteudoHtml || "",
    anexos: Array.isArray(atendimento.anexos) ? atendimento.anexos.map(normalizarAnexoAtendimento).filter((anexo) => anexo.nome) : [],
    processoId: atendimento.processoId || "",
    arquivado: !!atendimento.arquivado,
    versoes: (atendimento.versoes || []).slice(0, 3).map((versao) => ({
      id: versao.id || uid(),
      assunto: versao.assunto || "",
      conteudoHtml: versao.conteudoHtml || "",
      salvoEm: versao.salvoEm || hojeIso()
    }))
  };
}

function normalizarAnexoAtendimento(anexo = {}) {
  return {
    id: anexo.id || uid(),
    nome: anexo.nome || anexo.name || "",
    tipo: anexo.tipo || anexo.type || "application/octet-stream",
    tamanho: Number(anexo.tamanho || anexo.size || 0),
    dataUrl: anexo.dataUrl || anexo.url || "",
    adicionadoEm: anexo.adicionadoEm || hojeIso()
  };
}

function normalizarNumeracaoAtendimentos(atendimentos) {
  let maiorNumero = Math.max(0, ...atendimentos.map((atendimento) => Number(atendimento.numero || 0)).filter((numero) => Number.isFinite(numero)));
  atendimentos.forEach((atendimento) => {
    if (!atendimento.numero) {
      maiorNumero += 1;
      atendimento.numero = String(maiorNumero).padStart(4, "0");
    }
  });
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
    descontoHonorarios: Number(processo.descontoHonorarios || 0),
    observacaoHonorarios: processo.observacaoHonorarios || "",
    descontos,
    resumo: migrarTextoParaPb(processo.resumo || ""),
    prazos,
    atendimentos: processo.atendimentos || [],
    movimentacoes: (processo.movimentacoes?.length ? processo.movimentacoes : [{ id: uid(), data: hojeIso(), tipo: "Histórico", descricao: "Registro importado da versão anterior." }]).map((mov) => ({
      id: mov.id || uid(),
      data: mov.data || hojeIso(),
      tipo: migrarTextoParaPb(mov.tipo || "Andamento"),
      descricao: migrarTextoParaPb(mov.descricao || ""),
      prazoId: mov.prazoId || ""
    }))
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
    atendimentoMostrarArquivados: false,
    sidebarRecolhida: false,
    agendaModo: "mes",
    agendaDiaSelecionado: hojeIso(),
    feriadosDesmarcados: [],
    feriadosExtras: [],
    rascunhoAtendimento: null,
    avancadas: {
      googleScriptUrl: "",
      observacoesTecnicas: ""
    },
    usuarios,
    configs: {
      status: ["Ativo", "Aguardando audiência", "Recurso", "Suspenso", "Encerrado"],
      areas: ["Cível", "Trabalhista", "Família", "Empresarial", "Previdenciário"],
      orgaos: ["1ª Vara Cível de João Pessoa", "2ª Vara Empresarial de João Pessoa", "3ª Vara de Família de João Pessoa", "12ª Vara do Trabalho de João Pessoa", "Fórum Cível Des. Mário Moacyr Porto", "TRT 13ª Região", "Justiça Federal da Paraíba"],
      movimentacoes: ["Intimação/publicação", "Despacho", "Decisão", "Sentença", "Audiência designada", "Petição protocolada", "Juntada de documentos", "Vista/carga", "Contato com cliente", "Sem movimentação externa", "Outro"]
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
    descontoHonorarios: 0,
    observacaoHonorarios: "",
    descontos: [],
    resumo,
    atendimentos: [],
    prazos: prazos.map((item) => ({ id: uid(), concluido: false, ...item })),
    movimentacoes: [
      { id: uid(), data: "2026-05-18", tipo: "Andamento conferido", descricao: "Movimentação registrada e conferida pela equipe." },
      { id: uid(), data: "2026-05-12", tipo: "Juntada de documentos", descricao: "Documentos anexados ao acompanhamento interno." }
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

function rotuloAtendimento(atendimento = {}) {
  return atendimento.numero ? `#${String(atendimento.numero).padStart(4, "0")}` : "#----";
}

function proximoNumeroAtendimento() {
  const numeros = state.atendimentos
    .map((atendimento) => Number(atendimento.numero || 0))
    .filter((numero) => Number.isFinite(numero));
  return String(Math.max(0, ...numeros) + 1).padStart(4, "0");
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

function financeCard(label, value, caption, action = "") {
  const attrs = action ? `${action}="" type="button"` : "";
  const tag = action ? "button" : "article";
  return `<${tag} class="finance-card ${action ? "clickable" : ""}" ${attrs}><span>${label}</span><strong>${moeda(value)}</strong><p>${caption}</p></${tag}>`;
}

function recalcularRecebido(processo) {
  processo.recebido = soma(processo.recebimentos || [], "valor");
}

function valorHonorariosLiquido(processo) {
  return Math.max(0, Number(processo.honorarios || 0) - totalDescontos(processo));
}

function saldoHonorarios(processo) {
  return Math.max(0, valorHonorariosLiquido(processo) - Number(processo.recebido || 0));
}

function totalDescontos(processo) {
  return Number(processo.descontoHonorarios || 0) + totalDescontosLegado(processo);
}

function totalDescontosLegado(processo) {
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

function alternarMenuExportarAtendimento(event) {
  event.preventDefault();
  els.menuExportarAtendimento?.classList.toggle("is-hidden");
}

function fecharMenuExportarAtendimento() {
  els.menuExportarAtendimento?.classList.add("is-hidden");
}

function exportarAtendimentoPeloMenu(event) {
  const botao = event.target.closest("[data-export-attendance]");
  if (!botao) return;
  fecharMenuExportarAtendimento();
  if (botao.dataset.exportAttendance === "docx") exportarAtendimentoDocx();
  if (botao.dataset.exportAttendance === "pdf") imprimirAtendimentoAtual({ titulo: "Exportar PDF" });
}

function nomeArquivoAtendimento(extensao) {
  const dados = dadosAtendimentoDoFormulario();
  const cliente = normalizar(obterCliente(dados.clienteId)?.nome || "atendimento").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "atendimento";
  return `atendimento-${cliente}-${String(dados.data || hojeIso()).slice(0, 10)}.${extensao}`;
}

function htmlAtendimentoExportacao() {
  const dados = dadosAtendimentoDoFormulario();
  const cliente = obterCliente(dados.clienteId);
  const responsavel = obterUsuario(dados.responsavelId);
  const linha = (rotulo, valor) => `<div><strong>${rotulo}</strong><span>${escapeHtml(valor || "-")}</span></div>`;
  const conteudo = dados.conteudoHtml?.trim() || "<p></p>";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(dados.assunto || "Atendimento")}</title>
<style>
  @page { size: A4; margin: 2cm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #202124; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.45; }
  header { padding-bottom: 14px; margin-bottom: 18px; border-bottom: 2px solid #c59a46; }
  h1 { margin: 0 0 12px; font-size: 18pt; color: #2f3032; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
  .meta div { display: grid; gap: 2px; }
  .meta strong { color: #6f5d45; font-size: 9pt; text-transform: uppercase; }
  .meta span { color: #202124; }
  main img { max-width: 100%; height: auto; }
  p { margin: 0 0 10px; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ddd; padding: 6px; }
</style>
</head>
<body>
<header>
  <h1>Atendimento</h1>
  <section class="meta">
    ${linha("Cliente", cliente?.nome)}
    ${linha("Área", dados.area)}
    ${linha("Data", dataHoraCurta(dados.data))}
    ${linha("Responsável", responsavel?.nome)}
    ${linha("Assunto", dados.assunto)}
  </section>
</header>
<main>${conteudo}</main>
</body>
</html>`;
}

function imprimirAtendimentoAtual({ titulo = "Imprimir atendimento" } = {}) {
  const janela = window.open("", "_blank", "noopener,noreferrer");
  if (!janela) {
    alert("Permita pop-ups para imprimir ou exportar em PDF.");
    return;
  }
  const html = htmlAtendimentoExportacao().replace("<title>", `<title>${escapeHtml(titulo)} - `);
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  setTimeout(() => {
    janela.focus();
    janela.print();
  }, 350);
}

function exportarAtendimentoDocx() {
  const html = htmlAtendimentoExportacao();
  const entradas = [
    { nome: "[Content_Types].xml", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="html" ContentType="text/html"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { nome: "_rels/.rels", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { nome: "word/document.xml", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:altChunk r:id="htmlChunk"/><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>` },
    { nome: "word/_rels/document.xml.rels", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.html"/></Relationships>` },
    { nome: "word/afchunk.html", conteudo: html }
  ];
  baixarBlob(new Blob([criarZipSemCompressao(entradas)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), nomeArquivoAtendimento("docx"));
}

function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function criarZipSemCompressao(entradas) {
  const encoder = new TextEncoder();
  const partes = [];
  const central = [];
  let offset = 0;
  entradas.forEach((entrada) => {
    const nome = encoder.encode(entrada.nome);
    const dados = typeof entrada.conteudo === "string" ? encoder.encode(entrada.conteudo) : entrada.conteudo;
    const crc = crc32(dados);
    const local = zipHeaderLocal(nome, dados.length, crc);
    partes.push(local, dados);
    central.push(zipHeaderCentral(nome, dados.length, crc, offset));
    offset += local.length + dados.length;
  });
  const centralOffset = offset;
  const centralSize = central.reduce((soma, item) => soma + item.length, 0);
  const fim = zipHeaderFim(entradas.length, centralSize, centralOffset);
  return unirBytes([...partes, ...central, fim]);
}

function zipHeaderLocal(nome, tamanho, crc) {
  const bytes = new Uint8Array(30 + nome.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, tamanho, true);
  view.setUint32(22, tamanho, true);
  view.setUint16(26, nome.length, true);
  bytes.set(nome, 30);
  return bytes;
}

function zipHeaderCentral(nome, tamanho, crc, offset) {
  const bytes = new Uint8Array(46 + nome.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, tamanho, true);
  view.setUint32(24, tamanho, true);
  view.setUint16(28, nome.length, true);
  view.setUint32(42, offset, true);
  bytes.set(nome, 46);
  return bytes;
}

function zipHeaderFim(total, tamanhoCentral, offsetCentral) {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, total, true);
  view.setUint16(10, total, true);
  view.setUint32(12, tamanhoCentral, true);
  view.setUint32(16, offsetCentral, true);
  return bytes;
}

function unirBytes(lista) {
  const tamanho = lista.reduce((soma, item) => soma + item.length, 0);
  const saida = new Uint8Array(tamanho);
  let offset = 0;
  lista.forEach((item) => {
    saida.set(item, offset);
    offset += item.length;
  });
  return saida;
}

function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
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

function textoParaHtml(texto = "") {
  const limpo = String(texto || "").trim();
  if (!limpo) return "";
  return limpo.split(/\n{2,}/).map((paragrafo) => `<p>${escapeHtml(paragrafo).replace(/\n/g, "<br>")}</p>`).join("");
}

function somarDiasIso(data, dias) {
  const base = new Date(`${String(data).slice(0, 10)}T00:00:00`);
  base.setDate(base.getDate() + dias);
  return base.toISOString().slice(0, 10);
}

function dataLocalAgenda(data) {
  const [ano, mes, dia] = String(data || hojeIso()).slice(0, 10).split("-").map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

function isoLocalAgenda(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function datasSemanaAgenda(data) {
  const inicio = dataLocalAgenda(data);
  inicio.setDate(inicio.getDate() - inicio.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + index);
    return isoLocalAgenda(dia);
  });
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
