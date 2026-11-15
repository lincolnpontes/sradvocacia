(() => {
  "use strict";
  const CLIENTE = "684513615167-dljgc4pk0o959vv5hpvi6uqglvpmgfss.apps.googleusercontent.com";
  const CONTA = "66baa8dfb04ba767b7c7cdece1107fbe1c29ba73183254d5639770db7e2e4587";
  const LEITURA = "https://www.googleapis.com/auth/calendar.events.owned.readonly";
  const FUSO = "America/Recife";
  const DIA = 86400000;
  const $ = id => document.getElementById("gcal" + id);
  const texto = (tag, valor, classe) => {
    const el = document.createElement(tag);
    el.textContent = valor;
    if (classe) el.className = classe;
    return el;
  };
  const formato = (data, opcoes, fuso = FUSO) =>
    new Intl.DateTimeFormat("pt-BR", {...opcoes, timeZone:fuso}).format(data);
  const diaLocal = data => {
    const partes = new Intl.DateTimeFormat("en", {timeZone:FUSO, day:"2-digit", month:"2-digit", year:"numeric"}).formatToParts(data);
    const p = Object.fromEntries(partes.map(item => [item.type, item.value]));
    return p.year + "-" + p.month + "-" + p.day;
  };
  const iso = d => d.toISOString().slice(0, 10);
  const utc = s => new Date(s + "T12:00:00Z");
  function periodo(base, modo, passo = 0) {
    const d = utc(base);
    if (modo === "MONTH") {
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + passo);
      const inicio = iso(d);
      d.setUTCMonth(d.getUTCMonth() + 1);
      return [inicio, iso(d)];
    }
    d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7 + passo * 7);
    return [iso(d), iso(new Date(+d + 7 * DIA))];
  }
  function urlEvento(link, email) {
    try {
      const u = new URL(link);
      if (u.protocol !== "https:" || !["calendar.google.com","www.google.com"].includes(u.hostname)
          || u.port || u.username || u.password || !u.pathname.startsWith("/calendar/")) return "";
      u.searchParams.set("authuser", email);
      return u.href;
    } catch { return ""; }
  }
  let ctx, perfil, acesso = "", email = "", modo = "WEEK", base = "", expira = 0;
  let pedido, auth, geracao = 0, timer, ultima = 0, visivel = false;
  const ativo = () => Boolean(perfil && ctx?.perfil() === perfil && ctx.visivel());
  const avisar = msg => { $("Status").textContent = msg; };
  function interromper() { pedido?.abort(); pedido = null; }
  function fecharAuth() {
    if (!auth) return;
    clearTimeout(auth.timer);
    auth.canal.close();
    try { auth.janela.close(); } catch { /* Navegadores podem isolar a janela. */ }
    auth = null;
  }
  function limpar() {
    geracao++; interromper(); fecharAuth(); clearTimeout(timer);
    acesso = email = ""; expira = ultima = 0;
    $("Body").replaceChildren(); $("Range").textContent = "";
    $("Open").removeAttribute("href"); $("Create").removeAttribute("href");
    $("Range").hidden = $("Actions").hidden = $("Tools").hidden = true;
    $("Start").hidden = false; $("Connect").disabled = false;
    $("Connect").textContent = "Conectar Google Agenda"; $("Refresh").disabled = false;
    avisar("");
  }
  function sair() { if (ctx) limpar(); perfil = null; visivel = false; }
  function sessao() {
    if (!ctx) return;
    if (perfil !== ctx.perfil()) {
      sair(); perfil = ctx.perfil(); base = diaLocal(new Date()); modo = "WEEK";
    }
    if (!ativo()) {
      if (visivel) {
        geracao++; interromper(); fecharAuth(); $("Body").replaceChildren();
        $("Refresh").disabled = false; $("Connect").disabled = false;
        $("Connect").textContent = "Conectar Google Agenda"; avisar(""); ultima = 0;
      }
      visivel = false;
    } else if (!visivel) {
      visivel = true;
      if (acesso) void consultar();
    }
  }
  function falhaLogin(msg) { limpar(); avisar(msg); }
  async function json(url, token, signal) {
    const r = await fetch(url, {signal, headers:{Authorization:"Bearer " + token},
      cache:"no-store", credentials:"omit", redirect:"error", referrerPolicy:"no-referrer"});
    if (!r.ok) throw Object.assign(new Error("google"), {status:r.status});
    return r.json();
  }
  function conectar() {
    if (!ativo()) return;
    if (auth) { fecharAuth(); $("Connect").textContent = "Conectar Google Agenda"; avisar("Conexão cancelada."); return; }
    if (!navigator.onLine) return avisar("Sem internet. Reconecte o aparelho para acessar o Google.");
    if (!window.crypto?.subtle || typeof BroadcastChannel !== "function") return avisar("Atualize o navegador para conectar a agenda com segurança.");
    const estado = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,"0")).join("");
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.search = new URLSearchParams({client_id:CLIENTE, redirect_uri:new URL("agenda-retorno.html", location.href).href,
      response_type:"token", scope:"openid email " + LEITURA, prompt:"select_account", state:estado}).toString();
    const janela = window.open("about:blank", "_blank", "popup,width=540,height=660");
    if (!janela) return avisar("O navegador bloqueou a janela do Google. Permita a abertura e tente novamente.");
    const canal = new BroadcastChannel("sr-agenda:" + estado);
    const versao = ++geracao;
    auth = {janela, canal, timer:setTimeout(() => falhaLogin("O tempo de conexão terminou. Tente novamente."), 180000)};
    canal.onmessage = async ({data}) => {
      if (!ativo() || versao !== geracao || data?.estado !== estado) return;
      canal.postMessage("recebido"); fecharAuth();
      if (data.erro || !data.acesso || !String(data.escopos).split(" ").includes(LEITURA) || !(Number(data.expira) > 0)) {
        return falhaLogin("O Google não autorizou a leitura dos eventos. A agenda do SR não foi alterada.");
      }
      $("Connect").disabled = true; avisar("Conferindo a conta do escritório…");
      const req = new AbortController(); pedido = req;
      const limite = setTimeout(() => req.abort(), 25000);
      try {
        const info = await json("https://openidconnect.googleapis.com/v1/userinfo", data.acesso, req.signal);
        const conta = String(info.email || "").toLowerCase().trim();
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(conta))),
          b => b.toString(16).padStart(2,"0")).join("");
        if (!ativo() || versao !== geracao) return;
        if (info.email_verified !== true || hash !== CONTA) return falhaLogin("Escolha o Gmail do escritório. Nenhuma agenda dessa conta foi consultada.");
        acesso = data.acesso; email = conta; expira = Date.now() + Math.min(Number(data.expira), 3600) * 1000;
        timer = setTimeout(() => falhaLogin("A sessão do Google expirou. Conecte novamente."), expira - Date.now());
        $("Start").hidden = true;
        $("Range").hidden = $("Actions").hidden = $("Tools").hidden = false;
        $("Open").href = urlEvento("https://calendar.google.com/calendar/r", email);
        $("Create").href = urlEvento("https://calendar.google.com/calendar/r/eventedit", email);
        await consultar();
      } catch {
        if (versao === geracao && ativo()) falhaLogin("Não foi possível confirmar a conta com o Google. Tente novamente.");
      } finally { clearTimeout(limite); if (pedido === req) pedido = null; }
    };
    janela.opener = null;
    janela.location.replace(u.href);
    $("Connect").textContent = "Cancelar conexão";
    avisar("Na janela do Google, selecione a conta do escritório e autorize a leitura da agenda.");
  }
  function exibir(itens, inicio) {
    const frag = document.createDocumentFragment();
    let grupo;
    for (const e of itens) {
      const d = e.start?.dateTime ? new Date(e.start.dateTime) : null;
      if (d && !Number.isFinite(+d)) continue;
      const dia = d ? diaLocal(d) : e.start?.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia || "")) continue;
      const chave = dia < inicio ? inicio : dia;
      if (chave !== grupo) {
        frag.append(texto("h4", formato(utc(chave), {weekday:"long", day:"numeric", month:"long"}), "gcal-day"));
        grupo = chave;
      }
      const row = texto("article", "", "gcal-event");
      const hora = {hour:"2-digit",minute:"2-digit"};
      let quando = d ? formato(d, hora) : "Dia inteiro";
      if (!d && /^\d{4}-\d{2}-\d{2}$/.test(e.end?.date || "")) {
        const ultimo = new Date(+utc(e.end.date)-DIA);
        if (iso(ultimo) > dia) quando += " até " + formato(ultimo,{day:"numeric",month:"short"});
      }
      if (d && e.end?.dateTime) {
        const fim = new Date(e.end.dateTime);
        if (Number.isFinite(+fim)) quando += " – " + formato(fim, diaLocal(fim) === dia ? hora : {...hora, day:"numeric", month:"short"});
      }
      if (dia < inicio) quando = "Em andamento";
      const data = texto("time", quando); data.dateTime = e.start.dateTime || dia;
      const info = document.createElement("div"), href = urlEvento(e.htmlLink, email);
      const titulo = texto(href ? "a" : "strong", e.summary || "Ocupado");
      if (href) { titulo.href = href; titulo.target = "_blank"; titulo.rel = "noopener noreferrer"; }
      info.append(titulo); if (e.location) info.append(texto("small", e.location));
      row.append(data, info); frag.append(row);
    }
    if (!frag.childNodes.length) frag.append(texto("p","Nenhum compromisso neste período."));
    $("Body").replaceChildren(frag);
  }
  async function consultar() {
    if (!ativo() || !acesso) return;
    if (Date.now() >= expira) return falhaLogin("A sessão do Google expirou. Conecte novamente.");
    interromper();
    const req = new AbortController(); pedido = req;
    const valido = () => pedido === req && ativo();
    const limite = setTimeout(() => req.abort(), 30000);
    const [ini, fim] = periodo(base, modo);
    $("Range").textContent = modo === "MONTH" ? formato(utc(ini),{month:"long",year:"numeric"})
      : formato(utc(ini),{day:"numeric",month:"short"}) + " a " + formato(new Date(+utc(fim)-DIA),{day:"numeric",month:"short",year:"numeric"});
    document.querySelectorAll("[data-gcal-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.gcalMode === modo)));
    $("Refresh").disabled = true; avisar("Consultando o Google…");
    const eventos = [], paginas = new Set();
    const u = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    u.search = new URLSearchParams({timeMin:ini+"T00:00:00-03:00", timeMax:fim+"T00:00:00-03:00", timeZone:FUSO,
      singleEvents:"true", orderBy:"startTime", maxResults:"250", fields:"kind,nextPageToken,items(status,summary,start,end,location,htmlLink)"}).toString();
    try {
      for (;;) {
        const pag = await json(u.href, acesso, req.signal);
        if (!valido()) return;
        const itens = pag.items ?? (pag.kind === "calendar#events" ? [] : null);
        if (!Array.isArray(itens)) throw new Error("Resposta incompleta");
        eventos.push(...itens.filter(e => e.status !== "cancelled"));
        if (!pag.nextPageToken) break;
        if (paginas.has(pag.nextPageToken)) throw new Error("Página repetida");
        paginas.add(pag.nextPageToken); u.searchParams.set("pageToken",pag.nextPageToken);
      }
      exibir(eventos, ini); ultima = Date.now();
      avisar("Google Agenda · Atualizado às " + formato(new Date(), {hour:"2-digit",minute:"2-digit"}) + " · Horário de João Pessoa");
    } catch (err) {
      if (!valido()) return;
      if (err.status === 401 || err.status === 403) return falhaLogin(err.status === 401 ? "A sessão do Google expirou. Conecte novamente." : "O Google recusou a consulta. Confira a permissão da agenda e tente novamente.");
      avisar((navigator.onLine ? "Não foi possível atualizar." : "Sem internet.") + (ultima ? " Exibindo a última consulta deste período." : " Nenhum resultado confirmado.") + " Tente atualizar novamente.");
    } finally { clearTimeout(limite); if (pedido === req) { pedido = null; $("Refresh").disabled = false; } }
  }
  function mudar(m, passo, hoje = false) {
    if (!ativo() || !acesso) return;
    modo = m; base = periodo(hoje ? diaLocal(new Date()) : base, modo, passo)[0];
    ultima = 0; $("Body").replaceChildren(); void consultar();
  }
  function iniciar(deps) {
    if (ctx) return;
    ctx = deps;
    $("Connect").onclick = conectar;
    $("Exit").onclick = () => { limpar(); avisar("Conexão encerrada neste aparelho. Os compromissos permanecem no Google."); };
    $("Refresh").onclick = consultar;
    $("Today").onclick = () => mudar(modo, 0, true);
    $("Previous").onclick = () => mudar(modo, -1);
    $("Next").onclick = () => mudar(modo, 1);
    document.querySelectorAll("[data-gcal-mode]").forEach(b => b.onclick = () => mudar(b.dataset.gcalMode, 0));
    const atualizar = () => { if (ativo() && acesso && !pedido && !document.hidden && Date.now()-ultima > 60000) void consultar(); };
    window.addEventListener("focus", atualizar); window.addEventListener("online", atualizar);
    document.addEventListener("visibilitychange", atualizar);
    window.setInterval(atualizar, 60000);
  }
  window.SrAgendaGoogle = {iniciar, sessao, sair};
})();
