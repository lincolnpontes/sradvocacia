const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { numero, situacao, certidao, validarResposta } = require('../tribunal.js');
const number = '00000010020268150000';
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function ambiente() {
  const props = new Map(), files = new Map(), requests = [], backups = [], triggers = [];
  let store = { schema: 1, consultas: {} }, responses = [], writes = 0;
  const original = { data: { usuarios: [{ id: 'adv', senha: 'ficticia', permissoes: ['processos'] }], processos: [{ id: 'p', numero: number, status: 'Ativo' }] } };
  const main = JSON.stringify(original);
  const ctx = vm.createContext({
    srReadRecord_: () => structuredClone(original), srWithLock_: fn => fn(), srHash_: hash, srHashText_: hash,
    srSafeEquals_: (a, b) => !!a && a === b, srNow_: () => new Date().toISOString(),
    Utilities: { getUuid: crypto.randomUUID }, Logger: { log() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) || null, setProperty: (k, v) => props.set(k, v), deleteProperty: k => props.delete(k) }) },
    ScriptApp: { getProjectTriggers: () => triggers, newTrigger: name => ({ timeBased: () => ({ everyHours: () => ({ create: () => triggers.push({ getHandlerFunction: () => name }) }) }) }) },
    UrlFetchApp: { fetch: (url, options) => { requests.push({ url, options }); const item = responses.shift(); if (!item) throw new Error('Sem fixture'); if (item.error) throw new Error(item.error); return { getResponseCode: () => item.status || 200, getAllHeaders: () => item.headers || {}, getContentText: () => item.raw || JSON.stringify(item.body) }; } },
    srGetDataFolder_: () => { throw new Error('Nao criar banco real no teste'); }
  });
  vm.runInContext(fs.readFileSync(require.resolve('../apps-script/Djen.gs'), 'utf8'), ctx);
  ctx.srDjenRead_ = () => structuredClone(store);
  ctx.srDjenWrite_ = (next, backup) => { if (backup) backups.push(store); store = structuredClone(next); writes++; };
  return { ctx, props, requests, original, main, backups, triggers, get store() { return store; }, set store(v) { store = v; }, get writes() { return writes; }, respond: (...values) => { responses = values; }, resetCooldown: () => { props.clear(); Object.values(store.consultas).forEach(e => e.tentativaEm = '2020-01-01'); } };
}
function item(id = 1, extra = {}) {
  return { id, numero_processo: number, data_disponibilizacao: '2026-10-12', meio: 'D', siglaTribunal: 'TJPB', nomeOrgao: 'Vara ficticia', tipoComunicacao: 'Intimacao', tipoDocumento: 'Despacho', texto: '<p>Texto ficticio</p>', hash: 'CertidaoDeTeste', ativo: true, ...extra };
}
const body = (items, count = items.length) => ({ body: { status: 'success', count, items } });
const auth = { usuarioId: 'adv', senha: 'ficticia', processoId: 'p' };

test('numero exato, certidao restrita ao dominio oficial e estados honestos', () => {
  assert.equal(numero('0000001-00.2026.8.15.0000'), number);
  assert.equal(numero('x0000001-00.2026.8.15.0000'), '');
  assert.equal(numero('00000000000000000000'), '');
  assert.equal(certidao('../x?token=senha'), '');
  assert.equal(situacao(null).tipo, 'neutro');
  assert.equal(situacao({ completaEm: '2020-01-01' }).tipo, 'aviso');
  assert.equal(situacao({ completaEm: new Date().toISOString() }).tipo, 'ok');
  assert.equal(situacao({ completaEm: new Date().toISOString(), parcial: true }).tipo, 'aviso');
  assert.equal(situacao({ erro: 'HTTP 503' }).tipo, 'erro');
});
test('consultar adiciona publicacoes sem modificar o banco, sem duplicar e sem prazos', () => {
  const e = ambiente(); e.respond(body([item()]));
  const result = e.ctx.srDjenHandle_('djenConsult', auth);
  assert.equal(result.djen.consultas[number].publicacoes.length, 1);
  assert.equal(result.djen.consultas[number].parcial, false);
  assert.equal(JSON.stringify(e.original), e.main);
  assert.ok(!JSON.stringify(e.store).includes('prazos'));
  assert.match(e.requests[0].url, /numeroProcesso=00000010020268150000&meio=D&itensPorPagina=100&pagina=1$/);
  e.resetCooldown(); e.respond(body([item()])); e.ctx.srDjenHandle_('djenConsult', auth);
  assert.equal(e.store.consultas[number].publicacoes.length, 1);
  assert.equal(e.backups.length, 1);
});
test('leitura por usuario persiste, mudanca da publicacao volta a alertar e leitura nao expoe senhas', () => {
  const e = ambiente(); e.respond(body([item()])); e.ctx.srDjenHandle_('djenConsult', auth);
  const read = e.ctx.srDjenHandle_('djenRead', { ...auth, publicacaoId: '1' });
  assert.equal(read.djen.consultas[number].publicacoes[0].lida, true);
  assert.ok(!JSON.stringify(read).includes('leituras'));
  assert.ok(!JSON.stringify(read).includes('senha'));
  e.resetCooldown(); e.respond(body([item(1, { texto: 'Teor retificado' })]));
  const next = e.ctx.srDjenHandle_('djenConsult', auth);
  assert.equal(next.djen.consultas[number].publicacoes[0].lida, false);
});
test('servidor verifica usuario, senha, permissao e processo cadastrado', () => {
  const e = ambiente();
  for (const payload of [{ ...auth, senha: 'errada' }, { ...auth, usuarioId: 'outro' }, { ...auth, processoId: 'outro' }]) assert.throws(() => e.ctx.srDjenHandle_('djenConsult', payload));
  e.original.data.usuarios[0].permissoes = ['clientes'];
  assert.throws(() => e.ctx.srDjenHandle_('djenList', auth), /autorizado/);
  assert.equal(e.requests.length + e.writes, 0);
});
for (const failure of [{ status: 503 }, { status: 429, headers: { 'Retry-After': '120' } }, { raw: '<html>indisponivel</html>' }, body([item(2, { numero_processo: '99999990020268150000' })]), body([item(3, { texto: null })]), body([], 200)]) {
  test('falha preserva historico e ultima consulta completa: ' + JSON.stringify(failure).slice(0, 65), () => {
    const e = ambiente(); e.respond(body([item()])); e.ctx.srDjenHandle_('djenConsult', auth);
    const before = e.store.consultas[number].completaEm;
    e.resetCooldown(); e.respond(failure); e.ctx.srDjenHandle_('djenConsult', auth);
    assert.equal(e.store.consultas[number].publicacoes[0].id, '1');
    assert.equal(e.store.consultas[number].completaEm, before);
    assert.ok(e.store.consultas[number].erro);
    assert.equal(JSON.stringify(e.original), e.main);
    assert.equal(e.props.has('SR_ADVOCACIA_DJEN_LEASE'), false);
  });
}
test('paginacao continua em lotes e nao confirma historico parcial como completo', () => {
  const e = ambiente(); const page = start => Array.from({ length: 100 }, (_, i) => item(start + i));
  e.respond(body(page(1), 201), body(page(101), 201)); e.ctx.srDjenHandle_('djenConsult', auth);
  assert.equal(e.store.consultas[number].parcial, true);
  assert.equal(e.store.consultas[number].proximaPagina, 3);
  assert.equal(e.store.consultas[number].completaEm, '');
  e.resetCooldown(); e.respond(body([item(201)], 201)); e.ctx.srDjenHandle_('djenConsult', auth);
  assert.equal(e.store.consultas[number].parcial, false);
  assert.equal(e.store.consultas[number].publicacoes.length, 201);
});
test('novo total durante paginacao reinicia consulta, sem apagar paginas ja recebidas', () => {
  const e = ambiente(); e.store.consultas[number] = { numero: number, publicacoes: [], proximaPagina: 2, total: 200 };
  e.respond(body([item()], 201)); e.ctx.srDjenHandle_('djenConsult', auth);
  assert.equal(e.store.consultas[number].proximaPagina, 1);
  assert.equal(e.store.consultas[number].parcial, true);
});
test('pagina repetida gera falha e mantem o que ja foi recebido', () => {
  const e = ambiente(); const page = Array.from({ length: 100 }, (_, i) => item(i + 1));
  e.respond(body(page, 200), body(page, 200)); e.ctx.srDjenHandle_('djenConsult', auth);
  assert.match(e.store.consultas[number].erro, /repetiu/);
  assert.equal(e.store.consultas[number].publicacoes.length, 100);
});
test('consulta incompleta pode se recuperar sem prender o cursor em uma pagina repetida', () => {
  const e = ambiente();
  const first = Array.from({ length: 100 }, (_, i) => item(i + 1));
  e.respond(body(first, 102), body([item(101)], 102)); e.ctx.srDjenHandle_('djenConsult', auth);
  assert.match(e.store.consultas[number].erro, /incompleta/);
  assert.equal(e.store.consultas[number].proximaPagina, 1);
  assert.equal(e.store.consultas[number].publicacoes.length, 101);
  e.resetCooldown(); e.respond(body(first, 102), body([item(101), item(102)], 102));
  e.ctx.srDjenHandle_('djenConsult', auth);
  assert.equal(e.store.consultas[number].erro, '');
  assert.equal(e.store.consultas[number].parcial, false);
  assert.equal(e.store.consultas[number].publicacoes.length, 102);
});
test('respeita cooldown global e nao faz chamadas extras apos 429', () => {
  const e = ambiente(); e.respond({ status: 429, headers: { 'Retry-After': '120' } }); e.ctx.srDjenHandle_('djenConsult', auth);
  assert.throws(() => e.ctx.srDjenHandle_('djenConsult', auth), /limitou/);
  assert.equal(e.requests.length, 1);
});
test('historico de numero anterior nao e associado ao numero editado do processo', () => {
  const e = ambiente(); e.respond(body([item()])); e.ctx.srDjenHandle_('djenConsult', auth);
  e.original.data.processos[0].numero = '99999990020268150000';
  assert.equal(Object.keys(e.ctx.srDjenHandle_('djenList', auth).djen.consultas).length, 0);
  assert.equal(e.store.consultas[number].publicacoes.length, 1);
});
test('publicacao manual nao depende de acionadores nem instala monitoramento', () => {
  const e = ambiente(); delete e.ctx.ScriptApp;
  assert.equal(e.ctx.instalarMonitoramentoDjen, undefined);
  assert.equal(e.ctx.monitorarPublicacoesDjen, undefined);
  assert.equal(e.ctx.srDjenHandle_('djenList', auth).djen.monitoramentoAtivo, false);
  e.respond(body([item()])); e.ctx.srDjenHandle_('djenConsult', auth);
  assert.equal(e.store.consultas[number].publicacoes.length, 1);
  assert.equal(e.triggers.length, 0);
});
test('teste de conexao usa numero ficticio e nao grava arquivos', () => {
  const e = ambiente(); e.respond(body([])); e.ctx.testarConexaoDjen();
  assert.match(e.requests[0].url, /numeroProcesso=00000000000000000000/);
  assert.equal(e.writes, 0); assert.equal(e.triggers.length, 0);
});
test('cliente rejeita cache com numero de processo divergente', () => {
  assert.throws(() => validarResposta({ consultas: { [number]: { numero: 'outro', publicacoes: [] } } }));
});
