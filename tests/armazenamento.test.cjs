const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { IDBFactory } = require('fake-indexeddb');
const Armazenamento = require('../armazenamento.js');
const { ambiente, arquivo } = require('./app-ambiente.cjs');
const STATE = 'sr-advocacia-gestao-juridica-v134';
const META = 'sr-advocacia-sync-meta-v1';
const OLD = 'sr-advocacia-gestao-juridica-v133';

function dados(clientes = []) {
  return { usuarios: [], clientes: clientes.map(id => ({ id })), processos: [], atendimentos: [] };
}
function fixture(factory = new IDBFactory(), values = new Map()) {
  const writes = [];
  const legacy = {
    getItem: key => values.get(key) ?? null,
    setItem() { writes.push('write'); throw new Error('localStorage cheio'); },
    removeItem() { writes.push('delete'); throw new Error('Nao excluir legado'); }
  };
  const app = ambiente();
  const store = new Armazenamento({
    keys: [STATE, META, OLD], stateKeys: [STATE, OLD], stateKey: STATE, metaKey: META,
    legacy, indexedDB: factory, crypto: webcrypto,
    validarEstado: app.contexto.validarEstadoLocal,
    resolverConflito: (a, b, base) => JSON.stringify(app.contexto.mesclarEdicoesLocais(JSON.parse(a), JSON.parse(b), base ? JSON.parse(base) : {}))
  });
  return { store, values, factory, writes };
}
async function migrar(f, data = dados(['antigo'])) {
  await f.store.inicializar();
  await f.store.confirmarMigracao([{ key: STATE, value: JSON.stringify(data) }, { key: META, value: '{"dirty":false}' }]);
}

test('migracao e gravacao acima de 5 MiB nao escrevem nem apagam localStorage', async () => {
  const antigo = JSON.stringify(dados(['antigo']));
  const f = fixture(undefined, new Map([[STATE, antigo], [OLD, antigo]]));
  await migrar(f);
  const grande = { ...dados(['antigo', 'novo']), atendimentos: [{ id: 'at-1', anexos: [arquivo('grande.bin', 'application/octet-stream', Buffer.alloc(4 * 1024 * 1024, 77))] }] };
  const raw = JSON.stringify(grande);
  assert.ok(raw.length > 5 * 1024 * 1024);
  await f.store.gravarItens([{ key: STATE, value: raw }, { key: META, value: '{"dirty":true}' }]);
  assert.equal(f.store.getItem(STATE), raw);
  assert.equal(f.values.get(STATE), antigo);
  assert.equal(f.values.get(OLD), antigo);
  assert.equal(f.store.originais[0].copias.find(item => item.key === STATE).value, antigo);
  assert.deepEqual(f.writes, []);
  const reopened = fixture(f.factory, f.values);
  await reopened.store.inicializar();
  assert.equal(reopened.store.getItem(STATE), raw);
  assert.equal(reopened.store.migrado, true);
  assert.equal(reopened.store.originais.length, 1);
});

test('chave legada e conservada e migracao acontece uma unica vez', async () => {
  const original = JSON.stringify(dados(['legado']));
  const f = fixture(undefined, new Map([[OLD, original]]));
  await migrar(f, dados(['legado']));
  const reopened = fixture(f.factory, f.values);
  await reopened.store.inicializar();
  assert.equal(await reopened.store.confirmarMigracao([]), false);
  assert.equal(reopened.store.legadoAlterado, null);
  assert.equal(f.values.get(OLD), original);
  assert.equal(reopened.store.originais[0].copias[0].value, original);
});

test('edicao feita por uma versao antiga continua disponivel para reconciliacao', async () => {
  const f = fixture(undefined, new Map([[STATE, JSON.stringify(dados(['original']))]]));
  await migrar(f, dados(['original', 'novo-idb']));
  const antigoAlterado = JSON.stringify(dados(['original', 'novo-legado']));
  f.values.set(STATE, antigoAlterado);
  const reopened = fixture(f.factory, f.values);
  await reopened.store.inicializar();
  assert.equal(reopened.store.legadoAlterado, antigoAlterado);
  assert.equal(JSON.parse(reopened.store.getItem(STATE)).clientes.length, 2);
  await reopened.store.confirmarMigracao([{ key: STATE, value: JSON.stringify(dados(['original', 'novo-idb', 'novo-legado'])) }]);
  assert.equal(reopened.store.originais.length, 2);
  assert.equal(reopened.store.originais[1].copias.find(item => item.key === STATE).value, antigoAlterado);
  assert.equal(f.values.get(STATE), antigoAlterado);
});

test('falha de transacao preserva estado, meta e backup anteriores', async () => {
  const f = fixture();
  await migrar(f);
  const anterior = f.store.getItem(STATE);
  await assert.rejects(() => f.store.gravarItens([
    { key: STATE, value: JSON.stringify(dados(['substituto'])) }, { key: META, value: '{"dirty":true}' }
  ], { original: { id: null, copias: [] } }), { name: 'SrPersistenciaError' });
  assert.equal(f.store.getItem(STATE), anterior);
  await assert.rejects(() => f.store.aguardar(), { name: 'SrPersistenciaError' });
  const reopened = fixture(f.factory, f.values);
  await reopened.store.inicializar();
  assert.equal(reopened.store.getItem(STATE), anterior);
  assert.equal(reopened.store.getItem(META), '{"dirty":false}');
  assert.equal(reopened.store.originais.length, 1);
  await f.store.setItem(META, '{"dirty":true}');
  await f.store.aguardar();
  assert.equal(f.store.erro, null);
});

for (const value of ['', '{quebrado', 'null', '[]', '{}', '{"clientes":null}']) {
  test(`estado invalido nao substitui IndexedDB: ${value}`, async () => {
    const f = fixture();
    await migrar(f);
    const anterior = f.store.getItem(STATE);
    await assert.rejects(() => f.store.setItem(STATE, value), { name: 'SrPersistenciaError' });
    assert.equal(f.store.getItem(STATE), anterior);
    const reopened = fixture(f.factory, f.values);
    await reopened.store.inicializar();
    assert.equal(reopened.store.getItem(STATE), anterior);
  });
}

test('duas abas mesclam gravacoes concorrentes e preservam os registros de ambas', async () => {
  const f = fixture();
  await migrar(f, dados(['base']));
  const outra = fixture(f.factory, f.values);
  await outra.store.inicializar();
  await f.store.setItem(STATE, JSON.stringify(dados(['base', 'aba-1'])));
  await outra.store.gravarItens([{ key: STATE, value: JSON.stringify(dados(['base', 'aba-2'])) }, { key: META, value: '{"dirty":false}' }]);
  assert.deepEqual(JSON.parse(outra.store.getItem(STATE)).clientes.map(item => item.id).sort(), ['aba-1', 'aba-2', 'base']);
  assert.equal(JSON.parse(outra.store.getItem(META)).dirty, true);
});

test('meta de aba antiga nao confirma como limpas alteracoes de outra aba', async () => {
  const f = fixture();
  await migrar(f);
  const outra = fixture(f.factory, f.values);
  await outra.store.inicializar();
  await f.store.gravarItens([{ key: STATE, value: JSON.stringify(dados(['novo'])) }, { key: META, value: '{"dirty":true,"revision":8,"serverHash":"novo"}' }]);
  await outra.store.setItem(META, '{"dirty":false,"revision":7,"serverHash":"antigo"}');
  const meta = JSON.parse(outra.store.getItem(META));
  assert.equal(meta.dirty, true);
  assert.equal(meta.revision, 8);
  assert.equal(meta.serverHash, 'novo');
});

test('fila de gravacao confirma os snapshots na ordem correta', async () => {
  const f = fixture();
  await migrar(f);
  const a = f.store.setItem(META, '{"seq":1}');
  const b = f.store.setItem(META, '{"seq":2}');
  assert.equal(f.store.pendentes, 2);
  await a;
  await b;
  await f.store.aguardar();
  assert.equal(f.store.pendentes, 0);
  assert.equal(f.store.getItem(META), '{"seq":2}');
});

test('bootstrap invalido nao migra, nao inicia sync e conserva a copia original', async () => {
  const env = ambiente();
  env.values.set(STATE, '{conteudo original invalido');
  env.contexto.window.indexedDB = new IDBFactory();
  env.contexto.iniciar = async () => {};
  await env.contexto.iniciarAplicativo();
  assert.equal(vm.runInContext('armazenamentoBloqueado', env.contexto), true);
  assert.equal(vm.runInContext('armazenamentoLocal.migrado', env.contexto), false);
  assert.equal(vm.runInContext('syncPronto', env.contexto), false);
  assert.equal(env.values.get(STATE), '{conteudo original invalido');
  assert.equal(env.gravacoes.length, 0);
});

test('bootstrap do cache antigo preserva token e invalida confirmacao antiga do servidor', async () => {
  const env = ambiente();
  const original = JSON.stringify({ ...dados(['cliente-antigo']), usuarios: [{ id: 'user-1', nome: 'Ficticio', senha: 'test-only' }], avancadas: { googleScriptUrl: 'https://example.test/sync' } });
  env.values.set(STATE, original);
  env.values.set(META, '{"dirty":false,"serverVersion":"antigo","serverHash":"antigo"}');
  env.values.set('sr-advocacia-sync-config-v1', '{"syncToken":"test-only"}');
  env.contexto.window.indexedDB = new IDBFactory();
  env.contexto.iniciar = async () => {};
  await env.contexto.iniciarAplicativo();
  assert.equal(vm.runInContext('armazenamentoBloqueado', env.contexto), false);
  assert.equal(env.contexto.__testState.avancadas.syncToken, 'test-only');
  assert.equal(vm.runInContext('syncMeta.dirty', env.contexto), true);
  assert.equal(vm.runInContext('syncMeta.serverHash', env.contexto), '');
  assert.equal(vm.runInContext('armazenamentoLocal.originais[0].copias.find(x => x.key === "' + STATE + '").value', env.contexto), original);
  assert.equal(env.values.get(STATE), original);
  assert.equal(env.gravacoes.length, 0);
});

test('IndexedDB indisponivel bloqueia inicializacao e ainda permite baixar o legado', async () => {
  const env = ambiente();
  const original = JSON.stringify(dados(['preservado']));
  env.values.set(STATE, original);
  await env.contexto.iniciarAplicativo();
  assert.equal(vm.runInContext('armazenamentoBloqueado', env.contexto), true);
  env.contexto.baixarCopiaProtegida();
  const backup = JSON.parse(await env.criados[0].blob.text());
  assert.equal(backup.copiasLocais.find(item => item.key === STATE).value, original);
  assert.equal(env.values.get(STATE), original);
});

test('novas notas durante gravacao de rascunho nao recebem confirmacao falsa', async () => {
  const env = ambiente();
  let concluir;
  env.storage.gravarItens = () => new Promise(resolve => { concluir = resolve; });
  env.contexto.dadosAtendimentoDoFormulario = () => ({ conteudoHtml: 'primeira anotacao', anexos: [] });
  env.contexto.conteudoAtendimentoPreenchido = () => true;
  vm.runInContext('atendimentoModoEditor = true; atendimentoAlterado = true; viewAtual = "atendimentos";', env.contexto);
  const salvo = env.contexto.salvarRascunhoAtendimento();
  await new Promise(resolve => setImmediate(resolve));
  vm.runInContext('atendimentoRevisaoEditor += 1;', env.contexto);
  concluir([{ key: STATE, value: JSON.stringify(env.contexto.__testState) }, { key: META, value: '{}' }]);
  await salvo;
  assert.equal(vm.runInContext('atendimentoAlterado', env.contexto), true);
  assert.match(env.elementos.get('#atendimentoStatus').textContent, /aguardando salvar/);
});

test('submit duplicado nao cadastra duas vezes enquanto a gravacao esta pendente', async () => {
  const env = ambiente();
  let handler;
  let concluir;
  let chamadas = 0;
  const botao = { disabled: false };
  const form = { querySelectorAll: () => [botao], setAttribute() {} };
  env.contexto.vincularFormulario({ addEventListener(_, fn) { handler = fn; } }, () => {
    chamadas += 1;
    return new Promise(resolve => { concluir = resolve; });
  });
  const event = { target: form, preventDefault() {} };
  const primeiro = handler(event);
  await handler(event);
  assert.equal(chamadas, 1);
  assert.equal(botao.disabled, true);
  concluir();
  await primeiro;
  assert.equal(botao.disabled, false);
});

test('pull com gravacao lenta nao apaga edicao local feita enquanto aguardava', async () => {
  const env = ambiente([arquivo('original.txt', 'text/plain', 'original')]);
  const f = fixture();
  await migrar(f, env.contexto.__testState);
  env.setStorage(f.store);
  env.contexto.normalizarEstado = value => JSON.parse(JSON.stringify(value));
  env.contexto.atualizarStatusSync = () => {};
  env.contexto.agendarSincronizacao = () => {};
  vm.runInContext('syncPronto = true;', env.contexto);
  const gravar = f.store.gravarItens.bind(f.store);
  let concluir;
  let primeira = true;
  f.store.gravarItens = (entries, options) => {
    if (!primeira) return gravar(entries, options);
    primeira = false;
    return new Promise(resolve => { concluir = () => resolve(gravar(entries, options)); });
  };
  const remoto = JSON.parse(JSON.stringify(env.contexto.__testState));
  remoto.clientes.push({ id: 'cliente-remoto' });
  const aplicar = env.contexto.aplicarDadosSync(remoto);
  env.contexto.__testState.atendimentos[0].anexos.push(arquivo('novo.txt', 'text/plain', 'nova anotacao'));
  env.contexto.__testState.atendimentos[0].atualizadoEm = new Date(Date.now() + 5000).toISOString();
  await env.contexto.salvarEstado();
  concluir();
  await aplicar;
  assert.equal(env.contexto.__testState.clientes[0].id, 'cliente-remoto');
  assert.equal(env.contexto.__testState.atendimentos[0].anexos.length, 2);
  const persistido = JSON.parse(f.store.getItem(STATE));
  assert.equal(persistido.clientes[0].id, 'cliente-remoto');
  assert.equal(persistido.atendimentos[0].anexos.length, 2);
});

test('rascunho forcado aguarda tambem o texto digitado durante a primeira gravacao', async () => {
  const env = ambiente();
  let concluir;
  let texto = 'primeira anotacao';
  let calls = 0;
  env.storage.gravarItens = entries => {
    calls += 1;
    if (calls === 1) return new Promise(resolve => { concluir = () => resolve(entries); });
    return Promise.resolve(entries);
  };
  env.contexto.dadosAtendimentoDoFormulario = () => ({ conteudoHtml: texto, anexos: [] });
  env.contexto.conteudoAtendimentoPreenchido = () => true;
  vm.runInContext('atendimentoModoEditor = true; atendimentoAlterado = true; viewAtual = "atendimentos";', env.contexto);
  const salvo = env.contexto.salvarRascunhoAtendimento(true);
  await new Promise(resolve => setImmediate(resolve));
  texto = 'anotacao completa com texto novo';
  vm.runInContext('atendimentoRevisaoEditor += 1;', env.contexto);
  concluir();
  await salvo;
  assert.equal(calls, 2);
  assert.equal(vm.runInContext('atendimentoAlterado', env.contexto), false);
  assert.equal(env.contexto.__testState.rascunhoAtendimento.conteudoHtml, texto);
});

test('pull confirmado mantem edicao durante gravacao pendente para enviar', async () => {
  const env = ambiente([arquivo('original.txt', 'text/plain', 'original')]);
  const f = fixture();
  await migrar(f, env.contexto.__testState);
  env.setStorage(f.store);
  env.contexto.normalizarEstado = value => JSON.parse(JSON.stringify(value));
  env.contexto.atualizarStatusSync = () => {};
  const agendamentos = [];
  env.contexto.agendarSincronizacao = motivo => agendamentos.push(motivo);
  for (const name of ['aplicarTema', 'aplicarSidebar', 'atualizarPerfil', 'renderizarTudo']) env.contexto[name] = () => {};
  vm.runInContext('syncPronto = true; syncMeta.dirty = false;', env.contexto);
  const gravar = f.store.gravarItens.bind(f.store);
  let concluir;
  let primeira = true;
  f.store.gravarItens = (entries, options) => {
    if (!primeira) return gravar(entries, options);
    primeira = false;
    return new Promise(resolve => { concluir = () => resolve(gravar(entries, options)); });
  };
  const remoto = JSON.parse(JSON.stringify(env.contexto.__testState));
  remoto.clientes.push({ id: 'cliente-remoto' });
  const receber = env.contexto.aplicarEstadoServidor({ data: remoto, revision: 2, serverVersion: 'v2' });
  env.contexto.__testState.atendimentos[0].anexos.push(arquivo('novo.txt', 'text/plain', 'novo'));
  env.contexto.__testState.atendimentos[0].atualizadoEm = new Date(Date.now() + 5000).toISOString();
  await env.contexto.salvarEstado();
  concluir();
  await receber;
  assert.equal(env.contexto.__testState.atendimentos[0].anexos.length, 2);
  assert.equal(JSON.parse(f.store.getItem(STATE)).atendimentos[0].anexos.length, 2);
  assert.equal(JSON.parse(f.store.getItem(META)).dirty, true);
  assert.equal(agendamentos.at(-1), 'alteracao-durante-pull');
});

test('confirmacao de editor antigo nao sobrescreve estado do novo editor', async () => {
  const env = ambiente();
  let concluir;
  env.storage.gravarItens = entries => new Promise(resolve => { concluir = () => resolve(entries); });
  env.contexto.dadosAtendimentoDoFormulario = () => ({ conteudoHtml: 'editor antigo', anexos: [] });
  env.contexto.conteudoAtendimentoPreenchido = () => true;
  vm.runInContext('atendimentoModoEditor = true; atendimentoAlterado = true;', env.contexto);
  const salvo = env.contexto.salvarRascunhoAtendimento(true);
  await new Promise(resolve => setImmediate(resolve));
  vm.runInContext('atendimentoSessaoEditor += 1; atendimentoAlterado = false;', env.contexto);
  env.elementos.get('#atendimentoStatus').textContent = 'Novo atendimento';
  concluir();
  await salvo;
  assert.equal(vm.runInContext('atendimentoAlterado', env.contexto), false);
  assert.equal(env.elementos.get('#atendimentoStatus').textContent, 'Novo atendimento');
});

test('migracoes iniciadas em duas abas nao se bloqueiam nem perdem copias', async () => {
  const values = new Map([[STATE, JSON.stringify(dados(['base']))]]);
  const a = fixture(undefined, values);
  const b = fixture(a.factory, values);
  await a.store.inicializar();
  await b.store.inicializar();
  const primeiro = a.store.confirmarMigracao([{ key: STATE, value: JSON.stringify(dados(['base', 'a'])) }]);
  const segundo = b.store.confirmarMigracao([{ key: STATE, value: JSON.stringify(dados(['base', 'b'])) }]);
  await primeiro;
  await segundo;
  const reopened = fixture(a.factory, values);
  await reopened.store.inicializar();
  assert.deepEqual(JSON.parse(reopened.store.getItem(STATE)).clientes.map(item => item.id).sort(), ['a', 'b', 'base']);
  assert.equal(reopened.store.originais.length, 1);
  assert.equal(values.get(STATE), JSON.stringify(dados(['base'])));
});

test('gravacao comum respeita exclusao de usuario e desfazimento de recebimento', async () => {
  const f = fixture();
  const base = { ...dados(), usuarios: [{ id: 'a' }, { id: 'b' }], processos: [{ id: 'p', recebimentos: [{ id: 'r1', valor: 10 }, { id: 'r2', valor: 20 }], recebido: 30 }] };
  await migrar(f, base);
  const novo = JSON.parse(JSON.stringify(base));
  novo.usuarios.pop();
  novo.processos[0].recebimentos.pop();
  novo.processos[0].recebido = 10;
  await f.store.setItem(STATE, JSON.stringify(novo));
  assert.deepEqual(JSON.parse(f.store.getItem(STATE)), novo);
});

test('snapshots ja enfileirados preservam dados conciliados de outra aba', async () => {
  const a = fixture();
  await migrar(a, dados(['base']));
  const b = fixture(a.factory, a.values);
  await b.store.inicializar();
  await a.store.setItem(STATE, JSON.stringify(dados(['base', 'a'])));
  const primeiro = b.store.setItem(STATE, JSON.stringify(dados(['base', 'b'])));
  const segundo = b.store.setItem(STATE, JSON.stringify(dados(['base', 'b', 'c'])));
  await primeiro;
  await segundo;
  assert.deepEqual(JSON.parse(b.store.getItem(STATE)).clientes.map(item => item.id).sort(), ['a', 'b', 'base', 'c']);
});

test('conciliacao respeita remocoes intencionais e conserva recebimento novo de outra aba', async () => {
  const a = fixture();
  const base = { ...dados(), usuarios: [{ id: 'u1' }, { id: 'u2' }], processos: [{ id: 'p1', recebimentos: [{ id: 'r1', valor: 10 }, { id: 'r2', valor: 20 }], recebido: 30 }] };
  await migrar(a, base);
  const b = fixture(a.factory, a.values);
  await b.store.inicializar();
  const outra = JSON.parse(JSON.stringify(base));
  outra.processos[0].recebimentos.push({ id: 'r3', valor: 5 });
  await a.store.setItem(STATE, JSON.stringify(outra));
  const editado = JSON.parse(JSON.stringify(base));
  editado.usuarios.pop();
  editado.processos[0].recebimentos.pop();
  editado.processos[0].recebido = 10;
  await b.store.setItem(STATE, JSON.stringify(editado));
  const salvo = JSON.parse(b.store.getItem(STATE));
  assert.deepEqual(salvo.usuarios.map(item => item.id), ['u1']);
  assert.deepEqual(salvo.processos[0].recebimentos.map(item => item.id).sort(), ['r1', 'r3']);
  assert.equal(salvo.processos[0].recebido, 15);
});

for (const pendente of [false, true]) {
  test(`antes de sincronizar, consultar dados salvos por outra aba: local pendente=${pendente}`, async () => {
    const env = ambiente();
    const a = fixture();
    await migrar(a, dados(['base']));
    const b = fixture(a.factory, a.values);
    await b.store.inicializar();
    env.setStorage(b.store);
    Object.assign(env.contexto.__testState, dados(pendente ? ['base', 'local'] : ['base']));
    env.contexto.normalizarEstado = value => JSON.parse(JSON.stringify(value));
    for (const name of ['aplicarTema', 'aplicarSidebar', 'atualizarPerfil', 'renderizarTudo']) env.contexto[name] = () => {};
    vm.runInContext('syncMeta.dirty = ' + pendente + ';', env.contexto);
    await a.store.gravarItens([{ key: STATE, value: JSON.stringify(dados(['base', 'outra'])) }, { key: META, value: '{"dirty":true}' }]);
    await env.contexto.conferirAlteracoesOutraAba();
    assert.deepEqual(env.contexto.__testState.clientes.map(item => item.id).sort(), pendente ? ['base', 'local', 'outra'] : ['base', 'outra']);
    assert.equal(vm.runInContext('syncMeta.dirty', env.contexto), true);
    assert.equal(b.store.revisao, (await b.store.lerCompartilhado()).estado.revisao);
  });
}

test('metadados ilegíveis nao fazem uma copia com dados parecer limpa', () => {
  const env = ambiente();
  env.values.set(META, '{invalido');
  assert.equal(env.contexto.carregarSyncMeta().dirty, true);
});
