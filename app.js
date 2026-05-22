const APP_VERSION = "1.0.1";
const STORAGE_KEY = "sradvocacia.v1.0.1";

const hojeIso = () => new Date().toISOString().slice(0, 10);

const dadosPadrao = {
  sessao: null,
  tema: "classico",
  usuarios: [
    { id: uid(), nome: "Leticia Ramos", email: "leticia@sradvocacia.com" },
    { id: uid(), nome: "Renato Silva", email: "renato@sradvocacia.com" }
  ],
  configs: {
    status: ["Ativo", "Aguardando audiencia", "Recurso", "Suspenso", "Encerrado"],
    areas: ["Civel", "Trabalhista", "Familia", "Empresarial", "Previdenciario"],
    varas: ["1a Vara Civel de Fortaleza", "2a Vara Empresarial de Fortaleza", "3a Vara de Familia de Fortaleza", "12a Vara do Trabalho de Fortaleza"],
    foruns: ["Forum Clovis Bevilaqua", "TRT 7a Regiao", "Justica Federal do Ceara", "Forum de Maracanau"]
  },
  clientes: [
    { id: uid(), nome: "Mariana Azevedo", cpf: "184.552.930-10", email: "mariana@email.com", whatsapp: "(85) 99991-1030", observacoes: "Prefere contato por Whatsapp no fim da tarde." },
    { id: uid(), nome: "Nobre Servicos LTDA", cpf: "22.981.440/0001-70", email: "juridico@nobre.com", whatsapp: "(85) 98822-4410", observacoes: "Cliente empresarial com demandas trabalhistas recorrentes." },
    { id: uid(), nome: "Paulo Henrique Sales", cpf: "039.118.260-54", email: "paulo@email.com", whatsapp: "(85) 99777-2600", observacoes: "Solicita relatorios mensais do caso." },
    { id: uid(), nome: "Clinica Aurora", cpf: "31.550.020/0001-88", email: "financeiro@aurora.com", whatsapp: "(85) 98888-0201", observacoes: "Enviar boletos para o financeiro." }
  ],
  processos: []
};

dadosPadrao.processos = [
  {
    id: uid(),
    numero: "0804126-31.2026.8.06.0001",
    clienteId: dadosPadrao.clientes[0].id,
    area: "Familia",
    vara: "3a Vara de Familia de Fortaleza",
    forum: "Forum Clovis Bevilaqua",
    status: "Aguardando audiencia",
    prazo: "2026-05-22",
    responsavel: "Leticia Ramos",
    honorarios: 6200,
    recebido: 3200,
    resumo: "Acao de guarda com pedido de regulamentacao de convivencia.",
    prazos: [
      { id: uid(), data: "2026-05-22", tipo: "Audiencia", descricao: "Audiencia de conciliacao", concluido: false },
      { id: uid(), data: "2026-05-29", tipo: "Manifestacao", descricao: "Juntar documentos complementares", concluido: false }
    ],
    movimentacoes: [
      { id: uid(), data: "2026-05-18", descricao: "Concluso para decisao sobre tutela provisoria." },
      { id: uid(), data: "2026-05-12", descricao: "Contestacao apresentada pela parte contraria." }
    ]
  },
  {
    id: uid(),
    numero: "0009824-78.2025.5.07.0012",
    clienteId: dadosPadrao.clientes[1].id,
    area: "Trabalhista",
    vara: "12a Vara do Trabalho de Fortaleza",
    forum: "TRT 7a Regiao",
    status: "Ativo",
    prazo: "2026-05-27",
    responsavel: "Renato Silva",
    honorarios: 9800,
    recebido: 6800,
    resumo: "Defesa em reclamacao trabalhista com pericia tecnica designada.",
    prazos: [
      { id: uid(), data: "2026-05-27", tipo: "Pericia", descricao: "Acompanhar pericia tecnica", concluido: false }
    ],
    movimentacoes: [
      { id: uid(), data: "2026-05-15", descricao: "Perito nomeado e honorarios periciais arbitrados." }
    ]
  },
  {
    id: uid(),
    numero: "3001142-59.2026.8.06.0117",
    clienteId: dadosPadrao.clientes[2].id,
    area: "Civel",
    vara: "1a Vara Civel de Fortaleza",
    forum: "Forum Clovis Bevilaqua",
    status: "Recurso",
    prazo: "2026-06-02",
    responsavel: "Leticia Ramos",
    honorarios: 7500,
    recebido: 7500,
    resumo: "Apelacao em acao indenizatoria por vicio em imovel.",
    prazos: [
      { id: uid(), data: "2026-06-02", tipo: "Contrarrazoes", descricao: "Protocolar contrarrazoes", concluido: false }
    ],
    movimentacoes: [
      { id: uid(), data: "2026-05-20", descricao: "Recurso de apelacao recebido no duplo efeito." }
    ]
  }
];

let banco = carregarBanco();
let viewAtual = "dashboard";
let mesAgenda = new Date();

const els = {
  app: document.querySelector("#appShell"),
  login: document.querySelector("#loginScreen"),
  formLogin: document.querySelector("#formLogin"),
  loginUsuario: document.querySelector("#loginUsuario"),
  title: document.querySelector("#viewTitle"),
  busca: document.querySelector("#buscaGlobal"),
  modalProcesso: document.querySelector("#modalProcesso"),
  modalCliente: document.querySelector("#modalCliente"),
  modalDetalhe: document.querySelector("#modalDetalheProcesso"),
  formProcesso: document.querySelector("#formProcesso"),
  formCliente: document.querySelector("#formCliente"),
  filtroArea: document.querySelector("#filtroArea"),
  filtroStatus: document.querySelector("#filtroStatus"),
  btnNovoTexto: document.querySelector("#btnNovoTexto")
};

inicializar();

function inicializar() {
  aplicarTema();
  popularLogin();
  configurarEventos();
  atualizarSessaoVisual();
  if (banco.sessao) liberarApp();
  renderizar();
}

function configurarEventos() {
  els.formLogin.addEventListener("submit", entrar);
  document.querySelector("#btnSair").addEventListener("click", sair);
  document.querySelector("#brandMenuButton").addEventListener("click", alternarMenuMarca);
  document.querySelector("#brandMenuButton").addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") alternarMenuMarca();
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => trocarView(button.dataset.view));
  });
  document.querySelectorAll("[data-view-shortcut]").forEach((button) => {
    button.addEventListener("click", () => {
      fecharMenuMarca();
      trocarView(button.dataset.viewShortcut);
    });
  });

  document.querySelector("#btnNovo").addEventListener("click", acaoPrincipal);
  document.querySelector("#btnExportar").addEventListener("click", exportarDados);
  document.querySelector("#mesAnterior").addEventListener("click", () => mudarMes(-1));
  document.querySelector("#mesProximo").addEventListener("click", () => mudarMes(1));
  document.querySelector("#btnFecharDetalhe").addEventListener("click", () => els.modalDetalhe.close());

  els.busca.addEventListener("input", renderizar);
  els.filtroArea.addEventListener("change", renderizar);
  els.filtroStatus.addEventListener("change", renderizar);
  els.formProcesso.addEventListener("submit", salvarProcesso);
  els.formCliente.addEventListener("submit", salvarCliente);
  document.querySelector("#formUsuario").addEventListener("submit", salvarUsuario);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".brand") && !event.target.closest(".brand-menu")) fecharMenuMarca();
  });
}

function entrar(event) {
  event.preventDefault();
  const usuario = banco.usuarios.find((item) => item.id === els.loginUsuario.value) || banco.usuarios[0];
  banco.sessao = usuario.id;
  salvarBanco();
  liberarApp();
}

function sair() {
  banco.sessao = null;
  salvarBanco();
  els.app.classList.add("is-locked");
  els.login.classList.remove("is-hidden");
  fecharMenuMarca();
}

function liberarApp() {
  els.app.classList.remove("is-locked");
  els.login.classList.add("is-hidden");
  atualizarSessaoVisual();
}

function atualizarSessaoVisual() {
  const usuario = usuarioAtual();
  document.querySelector("#usuarioInicial").textContent = (usuario?.nome || "S").trim().charAt(0).toUpperCase();
  document.querySelector("#plantaoNome").textContent = usuario?.nome || "SR Advocacia";
}

function usuarioAtual() {
  return banco.usuarios.find((usuario) => usuario.id === banco.sessao) || banco.usuarios[0];
}

function acaoPrincipal() {
  if (viewAtual === "clientes") abrirModalCliente();
  else abrirModalProcesso();
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
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formCliente));
  banco.clientes.unshift({ id: uid(), ...dados });
  salvarBanco();
  els.modalCliente.close();
  trocarView("clientes");
}

function salvarProcesso(event) {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(els.formProcesso));
  banco.processos.unshift({
    id: uid(),
    ...dados,
    honorarios: Number(dados.honorarios || 0),
    recebido: Number(dados.recebido || 0),
    prazos: [{ id: uid(), data: dados.prazo, tipo: "Prazo inicial", descricao: "Prazo cadastrado na abertura do processo", concluido: false }],
    movimentacoes: [{ id: uid(), data: hojeIso(), descricao: "Processo cadastrado no sistema." }]
  });
  salvarBanco();
  els.modalProcesso.close();
  trocarView("processos");
}

function salvarUsuario(event) {
  event.preventDefault();
  const dados = Object.fromEntries(new FormData(event.currentTarget));
  banco.usuarios.push({ id: uid(), nome: dados.nome, email: dados.email });
  event.currentTarget.reset();
  salvarBanco();
  popularLogin();
  renderConfiguracoes();
}

function trocarView(view) {
  viewAtual = view;
  const labels = {
    dashboard: "Painel",
    processos: "Processos",
    clientes: "Clientes",
    agenda: "Agenda",
    financeiro: "Honorarios",
    configuracoes: "Configuracoes"
  };

  els.title.textContent = labels[view] || "Painel";
  els.btnNovoTexto.textContent = view === "clientes" ? "Novo cliente" : "Novo processo";
  document.querySelector("#btnNovo").style.display = view === "configuracoes" ? "none" : "inline-flex";

  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-visible", section.id === `view-${view}`);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  renderizar();
}

function filtrarProcessos() {
  const termo = normalizar(els.busca.value);
  return banco.processos.filter((processo) => {
    const cliente = obterCliente(processo.clienteId);
    const alvo = normalizar([
      processo.numero,
      cliente?.nome,
      cliente?.cpf,
      processo.area,
      processo.vara,
      processo.forum,
      processo.status,
      processo.responsavel,
      processo.resumo
    ].join(" "));

    const combinaBusca = !termo || alvo.includes(termo);
    const combinaArea = !els.filtroArea.value || processo.area === els.filtroArea.value;
    const combinaStatus = !els.filtroStatus.value || processo.status === els.filtroStatus.value;
    return combinaBusca && combinaArea && combinaStatus;
  });
}

function renderizar() {
  migrarProcessosAntigos();
  popularFiltros();
  const lista = filtrarProcessos();
  renderMetricas();
  renderDestaques(lista);
  renderAgendaResumo(lista);
  renderTabelaProcessos(lista);
  renderClientes();
  renderAgendaCalendario();
  renderFinanceiro(lista);
  renderConfiguracoes();
}

function renderMetricas() {
  const ativos = banco.processos.filter((p) => p.status !== "Encerrado").length;
  const prazosCriticos = banco.processos.filter((p) => diasAte(p.prazo) <= 3 && p.status !== "Encerrado").length;
  const recebido = soma(banco.processos, "recebido");
  const pendente = soma(banco.processos, "honorarios") - recebido;

  document.querySelector("#metricas").innerHTML = [
    metricCard("Processos ativos", ativos, "Carteira em andamento"),
    metricCard("Clientes", banco.clientes.length, "Cadastros ativos"),
    metricCard("Prazos criticos", prazosCriticos, "Ate 3 dias"),
    metricCard("Pendente", moeda(pendente), "A receber")
  ].join("");

  document.querySelector("#plantaoResumo").textContent = `${prazosCriticos} prazos criticos`;
}

function renderDestaques(lista) {
  const ordenados = [...lista]
    .filter((p) => p.status !== "Encerrado")
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    .slice(0, 4);

  document.querySelector("#processosDestaque").innerHTML = vazioOu(ordenados, (p) => cardProcesso(p));
}

function cardProcesso(p) {
  const cliente = obterCliente(p.clienteId);
  return `
    <article class="case-item clickable" data-open-process="${p.id}">
      <div class="case-top">
        <div>
          <div class="case-title">${escapeHtml(cliente?.nome || "Cliente nao informado")}</div>
          <div class="case-meta">${escapeHtml(p.numero)} · ${escapeHtml(p.vara)}</div>
        </div>
        ${badgePrazo(p)}
      </div>
      <p>${escapeHtml(p.resumo || "Sem resumo cadastrado.")}</p>
      <div class="case-meta">${escapeHtml(p.area)} · ${escapeHtml(p.status)} · ${escapeHtml(p.responsavel)}</div>
    </article>
  `;
}

function renderAgendaResumo(lista) {
  const prazos = todosPrazos(lista).sort((a, b) => new Date(a.data) - new Date(b.data)).slice(0, 6);
  document.querySelector("#agendaResumo").innerHTML = vazioOu(prazos, (item) => `
    <article class="deadline-item">
      <div class="deadline-top">
        <strong>${dataCurta(item.data)}</strong>
        <span class="badge ${diasAte(item.data) <= 3 ? "gold" : "ok"}">${escapeHtml(item.tipo)}</span>
      </div>
      <div>${escapeHtml(item.cliente)}</div>
      <div class="deadline-meta">${escapeHtml(item.processo)} · ${escapeHtml(item.descricao)}</div>
    </article>
  `);
}

function renderTabelaProcessos(lista) {
  document.querySelector("#tabelaProcessos").innerHTML = vazioOu(lista, (p) => {
    const cliente = obterCliente(p.clienteId);
    return `
      <tr class="clickable" data-open-process="${p.id}">
        <td><strong>${escapeHtml(p.numero)}</strong><br><span class="case-meta">${escapeHtml(p.vara)}</span></td>
        <td>${escapeHtml(cliente?.nome || "")}<br><span class="case-meta">${escapeHtml(cliente?.cpf || "")}</span></td>
        <td>${escapeHtml(p.area)}</td>
        <td>${badgeStatus(p.status)}</td>
        <td>${dataCurta(p.prazo)}<br>${badgePrazo(p)}</td>
        <td>${escapeHtml(p.responsavel)}</td>
      </tr>
    `;
  });

  document.querySelectorAll("[data-open-process]").forEach((el) => {
    el.addEventListener("click", () => abrirDetalheProcesso(el.dataset.openProcess));
  });
}

function renderClientes() {
  const termo = normalizar(els.busca.value);
  const clientes = banco.clientes.filter((cliente) => {
    const alvo = normalizar([cliente.nome, cliente.cpf, cliente.email, cliente.whatsapp, cliente.observacoes].join(" "));
    return !termo || alvo.includes(termo);
  });

  document.querySelector("#listaClientes").innerHTML = vazioOu(clientes, (cliente) => {
    const processos = banco.processos.filter((processo) => processo.clienteId === cliente.id);
    return `
      <article class="client-card">
        <div class="client-top">
          <strong>${escapeHtml(cliente.nome)}</strong>
          <span class="badge">${processos.length} caso${processos.length !== 1 ? "s" : ""}</span>
        </div>
        <div class="client-meta">${escapeHtml(cliente.cpf)}</div>
        <p>${escapeHtml(cliente.email || "E-mail nao informado")}</p>
        <p>${escapeHtml(cliente.whatsapp || "Whatsapp nao informado")}</p>
        <div class="client-note">${escapeHtml(cliente.observacoes || "Sem observacoes.")}</div>
      </article>
    `;
  });
}

function renderAgendaCalendario() {
  const ano = mesAgenda.getFullYear();
  const mes = mesAgenda.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const inicio = primeiroDia.getDay();
  const eventos = todosPrazos(banco.processos);
  const titulo = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(mesAgenda);
  document.querySelector("#tituloMesAgenda").textContent = titulo;

  const celulas = [];
  for (let i = 0; i < inicio; i++) celulas.push(`<div class="calendar-day muted"></div>`);
  for (let dia = 1; dia <= totalDias; dia++) {
    const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const eventosDia = eventos.filter((evento) => evento.data === data).slice(0, 3);
    celulas.push(`
      <div class="calendar-day ${data === hojeIso() ? "today" : ""}">
        <strong>${dia}</strong>
        <div class="calendar-events">
          ${eventosDia.map((evento) => `<button type="button" data-open-process="${evento.processoId}">${escapeHtml(evento.cliente)} · ${escapeHtml(evento.tipo)}</button>`).join("")}
        </div>
      </div>
    `);
  }
  document.querySelector("#gradeAgenda").innerHTML = celulas.join("");
  document.querySelectorAll("#gradeAgenda [data-open-process]").forEach((button) => {
    button.addEventListener("click", () => abrirDetalheProcesso(button.dataset.openProcess));
  });
}

function renderFinanceiro(lista) {
  const total = soma(lista, "honorarios");
  const recebido = soma(lista, "recebido");
  const pendente = total - recebido;

  document.querySelector("#financeiroResumo").innerHTML = [
    financeCard("Contratado", total, "Total em honorarios"),
    financeCard("Recebido", recebido, "Entradas registradas"),
    financeCard("Pendente", pendente, "Valores a receber")
  ].join("");

  document.querySelector("#tabelaFinanceiro").innerHTML = vazioOu(lista, (p) => {
    const cliente = obterCliente(p.clienteId);
    return `
      <tr>
        <td>${escapeHtml(cliente?.nome || "")}<br><span class="case-meta">${escapeHtml(p.numero)}</span></td>
        <td>${moeda(p.honorarios)}</td>
        <td>${moeda(p.recebido)}</td>
        <td>${moeda((p.honorarios || 0) - (p.recebido || 0))}</td>
      </tr>
    `;
  });
}

function renderConfiguracoes() {
  const titulos = { status: "Status", areas: "Areas", varas: "Varas", foruns: "Foruns" };
  document.querySelectorAll(".config-list").forEach((box) => {
    const chave = box.dataset.config;
    box.innerHTML = `
      <h3>${titulos[chave]}</h3>
      <form class="inline-form" data-add-config="${chave}">
        <input name="valor" required placeholder="Adicionar ${titulos[chave].toLowerCase()}">
        <button class="ghost-button" type="submit">Adicionar</button>
      </form>
      <div class="pill-list">
        ${banco.configs[chave].map((valor) => `<span class="pill">${escapeHtml(valor)} <button type="button" data-remove-config="${chave}" data-value="${escapeHtml(valor)}">×</button></span>`).join("")}
      </div>
    `;
  });

  document.querySelectorAll("[data-add-config]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const chave = form.dataset.addConfig;
      const valor = new FormData(form).get("valor").trim();
      if (valor && !banco.configs[chave].includes(valor)) banco.configs[chave].push(valor);
      form.reset();
      salvarBanco();
      renderizar();
    });
  });

  document.querySelectorAll("[data-remove-config]").forEach((button) => {
    button.addEventListener("click", () => {
      const chave = button.dataset.removeConfig;
      banco.configs[chave] = banco.configs[chave].filter((valor) => valor !== button.dataset.value);
      salvarBanco();
      renderizar();
    });
  });

  document.querySelector("#listaUsuarios").innerHTML = banco.usuarios.map((usuario) => `
    <div class="user-row">
      <span>${escapeHtml(usuario.nome)}</span>
      <small>${escapeHtml(usuario.email || "Sem e-mail")}</small>
    </div>
  `).join("");

  document.querySelectorAll("#temaPicker button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.theme === banco.tema);
    button.onclick = () => {
      banco.tema = button.dataset.theme;
      salvarBanco();
      aplicarTema();
      renderConfiguracoes();
    };
  });
}

function abrirDetalheProcesso(id) {
  const processo = banco.processos.find((item) => item.id === id);
  if (!processo) return;
  const cliente = obterCliente(processo.clienteId);
  document.querySelector("#detalheTitulo").textContent = processo.numero;
  document.querySelector("#detalheConteudo").innerHTML = `
    <div class="detail-grid">
      <section>
        <h3>Dados principais</h3>
        <dl>
          <dt>Cliente</dt><dd>${escapeHtml(cliente?.nome || "")}</dd>
          <dt>CPF/CNPJ</dt><dd>${escapeHtml(cliente?.cpf || "")}</dd>
          <dt>Area</dt><dd>${escapeHtml(processo.area)}</dd>
          <dt>Status</dt><dd>${badgeStatus(processo.status)}</dd>
          <dt>Vara</dt><dd>${escapeHtml(processo.vara)}</dd>
          <dt>Forum</dt><dd>${escapeHtml(processo.forum || "")}</dd>
          <dt>Responsavel</dt><dd>${escapeHtml(processo.responsavel)}</dd>
        </dl>
        <p>${escapeHtml(processo.resumo || "Sem resumo cadastrado.")}</p>
      </section>
      <section>
        <h3>Prazos</h3>
        <div class="mini-list">
          ${(processo.prazos || []).map((prazo) => `
            <div>
              <strong>${dataCurta(prazo.data)} · ${escapeHtml(prazo.tipo)}</strong>
              <span>${escapeHtml(prazo.descricao)}</span>
            </div>
          `).join("") || "<p>Nenhum prazo cadastrado.</p>"}
        </div>
      </section>
      <section class="span-2">
        <h3>Movimentacoes</h3>
        <div class="mini-list">
          ${(processo.movimentacoes || []).map((mov) => `
            <div>
              <strong>${dataCurta(mov.data)}</strong>
              <span>${escapeHtml(mov.descricao)}</span>
            </div>
          `).join("") || "<p>Nenhuma movimentacao cadastrada.</p>"}
        </div>
      </section>
    </div>
  `;
  els.modalDetalhe.showModal();
}

function popularLogin() {
  els.loginUsuario.innerHTML = banco.usuarios.map((usuario) => `<option value="${usuario.id}">${escapeHtml(usuario.nome)}</option>`).join("");
}

function popularFiltros() {
  const areaAtual = els.filtroArea.value;
  const statusAtual = els.filtroStatus.value;
  popularSelect(els.filtroArea, ["", ...banco.configs.areas], "Todas as areas");
  popularSelect(els.filtroStatus, ["", ...banco.configs.status], "Todos os status");
  els.filtroArea.value = banco.configs.areas.includes(areaAtual) ? areaAtual : "";
  els.filtroStatus.value = banco.configs.status.includes(statusAtual) ? statusAtual : "";
}

function popularSelectsProcesso() {
  popularSelect(document.querySelector("#processoCliente"), banco.clientes.map((c) => ({ value: c.id, label: c.nome })), "Selecione o cliente");
  popularSelect(document.querySelector("#processoArea"), banco.configs.areas);
  popularSelect(document.querySelector("#processoStatus"), banco.configs.status);
  popularSelect(document.querySelector("#processoVara"), banco.configs.varas);
  popularSelect(document.querySelector("#processoForum"), banco.configs.foruns);
  popularSelect(document.querySelector("#processoResponsavel"), banco.usuarios.map((u) => u.nome));
}

function popularSelect(select, opcoes, placeholder = "") {
  const html = opcoes.map((opcao, index) => {
    if (typeof opcao === "object") return `<option value="${escapeHtml(opcao.value)}">${escapeHtml(opcao.label)}</option>`;
    if (opcao === "") return `<option value="">${escapeHtml(placeholder)}</option>`;
    return `<option${index === 0 && placeholder ? " value=\"\"" : ""}>${escapeHtml(opcao)}</option>`;
  }).join("");
  select.innerHTML = html;
}

function alternarMenuMarca() {
  const menu = document.querySelector("#brandMenu");
  const aberto = menu.classList.toggle("is-open");
  document.querySelector("#brandMenuButton").setAttribute("aria-expanded", aberto ? "true" : "false");
}

function fecharMenuMarca() {
  document.querySelector("#brandMenu").classList.remove("is-open");
  document.querySelector("#brandMenuButton").setAttribute("aria-expanded", "false");
}

function mudarMes(delta) {
  mesAgenda = new Date(mesAgenda.getFullYear(), mesAgenda.getMonth() + delta, 1);
  renderAgendaCalendario();
}

function aplicarTema() {
  document.body.dataset.theme = banco.tema || "classico";
}

function todosPrazos(processos) {
  return processos.flatMap((processo) => {
    const cliente = obterCliente(processo.clienteId);
    const prazos = processo.prazos?.length ? processo.prazos : [{ id: processo.id, data: processo.prazo, tipo: "Prazo", descricao: processo.resumo }];
    return prazos.map((prazo) => ({
      ...prazo,
      processoId: processo.id,
      processo: processo.numero,
      cliente: cliente?.nome || "Cliente nao informado"
    }));
  });
}

function obterCliente(id) {
  return banco.clientes.find((cliente) => cliente.id === id);
}

function carregarBanco() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) return structuredClone(dadosPadrao);
  try {
    const parsed = JSON.parse(salvo);
    return {
      ...structuredClone(dadosPadrao),
      ...parsed,
      configs: { ...structuredClone(dadosPadrao.configs), ...(parsed.configs || {}) }
    };
  } catch {
    return structuredClone(dadosPadrao);
  }
}

function salvarBanco() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(banco));
  atualizarSessaoVisual();
}

function migrarProcessosAntigos() {
  let mudou = false;
  banco.processos.forEach((processo) => {
    if (!processo.id) {
      processo.id = uid();
      mudou = true;
    }
    if (!processo.clienteId && processo.cliente) {
      let cliente = banco.clientes.find((item) => item.nome === processo.cliente);
      if (!cliente) {
        cliente = { id: uid(), nome: processo.cliente, cpf: processo.documento || "", email: "", whatsapp: "", observacoes: "" };
        banco.clientes.push(cliente);
      }
      processo.clienteId = cliente.id;
      mudou = true;
    }
    if (!processo.prazos) {
      processo.prazos = [{ id: uid(), data: processo.prazo || hojeIso(), tipo: "Prazo", descricao: "Prazo principal", concluido: false }];
      mudou = true;
    }
    if (!processo.movimentacoes) {
      processo.movimentacoes = [{ id: uid(), data: hojeIso(), descricao: "Registro importado da versao anterior." }];
      mudou = true;
    }
  });
  if (mudou) salvarBanco();
}

function metricCard(label, value, caption) {
  return `<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${caption}</small></article>`;
}

function financeCard(label, value, caption) {
  return `<article class="finance-card"><span>${label}</span><strong>${moeda(value)}</strong><p>${caption}</p></article>`;
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

function exportarDados() {
  const blob = new Blob([JSON.stringify({ versao: APP_VERSION, ...banco }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sr-advocacia-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function diasAte(data) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo - hoje) / 86400000);
}

function dataCurta(data) {
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

function vazioOu(lista, render) {
  if (!lista.length) return `<div class="case-item"><strong>Nenhum registro encontrado</strong><span class="case-meta">Ajuste os filtros ou cadastre um novo item.</span></div>`;
  return lista.map(render).join("");
}

function uid() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
