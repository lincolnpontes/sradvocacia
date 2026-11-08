const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { ambiente } = require('./app-ambiente.cjs');

test('agenda prioriza hoje e o futuro; passado limitado a tres dias, mais recente primeiro', () => {
  const { selecionarEventosProximos } = ambiente().contexto;
  const eventos = ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-12-01']
    .map(data => ({ data }));
  eventos.push({ data: '2026-11-01', concluido: true });
  const originais = JSON.stringify(eventos);
  assert.deepEqual(Array.from(selecionarEventosProximos(eventos, '2026-11-01'), e => e.data),
    ['2026-11-01', '2026-12-01', '2026-10-31', '2026-10-30', '2026-10-29']);
  assert.equal(JSON.stringify(eventos), originais);
  const ocupada = [...eventos, ...Array.from({ length: 9 }, () => ({ data: '2026-11-03' }))];
  const proximos = selecionarEventosProximos(ocupada, '2026-11-01');
  assert.equal(proximos.length, 8);
  assert.ok(proximos.every(evento => evento.data >= '2026-11-01'));
  assert.equal(selecionarEventosProximos(eventos, '2027-02-01').length, 0);
});

test('valores aceitam centavos pt-BR sem arredondar entradas invalidas para zero', () => {
  const { lerValorMonetario, formatarValorMonetario } = ambiente().contexto;
  for (const [entrada, esperado] of [['1600', '1600,00'], ['1650,5', '1650,50'], ['1650.50', '1650,50'],
    ['R$ 1.650,05', '1650,05'], ['1.650', '1650,00'], [',05', '0,05'], ['', '0,00']]) {
    assert.equal(formatarValorMonetario(lerValorMonetario(entrada)), esperado);
  }
  for (const invalido of ['-0,01', '1e3', 'abc', '1,2,3', '12,345', '1.50,50', '999999999999999999']) {
    assert.ok(Number.isNaN(lerValorMonetario(invalido)), invalido);
  }
});

test('os cinco campos monetarios permitem teclado decimal, digitacao continua, correcao e colagem', () => {
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  const dom = new JSDOM(html);
  try {
    const campos = Array.from(dom.window.document.querySelectorAll('[data-moeda]'));
    assert.deepEqual(campos.map(c => [c.form.id, c.name]), [['formProcesso', 'honorarios'], ['formProcesso', 'recebido'],
      ['formContrato', 'honorarios'], ['formContrato', 'descontoHonorarios'], ['formRecebimento', 'valor']]);
    for (const campo of campos) {
      assert.equal(campo.type, 'text'); assert.equal(campo.inputMode, 'decimal');
      const ctx = ambiente().contexto;
      ctx.document = dom.window.document;
      ctx.vincularCampoMonetario(campo);
      const exibido = () => campo.value + campo.parentElement.querySelector('.money-completion b').textContent;
      const inserir = texto => {
        campo.dispatchEvent(new dom.window.InputEvent('beforeinput', { data: texto, inputType: 'insertText' }));
        campo.setRangeText(texto, campo.selectionStart, campo.selectionEnd, 'end');
        campo.dispatchEvent(new dom.window.InputEvent('input', { data: texto, inputType: 'insertText' }));
      };
      for (const letra of '1650') inserir(letra);
      assert.equal(exibido(), '1650,00');
      inserir(','); inserir('5');
      assert.equal(exibido(), '1650,50');
      inserir('9');
      assert.equal(campo.value, '1650,59');
      campo.select(); inserir('R$ 1.750,05');
      campo.dispatchEvent(new dom.window.Event('blur'));
      assert.equal(campo.value, '1750,05'); assert.ok(campo.checkValidity());
      campo.select(); inserir('-15'); assert.ok(!campo.checkValidity());
      campo.form.reset(); assert.ok(!campo.validity.customError);
    }
  } finally { dom.window.close(); }
});

test('salvar atendimento grava sem processo e converter exige escolha posterior com permissao', async () => {
  const e = ambiente(), ctx = e.contexto, state = ctx.__testState;
  Object.assign(state, { atendimentos: [], processos: [], usuarioAtivoId: 'u', usuarios: [{ id: 'u', permissoes: ['atendimentos'] }] });
  ctx.dadosAtendimentoDoFormulario = () => ({ id: '', clienteId: 'c', area: 'Civel', responsavelId: 'u', assunto: 'Consulta',
    data: '2026-11-08T10:00', conteudoHtml: '<p>Notas</p>', anexos: [] });
  ctx.conteudoAtendimentoPreenchido = () => true;
  let salvo = false, fechado = false, conversoes = 0;
  ctx.registrarAuditoria = () => {};
  ctx.salvarEstado = async () => { salvo = true; };
  ctx.renderizarTudo = async () => {};
  ctx.fecharEditorAtendimento = () => { assert.ok(salvo); fechado = true; };
  ctx.abrirModalProcessoPorAtendimento = atendimento => { assert.equal(atendimento.id, state.atendimentos[0].id); conversoes++; };
  await ctx.salvarAtendimento({ preventDefault() {} });
  assert.ok(fechado); assert.equal(state.atendimentos.length, 1);
  assert.equal(state.atendimentos[0].processoId, ''); assert.equal(state.processos.length, 0); assert.equal(conversoes, 0);
  const evento = { preventDefault() {}, target: { closest() { return { dataset: { convertAttendance: 'id:' + state.atendimentos[0].id } }; } } };
  await ctx.abrirAtendimentoDaLista(evento);
  assert.equal(conversoes, 0);
  state.usuarios[0].permissoes.push('processos');
  await ctx.abrirAtendimentoDaLista(evento);
  assert.equal(conversoes, 1); assert.equal(state.atendimentos[0].processoId, ''); assert.equal(state.processos.length, 0);
});

test('normalizar preserva numero CNJ e campos reais sem trocar jurisdicao', () => {
  const e = ambiente();
  for (const value of ['0000001-00.2026.8.06.0000', '(85) 99999-0000', 'OAB/CE 1234', 'Fortaleza/CE', '8.06 - anotacao original']) assert.equal(e.contexto.migrarTextoParaPb(value), value);
});
test('processo sem prazo nem movimentos continua vazio depois de normalizar', () => {
  const e = ambiente(); const state = { clientes: [{ id: 'c' }], usuarios: [], configs: { orgaos: ['Vara'], areas: ['Civel'], status: ['Ativo'] } };
  const process = e.contexto.normalizarProcesso({ id: 'p', clienteId: 'c', prazos: [], movimentacoes: [] }, state);
  assert.equal(process.prazos.length, 0); assert.equal(process.movimentacoes.length, 0);
  const legacy = e.contexto.normalizarProcesso({ id: 'p', clienteId: 'c', prazo: '2026-12-01' }, state);
  assert.equal(legacy.prazos.length, 1); assert.equal(legacy.prazos[0].data, '2026-12-01');
});
test('usuario sem sessao nao herda permissoes do primeiro administrador', () => {
  const e = ambiente(); e.contexto.__testState.usuarios = [{ id: 'admin', permissoes: ['financeiro', 'configuracoes'] }];
  assert.equal(e.contexto.usuarioAtual(), null); assert.equal(e.contexto.temAcesso('financeiro'), false);
});

test('hoje usa a data local e nao antecipa o dia depois das 21h no Brasil', () => {
  const e = ambiente();
  e.contexto.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-13T02:00:00Z'])); }
    getFullYear() { return 2026; }
    getMonth() { return 9; }
    getDate() { return 12; }
  };
  assert.equal(e.contexto.hojeIso(), '2026-10-12');
});
test('honorarios nao aparecem no cliente nem no processo sem permissao financeira', () => {
  const e = ambiente(); const state = e.contexto.__testState;
  Object.assign(state, { usuarioAtivoId: 'u', usuarios: [{ id: 'u', permissoes: ['clientes', 'processos'] }], clientes: [{ id: 'c', nome: 'Ficticio' }], configs: { status: ['Ativo'], movimentacoes: [] }, atendimentos: [],
    processos: [{ id: 'p', clienteId: 'c', numero: '0000001-00.2026.8.15.0000', prazos: [], movimentacoes: [], recebimentos: [], descontos: [], honorarios: 9876.54, recebido: 0, atendimentos: [] }] });
  e.contexto.vincularPainelCliente = () => {};
  e.contexto.renderPainelCliente(state.clientes[0]);
  assert.doesNotMatch(e.elementos.get('#clientePainel').innerHTML, /9\.876/);
  e.contexto.abrirDetalheProcesso('p');
  const html = e.elementos.get('#detalheConteudo').innerHTML;
  assert.doesNotMatch(html, /detail-finance|Gerenciar recebimento|9\.876/);
  e.contexto.abrirModalRecebimento('p'); assert.ok(!e.elementos.get('#modalRecebimento').open);
});
test('repetir recebimento depois de falha local nao duplica valor', async () => {
  const e = ambiente(); const state = e.contexto.__testState;
  const process = { id: 'p', numero: 'teste', recebimentos: [], honorarios: 1000, descontos: [] };
  Object.assign(state, { usuarioAtivoId: 'u', usuarios: [{ id: 'u', permissoes: ['financeiro'] }], processos: [process] });
  e.contexto.FormData = class { *[Symbol.iterator]() { yield* Object.entries({ processoId: 'p', valor: '100', data: '2026-10-12', forma: 'Pix', notaFiscal: 'nao', observacoes: '' }); } };
  e.contexto.registrarAuditoria = () => {};
  e.contexto.renderizarTudo = async () => {};
  e.contexto.salvarEstado = async () => { throw new Error('Quota'); };
  await assert.rejects(() => e.contexto.salvarRecebimento({ preventDefault() {} }), /Quota/);
  assert.equal(process.recebimentos.length, 1);
  e.contexto.salvarEstado = async () => {};
  await e.contexto.salvarRecebimento({ preventDefault() {} });
  assert.equal(process.recebimentos.length, 1); assert.equal(process.recebido, 100);
});
test('sanitizacao remove execucao preservando formatacao, listas, tabelas e imagens embutidas', () => {
  const dom = new JSDOM('', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  vm.runInContext(fs.readFileSync(require.resolve('../vendor/purify.min.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(require.resolve('../conteudo-seguro.js'), 'utf8'), ctx);
  const original = '<p style="margin-left:1.25cm;text-align:justify"><b>Nome</b> <u>Texto</u></p><ol type="A"><li>Item</li></ol><table><tr><td>Campo</td></tr></table><img data-layout="wrap" src="data:image/png;base64,AA==" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">link</a><iframe srcdoc="x"></iframe>';
  const safe = dom.window.htmlSeguroAtendimento(original);
  assert.doesNotMatch(safe, /onerror|<script|javascript:|<iframe/);
  for (const expected of ['margin-left:1.25cm', '<b>Nome</b>', '<u>Texto</u>', 'type="A"', '<td>Campo</td>', 'data:image/png;base64,AA==', 'data-layout="wrap"']) assert.ok(safe.includes(expected), expected);
  assert.ok(original.includes('onerror'));
  dom.window.close();
});

test('repetir novo processo apos falha preserva o ID, vinculo e historico sem duplicar', async () => {
  const e = ambiente(); const state = e.contexto.__testState;
  Object.assign(state, { clientes: [{ id: 'c', nome: 'Ficticio' }], processos: [], atendimentos: [{ id: 'a' }] });
  let dados = { clienteId: 'c', atendimentoOrigemId: 'a', numero: '0000001-00.2026.8.15.0000', area: 'Civel', status: 'Ativo', orgao: 'Vara', prazo: '2026-11-01', responsavelId: 'u', honorarios: '1000', recebido: '100', resumo: '' };
  e.contexto.FormData = class { *[Symbol.iterator]() { yield* Object.entries(dados); } };
  e.contexto.registrarAuditoria = () => {};
  e.contexto.trocarView = async () => {};
  e.contexto.salvarEstado = async () => { throw new Error('Quota'); };
  await assert.rejects(() => e.contexto.salvarProcesso({ preventDefault() {} }), /Quota/);
  const id = state.processos[0].id, prazo = state.processos[0].prazos[0].id;
  dados.recebido = '200';
  e.contexto.salvarEstado = async () => {};
  await e.contexto.salvarProcesso({ preventDefault() {} });
  assert.equal(state.processos.length, 1); assert.equal(state.processos[0].id, id);
  assert.equal(state.processos[0].prazos[0].id, prazo);
  assert.equal(state.processos[0].movimentacoes.length, 1);
  assert.equal(state.processos[0].recebimentos.length, 1);
  assert.equal(state.processos[0].recebido, 200);
  assert.equal(state.atendimentos[0].processoId, id);
});

test('repetir andamento com providencia apos falha nao duplica movimentacao ou prazo', async () => {
  const e = ambiente(); const state = e.contexto.__testState;
  state.processos = [{ id: 'p', numero: 'teste', prazos: [], movimentacoes: [] }];
  vm.runInContext("processoAbertoId = 'p';", e.contexto);
  const form = { dataset: { detailForm: 'andamento' }, reset() {} };
  const dados = { tipoMovimentacao: 'Contato', data: '2026-10-12', descricao: 'Ficticio', gerarPrazo: 'sim', prazoData: '2026-11-01', prazoTipo: 'Providencia', responsavelId: 'u' };
  e.contexto.FormData = class { *[Symbol.iterator]() { yield* Object.entries(dados); } };
  e.contexto.registrarAuditoria = () => {};
  e.contexto.renderizarTudo = async () => {};
  e.contexto.abrirDetalheProcesso = () => {};
  const event = { preventDefault() {}, target: { closest: () => form } };
  e.contexto.salvarEstado = async () => { throw new Error('Quota'); };
  await assert.rejects(() => e.contexto.salvarItemProcesso(event), /Quota/);
  e.contexto.salvarEstado = async () => {};
  await e.contexto.salvarItemProcesso(event);
  assert.equal(state.processos[0].movimentacoes.length, 1);
  assert.equal(state.processos[0].prazos.length, 1);
  assert.equal(state.processos[0].movimentacoes[0].prazoId, state.processos[0].prazos[0].id);
});

test('repetir usuario depois de falha usa o ID mantido no formulario', async () => {
  const e = ambiente();
  const form = e.elementos.get('#formUsuarioDetalhe');
  form.querySelectorAll = () => [{ value: 'processos' }];
  const dados = { nome: 'Ficticio', email: '', senha: 'ficticia', cargo: '', telefone: '', oabUf: 'PB', oabNumero: '123' };
  e.contexto.FormData = class { *[Symbol.iterator]() { yield* Object.entries({ ...dados, id: form.elements.id.value }); } };
  for (const name of ['registrarAuditoria', 'popularLogin', 'atualizarPerfil', 'renderConfiguracoes']) e.contexto[name] = () => {};
  e.contexto.aplicarPermissoes = async () => {};
  e.contexto.salvarEstado = async () => { throw new Error('Quota'); };
  await assert.rejects(() => e.contexto.salvarUsuario({ preventDefault() {} }), /Quota/);
  const id = form.elements.id.value;
  e.contexto.salvarEstado = async () => {};
  await e.contexto.salvarUsuario({ preventDefault() {} });
  assert.equal(e.contexto.__testState.usuarios.length, 1);
  assert.equal(e.contexto.__testState.usuarios[0].id, id);
});
