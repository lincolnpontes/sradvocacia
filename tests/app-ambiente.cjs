const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ArmazenamentoSrAdvocacia = require('../armazenamento.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const inicializacao = 'const state = {};';
assert.ok(source.includes(inicializacao));
assert.ok(source.includes('\niniciarAplicativo();'));
const isolatedSource = source.replace(inicializacao, 'const state = __testState;')
  .replace('let armazenamentoLocal = null;', 'let armazenamentoLocal = __testStorage;')
  .replace('\niniciarAplicativo();', '');

function ambiente(anexos = []) {
  const elementos = new Map();
  const criados = [];
  const revogados = [];
  const timers = [];
  const alerts = [];
  const abertos = [];
  const gravacoes = [];
  const values = new Map();
  const eventos = new Map();
  let destino;
  function elemento(tag = 'div') {
    return {
      tagName: tag.toUpperCase(), dataset: {}, children: [], textContent: '', innerHTML: '', value: '',
      elements: { id: { value: '' } }, style: {},
      classList: { toggle() {}, add() {}, remove() {} },
      appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; },
      showModal() { this.open = true; }, close() { this.open = false; },
      remove() { this.removed = true; }, click() { this.clicked = true; },
      addEventListener(name, fn) { eventos.set(name, fn); }, setAttribute() {}, focus() {}
    };
  }
  const localStorage = {
    getItem(key) { return values.get(key) ?? null; }, removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); gravacoes.push({ key, value }); }
  };
  const storage = {
    inicializado: true, originais: [], getItem: localStorage.getItem,
    async gravarItens(entries) {
      for (const item of entries) localStorage.setItem(item.key, item.value);
      return entries;
    },
    async setItem(key, value) { return this.gravarItens([{ key, value }]); },
    async removeItem(key) { localStorage.removeItem(key); return []; }, async aguardar() {}, async lerCompartilhado() { return {}; }
  };
  const contexto = vm.createContext({
    __testState: { atualizadoEm: '2026-10-10T12:00:00Z', usuarios: [], clientes: [], processos: [], atendimentos: [{ id: 'at-1', anexos }], avancadas: { syncToken: 'test-only' } },
    __testStorage: storage, ArmazenamentoSrAdvocacia, htmlSeguroAtendimento: html => String(html),
    Blob, TextEncoder, Uint8Array, atob, navigator: { pdfViewerEnabled: true },
    URL: class extends URL {
      static createObjectURL(blob) { const url = `blob:test-${criados.length}`; criados.push({ url, blob }); return url; }
      static revokeObjectURL(url) { revogados.push(url); }
    },
    document: {
      body: elemento('body'),
      querySelector(selector) { if (!elementos.has(selector)) elementos.set(selector, elemento()); return elementos.get(selector); },
      querySelectorAll() { return []; },
      createElement(tag) { const el = elemento(tag); elementos.set(`created-${elementos.size}`, el); return el; }
    },
    window: {
      crypto: webcrypto, open(...args) { abertos.push(args); return null; },
      addEventListener(name, fn) { eventos.set(name, fn); },
      location: { href: 'https://example.test/sradvocacia/?admin=keep#atendimentos', replace(url) { destino = url; } },
      caches: { keys() { throw new Error('Caches nao devem ser acessados.'); } }
    },
    localStorage,
    setTimeout(fn, ms) { timers.push({ fn, ms }); },
    alert(message) { alerts.push(message); }
  });
  vm.runInContext(isolatedSource, contexto);
  contexto.__anexos = anexos;
  vm.runInContext('documentosAtendimento = __anexos;', contexto);
  return { contexto, elementos, criados, revogados, timers, alerts, abertos, gravacoes, values, eventos, storage, destino: () => destino,
    setStorage(value) { contexto.__newStorage = value; vm.runInContext('armazenamentoLocal = __newStorage;', contexto); } };
}
function arquivo(nome, tipo, bytes) {
  const buffer = Buffer.from(bytes);
  return { id: nome, nome, tipo, tamanho: buffer.length, dataUrl: `data:${tipo};base64,${buffer.toString('base64')}`, adicionadoEm: '2026-10-10T12:00:00Z' };
}
module.exports = { source, ambiente, arquivo };
