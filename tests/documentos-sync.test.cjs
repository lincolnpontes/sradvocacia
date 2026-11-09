const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const { IDBFactory } = require("fake-indexeddb");
const servidor = require("./minutas-servidor.cjs");
const window = {}, c = vm.createContext({ window, crypto:webcrypto, clearTimeout, setTimeout, document:{hidden:false} });
for (const nome of ["documentos-local.js", "documentos-sync.js"]) {
  vm.runInContext(fs.readFileSync(require.resolve("../"+nome),"utf8"),c);
}
const usuario = { id:"adv", senha:"teste", permissoes:["documentos"] };
const acesso = { usuarioId:"adv", senha:"teste", chave:"a".repeat(64) };
const d = { id:"minuta-1", modeloId:"contrato", clienteId:"c", titulo:"Teste", texto:"Do Mac" };
function aparelho() {
  return window.SrRepositorioDocumentos.criar({ indexedDB:new IDBFactory(),
    contexto:() => ({ permitido:true, usuarioId:"adv", escritorio:"qa" }) });
}
function rede() {
  const s = servidor([usuario, {...usuario,id:"outra"}, {...usuario,id:"sem",permissoes:[]}]);
  const chamar = (a,p={}) => s.chamar(a,{...acesso,...p});
  chamar("minutasVincular",{admin:"admin-teste"});
  return { ...s, chamar, sync:repo => window.SrMinutasSync.conciliar(repo,chamar,()=>{}) };
}

test("rascunho do Mac abre no celular, retorna editado e um aparelho vazio não exclui nada", async () => {
  const mac = aparelho(), celular = aparelho(), r = rede();
  await mac.salvar(d,null); await r.sync(mac); await r.sync(celular);
  const [recebido] = await celular.listar(); assert.equal(recebido.texto,d.texto);
  await celular.salvar({...recebido,texto:"Do celular"},recebido.atualizadoEm);
  await r.sync(celular); await r.sync(mac);
  assert.equal((await mac.listar())[0].texto,"Do celular");
  await r.sync(aparelho()); assert.equal(r.files.size,2);
});

test("edições concorrentes offline resultam em duas versões recuperáveis nos dois aparelhos", async () => {
  const mac = aparelho(), cel = aparelho(), r = rede();
  await mac.salvar(d,null); await r.sync(mac); await r.sync(cel);
  for(const [repo,texto] of [[mac,"petição A"],[cel,"petição B"]]) {
    const [doc] = await repo.listar(); await repo.salvar({...doc,texto},doc.atualizadoEm);
  }
  await r.sync(mac); const retorno = await r.sync(cel); assert.equal(retorno.conflitos,1);
  await r.sync(mac); await r.sync(cel);
  for(const repo of [mac,cel]) {
    assert.deepEqual(Array.from(await repo.listar(),i=>i.texto).sort(),["petição A","petição B"]);
    assert.equal((await repo.inventario()).filter(i=>i.pendente).length,0);
  }
  assert.equal(r.files.size,3);
});

test("resposta perdida não duplica; digitar durante o envio não descarta a última frase", async () => {
  const repo = aparelho(), r = rede();
  const primeiro = await repo.salvar(d,null);
  await assert.rejects(window.SrMinutasSync.conciliar(repo,(a,p)=>{
    const resp=r.chamar(a,p); if(a==="minutasPut") throw Error("rede"); return resp;
  },()=>{}),/rede/);
  assert.equal((await repo.inventario())[0].pendente,true);
  await r.sync(repo); assert.equal(r.files.size,1);
  const segundo = await repo.salvar({...d,texto:"dois"},primeiro.atualizadoEm);
  await window.SrMinutasSync.conciliar(repo,async(a,p)=>{
    const resp=r.chamar(a,p);
    if(a==="minutasPut") await repo.salvar({...d,texto:"três"},segundo.atualizadoEm);
    return resp;
  },()=>{});
  assert.equal((await repo.listar()).length,1);
  assert.equal((await repo.inventario())[0].pendente,true);
  await r.sync(repo); const destino=aparelho(); await r.sync(destino);
  assert.equal((await destino.listar())[0].texto,"três");
});

test("perfil, permissão e chave são verificados no servidor; não basta saber a senha legada", () => {
  const r=rede();
  assert.throws(()=>r.chamar("minutasList",{chave:"b".repeat(64)}),/autorizado/);
  assert.throws(()=>r.chamar("minutasList",{usuarioId:"outra"}),/autorizado/);
  assert.throws(()=>r.chamar("minutasList",{usuarioId:"sem"}),/acesso/);
  assert.throws(()=>r.chamar("minutasVincular",{usuarioId:"outra",admin:"errada"}),/administrativa/);
  assert.throws(()=>r.chamar("minutasVincular",{chave:"b".repeat(64),admin:"admin-teste"}),/corresponde/);
  r.chamar("minutasPut",{doc:d,base:0}); const tentativa=r.chamar("minutasPut",{doc:{...d,texto:"atrasada"},base:0});
  assert.equal(tentativa.conflito,true); assert.equal(tentativa.item.texto,d.texto);
  r.files.set("f-0","arquivo corrompido");
  assert.throws(()=>r.chamar("minutasList"),/integridade/);
  assert.throws(()=>r.chamar("minutasList",{conhecidas:[{id:"faltante",rev:1}]}),/última revisão/);
});

test("minuta do esquema 1.0.49 é enviada sem apagar nem renumerar o original",async () => {
  const db = new IDBFactory(), local = window.SrRepositorioDocumentos.criar({ indexedDB:db,
    contexto:()=>({permitido:true,usuarioId:"adv",escritorio:"qa"}) });
  await local.listar();
  await new Promise((resolve,reject)=>{
    const req=db.open("sr-advocacia-minutas-v1",1);
    req.onsuccess=()=>{
      const tx=req.result.transaction("minutas","readwrite");
      tx.objectStore("minutas").put({...d,escritorio:"qa",usuarioId:"adv",atualizadoEm:"2026-11-08T18:00:00.000Z"});
      tx.oncomplete=()=>{req.result.close();resolve();}; tx.onerror=()=>reject(tx.error);
    };
  });
  const r=rede(); await r.sync(local); const [minuta]=await local.listar();
  assert.equal(minuta.atualizadoEm,"2026-11-08T18:00:00.000Z"); assert.equal(minuta.id,d.id);
  const outro=aparelho(); await r.sync(outro); assert.equal((await outro.listar())[0].texto,d.texto);
});

test("servidor antigo nunca recebe chave nem senha administrativa durante descoberta",async()=>{
  const chamadas=[], api=window.SrMinutasSync.criar({
    repo:aparelho(),contexto:()=>({usuario,endpoint:"qa"}),ler:()=>null,guardar:()=>assert.fail(),
    enviar:async(acao,dados)=>{ chamadas.push([acao,{...dados}]);return {ok:false,error:"Ação desconhecida."}; }
  });
  await api.verificar(); assert.equal(api.estado().disponivel,false);
  await assert.rejects(api.vincular(acesso.chave,"admin-teste"),/ainda não está atualizado/);
  assert.deepEqual(chamadas,[["minutasPing",{}],["minutasPing",{}]]);
});
