const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {createHash,webcrypto} = require("node:crypto");
const {JSDOM} = require("jsdom");
const ler = nome => fs.readFileSync(require.resolve("../"+nome),"utf8");
const email = "escritorio@example.test", pin = createHash("sha256").update(email).digest("hex");
const authScope = "https://www.googleapis.com/auth/calendar.events.owned.readonly";
const resposta = obj => ({ok:true, json:async () => obj});
function pagina() {
  const dom = new JSDOM(ler("index.html"),{url:"https://qa.invalid/sr/",runScripts:"outside-only"}), w=dom.window;
  const ctx = {perfil:"a",visivel:true, conta:email, chamadas:[]};
  Object.defineProperty(w.crypto,"subtle",{value:webcrypto.subtle});
  w.TextEncoder = TextEncoder;
  w.open = () => ({close(){},location:{replace:url=>ctx.oauth=new URL(url)}});
  w.BroadcastChannel = class { constructor(nome){ctx.canal=this;this.nome=nome;} close(){} postMessage(){} };
  w.fetch = async (url,opt) => {
    ctx.chamadas.push([url,opt]);
    if (url.includes("userinfo")) return resposta({email_verified:true,email:ctx.conta});
    return ctx.buscar ? ctx.buscar(url) : resposta({items:[]});
  };
  w.eval(ler("agenda-google.js").replace(/const CONTA = "[a-f0-9]{64}"/,'const CONTA = "'+pin+'"'));
  w.SrAgendaGoogle.iniciar({perfil:()=>ctx.perfil,visivel:()=>ctx.visivel});
  w.SrAgendaGoogle.sessao();
  const el = id => w.document.querySelector("#gcal"+id);
  ctx.iniciar = () => el("Connect").click();
  ctx.responder = extras => ctx.canal.onmessage({data:{estado:ctx.oauth.searchParams.get("state"),acesso:"teste",escopos:authScope,expira:"3600",...extras}});
  return {w,el,ctx};
}
test("autorização é explícita, de leitura, com retorno fixo; cancelar ou conta errada não consulta calendários", async () => {
  const {w,el,ctx} = pagina();
  try {
    assert.equal(ctx.oauth,undefined); assert.equal(ctx.chamadas.length,0);
    ctx.iniciar();
    assert.equal(ctx.oauth.origin,"https://accounts.google.com");
    assert.equal(ctx.oauth.searchParams.get("redirect_uri"),"https://qa.invalid/sr/agenda-retorno.html");
    assert.deepEqual(ctx.oauth.searchParams.get("scope").split(" "),["openid","email",authScope]);
    assert.match(ctx.canal.nome,/^sr-agenda:[a-f0-9]{64}$/);
    await ctx.responder({estado:"outro"}); assert.equal(ctx.chamadas.length,0);
    await ctx.responder({erro:"access_denied"}); assert.equal(ctx.chamadas.length,0);
    ctx.conta="outra@example.test"; ctx.iniciar(); await ctx.responder();
    assert.equal(ctx.chamadas.length,1); assert.match(el("Status").textContent,/Nenhuma agenda/);
    assert.equal(el("Actions").hidden,true); assert.equal(w.localStorage.length,0);
  } finally { w.close(); }
});
test("lê páginas completas, escapa títulos, mantém datas locais e rejeita links externos",async () => {
  const {w,el,ctx} = pagina();
  try {
    ctx.buscar = s => {
      const u = new URL(s), data=u.searchParams.get("timeMin").slice(0,10);
      assert.equal(u.pathname,"/calendar/v3/calendars/primary/events");
      assert.equal(u.searchParams.get("singleEvents"),"true");
      if (u.searchParams.get("pageToken")) return resposta({items:[{summary:"Segundo",start:{date:data},htmlLink:"https://example.test/calendar/"}]});
      return resposta({nextPageToken:"p2",items:[{summary:"<img src=x>",start:{dateTime:data+"T12:00:00Z"},htmlLink:"https://calendar.google.com/calendar/event?eid=exemplo"}]});
    };
    ctx.iniciar(); await ctx.responder();
    assert.equal(ctx.chamadas.length,3); assert.match(el("Body").textContent,/09:00/);
    assert.equal(el("Body").querySelectorAll("img").length,0);
    assert.equal(el("Body").querySelectorAll("a").length,1);
    assert.match(el("Body").textContent,/Dia inteiro/); assert.match(el("Status").textContent,/Atualizado/);
    assert.equal(new URL(el("Create").href).searchParams.get("authuser"),email);
    assert.equal(w.localStorage.length,0); assert.equal(w.sessionStorage.length,0);
    ctx.buscar = () => ({ok:false,status:503}); await el("Refresh").onclick();
    assert.match(el("Status").textContent,/última consulta/); assert.match(el("Body").textContent,/Segundo/);
    ctx.buscar = () => ({ok:false,status:401}); await el("Refresh").onclick();
    assert.equal(el("Body").textContent,""); assert.match(el("Status").textContent,/expirou/);
  } finally { w.close(); }
});
test("resposta em trânsito não atravessa troca de perfil ou perda de permissão", async () => {
  const {w,el,ctx} = pagina();
  try {
    let liberar, iniciou;
    const pronto = new Promise(r=>iniciou=r);
    ctx.buscar = () => new Promise(r=>{liberar=r; iniciou();});
    ctx.iniciar(); const fim=ctx.responder(); await pronto;
    ctx.perfil=null; w.SrAgendaGoogle.sessao();
    liberar(resposta({items:[{summary:"Privado",start:{date:"2026-11-15"}}]})); await fim;
    assert.equal(el("Body").textContent,""); assert.equal(el("Open").hasAttribute("href"),false);
    ctx.iniciar(); assert.equal(ctx.chamadas.length,2);
    ctx.perfil="b"; w.SrAgendaGoogle.sessao(); assert.equal(el("Start").hidden,false);
  } finally { w.close(); }
});
test("página de retorno apaga o fragmento antes de entregar a resposta e não usa rede ou armazenamento", () => {
  const estado="d".repeat(64);
  const dom=new JSDOM(ler("agenda-retorno.html"),{url:"https://qa.invalid/agenda-retorno.html#state="+estado+"&access_token=ficticio",runScripts:"outside-only"});
  const w=dom.window;
  try {
    let msg; w.BroadcastChannel=class {constructor(nome){assert.equal(nome,"sr-agenda:"+estado);} postMessage(x){assert.equal(w.location.hash,"");msg=x;}close(){}};
    w.eval(ler("agenda-retorno.js")); assert.equal(msg.acesso,"ficticio"); assert.equal(w.localStorage.length,0);
  } finally { w.close(); }
});
