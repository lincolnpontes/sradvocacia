const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { test } = require('node:test');
// O codigo em uso e guardado fora do repositorio publico, junto ao backup privado.
const sourcePath = process.env.SR_BACKEND_SOURCE_PATH;
if (!sourcePath) throw new Error('Informe SR_BACKEND_SOURCE_PATH para testar o Apps Script privado.');
const source = fs.readFileSync(sourcePath, 'utf8');
function ambiente() {
  const writes = [], backups = [], trashed = [];
  let text = '', missing = false, corruptBackup = false, corruptWrite = false, createFailure = false;
  const file = { isTrashed: () => false, getBlob: () => ({ getDataAsString: () => text }), setContent: (value) => { writes.push(value); text = corruptWrite ? '{}' : value; } };
  const iterator = items => ({ hasNext: () => items.length > 0, next: () => items.shift() });
  const folder = { isTrashed: () => false, getFoldersByName: () => iterator([folder]), getFiles: () => iterator(backups.slice()), createFile: (name, value) => {
    if (createFailure) throw new Error('Sem quota no Drive');
    const b = { getName: () => name, getBlob: () => ({ getDataAsString: () => corruptBackup ? '{}' : value }), getLastUpdated: () => new Date(), setTrashed: () => trashed.push(name) };
    backups.push(b); return b;
  } };
  const ctx = vm.createContext({
    Utilities: { getUuid: () => crypto.randomUUID(), formatDate: () => '20261010-120000', DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: (alg, raw) => Array.from(crypto.createHash(alg).update(raw).digest()) },
    Session: { getScriptTimeZone: () => 'America/Fortaleza' }, MimeType: { PLAIN_TEXT: 'text/plain' },
    DriveApp: { getFileById: () => { if (missing) throw new Error('Arquivo ausente'); return file; }, getFolderById: () => folder }
  });
  vm.runInContext(source, ctx);
  const data = { usuarios: [{ id: 'u', senha: 'teste-ficticio' }], clientes: [{ id: 'c' }], processos: [{ id: 'p', clienteId: 'c' }], atendimentos: [{ id: 'a', anexos: [{ id: 'an', nome: 'arquivo.txt', dataUrl: 'data:text/plain;base64,YWJj' }] }] };
  const record = { schema: 1, appId: 'sr-advocacia', revision: 1, serverVersion: 'v1', data, hash: ctx.srHash_(data) };
  text = JSON.stringify(record);
  return { ctx, data, record, writes, backups, trashed, file, setText: v => { text = v; }, getText: () => text, missing: () => { missing = true; }, corruptBackup: () => { corruptBackup = true; }, corruptWrite: () => { corruptWrite = true; }, createFailure: () => { createFailure = true; } };
}
test('leitura valida nao grava nem cria backups', () => {
  const e = ambiente(); assert.equal(JSON.stringify(e.ctx.srReadRecord_()), JSON.stringify(e.record)); assert.equal(e.writes.length + e.backups.length, 0);
});
for (const raw of ['', '{invalido', 'null', '[]', '{}']) test(`banco invalido falha fechado: ${raw}`, () => {
  const e = ambiente(); e.setText(raw); assert.throws(() => e.ctx.srReadRecord_()); assert.equal(e.getText(), raw); assert.equal(e.writes.length + e.backups.length, 0);
});
test('arquivo ausente nao cria outro banco', () => { const e = ambiente(); e.missing(); assert.throws(() => e.ctx.srReadRecord_(), /ausente/); assert.equal(e.writes.length, 0); });
test('alteracao de bytes do banco sem hash correspondente bloqueia escrita', () => {
  const e = ambiente(); e.record.data.atendimentos[0].anexos[0].dataUrl = 'data:text/plain;base64,eA=='; e.setText(JSON.stringify(e.record)); assert.throws(() => e.ctx.srReadRecord_(), /Integridade/); assert.equal(e.writes.length, 0);
});
test('payload incompleto nao substitui banco', () => { const e = ambiente(); assert.throws(() => e.ctx.srPush_({ data: { clientes: [] } }, e.record), /incompletos/); assert.equal(e.writes.length + e.backups.length, 0); });
test('snapshot identico nao altera revisao nem gera backup', () => { const e = ambiente(); assert.equal(e.ctx.srPush_({ data: e.data, baseVersion: 'v1' }, e.record).status, 'unchanged'); assert.equal(e.writes.length + e.backups.length, 0); });
test('push grava somente apos verificar backup e preserva anexos', () => {
  const e = ambiente(); const data = structuredClone(e.data); data.clientes[0].nome = 'Cliente ficticio'; const r = e.ctx.srPush_({ data, baseVersion: 'v1' }, e.record); assert.equal(e.backups.length, 1); assert.equal(r.record.revision, 2); assert.equal(r.record.data.atendimentos[0].anexos[0].dataUrl, e.data.atendimentos[0].anexos[0].dataUrl); assert.equal(JSON.parse(e.backups[0].getBlob().getDataAsString()).revision, 1);
});
for (const failure of ['corruptBackup', 'createFailure']) test(`falha no backup impede sobrescrita: ${failure}`, () => {
  const e = ambiente(); e[failure](); const original = e.getText(); const data = structuredClone(e.data); data.clientes.push({ id: 'c2' }); assert.throws(() => e.ctx.srPush_({ data, baseVersion: 'v1' }, e.record)); assert.equal(e.getText(), original); assert.equal(e.writes.length, 0);
});
test('gravação divergente nao e confirmada como sucesso', () => { const e = ambiente(); e.corruptWrite(); assert.throws(() => e.ctx.srWriteRecord_(e.record), /não confirmada/); });
test('retencao nunca remove backup manual ou arquivo corrompido', () => {
  const e = ambiente();
  const automaticos = Array.from({ length: 42 }, (_, i) => ({ getName: () => `backup-20261010-120000-replace-rev${i}.json`, getLastUpdated: () => new Date(), setTrashed: () => e.trashed.push(i) }));
  const protegidos = ['backup-protegido.json', 'corrompido-original.json'].map(name => ({ getName: () => name, getLastUpdated: () => new Date(), setTrashed: () => { throw new Error('Arquivo protegido'); } }));
  const folder = { getFiles: () => { const items = automaticos.concat(protegidos); return { hasNext: () => items.length > 0, next: () => items.shift() }; } };
  e.ctx.srPruneBackups_(folder); assert.equal(e.trashed.length, 2);
});
