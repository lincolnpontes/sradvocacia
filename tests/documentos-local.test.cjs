const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { IDBFactory } = require('fake-indexeddb');
const window = {};
vm.runInNewContext(fs.readFileSync(require.resolve('../documentos-local.js'), 'utf8'), { window });
const minuta = { id:'a', titulo:'Consulta', texto:'Versão de teste', modeloId:'procuracao', clienteId:'c' };
function ambiente(idb = new IDBFactory()) {
  const perfil = { usuarioId:'u', escritorio:'um', permitido:true };
  const repo = window.SrRepositorioDocumentos.criar({ indexedDB:idb, contexto:() => perfil });
  return { repo, perfil };
}

test('minutas sobrevivem a reabertura e ficam isoladas por perfil e escritório', async () => {
  const db = new IDBFactory(), a = ambiente(db), b = ambiente(db);
  const doc = await a.repo.salvar(minuta, null);
  assert.equal((await b.repo.listar())[0].atualizadoEm, doc.atualizadoEm);
  b.perfil.usuarioId = 'outro';
  assert.equal((await b.repo.listar()).length, 0);
  await b.repo.salvar({...minuta, texto:'Outro perfil'}, null);
  b.perfil.usuarioId = 'u'; b.perfil.escritorio = 'dois';
  assert.equal((await b.repo.listar()).length, 0);
  assert.equal((await a.repo.listar())[0].texto, minuta.texto);
  a.perfil.permitido = false;
  await assert.rejects(a.repo.listar(), /Sem acesso/);
  await assert.rejects(a.repo.salvar(minuta, doc.atualizadoEm), /Sem acesso/);
});

test('gravações concorrentes são atômicas: apenas a primeira usa a revisão correta', async () => {
  const db = new IDBFactory(), a = ambiente(db), b = ambiente(db);
  const inicial = await a.repo.salvar(minuta, null);
  const resultados = await Promise.allSettled([a.repo.salvar({...minuta, texto:'A'}, inicial.atualizadoEm), b.repo.salvar({...minuta, texto:'B'}, inicial.atualizadoEm)]);
  const aceitos = resultados.filter(r => r.status === 'fulfilled');
  assert.equal(aceitos.length, 1);
  assert.equal(resultados.find(r => r.status === 'rejected').reason.code, 'CONFLITO');
  const [atual] = await a.repo.listar();
  assert.equal(atual.texto, aceitos[0].value.texto);
  await assert.rejects(a.repo.salvar(minuta, inicial.atualizadoEm), { code:'CONFLITO' });
  await assert.rejects(a.repo.salvar(minuta, null), { code:'CONFLITO' });
});

test('troca de sessão enquanto o banco abre não grava no perfil seguinte', async () => {
  const { repo, perfil } = ambiente();
  const pendente = repo.salvar(minuta, null);
  perfil.usuarioId = 'novo';
  await assert.rejects(pendente, /mudou/);
  assert.equal((await repo.listar()).length, 0);
});
