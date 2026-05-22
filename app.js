const STORAGE_KEY = "lexora.processos.v1";

const processosIniciais = [
  {
    numero: "0804126-31.2026.8.06.0001",
    cliente: "Mariana Azevedo",
    documento: "184.552.930-10",
    area: "Família",
    vara: "3ª Vara de Família de Fortaleza",
    status: "Aguardando audiência",
    prazo: "2026-05-22",
    responsavel: "Dra. Letícia",
    honorarios: 6200,
    recebido: 3200,
    resumo: "Ação de guarda com pedido de regulamentação de convivência."
  },
  {
    numero: "0009824-78.2025.5.07.0012",
    cliente: "Nobre Serviços LTDA",
    documento: "22.981.440/0001-70",
    area: "Trabalhista",
    vara: "12ª Vara do Trabalho de Fortaleza",
    status: "Ativo",
    prazo: "2026-05-27",
    responsavel: "Dr. Renato",
    honorarios: 9800,
    recebido: 6800,
    resumo: "Defesa em reclamação trabalhista com perícia técnica designada."
  },
  {
    numero: "3001142-59.2026.8.06.0117",
    cliente: "Paulo Henrique Sales",
    documento: "039.118.260-54",
    area: "Cível",
    vara: "1ª Vara Cível de Maracanaú",
    status: "Recurso",
    prazo: "2026-06-02",
    responsavel: "Dra. Letícia",
    honorarios: 7500,
    recebido: 7500,
    resumo: "Apelação em ação indenizatória por vício em imóvel."
  },
  {
    numero: "0802199-06.2026.8.06.0001",
    cliente: "Clínica Aurora",
    documento: "31.550.020/0001-88",
    area: "Empresarial",
    vara: "2ª Vara Empresarial de Fortaleza",
    status: "Ativo",
    prazo: "2026-05-24",
    responsavel: "Dra. Camila",
    honorarios: 12400,
    recebido: 4200,
    resumo: "Cobrança contratual com pedido de tutela para bloqueio de valores."
  },
  {
    numero: "0503301-44.2025.4.05.8100",
    cliente: "Tereza Nascimento",
    documento: "601.774.930-22",
    area: "Previdenciário",
    vara: "7ª Vara Federal do Ceará",
    status: "Encerrado",
    prazo: "2026-06-18",
    responsavel: "Dr. Renato",
    honorarios: 5100,
    recebido: 5100,
    resumo: "Concessão de benefício por incapacidade com acordo homologado."
  }
];

let processos = carregarProcessos();
let viewAtual = "dashboard";

const els = {
  title: document.querySelector("#viewTitle"),
  busca: document.querySelector("#buscaGlobal"),
  modal: document.querySelector("#modalProcesso"),
  form: document.querySelector("#formProcesso"),
  filtroArea: document.querySelector("#filtroArea"),
  filtroStatus: document.querySelector("#filtroStatus")
};

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => trocarView(button.dataset.view));
});

document.querySelectorAll("[data-view-shortcut]").forEach((button) => {
  button.addEventListener("click", () => trocarView(button.dataset.viewShortcut));
});

document.querySelector("#btnNovo").addEventListener("click", () => {
  els.form.reset();
  els.form.prazo.valueAsDate = new Date();
  els.modal.showModal();
});

document.querySelector("#btnExportar").addEventListener("click", exportarDados);
els.busca.addEventListener("input", renderizar);
els.filtroArea.addEventListener("change", renderizar);
els.filtroStatus.addEventListener("change", renderizar);

els.form.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();

  const dados = Object.fromEntries(new FormData(els.form));
  processos.unshift({
    ...dados,
    honorarios: Number(dados.honorarios || 0),
    recebido: Number(dados.recebido || 0)
  });
  salvarProcessos();
  els.modal.close();
  trocarView("processos");
});

renderizar();

function carregarProcessos() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) return processosIniciais;

  try {
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) ? parsed : processosIniciais;
  } catch {
    return processosIniciais;
  }
}

function salvarProcessos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(processos));
  renderizar();
}

function trocarView(view) {
  viewAtual = view;
  const labels = {
    dashboard: "Painel",
    processos: "Processos",
    clientes: "Clientes",
    agenda: "Prazos",
    financeiro: "Honorários"
  };

  els.title.textContent = labels[view] || "Painel";
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
  return processos.filter((processo) => {
    const alvo = normalizar([
      processo.numero,
      processo.cliente,
      processo.documento,
      processo.area,
      processo.vara,
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
  const lista = filtrarProcessos();
  renderMetricas();
  renderDestaques(lista);
  renderAgenda(lista);
  renderTabelaProcessos(lista);
  renderClientes(lista);
  renderFinanceiro(lista);
}

function renderMetricas() {
  const ativos = processos.filter((p) => p.status !== "Encerrado").length;
  const prazosCriticos = processos.filter((p) => diasAte(p.prazo) <= 3 && p.status !== "Encerrado").length;
  const recebido = soma(processos, "recebido");
  const pendente = soma(processos, "honorarios") - recebido;

  document.querySelector("#metricas").innerHTML = [
    metricCard("Processos ativos", ativos, "Carteira em andamento"),
    metricCard("Prazos críticos", prazosCriticos, "Até 3 dias"),
    metricCard("Recebido", moeda(recebido), "Honorários pagos"),
    metricCard("Pendente", moeda(pendente), "A receber")
  ].join("");

  document.querySelector("#plantaoResumo").textContent = `${prazosCriticos} prazos críticos hoje`;
}

function renderDestaques(lista) {
  const ordenados = [...lista]
    .filter((p) => p.status !== "Encerrado")
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    .slice(0, 4);

  document.querySelector("#processosDestaque").innerHTML = vazioOu(ordenados, (p) => `
    <article class="case-item">
      <div class="case-top">
        <div>
          <div class="case-title">${escapeHtml(p.cliente)}</div>
          <div class="case-meta">${escapeHtml(p.numero)} · ${escapeHtml(p.vara)}</div>
        </div>
        ${badgePrazo(p)}
      </div>
      <p>${escapeHtml(p.resumo || "Sem resumo cadastrado.")}</p>
      <div class="case-meta">${escapeHtml(p.area)} · ${escapeHtml(p.status)} · ${escapeHtml(p.responsavel)}</div>
    </article>
  `);
}

function renderAgenda(lista) {
  const proximos = [...lista].sort((a, b) => new Date(a.prazo) - new Date(b.prazo));
  const html = vazioOu(proximos.slice(0, viewAtual === "agenda" ? 30 : 6), (p) => `
    <article class="${viewAtual === "agenda" ? "timeline-item" : "deadline-item"}">
      <div class="deadline-top">
        <strong>${dataCurta(p.prazo)}</strong>
        ${badgePrazo(p)}
      </div>
      <div>${escapeHtml(p.cliente)}</div>
      <div class="deadline-meta">${escapeHtml(p.numero)} · ${escapeHtml(p.status)} · ${escapeHtml(p.responsavel)}</div>
    </article>
  `);

  document.querySelector("#agendaResumo").innerHTML = html;
  document.querySelector("#linhaTempo").innerHTML = html;
}

function renderTabelaProcessos(lista) {
  document.querySelector("#tabelaProcessos").innerHTML = vazioOu(lista, (p) => `
    <tr>
      <td><strong>${escapeHtml(p.numero)}</strong><br><span class="case-meta">${escapeHtml(p.vara)}</span></td>
      <td>${escapeHtml(p.cliente)}<br><span class="case-meta">${escapeHtml(p.documento)}</span></td>
      <td>${escapeHtml(p.area)}</td>
      <td>${badgeStatus(p.status)}</td>
      <td>${dataCurta(p.prazo)}<br>${badgePrazo(p)}</td>
      <td>${escapeHtml(p.responsavel)}</td>
    </tr>
  `);
}

function renderClientes(lista) {
  const clientes = agruparPorCliente(lista);
  document.querySelector("#listaClientes").innerHTML = vazioOu(clientes, (cliente) => `
    <article class="client-card">
      <div class="client-top">
        <strong>${escapeHtml(cliente.nome)}</strong>
        <span class="badge">${cliente.processos.length} caso${cliente.processos.length > 1 ? "s" : ""}</span>
      </div>
      <div class="client-meta">${escapeHtml(cliente.documento || "Documento não informado")}</div>
      <p>${escapeHtml(cliente.areas.join(", "))}</p>
      <div class="client-meta">Próximo prazo: ${dataCurta(cliente.proximoPrazo)}</div>
    </article>
  `);
}

function renderFinanceiro(lista) {
  const total = soma(lista, "honorarios");
  const recebido = soma(lista, "recebido");
  const pendente = total - recebido;

  document.querySelector("#financeiroResumo").innerHTML = [
    financeCard("Contratado", total, "Total em honorários"),
    financeCard("Recebido", recebido, "Entradas registradas"),
    financeCard("Pendente", pendente, "Valores a receber")
  ].join("");

  document.querySelector("#tabelaFinanceiro").innerHTML = vazioOu(lista, (p) => `
    <tr>
      <td>${escapeHtml(p.cliente)}<br><span class="case-meta">${escapeHtml(p.numero)}</span></td>
      <td>${moeda(p.honorarios)}</td>
      <td>${moeda(p.recebido)}</td>
      <td>${moeda((p.honorarios || 0) - (p.recebido || 0))}</td>
    </tr>
  `);
}

function metricCard(label, value, caption) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${caption}</small>
    </article>
  `;
}

function financeCard(label, value, caption) {
  return `
    <article class="finance-card">
      <span>${label}</span>
      <strong>${moeda(value)}</strong>
      <p>${caption}</p>
    </article>
  `;
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
  const classe = status === "Encerrado" ? "ok" : status === "Recurso" ? "gold" : "";
  return `<span class="badge ${classe}">${escapeHtml(status)}</span>`;
}

function agruparPorCliente(lista) {
  const mapa = new Map();
  lista.forEach((processo) => {
    const atual = mapa.get(processo.cliente) || {
      nome: processo.cliente,
      documento: processo.documento,
      processos: [],
      areas: new Set(),
      proximoPrazo: processo.prazo
    };
    atual.processos.push(processo);
    atual.areas.add(processo.area);
    if (new Date(processo.prazo) < new Date(atual.proximoPrazo)) atual.proximoPrazo = processo.prazo;
    mapa.set(processo.cliente, atual);
  });

  return [...mapa.values()].map((cliente) => ({
    ...cliente,
    areas: [...cliente.areas]
  }));
}

function exportarDados() {
  const blob = new Blob([JSON.stringify(processos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lexora-processos-${new Date().toISOString().slice(0, 10)}.json`;
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
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function vazioOu(lista, render) {
  if (!lista.length) {
    return `<div class="case-item"><strong>Nenhum registro encontrado</strong><span class="case-meta">Ajuste os filtros ou cadastre um novo processo.</span></div>`;
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
