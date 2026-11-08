const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const fonte = fs.readFileSync(require.resolve("../documentos.js"), "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));
function espera() {
  let resolve, reject;
  const promise = new Promise((ok, falha) => { resolve = ok; reject = falha; });
  return { promise, resolve, reject };
}

function ponte() {
  const p = {
    u: { id: "u1", nome: "Profissional Fictícia" }, office: "instalacao-A", permitido: true, acessoClientes: true,
    cliente: { id: "c1", nome: "Ágata Exemplo", documento: "000.000.000-00", extra: { cidade: "Cidade Fictícia" } },
    chamadas: [], leituras: 0, registros: new Map(), contador: 0,
    usuario: () => p.u, escritorio: () => p.office,
    temAcesso: aba => aba === "documentos" && p.permitido,
    clientes: () => p.acessoClientes ? [p.cliente, { id: "c2", nome: "Outro Exemplo" }] : [],
    escopo: () => JSON.stringify([p.office, p.u?.id]),
    lista: () => [...(p.registros.get(p.escopo())?.values() ?? [])].map(d => ({ ...d })),
    async listar() { p.leituras++; return p.ler ? p.ler() : p.lista(); },
    async salvar(doc, base) {
      const chave = p.escopo();
      p.chamadas.push({ doc: { ...doc }, base, chave });
      if (p.antes) await p.antes();
      if (chave !== p.escopo() || !p.permitido) throw Error("Sem acesso");
      if (!p.registros.has(chave)) p.registros.set(chave, new Map());
      const docs = p.registros.get(chave);
      if ((docs.get(doc.id)?.atualizadoEm ?? null) !== base) throw Object.assign(Error("Revisão mudou"), { code: "CONFLITO" });
      const salvo = { ...doc, atualizadoEm: new Date(Date.UTC(2026, 0, 1) + ++p.contador).toISOString() };
      docs.set(doc.id, salvo);
      return { ...salvo };
    }
  };
  return p;
}

function ambiente(t, p = ponte()) {
  const dom = new JSDOM('<main><section class="view" id="view-documentos"></section></main>', { runScripts: "outside-only", url: "https://ficticio.invalid/" });
  t.after(() => dom.window.close());
  const w = dom.window;
  const modelo = Object.freeze({ id: "procuracao", nome: "Procuração fictícia" });
  w.SrModelosDocumentos = {
    modelos: Object.freeze([modelo, Object.freeze({ id: "contrato", nome: "Contrato fictício" })]),
    gerar(id, cliente, usuario, data) {
      assert.equal(id, modelo.id);
      assert.deepEqual(JSON.parse(JSON.stringify(cliente)), p.cliente);
      assert.equal(usuario.nome, p.u.nome);
      assert.match(data, /^\d{4}-\d{2}-\d{2}$/);
      cliente.extra.cidade = "Nunca alterar o cadastro";
      return cliente.nome + "\nPoderes: [especificar]. Representante: [...]";
    }
  };
  w.Blob = Blob;
  const downloads = [];
  w.baixarBlob = (blob, nome) => downloads.push({ blob, nome });
  vm.runInContext(fonte, dom.getInternalVMContext());
  const api = w.SrDocumentos;
  api.iniciar(p);
  const el = id => w.document.getElementById("docs-" + id);
  function alterar(id, valor) {
    el(id).value = valor;
    el(id).dispatchEvent(new w.Event(el(id).tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  }
  function gerar() {
    alterar("modelo", modelo.id);
    alterar("cliente", p.cliente.id);
    el("gerar").click();
    assert.equal(el("folha").hidden, false, el("aviso").textContent);
  }
  return { w, api, p, el, alterar, gerar, downloads, raiz: w.document.querySelector(".view") };
}

test("busca acessível por nome ou documento, geração independente e reabertura após recarga", async t => {
  const e = ambiente(t);
  await e.api.renderizar();
  for (const el of e.raiz.querySelectorAll("input,select,textarea")) assert.ok(el.labels.length);
  e.alterar("busca", "agata");
  assert.deepEqual([...e.el("cliente").options].map(o => o.value), ["", "c1"]);
  e.alterar("busca", "00000000000");
  assert.equal(e.el("cliente").options[1].value, "c1");
  e.alterar("busca", "inexistente");
  assert.equal(e.el("gerar").disabled, true);
  e.alterar("busca", "");
  e.gerar();
  assert.equal(await e.api.prepararSaida(), true);
  assert.equal(e.p.cliente.extra.cidade, "Cidade Fictícia");
  assert.match(e.el("pendencias").textContent, /2 campos/);
  const original = e.p.lista()[0];
  assert.equal(original.modeloId, "procuracao");
  assert.equal(original.clienteId, "c1");
  assert.equal(e.p.chamadas[0].base, null);
  e.alterar("titulo", "Título da cópia");
  e.alterar("texto", "Primeira linha\n\nÚltima linha");
  assert.equal(await e.api.prepararSaida(), true);
  await e.api.renderizar();
  assert.equal(e.el("texto").value, "Primeira linha\n\nÚltima linha");
  const nova = ambiente(t, e.p);
  await nova.api.renderizar();
  nova.alterar("rascunhos", original.id);
  assert.equal(nova.el("titulo").value, "Título da cópia");
  assert.equal(nova.el("texto").value, e.el("texto").value);
  assert.equal(nova.el("revisado").checked, false);
  assert.equal(e.p.lista().length, 1);
  assert.equal(e.w.localStorage.length + e.w.sessionStorage.length, 0);
});

test("Próximo campo seleciona cada lacuna, volta ao início e inclui lacunas do título", async t => {
  const e = ambiente(t); await e.api.renderizar(); e.gerar(); await e.api.prepararSaida();
  const texto = e.el("texto"), proximo = e.el("proximo");
  assert.equal(proximo.hidden, false);
  const escolher = esperado => {
    proximo.focus(); proximo.click();
    const el = e.w.document.activeElement;
    assert.equal(el.value.slice(el.selectionStart, el.selectionEnd), esperado);
    return el;
  };
  assert.equal(escolher("[especificar]"), texto);
  assert.equal(escolher("[...]"), texto);
  assert.equal(escolher("[especificar]"), texto);
  assert.equal(e.p.chamadas.length, 1);
  e.alterar("titulo", "Minuta [nome]");
  assert.equal(escolher("[...]"), texto);
  assert.equal(escolher("[nome]"), e.el("titulo"));
  assert.equal(escolher("[especificar]"), texto);
  e.alterar("texto", "Texto preenchido");
  assert.equal(escolher("[nome]"), e.el("titulo"));
  e.alterar("titulo", "Minuta conferida");
  assert.equal(proximo.hidden, true);
  assert.equal(e.el("pendencias").textContent, "");
  assert.equal(await e.api.prepararSaida(), true);
});

test("flush espera a última tecla, serializa versões e não deixa leitura atrasada apagar a edição", async t => {
  const e = ambiente(t);
  await e.api.renderizar(); e.gerar(); await e.api.prepararSaida();
  const inicial = e.p.lista()[0];
  const leitura = espera();
  e.p.ler = () => leitura.promise;
  const refresh = e.api.renderizar();
  const escrita = espera(); e.p.antes = () => escrita.promise;
  e.alterar("texto", "Primeira alteração"); await tick();
  e.alterar("texto", "Alteração mais recente");
  const evento = new e.w.Event("beforeunload", { cancelable: true });
  e.w.dispatchEvent(evento);
  assert.ok(evento.defaultPrevented);
  let liberado = false;
  const saida = e.api.prepararSaida().then(ok => liberado = ok);
  await tick();
  assert.equal(liberado, false);
  assert.equal(e.p.chamadas.length, 2);
  escrita.resolve(); await saida;
  assert.ok(liberado);
  leitura.resolve([inicial]); await refresh;
  assert.equal(e.el("texto").value, "Alteração mais recente");
  assert.equal(e.p.lista()[0].texto, e.el("texto").value);
  assert.equal(e.p.chamadas[1].base, inicial.atualizadoEm);
  assert.notEqual(e.p.chamadas[2].base, inicial.atualizadoEm);
  const limpo = new e.w.Event("beforeunload", { cancelable: true });
  e.w.dispatchEvent(limpo); assert.equal(limpo.defaultPrevented, false);
});

test("duas abas: conflito bloqueia saída; nova cópia preserva as duas revisões", async t => {
  const a = ambiente(t); await a.api.renderizar(); a.gerar(); await a.api.prepararSaida();
  const b = ambiente(t, a.p); await b.api.renderizar();
  const id = a.p.lista()[0].id; b.alterar("rascunhos", id);
  a.alterar("texto", "Revisão da primeira aba"); await a.api.prepararSaida();
  b.alterar("texto", "Revisão da segunda aba");
  assert.equal(await b.api.prepararSaida(), false);
  await b.api.renderizar();
  assert.match(b.el("status").textContent, /Conflito/);
  assert.equal(b.el("texto").value, "Revisão da segunda aba");
  assert.equal(b.el("exportar").disabled, true);
  assert.equal(a.p.lista()[0].texto, "Revisão da primeira aba");
  b.el("copia").click();
  assert.equal(await b.api.prepararSaida(), true);
  assert.equal(a.p.lista().length, 2);
  const copia = a.p.lista().find(d => d.id !== id);
  assert.equal(copia.texto, "Revisão da segunda aba");
  assert.equal(a.p.chamadas.at(-1).base, null);
  b.alterar("rascunhos", id);
  assert.equal(b.el("texto").value, "Revisão da primeira aba");
});

test("falha não libera navegação/logout; permite backup não final e nova tentativa", async t => {
  const e = ambiente(t); await e.api.renderizar(); e.gerar(); await e.api.prepararSaida();
  e.p.antes = async () => { throw Error("Quota"); };
  e.alterar("texto", "Texto em risco");
  assert.equal(await e.api.prepararSaida(), false);
  assert.match(e.el("status").textContent, /Falha ao salvar/);
  assert.equal(e.el("gerar").disabled, true);
  assert.equal(e.el("imprimir").disabled, true);
  assert.equal(e.el("exportar").disabled, true);
  e.el("backup").click();
  const { blob, nome } = e.downloads[0];
  assert.match(nome, /^Rascunho não final .*\.txt$/);
  assert.match(await blob.text(), /^RASCUNHO NÃO FINAL[\s\S]*Texto em risco$/);
  assert.equal(await e.api.prepararSaida(), false);
  e.p.antes = null;
  assert.equal(await e.api.prepararSaida(), true);
  assert.equal(e.p.lista()[0].texto, "Texto em risco");
});

test("sem autorização não consulta clientes, modelos ou rascunhos; revogação bloqueia eventos antigos", async t => {
  const e = ambiente(t); e.p.permitido = false;
  const getClientes = e.p.clientes; e.p.clientes = () => assert.fail("Consulta sem acesso");
  await e.api.renderizar();
  assert.equal(e.p.leituras, 0);
  assert.equal(e.el("modelo"), null);
  e.p.permitido = true; e.p.clientes = getClientes; e.p.acessoClientes = false;
  await e.api.renderizar();
  assert.equal(e.el("cliente").options.length, 1);
  assert.ok(e.el("gerar").disabled);
  e.p.acessoClientes = true; await e.api.renderizar(); e.gerar(); await e.api.prepararSaida();
  const backup = e.el("backup"); e.p.permitido = false;
  backup.click();
  assert.equal(e.downloads.length, 0);
  assert.equal(e.raiz.childElementCount, 0);
  await e.api.renderizar();
  assert.doesNotMatch(e.raiz.textContent, /Ágata|Procuração/);
});

test("troca de escritório ou usuário invalida DOM, leitura e gravação em voo", async t => {
  const e = ambiente(t); await e.api.renderizar(); e.gerar(); await e.api.prepararSaida();
  const anterior = e.p.lista();
  const ler = espera(), salvar = espera(); e.p.ler = () => ler.promise; e.p.antes = () => salvar.promise;
  const refresh = e.api.renderizar();
  e.alterar("texto", "Sigiloso do primeiro escritório"); await tick();
  const botao = e.el("backup");
  e.p.office = "instalacao-B"; e.p.ler = null; e.p.acessoClientes = false;
  await e.api.renderizar();
  botao.click();
  salvar.resolve(); ler.resolve(anterior); await refresh; await tick();
  assert.equal(e.downloads.length, 0);
  assert.equal(e.el("texto").value, "");
  assert.equal(e.el("rascunhos").options.length, 1);
  assert.equal(e.p.lista().length, 0);
  e.p.office = "instalacao-A"; e.p.acessoClientes = true; await e.api.renderizar();
  e.alterar("rascunhos", anterior[0].id);
  e.api.sair(); assert.equal(e.raiz.childElementCount, 0);
  e.p.u = { id: "u2", nome: "Outra Profissional Fictícia" }; await e.api.renderizar();
  assert.equal(e.el("rascunhos").options.length, 1);
  assert.equal(e.el("texto").value, "");
  e.p.u = { id: "u1" }; await e.api.renderizar();
  e.alterar("rascunhos", anterior[0].id);
  assert.equal(e.el("texto").value, anterior[0].texto);
});

// Lê os registros locais do ZIP produzido pelo helper real de app.js.
function entradasZip(buf) {
  const entradas = new Map();
  let pos = 0;
  while (buf.readUInt32LE(pos) === 0x04034b50) {
    const tam = buf.readUInt32LE(pos + 18), nome = buf.readUInt16LE(pos + 26);
    const dados = pos + 30 + nome + buf.readUInt16LE(pos + 28);
    entradas.set(buf.toString("utf8", pos + 30, pos + 30 + nome), buf.toString("utf8", dados, dados + tam));
    pos = dados + tam;
  }
  assert.equal(buf.readUInt32LE(pos), 0x02014b50);
  assert.equal(buf.readUInt32LE(buf.length - 22), 0x06054b50);
  return entradas;
}

test("Word e impressão exigem revisão do texto exato; XML e impressão não interpretam HTML", async t => {
  const e = ambiente(t); await e.api.renderizar(); e.gerar(); await e.api.prepararSaida();
  const id = e.p.lista()[0].id;
  e.w.criarZipSemCompressao = require("./app-ambiente.cjs").ambiente().contexto.criarZipSemCompressao;
  const enviarClick = campo => e.el(campo).dispatchEvent(new e.w.Event("click"));
  enviarClick("exportar"); enviarClick("imprimir");
  assert.equal(e.downloads.length, 0);
  assert.equal(e.w.document.querySelector("iframe"), null);
  assert.ok(e.el("revisado").disabled);
  const titulo = 'Minuta <PJ> & sócia', texto = ' Ação\t<xml> & "texto"\n\n<img src=x onerror=alert(1)>';
  e.alterar("texto", texto); e.alterar("titulo", "[título]");
  await e.api.prepararSaida(); assert.ok(e.el("revisado").disabled);
  e.alterar("titulo", titulo); await e.api.prepararSaida();
  assert.equal(e.el("exportar").disabled, true);
  e.el("revisado").click();
  assert.equal(e.el("exportar").disabled, false);
  e.el("exportar").click();
  const { blob, nome } = e.downloads[0];
  assert.match(nome, /^Minuta .*\.docx$/);
  assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  const entradas = entradasZip(Buffer.from(await blob.arrayBuffer()));
  assert.deepEqual([...entradas.keys()].sort(), ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]);
  const parser = new e.w.DOMParser();
  for (const parte of entradas.values()) assert.equal(parser.parseFromString(parte, "application/xml").querySelector("parsererror"), null);
  const xml = parser.parseFromString(entradas.get("word/document.xml"), "application/xml");
  const ns = xml.documentElement.namespaceURI;
  const paragrafos = [...xml.getElementsByTagNameNS(ns, "p")];
  assert.deepEqual(paragrafos.map(p => p.textContent), [titulo, ' Ação<xml> & "texto"', "", "<img src=x onerror=alert(1)>"]);
  assert.equal(xml.getElementsByTagNameNS(ns, "tab").length, 1);
  let impresso;
  const body = e.w.document.body, append = body.append.bind(body);
  body.append = frame => {
    append(frame);
    frame.contentWindow.focus = () => {};
    frame.contentWindow.print = () => { impresso = frame.contentDocument; };
  };
  e.el("imprimir").click();
  assert.equal(impresso.querySelector("article").textContent, texto);
  assert.equal(impresso.querySelector("h1").textContent, titulo);
  assert.equal(impresso.querySelector("img,script,button,input"), null);
  assert.ok(!e.w.document.querySelector("iframe").getAttribute("sandbox").includes("allow-scripts"));
  e.alterar("titulo", titulo + "!"); await e.api.prepararSaida();
  assert.equal(e.el("revisado").checked, false);
  assert.equal(e.el("imprimir").disabled, true);
  e.el("revisado").click(); e.alterar("texto", texto + " alterado");
  assert.equal(e.el("exportar").disabled, true); await e.api.prepararSaida();
  e.el("revisado").click(); e.alterar("rascunhos", ""); e.alterar("rascunhos", id);
  assert.equal(e.el("imprimir").disabled, true);
  assert.equal(e.el("revisado").checked, false);
  e.api.sair();
  assert.equal(e.w.document.querySelector("iframe"), null);
});
