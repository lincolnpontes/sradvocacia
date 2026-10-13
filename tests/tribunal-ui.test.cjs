const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const number = '00000010020268150000';
function ambiente() {
  const dom = new JSDOM('<main></main><aside id="djenAlerta"><span data-djen-alert-text></span><button data-djen-dismiss></button></aside>', { runScripts: 'outside-only' });
  const user = { id: 'u', senha: 'ficticia', permissoes: ['processos'] };
  const process = { id: 'p', numero: number };
  const values = new Map();
  let current = user, send, storageError = false;
  vm.runInContext(fs.readFileSync(require.resolve('../tribunal.js'), 'utf8'), dom.getInternalVMContext());
  const api = dom.window.SrDjen;
  api.iniciar({ usuario: () => current, processos: () => [process], endpoint: () => 'https://example.test',
    storage: () => ({ getItem: key => values.get(key), setItem: async (key, value) => { if (storageError) throw Object.assign(new Error('quota'), { name: 'SrPersistenciaError' }); values.set(key, value); } }),
    enviar: (...args) => send(...args) });
  return { dom, api, process, values, send: fn => send = fn, quota: () => storageError = true,
    logout: () => { current = null; api.sessao(); }, close: () => dom.window.close() };
}
function resposta(text = '<p>Teor ficticio</p>') {
  return { ok: true, djen: { consultas: { [number]: { numero: number, tentativaEm: new Date().toISOString(), completaEm: new Date().toISOString(), publicacoes: [
    { id: '1', numero: number, data: '2026-10-12', texto: text, tipo: 'Publicacao', versao: '1', lida: false }
  ] } } } };
}
test('DJEN mantém o historico diante de falha de rede ou de armazenamento', async t => {
  const e = ambiente(); t.after(e.close);
  e.send(async () => resposta()); await e.api.carregar(true);
  assert.match(e.api.painel(e.process), /Teor ficticio/);
  e.send(async () => { throw new Error('Servidor indisponivel'); }); await e.api.carregar(true);
  assert.match(e.api.painel(e.process), /Teor ficticio/);
  assert.match(e.api.painel(e.process), /Servidor indisponivel/);
  e.quota(); e.send(async () => resposta('Outro teor')); await e.api.carregar(true);
  assert.match(e.api.painel(e.process), /Teor ficticio/);
  assert.doesNotMatch(e.api.painel(e.process), /Outro teor/);
  assert.match(e.api.painel(e.process), /cópia anterior foi preservada/);
});
test('resposta atrasada depois de sair não reabre dados do usuário anterior', async t => {
  const e = ambiente(); t.after(e.close); let release;
  e.send(() => new Promise(resolve => release = resolve));
  const loading = e.api.carregar(true); e.logout(); release(resposta()); await loading;
  assert.equal(e.values.size, 0); assert.equal(e.api.painel(e.process), '');
  assert.equal(e.dom.window.document.querySelector('#djenAlerta').hidden, true);
});
test('publicacao HTML vira texto seguro e não inclui ação de gerar prazo', async t => {
  const e = ambiente(); t.after(e.close);
  e.send(async () => resposta('<p>Texto <b>legível</b></p><script>alert(1)</script><img src=x onerror=alert(2)>'));
  await e.api.carregar(true);
  const html = e.api.painel(e.process);
  assert.match(html, /Texto legível/);
  assert.doesNotMatch(html, /<script|onerror|alert\(|<img|Criar prazo|Gerar prazo/);
});
