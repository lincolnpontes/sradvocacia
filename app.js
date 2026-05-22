const APP_VERSION = "1.0.1";
const STORAGE_KEY = "sr-advocacia-gestao-juridica-v101";

const state = carregarEstado();
let viewAtual = "dashboard";
let mesAgenda = new Date();
let processoAbertoId = null;

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
  filtroArea: document.querySelector("#filtroArea"),
  filtroStatus: document.querySelector("#filtroStatus"),
  modalProcesso: document.querySelector("#modalProcesso"),
  modalCliente: document.querySelector("#modalCliente"),
  modalDetalhe: document.querySelector("#modalDetalheProcesso"),
  formProcesso: document.querySelector("#formProcesso"),
  formCliente: document.querySelector("#formCliente"),
  detalheConteudo: document.querySelector("#detalheConteudo")
};

iniciar();

function iniciar() {
  aplicarTema();
  popularLogin();
  configurarEventos();
  atualizarPerfil();
  renderizarTudo();

  if (state.usuarioAtivoId) {
    mostrarApp();
  } else {
    mostrarLogin();
  }
}

function configurarEventos() {
  els.formLogin.addEventListener("submit", entrar);
  document.querySelector("#btnSair").addEventListener("click", sair);
  els.brandButton.addEventListener("click", alternarMenuMarca);
  els.brandButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      alternarMenuMarca();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".brand-wrap")) fecharMenuMarca();
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => trocarView(button.dataset.view));
  });

  document.querySelectorAll("[data-view-shortcut]").forEach((button) => {
    button.addEventListener("click", () => {
      trocarView(button.dataset.viewShortcut);
      fecharMenuMarca();
    });
  });

  document.querySelector("[data-open-client]").addEventListener("click", abrirModalCliente);
  els.btnNovo.addEventListener("click", acaoPrincipal);
  document.querySelector("#btnExportar").addEventListener("click", exportarDados);
  document.querySelector("#mesAnterior").addEventListener("click", () => mudarMes(-1));
  document.querySelector("#mesProximo").addEventListener("click", () => mudarMes(1));
  document.querySelector("#btnFecharDetalhe").addEventListener("click", () => els.modalDetalhe.close());
  document.addEventListener("click", fecharDialogo);

  els.busca.addEventListener("input", renderizarTudo);
  els.filtroArea.addEventListener("change", renderizarTudo);
  els.filtroStatus.addEventListener("change", renderizarTudo);
  els.formCliente.addEventListener("submit", salvarCliente);
  els.formProcesso.addEventListener("submit", salvarProcesso);
  document.querySelector("#formUsuario").addEventListener("submit", salvarUsuario);
  document.querySelector("#settingsLists").addEventListener("submit", adicionarConfig);
  document.querySelector("#settingsLists").addEventListener("click", removerConfig);
  document.querySelector("#temaPicker").addEventListener("click", escolherTema);
  document.querySelector("#listaUsuarios").addEventListener("click", removerUsuario);
  els.detalheConteudo.addEventListener("submit", salvarItemProcesso);
  els.detalheConteudo.addEventListener("click", concluirPrazo);
}

function entrar(event) {
  event.preventDefault();
  const usuario = state.usuarios.find((item) => item.id === els.loginUsuario.value);
  if (!usuario) return;
  state.usuarioAtivoId = usuario.id;
  salvarEstado();
  atualizarPerfil();
  mostrarApp();
}

function sair() {
  state.usuarioAtivoId = null;
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
}

function acaoPrincipal() {
  if (viewAtual === "clientes") {
    abrirModalCliente();
    return;
  }
  abrirModalProcesso();
}

function abrirModalCliente() {
  els.formCliente.reset();
  els.modalCliente.showModal();
}

function abrirModalProcesso() {
  els.formProcesso.reset();
  popularSelectsProcesso();
  els.formProcesso.prazo.value = hojeIso();
  els.modalProcesso.showModal();
}

function salvarCliente(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formCliente));
  state.clientes.unshift({
    id: uid(),
    nome: dados.nome.trim(),
    cpf: dados.cpf.trim(),
    email: dados.email.trim(),
    whatsapp: dados.whatsapp.trim(),
    observacoes: dados.observacoes.trim()
  });
  salvarEstado();
  els.modalCliente.close();
  trocarView("clientes");
}

function salvarProcesso(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formProcesso));
  state.processos.unshift({
    id: uid(),
    numero: dados.numero.trim(),
    clienteId: dados.clienteId,
    area: dados.area,
    status: dados.status,
    vara: dados.vara,
    forum: dados.forum,
    prazo: dados.prazo,
    responsavelId: dados.responsavelId,
    honorarios: Number(dados.honorarios || 0),
    recebido: Number(dados.recebido || 0),
    resumo: dados.resumo.trim(),
    prazos: [
      {
        id: uid(),
        data: dados.prazo,
        tipo: "Prazo inicial",
        descricao: "Prazo cadastrado na abertura do processo.",
        concluido: false
      }
    ],
    movimentacoes: [
      {
        id: uid(),
        data: hojeIso(),
        descricao: "Processo cadastrado no sistema."
      }
    ]
  });
  salvarEstado();
  els.modalProcesso.close();
  trocarView("processos");
}

function fecharDialogo(event) {
  const button = event.target.closest("[data-close-dialog]");
  if (!button) return;
  button.closest("dialog")?.close();
}

function salvarUsuario(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const dados = Object.fromEntries(new FormData(form));
  const nome = dados.nome.trim();
  if (!nome) return;
  state.usuarios.push({ id: uid(), nome, email: dados.email.trim() });
  form.reset();
  salvarEstado();
  popularLogin();
  renderConfiguracoes();
}

function adicionarConfig(event) {
  const form = event.target.closest("[data-config-form]");
  if (!form) return;
  event.preventDefault();
  const chave = form.dataset.configForm;
  const valor = new FormData(form).get("valor").trim();
  if (valor && !state.configs[chave].includes(valor)) {
    state.configs[chave].push(valor);
    salvarEstado();
    renderizarTudo();
  }
  form.reset();
}

function removerConfig(event) {
  const button = event.target.closest("[data-remove-config]");
  if (!button) return;
  const chave = button.dataset.removeConfig;
  const valor = button.dataset.value;
  if (state.configs[chave].length <= 1) return;
  state.configs[chave] = state.configs[chave].filter((item) => item !== valor);
  salvarEstado();
  renderizarTudo();
}

function escolherTema(event) {
  const button = event.target.closest("[data-theme]");
  if (!button) return;
  state.tema = button.dataset.theme;
  salvarEstado();
  aplicarTema();
  renderConfiguracoes();
}

function removerUsuario(event) {
  const button = event.target.closest("[data-remove-user]");
  if (!button || state.usuarios.length <= 1) return;
  const id = button.dataset.removeUser;
  state.usuarios = state.usuarios.filter((usuario) => usuario.id !== id);
  if (state.usuarioAtivoId === id) state.usuarioAtivoId = state.usuarios[0]?.id || null;
  state.processos.forEach((processo) => {
    if (processo.responsavelId === id) processo.responsavelId = state.usuarios[0]?.id || "";
  });
  salvarEstado();
  popularLogin();
  atualizarPerfil();
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
      concluido: false
    });
    processo.prazo = proximoPrazoDoProcesso(processo);
  }

  if (form.dataset.detailForm === "movimentacao") {
    processo.movimentacoes.unshift({
      id: uid(),
      data: dados.data,
      descricao: dados.descricao.trim()
    });
  }

  form.reset();
  salvarEstado();
  abrirDetalheProcesso(processo.id);
  renderizarTudo();
}

function concluirPrazo(event) {
  const button = event.target.closest("[data-toggle-prazo]");
  if (!button) return;
  const processo = obterProcesso(processoAbertoId);
  if (!processo) return;
  const prazo = processo.prazos.find((item) => item.id === button.dataset.togglePrazo);
  if (!prazo) return;
  prazo.concluido = !prazo.concluido;
  processo.prazo = proximoPrazoDoProcesso(processo);
  salvarEstado();
  abrirDetalheProcesso(processo.id);
  renderizarTudo();
}

function trocarView(view) {
  viewAtual = view;
  const labels = {
    dashboard: "Painel",
    processos: "Processos",
    clientes: "Clientes",
    agenda: "Agenda",
    financeiro: "Honorários",
    configuracoes: "Configurações"
  };

  els.viewTitle.textContent = labels[view] || "Painel";
  els.btnNovoTexto.textContent = view === "clientes" ? "Novo cliente" : "Novo processo";
  els.btnNovo.classList.toggle("is-hidden", view === "configuracoes" || view === "agenda");

  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-visible", section.id === `view-${view}`);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  renderizarTudo();
}

function renderizarTudo() {
  popularFiltros();
  renderMetricas();
  renderProcessosDestaque();
  renderTabelaProcessos();
  renderClientes();
  renderAgenda();
  renderFinanceiro();
  renderConfiguracoes();
}

function renderMetricas() {
  const processosAtivos = state.processos.filter((processo) => processo.status !== "Encerrado").length;
  const prazosCriticos = eventosAgenda().filter((evento) => !evento.concluido && diasAte(evento.data) <= 3).length;
  const recebido = soma(state.processos, "recebido");
  const pendente = soma(state.processos, "honorarios") - recebido;

  document.querySelector("#metricas").innerHTML = [
    metricCard("Processos ativos", processosAtivos, "Carteira em andamento"),
    metricCard("Clientes", state.clientes.length, "Cadastros no escritório"),
    metricCard("Prazos críticos", prazosCriticos, "Vencidos ou até 3 dias"),
    metricCard("A receber", moeda(pendente), "Honorários pendentes")
  ].join("");

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
            <div class="case-meta">${escapeHtml(processo.numero)} · ${escapeHtml(processo.vara)}</div>
          </div>
          ${badgePrazo(processo)}
        </div>
        <p>${escapeHtml(processo.resumo || "Sem resumo cadastrado.")}</p>
        <div class="case-meta">${escapeHtml(processo.area)} · ${escapeHtml(processo.status)} · ${escapeHtml(responsavel?.nome || "")}</div>
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
        <td><strong>${escapeHtml(processo.numero)}</strong><br><span class="case-meta">${escapeHtml(processo.vara)}</span></td>
        <td>${escapeHtml(cliente?.nome || "")}<br><span class="case-meta">${escapeHtml(cliente?.cpf || "")}</span></td>
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
  const termo = normalizar(els.busca.value);
  const clientes = state.clientes.filter((cliente) => {
    return !termo || normalizar([cliente.nome, cliente.cpf, cliente.email, cliente.whatsapp, cliente.observacoes].join(" ")).includes(termo);
  });

  document.querySelector("#listaClientes").innerHTML = vazioOu(clientes, (cliente) => {
    const processos = state.processos.filter((processo) => processo.clienteId === cliente.id);
    return `
      <article class="client-card">
        <div class="client-top">
          <strong>${escapeHtml(cliente.nome)}</strong>
          <span class="badge">${processos.length} caso${processos.length !== 1 ? "s" : ""}</span>
        </div>
        <div class="client-meta">${escapeHtml(cliente.cpf)}</div>
        <div class="client-lines">
          <span>${escapeHtml(cliente.email || "E-mail não informado")}</span>
          <span>${escapeHtml(cliente.whatsapp || "Whatsapp não informado")}</span>
        </div>
        <p>${escapeHtml(cliente.observacoes || "Sem observações.")}</p>
      </article>
    `;
  });
}

function renderAgenda() {
  const eventos = eventosAgenda().sort((a, b) => new Date(a.data) - new Date(b.data));
  const proximos = eventos.filter((evento) => !evento.concluido).slice(0, 8);
  const resumo = proximos.slice(0, 6);
  document.querySelector("#agendaResumo").innerHTML = vazioOu(resumo, cardEvento);
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
      <div class="deadline-meta">${escapeHtml(evento.processo)} · ${escapeHtml(evento.descricao)}</div>
    </article>
  `;
}

function renderFinanceiro() {
  const lista = filtrarProcessos();
  const total = soma(lista, "honorarios");
  const recebido = soma(lista, "recebido");
  const pendente = total - recebido;

  document.querySelector("#financeiroResumo").innerHTML = [
    financeCard("Contratado", total, "Total em honorários"),
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
        <td>${moeda((processo.honorarios || 0) - (processo.recebido || 0))}</td>
      </tr>
    `;
  });
}

function renderConfiguracoes() {
  const temas = [
    { id: "classico", nome: "Clássico", amostra: "wine" },
    { id: "marinho", nome: "Marinho", amostra: "navy" },
    { id: "verde", nome: "Verde", amostra: "green" }
  ];

  document.querySelector("#temaPicker").innerHTML = temas.map((tema) => `
    <button type="button" data-theme="${tema.id}" class="${state.tema === tema.id ? "is-selected" : ""}">
      <span class="swatch ${tema.amostra}"></span>
      ${tema.nome}
    </button>
  `).join("");

  const listas = [
    { chave: "status", titulo: "Status" },
    { chave: "areas", titulo: "Áreas" },
    { chave: "varas", titulo: "Varas" },
    { chave: "foruns", titulo: "Fóruns" }
  ];

  document.querySelector("#settingsLists").innerHTML = listas.map((lista) => `
    <section class="config-list">
      <h3>${lista.titulo}</h3>
      <form class="inline-form compact-form" data-config-form="${lista.chave}">
        <input name="valor" required placeholder="Adicionar ${lista.titulo.toLowerCase()}">
        <button class="ghost-button" type="submit">Adicionar</button>
      </form>
      <div class="pill-list">
        ${state.configs[lista.chave].map((valor) => `
          <span class="pill">
            ${escapeHtml(valor)}
            <button type="button" data-remove-config="${lista.chave}" data-value="${escapeHtml(valor)}" title="Remover">×</button>
          </span>
        `).join("")}
      </div>
    </section>
  `).join("");

  document.querySelector("#listaUsuarios").innerHTML = state.usuarios.map((usuario) => `
    <div class="user-row">
      <span class="user-avatar">${escapeHtml(inicial(usuario.nome))}</span>
      <div>
        <strong>${escapeHtml(usuario.nome)}</strong>
        <small>${escapeHtml(usuario.email || "Sem e-mail")}</small>
      </div>
      <button class="icon-button subtle" type="button" data-remove-user="${usuario.id}" title="Remover usuário">×</button>
    </div>
  `).join("");
}

function abrirDetalheProcesso(id) {
  const processo = obterProcesso(id);
  if (!processo) return;
  processoAbertoId = id;

  const cliente = obterCliente(processo.clienteId);
  const responsavel = obterUsuario(processo.responsavelId);
  document.querySelector("#detalheTitulo").textContent = processo.numero;
  els.detalheConteudo.innerHTML = `
    <div class="process-detail">
      <section class="detail-summary">
        <div>
          <p class="eyebrow">Cliente</p>
          <h3>${escapeHtml(cliente?.nome || "Cliente não informado")}</h3>
          <p>${escapeHtml(cliente?.cpf || "")} · ${escapeHtml(cliente?.whatsapp || "Whatsapp não informado")}</p>
        </div>
        ${badgeStatus(processo.status)}
      </section>

      <div class="detail-grid">
        <section>
          <h3>Dados do processo</h3>
          <dl>
            <dt>Área</dt><dd>${escapeHtml(processo.area)}</dd>
            <dt>Vara</dt><dd>${escapeHtml(processo.vara)}</dd>
            <dt>Fórum</dt><dd>${escapeHtml(processo.forum)}</dd>
            <dt>Responsável</dt><dd>${escapeHtml(responsavel?.nome || "")}</dd>
            <dt>Honorários</dt><dd>${moeda(processo.honorarios)}</dd>
          </dl>
          <p>${escapeHtml(processo.resumo || "Sem resumo cadastrado.")}</p>
        </section>

        <section>
          <h3>Novo prazo</h3>
          <form class="stack-form" data-detail-form="prazo">
            <input name="data" type="date" required>
            <input name="tipo" required placeholder="Tipo do prazo">
            <textarea name="descricao" rows="3" required placeholder="Descrição"></textarea>
            <button class="primary-button" type="submit">Adicionar prazo</button>
          </form>
        </section>

        <section>
          <h3>Prazos</h3>
          <div class="mini-list">
            ${ordenarPorData(processo.prazos).map((prazo) => `
              <div class="${prazo.concluido ? "is-done" : ""}">
                <button class="mini-check" type="button" data-toggle-prazo="${prazo.id}" title="Marcar prazo">${prazo.concluido ? "✓" : ""}</button>
                <div>
                  <strong>${dataCurta(prazo.data)} · ${escapeHtml(prazo.tipo)}</strong>
                  <span>${escapeHtml(prazo.descricao)}</span>
                </div>
              </div>
            `).join("") || "<p>Nenhum prazo cadastrado.</p>"}
          </div>
        </section>

        <section>
          <h3>Nova movimentação</h3>
          <form class="stack-form" data-detail-form="movimentacao">
            <input name="data" type="date" required value="${hojeIso()}">
            <textarea name="descricao" rows="4" required placeholder="Descrição da movimentação"></textarea>
            <button class="primary-button" type="submit">Adicionar movimentação</button>
          </form>
        </section>

        <section class="span-2">
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
      </div>
    </div>
  `;

  els.modalDetalhe.showModal();
}

function vincularAberturaProcesso() {
  document.querySelectorAll("[data-open-process]").forEach((elemento) => {
    elemento.onclick = () => abrirDetalheProcesso(elemento.dataset.openProcess);
  });
}

function filtrarProcessos() {
  const termo = normalizar(els.busca.value);
  return state.processos.filter((processo) => {
    const cliente = obterCliente(processo.clienteId);
    const responsavel = obterUsuario(processo.responsavelId);
    const texto = normalizar([
      processo.numero,
      cliente?.nome,
      cliente?.cpf,
      processo.area,
      processo.status,
      processo.vara,
      processo.forum,
      responsavel?.nome,
      processo.resumo
    ].join(" "));

    const combinaBusca = !termo || texto.includes(termo);
    const combinaArea = !els.filtroArea.value || processo.area === els.filtroArea.value;
    const combinaStatus = !els.filtroStatus.value || processo.status === els.filtroStatus.value;
    return combinaBusca && combinaArea && combinaStatus;
  });
}

function eventosAgenda() {
  return state.processos.flatMap((processo) => {
    const cliente = obterCliente(processo.clienteId);
    return processo.prazos.map((prazo) => ({
      ...prazo,
      processoId: processo.id,
      processo: processo.numero,
      cliente: cliente?.nome || "Cliente não informado"
    }));
  });
}

function popularLogin() {
  els.loginUsuario.innerHTML = state.usuarios.map((usuario) => `
    <option value="${usuario.id}">${escapeHtml(usuario.nome)}</option>
  `).join("");
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
  preencherSelect(document.querySelector("#processoCliente"), state.clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome })));
  preencherSelect(document.querySelector("#processoArea"), state.configs.areas.map(opcao));
  preencherSelect(document.querySelector("#processoStatus"), state.configs.status.map(opcao));
  preencherSelect(document.querySelector("#processoVara"), state.configs.varas.map(opcao));
  preencherSelect(document.querySelector("#processoForum"), state.configs.foruns.map(opcao));
  preencherSelect(document.querySelector("#processoResponsavel"), state.usuarios.map((usuario) => ({ value: usuario.id, label: usuario.nome })));
}

function preencherSelect(select, opcoes) {
  select.innerHTML = opcoes.map((item) => `
    <option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>
  `).join("");
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
  els.popoverEmail.textContent = usuario?.email || "Perfil local";
  els.plantaoNome.textContent = usuario?.nome || "SR Advocacia";
}

function aplicarTema() {
  document.body.dataset.theme = state.tema || "classico";
}

function carregarEstado() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) return criarEstadoPadrao();

  try {
    const parsed = JSON.parse(salvo);
    const padrao = criarEstadoPadrao();
    return {
      ...padrao,
      ...parsed,
      configs: { ...padrao.configs, ...(parsed.configs || {}) }
    };
  } catch {
    return criarEstadoPadrao();
  }
}

function criarEstadoPadrao() {
  const usuarios = [
    { id: uid(), nome: "Letícia Ramos", email: "leticia@sradvocacia.com" },
    { id: uid(), nome: "Renato Silva", email: "renato@sradvocacia.com" }
  ];

  const clientes = [
    { id: uid(), nome: "Mariana Azevedo", cpf: "184.552.930-10", email: "mariana@email.com", whatsapp: "(85) 99991-1030", observacoes: "Prefere contato por Whatsapp no fim da tarde." },
    { id: uid(), nome: "Nobre Serviços LTDA", cpf: "22.981.440/0001-70", email: "juridico@nobre.com", whatsapp: "(85) 98822-4410", observacoes: "Cliente empresarial com demandas trabalhistas recorrentes." },
    { id: uid(), nome: "Paulo Henrique Sales", cpf: "039.118.260-54", email: "paulo@email.com", whatsapp: "(85) 99777-2600", observacoes: "Solicita relatórios mensais do caso." },
    { id: uid(), nome: "Clínica Aurora", cpf: "31.550.020/0001-88", email: "financeiro@aurora.com", whatsapp: "(85) 98888-0201", observacoes: "Enviar boletos para o financeiro." }
  ];

  return {
    usuarioAtivoId: null,
    tema: "classico",
    usuarios,
    configs: {
      status: ["Ativo", "Aguardando audiência", "Recurso", "Suspenso", "Encerrado"],
      areas: ["Cível", "Trabalhista", "Família", "Empresarial", "Previdenciário"],
      varas: ["1ª Vara Cível de Fortaleza", "2ª Vara Empresarial de Fortaleza", "3ª Vara de Família de Fortaleza", "12ª Vara do Trabalho de Fortaleza"],
      foruns: ["Fórum Clóvis Beviláqua", "TRT 7ª Região", "Justiça Federal do Ceará", "Fórum de Maracanaú"]
    },
    clientes,
    processos: [
      {
        id: uid(),
        numero: "0804126-31.2026.8.06.0001",
        clienteId: clientes[0].id,
        area: "Família",
        status: "Aguardando audiência",
        vara: "3ª Vara de Família de Fortaleza",
        forum: "Fórum Clóvis Beviláqua",
        prazo: "2026-05-22",
        responsavelId: usuarios[0].id,
        honorarios: 6200,
        recebido: 3200,
        resumo: "Ação de guarda com pedido de regulamentação de convivência.",
        prazos: [
          { id: uid(), data: "2026-05-22", tipo: "Audiência", descricao: "Audiência de conciliação.", concluido: false },
          { id: uid(), data: "2026-05-29", tipo: "Manifestação", descricao: "Juntar documentos complementares.", concluido: false }
        ],
        movimentacoes: [
          { id: uid(), data: "2026-05-18", descricao: "Concluso para decisão sobre tutela provisória." },
          { id: uid(), data: "2026-05-12", descricao: "Contestação apresentada pela parte contrária." }
        ]
      },
      {
        id: uid(),
        numero: "0009824-78.2025.5.07.0012",
        clienteId: clientes[1].id,
        area: "Trabalhista",
        status: "Ativo",
        vara: "12ª Vara do Trabalho de Fortaleza",
        forum: "TRT 7ª Região",
        prazo: "2026-05-27",
        responsavelId: usuarios[1].id,
        honorarios: 9800,
        recebido: 6800,
        resumo: "Defesa em reclamação trabalhista com perícia técnica designada.",
        prazos: [
          { id: uid(), data: "2026-05-27", tipo: "Perícia", descricao: "Acompanhar perícia técnica.", concluido: false }
        ],
        movimentacoes: [
          { id: uid(), data: "2026-05-15", descricao: "Perito nomeado e honorários periciais arbitrados." }
        ]
      },
      {
        id: uid(),
        numero: "3001142-59.2026.8.06.0117",
        clienteId: clientes[2].id,
        area: "Cível",
        status: "Recurso",
        vara: "1ª Vara Cível de Fortaleza",
        forum: "Fórum Clóvis Beviláqua",
        prazo: "2026-06-02",
        responsavelId: usuarios[0].id,
        honorarios: 7500,
        recebido: 7500,
        resumo: "Apelação em ação indenizatória por vício em imóvel.",
        prazos: [
          { id: uid(), data: "2026-06-02", tipo: "Contrarrazões", descricao: "Protocolar contrarrazões.", concluido: false }
        ],
        movimentacoes: [
          { id: uid(), data: "2026-05-20", descricao: "Recurso de apelação recebido no duplo efeito." }
        ]
      }
    ]
  };
}

function salvarEstado() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function proximoPrazoDoProcesso(processo) {
  const pendentes = processo.prazos
    .filter((prazo) => !prazo.concluido)
    .sort((a, b) => new Date(a.data) - new Date(b.data));
  return pendentes[0]?.data || processo.prazos[0]?.data || hojeIso();
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

function exportarDados() {
  const blob = new Blob([JSON.stringify({ versao: APP_VERSION, ...state }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sr-advocacia-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function diasAte(data) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo - hoje) / 86400000);
}

function dataCurta(data) {
  if (!data) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${data}T00:00:00`));
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
