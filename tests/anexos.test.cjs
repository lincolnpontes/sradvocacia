const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const inicializacao = 'const state = aplicarConfigSyncLocal(normalizarEstado(carregarEstado()));';
assert.ok(source.includes(inicializacao));
assert.ok(source.includes('\niniciar();'));
// Carrega as funcoes reais sem inicializar a interface ou a sincronizacao.
const isolatedSource = source.replace(inicializacao, 'const state = __testState;').replace('\niniciar();', '');

function ambiente(anexos = []) {
  const elementos = new Map();
  const criados = [];
  const revogados = [];
  const timers = [];
  const alerts = [];
  const abertos = [];
  const gravacoes = [];
  const values = new Map();
  let destino;
  function elemento(tag = 'div') {
    return {
      tagName: tag.toUpperCase(), dataset: {}, children: [], textContent: '', innerHTML: '',
      classList: { toggle() {}, add() {}, remove() {} },
      appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      showModal() { this.open = true; },
      remove() { this.removed = true; },
      click() { this.clicked = true; }
    };
  }
  const contexto = vm.createContext({
    __testState: { atualizadoEm: '2026-10-10T12:00:00Z', atendimentos: [{ id: 'at-1', anexos }], avancadas: { syncToken: 'test-only' } },
    Blob, TextEncoder, Uint8Array, atob, navigator: { pdfViewerEnabled: true },
    URL: class extends URL {
      static createObjectURL(blob) { const url = `blob:test-${criados.length}`; criados.push({ url, blob }); return url; }
      static revokeObjectURL(url) { revogados.push(url); }
    },
    document: {
      body: elemento('body'),
      querySelector(selector) {
        if (!elementos.has(selector)) elementos.set(selector, elemento());
        return elementos.get(selector);
      },
      createElement(tag) { const el = elemento(tag); elementos.set(`created-${elementos.size}`, el); return el; }
    },
    window: {
      open(...args) { abertos.push(args); return null; },
      location: { href: 'https://example.test/sradvocacia/?admin=keep#atendimentos', replace(url) { destino = url; } },
      caches: { keys() { throw new Error('Caches nao devem ser acessados.'); } }
    },
    localStorage: {
      getItem(key) { return values.get(key) || null; },
      removeItem(key) { values.delete(key); },
      setItem(key, value) { values.set(key, value); gravacoes.push({ key, value }); }
    },
    setTimeout(fn, ms) { timers.push({ fn, ms }); },
    alert(message) { alerts.push(message); }
  });
  vm.runInContext(isolatedSource, contexto);
  contexto.__anexos = anexos;
  vm.runInContext('documentosAtendimento = __anexos;', contexto);
  return { contexto, elementos, criados, revogados, timers, alerts, abertos, gravacoes, values, destino: () => destino };
}

function arquivo(nome, tipo, bytes) {
  const buffer = Buffer.from(bytes);
  return { id: nome, nome, tipo, tamanho: buffer.length, dataUrl: `data:${tipo};base64,${buffer.toString('base64')}`, adicionadoEm: '2026-10-10T12:00:00Z' };
}

for (const [nome, tipo, bytes] of [
  ['Contrato assinado.pdf', 'application/pdf', Buffer.from('%PDF-1.4\n% teste\n%%EOF')],
  ['Procuracao.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', [80, 75, 3, 4, 0, 255, 128]],
  ['Foto.png', 'image/png', [137, 80, 78, 71, 13, 10, 26, 10, 255, 0]],
  ['Anotacao.txt', 'text/plain', Buffer.from('Observacoes e reuniao')],
  ['Arquivo sem tipo.bin', 'application/octet-stream', [0, 1, 127, 128, 254, 255]]
]) {
  test(`download preserva nome e todos os bytes: ${nome}`, async () => {
    const anexo = arquivo(nome, tipo, bytes);
    const before = JSON.stringify(anexo);
    const env = ambiente([anexo]);
    env.contexto.baixarDocumentoAtendimento(anexo.id);
    assert.equal(env.alerts.length, 0);
    assert.equal(env.criados.length, 1);
    assert.deepEqual(Buffer.from(await env.criados[0].blob.arrayBuffer()), Buffer.from(bytes));
    assert.equal(env.criados[0].blob.type, tipo);
    const link = [...env.elementos.values()].find((el) => el.tagName === 'A');
    assert.equal(link.download, nome);
    assert.equal(link.href, env.criados[0].url);
    assert.equal(link.target, '_blank');
    assert.equal(link.rel, 'noopener noreferrer');
    assert.ok(link.clicked && link.removed);
    assert.equal(env.revogados.length, 0);
    assert.equal(env.timers[0].ms, 60000);
    env.timers[0].fn();
    assert.deepEqual(env.revogados, [link.href]);
    assert.equal(JSON.stringify(anexo), before);
    assert.equal(env.gravacoes.length, 0);
  });
}

test('anexo antigo com url e nome normalizados continua disponivel', async () => {
  const original = { id: 'legacy', name: 'antigo.txt', type: 'text/plain', size: 3, url: 'data:text/plain;base64,YWJj' };
  const env = ambiente();
  const anexo = env.contexto.normalizarAnexoAtendimento(original);
  const resultado = env.contexto.arquivoDoAnexoAtendimento(anexo);
  assert.equal(anexo.nome, 'antigo.txt');
  assert.equal(await resultado.blob.text(), 'abc');
  assert.equal(original.url, 'data:text/plain;base64,YWJj');
});

test('data URL textual com caracteres UTF-8 e virgula', async () => {
  const env = ambiente();
  const resultado = env.contexto.arquivoDoAnexoAtendimento({ dataUrl: 'data:text/plain;charset=UTF-8,Jo%C3%A3o%2C%20Pessoa' });
  assert.equal(await resultado.blob.text(), 'Jo\u00e3o, Pessoa');
});

for (const tipo of ['application/pdf', 'image/png']) {
  test(`preview local de ${tipo} nao depende de pop-ups`, () => {
    const anexo = arquivo('teste', tipo, [0, 1, 255]);
    const env = ambiente([anexo]);
    env.contexto.abrirDocumentoAtendimento('teste');
    const preview = env.elementos.get('#documentoPreview').children[0];
    assert.equal(preview.tagName, tipo === 'image/png' ? 'IMG' : 'P');
    if (tipo === 'image/png') assert.equal(preview.src, env.criados[0].url);
    else assert.equal(env.criados.length, 0);
    assert.equal(env.elementos.get('#modalDocumento').open, true);
    assert.equal(env.elementos.get('#documentoTitulo').textContent, 'teste');
    assert.equal(env.abertos.length, 0);
    assert.equal(env.gravacoes.length, 0);
    env.contexto.limparPreviewDocumento();
    assert.deepEqual(env.revogados, tipo === 'image/png' ? [preview.src] : []);
    assert.equal(env.elementos.get('#documentoPreview').children.length, 0);
  });
}

test('conteudo HTML anexado nao e executado em um iframe', () => {
  const env = ambiente([arquivo('teste.html', 'text/html', '<script>alert(1)</script>')]);
  env.contexto.abrirDocumentoAtendimento('teste.html');
  assert.equal(env.elementos.get('#documentoPreview').children[0].tagName, 'P');
  assert.equal(env.criados.length, 0);
});

test('PDF permanece baixavel sem depender de plugin nativo do navegador', () => {
  const env = ambiente([arquivo('teste.pdf', 'application/pdf', '%PDF-1.4')]);
  env.contexto.navigator.pdfViewerEnabled = false;
  env.contexto.abrirDocumentoAtendimento('teste.pdf');
  assert.equal(env.elementos.get('#documentoPreview').children[0].tagName, 'P');
  assert.match(env.elementos.get('#documentoPreview').children[0].textContent, /indispon/);
  assert.equal(env.criados.length, 0);
});

test('links antigos do Drive nao exigem publicacao ou fetch com CORS', () => {
  const anexo = { id: 'drive', nome: 'antigo.pdf', dataUrl: 'https://drive.google.com/file/d/test-only/view' };
  const env = ambiente([anexo]);
  env.contexto.abrirDocumentoAtendimento('drive');
  env.contexto.baixarDocumentoAtendimento('drive');
  assert.deepEqual(env.abertos.map((args) => Array.from(args)), [
    [anexo.dataUrl, '_blank', 'noopener,noreferrer'], [anexo.dataUrl, '_blank', 'noopener,noreferrer']
  ]);
  assert.equal(env.gravacoes.length, 0);
});

for (const dataUrl of ['', 'data:application/pdf;base64,!!!', 'data:application/pdf;base64', 'javascript:alert(1)', 'blob:https://example.test/expirado']) {
  test(`erro preserva o registro: ${dataUrl || 'conteudo ausente'}`, () => {
    const anexo = { id: 'erro', nome: 'Documento.pdf', dataUrl };
    const env = ambiente([anexo]);
    const before = JSON.stringify(anexo);
    env.contexto.baixarDocumentoAtendimento('erro');
    assert.equal(env.alerts.length, 1);
    assert.equal(env.criados.length, 0);
    assert.equal(env.abertos.length, 0);
    assert.equal(JSON.stringify(anexo), before);
    assert.equal(env.gravacoes.length, 0);
  });
}

test('conteudo truncado nao gera um download aparentemente valido', () => {
  const anexo = arquivo('truncado.pdf', 'application/pdf', [1, 2]);
  anexo.tamanho = 300;
  const env = ambiente([anexo]);
  env.contexto.baixarDocumentoAtendimento(anexo.id);
  assert.match(env.alerts[0], /incompleto/);
  assert.equal(env.criados.length, 0);
  assert.equal(anexo.tamanho, 300);
});

test('normalizacao e payload de sync preservam anexos existentes e nao vazam token', () => {
  const anexos = [arquivo('existente.pdf', 'application/pdf', [0, 255, 15])];
  const env = ambiente(anexos);
  const antes = JSON.stringify(anexos);
  const normalizado = env.contexto.normalizarAtendimento({ id: 'at-1', anexos });
  assert.equal(JSON.stringify(normalizado.anexos), antes);
  const payload = env.contexto.estadoParaSync();
  assert.equal(JSON.stringify(payload.atendimentos[0].anexos), antes);
  assert.equal(payload.avancadas.syncToken, '');
  assert.equal(env.contexto.__testState.avancadas.syncToken, 'test-only');
});

test('renderizacao tem baixar separado de excluir e escapa nomes e ids', () => {
  const anexo = arquivo('"<cliente>.txt', 'text/plain', 'abc');
  const env = ambiente([anexo]);
  env.contexto.renderDocumentosAtendimento();
  const html = env.elementos.get('#atendimentoDocumentosLista').innerHTML;
  assert.match(html, /data-download-document=/);
  assert.match(html, /data-remove-document=/);
  assert.match(html, /&quot;&lt;cliente&gt;/);
  assert.doesNotMatch(html, /"<cliente>/);
});

test('delegacao do botao baixar nao abre nem remove o anexo', () => {
  const anexo = arquivo('test.txt', 'text/plain', 'abc');
  const env = ambiente([anexo]);
  env.contexto.gerenciarDocumentoAtendimento({ target: { closest(selector) { return selector === '[data-download-document]' ? { dataset: { downloadDocument: anexo.id } } : null; } } });
  assert.equal(env.criados.length, 1);
  assert.equal(env.abertos.length, 0);
  assert.equal(env.contexto.__anexos.length, 1);
});

test('refresh salva rascunho, preserva parametros e nunca limpa caches ou banco', async () => {
  const env = ambiente();
  let salvo = false;
  env.contexto.salvarRascunhoAtendimento = () => { salvo = true; };
  await env.contexto.forcarAtualizacao();
  assert.ok(salvo);
  const url = new URL(env.destino());
  assert.equal(url.searchParams.get('admin'), 'keep');
  assert.match(url.searchParams.get('v'), /^1\.0\.44-/);
  assert.equal(url.hash, '#atendimentos');
  assert.equal(env.gravacoes.length, 0);
});

test('refresh nao abandona anexos ainda sem notas', async () => {
  const env = ambiente();
  vm.runInContext('atendimentoModoEditor = true; atendimentoAlterado = true;', env.contexto);
  env.contexto.conteudoAtendimentoPreenchido = () => false;
  await env.contexto.forcarAtualizacao();
  assert.equal(env.destino(), undefined);
  assert.equal(env.alerts.length, 1);
});

test('erro de armazenamento cancela refresh em vez de perder edicao', async () => {
  const env = ambiente();
  env.contexto.salvarRascunhoAtendimento = () => { throw new Error('QuotaExceededError'); };
  await env.contexto.forcarAtualizacao();
  assert.equal(env.destino(), undefined);
  assert.match(env.alerts[0], /cancelada/);
});

test('versao muda sem criar chave de armazenamento nova', () => {
  assert.match(source, /const APP_VERSION = "1\.0\.44"/);
  assert.match(source, /const STORAGE_KEY = "sr-advocacia-gestao-juridica-v134"/);
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /app\.js\?v=1\.0\.44/);
  assert.match(html, /style\.css\?v=1\.0\.44/);
  assert.doesNotMatch(html, /1\.0\.43/);
});

function prepararSync(env) {
  const agendamentos = [];
  const status = [];
  env.contexto.idDispositivoSync = () => 'qa-device';
  env.contexto.nomeDispositivoSync = () => 'Dispositivo ficticio';
  env.contexto.atualizarStatusSync = (texto) => status.push(texto);
  env.contexto.agendarSincronizacao = (motivo) => agendamentos.push(motivo);
  for (const nome of ['aplicarTema', 'aplicarSidebar', 'atualizarPerfil', 'renderizarTudo']) env.contexto[nome] = () => {};
  env.contexto.aplicarDadosSync = (data) => Object.assign(env.contexto.__testState, JSON.parse(JSON.stringify(data)));
  vm.runInContext('syncPronto = true; syncMeta.dirty = true;', env.contexto);
  return { agendamentos, status, dirty: () => vm.runInContext('syncMeta.dirty', env.contexto) };
}

test('snapshot confirmado sem novas edicoes fica sincronizado', async () => {
  const env = ambiente([arquivo('antigo.txt', 'text/plain', 'abc')]);
  const sync = prepararSync(env);
  env.contexto.chamarAppsScriptSync = async () => ({ ok: true, status: 'saved', record: { serverVersion: 'v2' } });
  assert.equal(await env.contexto.enviarEstadoServidor(), true);
  assert.equal(sync.dirty(), false);
  assert.equal(sync.status.at(-1), 'Sincronizada');
  assert.equal(sync.agendamentos.length, 0);
});

test('alteracao feita durante push permanece local e pendente para proximo envio', async () => {
  const env = ambiente([arquivo('antigo.txt', 'text/plain', 'abc')]);
  const sync = prepararSync(env);
  let concluir;
  let enviado;
  env.contexto.chamarAppsScriptSync = (_, payload) => {
    enviado = payload.data;
    return new Promise((resolve) => { concluir = resolve; });
  };
  const push = env.contexto.enviarEstadoServidor();
  env.contexto.__testState.atendimentos[0].anexos.push(arquivo('novo.txt', 'text/plain', 'novo'));
  env.contexto.salvarEstado();
  concluir({ ok: true, status: 'saved', record: { serverVersion: 'v2' } });
  await push;
  assert.equal(enviado.atendimentos[0].anexos.length, 1);
  assert.equal(env.contexto.__testState.atendimentos[0].anexos.length, 2);
  assert.equal(sync.dirty(), true);
  assert.equal(sync.agendamentos.at(-1), 'alteracao-durante-envio');
  assert.doesNotMatch(sync.status.at(-1), /^Sincronizada$/);
});

test('resposta merged nao apaga anexo salvo durante o envio', async () => {
  const env = ambiente([arquivo('antigo.txt', 'text/plain', 'abc')]);
  const sync = prepararSync(env);
  let concluir;
  let remoto;
  env.contexto.chamarAppsScriptSync = (_, payload) => {
    remoto = JSON.parse(JSON.stringify(payload.data));
    return new Promise((resolve) => { concluir = resolve; });
  };
  const push = env.contexto.enviarEstadoServidor();
  const atendimento = env.contexto.__testState.atendimentos[0];
  atendimento.anexos.push(arquivo('novo.txt', 'text/plain', 'novo'));
  atendimento.atualizadoEm = new Date(Date.now() + 5000).toISOString();
  env.contexto.salvarEstado();
  concluir({ ok: true, status: 'merged', record: { serverVersion: 'v2', data: remoto } });
  await push;
  assert.equal(env.contexto.__testState.atendimentos[0].anexos.length, 2);
  assert.equal(env.contexto.__testState.atendimentos[0].anexos[1].nome, 'novo.txt');
  assert.equal(sync.dirty(), true);
});

test('retry de conflito usa os dados atuais e nao o snapshot antigo', async () => {
  const env = ambiente([arquivo('antigo.txt', 'text/plain', 'abc')]);
  const sync = prepararSync(env);
  let concluir;
  let remoto;
  let retry;
  let chamadas = 0;
  env.contexto.chamarAppsScriptSync = (_, payload) => {
    chamadas += 1;
    if (chamadas === 1) {
      remoto = JSON.parse(JSON.stringify(payload.data));
      return new Promise((resolve) => { concluir = resolve; });
    }
    retry = payload.data;
    return Promise.resolve({ ok: true, status: 'saved', record: { serverVersion: 'v3' } });
  };
  const push = env.contexto.enviarEstadoServidor();
  const atendimento = env.contexto.__testState.atendimentos[0];
  atendimento.anexos.push(arquivo('novo.txt', 'text/plain', 'novo'));
  atendimento.atualizadoEm = new Date(Date.now() + 5000).toISOString();
  env.contexto.salvarEstado();
  concluir({ ok: true, status: 'conflict', record: { serverVersion: 'v2', data: remoto } });
  await push;
  assert.equal(chamadas, 2);
  assert.equal(retry.atendimentos[0].anexos.length, 2);
  assert.equal(env.contexto.__testState.atendimentos[0].anexos.length, 2);
  assert.equal(sync.dirty(), false);
});
