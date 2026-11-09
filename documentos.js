/* SR Advocacia: minutas locais. O pai controla permissões, persistência e versões. */
(() => {
  "use strict";
  let api, atual, impressao;
  const raiz = () => document.getElementById("view-documentos");

  function identidade() {
    const u = api?.usuario();
    const escritorio = u?.id && api.escritorio();
    return escritorio && api.temAcesso("documentos") === true
      ? JSON.stringify([escritorio, u.id]) : null;
  }

  function sair() {
    atual = null;
    impressao?.remove();
    impressao = null;
    window.removeEventListener("beforeunload", protegerRecarga);
    raiz()?.replaceChildren();
  }

  function vigente(s) {
    if (!s || atual !== s) return false;
    if (s.chave === identidade()) return true;
    sair();
    return false;
  }

  function protegerRecarga(evento) {
    if (!vigente(atual) || !atual.sujo) return;
    evento.preventDefault();
    evento.returnValue = true;
  }

  const layout = `
    <div class="docs-layout">
      <aside class="docs-biblioteca" aria-label="Biblioteca de documentos">
        <h2>Nova minuta</h2>
        <label for="docs-modelo">Modelo</label><select id="docs-modelo"></select>
        <label for="docs-busca">Buscar cliente</label>
        <input id="docs-busca" type="search" autocomplete="off" placeholder="Nome, CPF ou CNPJ">
        <label for="docs-cliente">Cliente</label><select id="docs-cliente"></select>
        <button type="button" class="primary-button" id="docs-gerar">Gerar cópia</button>
        <div class="docs-arquivo">
          <h2>Rascunhos</h2>
          <label for="docs-rascunhos">Abrir rascunho</label><select id="docs-rascunhos"></select>
          <p id="docs-lista-status" role="status"></p>
        </div>
        <section class="docs-arquivo" id="docs-nuvem" hidden>
          <h2>Sincronização</h2>
          <p id="docs-remoto" role="status"></p>
          <button type="button" class="ghost-button" id="docs-verificar">Verificar servidor</button>
          <button type="button" class="ghost-button" id="docs-sincronizar">Sincronizar agora</button>
          <details id="docs-parear"><summary>Vincular aparelho</summary>
            <label for="docs-chave">Chave privada do perfil</label>
            <input id="docs-chave" type="password" autocomplete="off" spellcheck="false" maxlength="64">
            <details><summary>Primeiro aparelho</summary>
              <button type="button" class="ghost-button" id="docs-gerarchave">Gerar nova chave</button>
              <label for="docs-admin">Senha administrativa do escritório</label>
              <input id="docs-admin" type="password" autocomplete="off">
            </details>
            <button type="button" class="primary-button" id="docs-vincular">Vincular</button>
          </details>
          <button type="button" class="ghost-button" id="docs-revelar">Chave para outro aparelho</button>
          <label class="sr-only" for="docs-compartilhar">Chave privada para o outro aparelho</label>
          <input id="docs-compartilhar" readonly hidden>
          <p id="docs-vinculo-status" role="status"></p>
        </section>
      </aside>
      <section class="docs-editor" aria-label="Editor de minuta">
        <h2>Minuta</h2>
        <p id="docs-vazio">Escolha um modelo e um cliente ou abra um rascunho.</p>
        <div id="docs-folha" hidden>
          <p class="docs-contexto" id="docs-contexto"></p>
          <label for="docs-titulo">Título</label>
          <input id="docs-titulo" autocomplete="off" type="text">
          <label for="docs-texto">Texto da minuta</label>
          <textarea id="docs-texto" rows="18" spellcheck="true" aria-describedby="docs-revisao docs-pendencias"></textarea>
          <p id="docs-revisao">Confira o representante e os poderes específicos antes de usar a minuta.</p>
          <div class="docs-lacunas">
            <p id="docs-pendencias" role="status"></p>
            <button type="button" class="ghost-button" id="docs-proximo" aria-describedby="docs-pendencias" hidden>Próximo campo</button>
          </div>
          <label class="docs-conferencia"><input id="docs-revisado" type="checkbox">
            Revisei o título, o texto, o representante e os poderes específicos.</label>
          <div class="docs-acoes">
            <button type="button" class="primary-button" id="docs-salvar">Salvar rascunho</button>
            <button type="button" class="ghost-button" id="docs-copia" hidden>Salvar como outra cópia</button>
            <button type="button" class="ghost-button" id="docs-exportar">Baixar Word (.docx)</button>
            <button type="button" class="ghost-button" id="docs-imprimir">Imprimir / PDF</button>
            <button type="button" class="ghost-button" id="docs-backup">Baixar rascunho (.txt)</button>
          </div>
        </div>
        <p id="docs-status" role="status" aria-live="polite"></p>
        <p id="docs-nuvem-editor" hidden></p>
        <p id="docs-aviso" role="status"></p>
      </section>
    </div>`;

  function opcoes(select, itens, inicial, valor) {
    select.replaceChildren(new Option(inicial, ""), ...itens.map(([id, nome]) => new Option(nome, id)));
    select.value = valor;
    if (select.selectedIndex < 0) select.selectedIndex = 0;
  }
  const normalizar = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const catalogo = () => window.SrModelosDocumentos?.modelos ?? [];
  const dataCurta = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

  function clientes(s) {
    const { busca, cliente } = s.el;
    const termo = normalizar(busca.value);
    const digitos = termo.replace(/[^0-9]/g, "");
    const itens = api.clientes().filter(c => normalizar(c.nome).includes(termo) ||
      (digitos && /^[\d.\s/-]+$/.test(termo) && String(c.documento || c.cpf || "").replace(/\D/g, "").includes(digitos)));
    opcoes(cliente, itens.map(c => [c.id, [c.nome, c.documento || c.cpf].filter(Boolean).join(" · ")]),
      itens.length ? "Selecione o cliente" : "Nenhum cliente encontrado", cliente.value);
    controles(s);
  }

  function biblioteca(s) {
    const docs = [...s.docs.values()].sort((a, b) => String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)));
    const nomes = new Map(api.clientes().map(c => [c.id, c.nome]));
    opcoes(s.el.rascunhos, docs.map(d => [d.id, [d.titulo || "Sem título", nomes.get(d.clienteId),
      dataCurta.format(new Date(d.atualizadoEm))].filter(Boolean).join(" · ")]),
      docs.length ? "Escolha um rascunho" : "Nenhum rascunho", s.doc?.id ?? "");
  }

  function dizer(el, mensagem) {
    if (el.textContent !== mensagem) el.textContent = mensagem;
  }
  function controles(s) {
    const e = s.el;
    e.gerar.disabled = s.sujo || !e.modelo.value || !e.cliente.value;
    e.rascunhos.disabled = s.sujo || !s.docs.size;
    e.salvar.disabled = !s.sujo || s.gravando || s.erro === "conflito";
    e.copia.hidden = !s.erro;
    e.revisado.disabled = !prontoParaRevisao(s);
    e.revisado.checked = !!s.aprovado;
    e.exportar.disabled = e.imprimir.disabled = !podeEmitir(s);
    const mensagem = s.erro === "conflito"
      ? "Conflito: outra revisão foi salva. Sua edição continua aqui. Salve como outra cópia para preservá-la."
      : s.erro ? "Falha ao salvar. Sua edição continua aqui. Tente salvar novamente ou baixe o rascunho em texto."
      : s.gravando || s.sujo ? "Salvando neste navegador…"
      : s.doc ? "Rascunho salvo neste navegador." : "";
    dizer(e.status, mensagem);
    if (s.sujo) window.addEventListener("beforeunload", protegerRecarga);
    else window.removeEventListener("beforeunload", protegerRecarga);
  }

  const lacunas = texto => [...texto.matchAll(/\[[^\[\]\r\n]*\]/g)];
  const marcadores = doc => lacunas(doc.titulo).length + lacunas(doc.texto).length;
  function prontoParaRevisao(s) {
    return s.doc && !s.sujo && !s.gravando && !s.erro && s.doc.titulo.trim() && s.doc.texto.trim() && !marcadores(s.doc);
  }
  function podeEmitir(s) {
    return prontoParaRevisao(s) && s.aprovado?.id === s.doc.id &&
      s.aprovado.titulo === s.doc.titulo && s.aprovado.texto === s.doc.texto;
  }
  function pendencias(s) {
    const n = marcadores(s.doc);
    s.el.proximo.hidden = !n;
    dizer(s.el.pendencias, n ? `${n === 1 ? "1 campo entre colchetes" : n + " campos entre colchetes"}. Preencha antes de revisar.`
      : !s.doc.titulo.trim() || !s.doc.texto.trim() ? "Preencha o título e o texto antes de revisar." : "");
  }
  function proximoCampo(s) {
    if (!s.doc) return;
    const campo = s.ultimoCampo || "texto";
    const outro = campo === "texto" ? "titulo" : "texto";
    const itens = lacunas(s.doc[campo]);
    const adiante = itens.find(m => m.index >= s.el[campo].selectionEnd);
    const seguinte = adiante ? null : lacunas(s.doc[outro])[0];
    const trecho = adiante || seguinte || itens[0];
    if (!trecho) return;
    const el = s.el[seguinte ? outro : campo];
    el.setSelectionRange(trecho.index, trecho.index + trecho[0].length);
    el.focus();
  }
  function contexto(s) {
    const c = api.clientes().find(item => item.id === s.doc.clienteId);
    const m = catalogo().find(item => item.id === s.doc.modeloId);
    dizer(s.el.contexto, [m?.nome, c?.nome].filter(Boolean).join(" · "));
  }

  function abrir(s, doc, focar = false) {
    s.doc = doc ? { ...doc } : null;
    s.erro = "";
    s.aprovado = null;
    s.ultimoCampo = "texto";
    const e = s.el;
    e.folha.hidden = !doc;
    e.vazio.hidden = !!doc;
    e.titulo.value = doc?.titulo ?? "";
    e.texto.value = doc?.texto ?? "";
    e.rascunhos.value = doc?.id ?? "";
    dizer(e.aviso, "");
    if (doc) {
      contexto(s);
      pendencias(s);
      if (focar) e.titulo.focus();
    }
    controles(s);
  }

  // Um escritor por sessão: a próxima edição usa a versão devolvida pela anterior.
  function gravar(s) {
    if (!vigente(s)) return Promise.resolve(false);
    if (s.gravando) return s.trabalho;
    if (s.erro || !s.sujo) return Promise.resolve(!s.sujo);
    s.gravando = true;
    controles(s);
    s.trabalho = Promise.resolve().then(async () => {
      try {
        while (vigente(s) && s.sujo) {
          const mudanca = s.mudanca;
          const salvo = await api.salvar({ ...s.doc }, s.doc.atualizadoEm ?? null);
          if (!vigente(s)) return false;
          if (salvo?.id !== s.doc.id || !salvo.atualizadoEm) throw new Error("Resposta de gravação inválida");
          s.docs.set(salvo.id, { ...salvo });
          s.doc.atualizadoEm = salvo.atualizadoEm;
          s.sujo = s.mudanca !== mudanca;
          biblioteca(s);
        }
        return vigente(s);
      } catch (erro) {
        if (vigente(s)) s.erro = erro?.code === "CONFLITO" ? "conflito" : "falha";
        return false;
      } finally {
        s.gravando = false;
        if (vigente(s)) controles(s);
      }
    });
    return s.trabalho;
  }

  function editar(s) {
    s.sujo = true;
    s.aprovado = null;
    s.mudanca++;
    dizer(s.el.aviso, "");
    pendencias(s);
    controles(s);
    if (!s.erro) void gravar(s);
  }

  async function prepararSaida() {
    const s = atual;
    if (!s || !vigente(s)) return true;
    while (s.sujo) {
      if (s.erro === "falha") s.erro = "";
      if (!(await gravar(s)) || !vigente(s)) return false;
    }
    if (s.aprovado) {
      s.aprovado = null;
      controles(s);
    }
    return true;
  }

  function idNovo() {
    return window.crypto.randomUUID?.() ||
      "doc-" + Array.from(window.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
  }
  function gerar(s) {
    if (s.sujo) return;
    const modelo = catalogo().find(m => String(m.id) === s.el.modelo.value);
    const cliente = api.clientes().find(c => String(c.id) === s.el.cliente.value);
    if (!modelo || !cliente) return;
    const hoje = new Date();
    const data = [hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()].map(n => String(n).padStart(2, "0")).join("-");
    const usuario = api.usuario();
    const profissional = Object.fromEntries(["id", "nome", "email", "telefone", "cargo", "oab", "oabUf", "oabNumero"].map(k => [k, usuario[k]]));
    try {
      const texto = window.SrModelosDocumentos.gerar(modelo.id, JSON.parse(JSON.stringify(cliente)), profissional, data);
      if (typeof texto !== "string" || !texto.trim()) throw new Error("Modelo vazio");
      abrir(s, { id: idNovo(), clienteId: cliente.id, modeloId: modelo.id, titulo: modelo.nome, texto }, true);
      editar(s);
    } catch {
      dizer(s.el.aviso, "Não foi possível gerar a minuta. Confira o modelo e o cliente.");
    }
  }

  function copiar(s) {
    if (s.gravando || !s.erro || !s.doc) return;
    abrir(s, { ...s.doc, id: idNovo(), atualizadoEm: null, titulo: (s.doc.titulo || "Minuta") + " (cópia)" }, true);
    editar(s);
    // Atualiza também a revisão concorrente, sem carregá-la sobre o editor.
    void renderizar();
  }

  function montar(s) {
    raiz().innerHTML = layout; // Apenas marcação constante; dados entram via value/textContent.
    s.el = Object.fromEntries([...raiz().querySelectorAll("[id]")].map(el => [el.id.slice(5), el]));
    const e = s.el;
    if (api.nuvem) {
      e.nuvem.hidden = false;
      statusNuvem();
      e.verificar.onclick = async () => {
        if (!vigente(s)) return;
        e.verificar.disabled = true;
        try { await api.nuvem.verificar(); } finally { e.verificar.disabled = false; }
      };
      e.sincronizar.onclick = () => { if (vigente(s)) void api.nuvem.sincronizar(true); };
      e.gerarchave.onclick = () => {
        if (!vigente(s)) return;
        e.chave.value = api.nuvem.gerar(); e.chave.type = "text";
      };
      e.vincular.onclick = async () => {
        if (!vigente(s)) return;
        e.vincular.disabled = true;
        const admin = e.admin.value;
        e.admin.value = "";
        try {
          await api.nuvem.vincular(e.chave.value.trim(),admin);
          if (vigente(s)) { e.chave.value = ""; e.chave.type = "password"; e.parear.open = false; dizer(e["vinculo-status"], ""); }
        } catch (err) { if (vigente(s)) dizer(e["vinculo-status"], err.message); }
        finally { e.vincular.disabled = false; }
      };
      e.revelar.onclick = () => {
        if (!vigente(s)) return;
        e.compartilhar.hidden = !e.compartilhar.hidden;
        e.compartilhar.value = e.compartilhar.hidden ? "" : api.nuvem.chave();
        if (!e.compartilhar.hidden) e.compartilhar.select();
      };
    }
    function ouvir(el, tipo, fn) {
      el.addEventListener(tipo, () => { if (vigente(s)) fn(); });
    }
    ouvir(e.busca, "input", () => clientes(s));
    for (const el of [e.cliente, e.modelo]) ouvir(el, "change", () => controles(s));
    ouvir(e.gerar, "click", () => gerar(s));
    ouvir(e.rascunhos, "change", () => { if (!s.sujo) abrir(s, s.docs.get(e.rascunhos.value), true); });
    for (const campo of ["titulo", "texto"]) {
      ouvir(e[campo], "focus", () => { s.ultimoCampo = campo; });
      ouvir(e[campo], "input", () => {
        if (!s.doc) return;
        s.doc[campo] = e[campo].value;
        editar(s);
      });
    }
    ouvir(e.proximo, "click", () => proximoCampo(s));
    ouvir(e.salvar, "click", () => { if (s.erro !== "conflito") { s.erro = ""; void gravar(s); } });
    ouvir(e.copia, "click", () => copiar(s));
    ouvir(e.revisado, "change", () => {
      s.aprovado = e.revisado.checked && prontoParaRevisao(s)
        ? { id: s.doc.id, titulo: s.doc.titulo, texto: s.doc.texto } : null;
      controles(s);
    });
    ouvir(e.exportar, "click", () => emitir(s, false));
    ouvir(e.imprimir, "click", () => emitir(s, true));
    ouvir(e.backup, "click", () => baixarRascunho(s));
  }

  async function renderizar() {
    if (!raiz()) return;
    const chave = identidade();
    if (chave !== atual?.chave) sair();
    if (!chave) {
      raiz().textContent = "Acesso a documentos indisponível.";
      return;
    }
    if (!atual) {
      atual = { chave, docs: new Map(), doc: null, leitura: 0, mudanca: 0, sujo: false, gravando: false, erro: "" };
      montar(atual);
    }
    const s = atual, e = s.el;
    const modelos = catalogo();
    opcoes(e.modelo, modelos.map(m => [m.id, m.nome]), modelos.length ? "Selecione o modelo" : "Nenhum modelo disponível", e.modelo.value);
    clientes(s);
    if (s.doc) contexto(s);
    const pedido = ++s.leitura, mudanca = s.mudanca, estavaSujo = s.sujo;
    const anteriores = new Map(s.docs);
    dizer(e["lista-status"], "Carregando rascunhos…");
    try {
      const docs = await api.listar();
      if (!vigente(s) || s.leitura !== pedido) return;
      const lista = new Map(docs.map(d => [d.id, { ...d }]));
      const protegido = estavaSujo || s.sujo || s.mudanca !== mudanca;
      // A leitura pode ter começado antes da confirmação de um ou mais salvamentos.
      for (const [id, local] of s.docs) {
        if (local !== anteriores.get(id) && (!lista.has(id) || local.atualizadoEm > lista.get(id).atualizadoEm)) lista.set(id, local);
      }
      s.docs = lista;
      biblioteca(s);
      if (!protegido && s.doc) {
        const revisao = s.docs.get(s.doc.id);
        if (!revisao || revisao.atualizadoEm !== s.doc.atualizadoEm) abrir(s, revisao);
      }
      controles(s);
      dizer(e["lista-status"], docs.length ? "" : "Nenhum rascunho salvo neste navegador.");
    } catch {
      if (vigente(s) && s.leitura === pedido) dizer(e["lista-status"], "Não foi possível carregar os rascunhos. Abra a aba novamente.");
    }
  }

  function xml(texto) {
    return texto.replace(/[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function word(doc) {
    const ns = "http://schemas.openxmlformats.org/";
    const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    function paragrafo(linha, titulo = false) {
      const texto = linha.split("\t").map(v => `<w:t xml:space="preserve">${xml(v)}</w:t>`).join("<w:tab/>");
      return `<w:p><w:r>${titulo ? "<w:rPr><w:b/><w:sz w:val=\"28\"/></w:rPr>" : ""}${texto}</w:r></w:p>`;
    }
    const corpo = doc.texto.split(/\r\n?|\n/).map(l => paragrafo(l)).join("");
    const entradas = [
      { nome: "[Content_Types].xml", conteudo: `<Types xmlns="${ns}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="${mime}.main+xml"/></Types>` },
      { nome: "_rels/.rels", conteudo: `<Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${ns}officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
      { nome: "word/document.xml", conteudo: `<w:document xmlns:w="${ns}wordprocessingml/2006/main"><w:body>${paragrafo(doc.titulo, true)}${corpo}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:bottom="1417" w:left="1417" w:right="1417"/></w:sectPr></w:body></w:document>` }
    ];
    window.baixarBlob(new Blob([window.criarZipSemCompressao(entradas)], { type: mime }), `Minuta - ${nomeArquivo(doc)}.docx`);
  }

  function nomeArquivo(doc) {
    return doc.titulo.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").trim().slice(0, 100) || "Documento";
  }
  function baixarRascunho(s) {
    if (!s.doc) return;
    try {
      const corpo = "RASCUNHO NÃO FINAL\n\n" + s.doc.titulo + "\n\n" + s.doc.texto;
      window.baixarBlob(new Blob(["\uFEFF", corpo], { type: "text/plain;charset=utf-8" }), `Rascunho não final - ${nomeArquivo(s.doc)}.txt`);
      dizer(s.el.aviso, "Download do rascunho em texto solicitado.");
    } catch {
      dizer(s.el.aviso, "Não foi possível baixar o rascunho. O texto continua no editor.");
    }
  }

  function imprimir(doc) {
    impressao?.remove();
    const frame = document.createElement("iframe");
    impressao = frame;
    frame.title = "Impressão da minuta";
    frame.className = "print-frame";
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    document.body.append(frame);
    try {
      const pagina = frame.contentDocument;
      pagina.documentElement.lang = "pt-BR";
      pagina.title = "Minuta";
      const estilo = pagina.createElement("style");
      estilo.textContent = "@page{size:A4;margin:25mm}body{font:12pt/1.55 Georgia,serif;color:#111}h1{font-size:16pt}h1,article{white-space:pre-wrap;overflow-wrap:anywhere}p{font:10pt sans-serif}";
      pagina.head.append(estilo);
      for (const [tag, valor] of [["p", "Minuta"], ["h1", doc.titulo], ["article", doc.texto]]) {
        const el = pagina.createElement(tag);
        el.textContent = valor;
        pagina.body.append(el);
      }
      frame.contentWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (erro) {
      frame.remove();
      throw erro;
    }
  }

  function emitir(s, papel) {
    if (!vigente(s) || !podeEmitir(s)) return;
    try {
      if (papel) imprimir(s.doc);
      else word(s.doc);
      dizer(s.el.aviso, papel ? "Para obter o PDF, escolha salvar em PDF na impressão." : "Download da minuta em Word solicitado.");
    } catch {
      dizer(s.el.aviso, papel ? "Não foi possível abrir a impressão." : "Não foi possível baixar o Word. O texto continua no editor.");
    }
  }

  function statusNuvem() {
    if (!atual?.el?.remoto || !vigente(atual) || !api?.nuvem) return;
    const e = atual.el, status = api.nuvem.estado();
    dizer(e.remoto, status.texto);
    e["nuvem-editor"].hidden = !atual.doc;
    dizer(e["nuvem-editor"], status.texto);
    e.verificar.hidden = status.vinculado || status.disponivel;
    e.sincronizar.hidden = e.revelar.hidden = !status.vinculado;
    e.parear.hidden = status.vinculado || !status.disponivel;
  }
  window.SrDocumentos = { iniciar(ponte) { sair(); api = ponte; }, renderizar, prepararSaida, sair, statusNuvem };
})();
