// Teste optativo de ponta a ponta: nenhum acesso a contas ou servidores reais.
const {spawn} = require("node:child_process");
const {once} = require("node:events");
const {createHash} = require("node:crypto");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {chromium,webkit} = require(process.env.SR_PLAYWRIGHT || "playwright");
const root = path.resolve(__dirname,".."), conta = "agenda@example.test";
const pin = createHash("sha256").update(conta).digest("hex");
const qa = spawn(process.execPath,[path.join(__dirname,"servidor-qa.cjs"),process.env.SR_QA_PORT || "5589"],{windowsHide:true});
async function testar(port,engine,viewport,nome) {
  const browser = await engine.launch(engine === chromium ? {channel:"chrome",headless:true} : {headless:true});
  try {
    const origem = "http://127.0.0.1:"+port;
    const ctx = await browser.newContext({viewport});
    await ctx.route("**/*", async r => {
      const u = new URL(r.request().url());
      if (u.origin === origem) {
        if (u.pathname === "/agenda-google.js") return r.fulfill({contentType:"text/javascript",body:fs.readFileSync(path.join(root,"agenda-google.js"),"utf8").replace(/const CONTA = "[a-f0-9]{64}"/,'const CONTA = "'+pin+'"')});
        return r.continue();
      }
      if (u.origin === "https://accounts.google.com") {
        const f = new URLSearchParams({state:u.searchParams.get("state"),access_token:"ficticio",scope:u.searchParams.get("scope"),expires_in:"3600"});
        return r.fulfill({contentType:"text/html",body:"<script>location.replace("+JSON.stringify(origem+"/agenda-retorno.html#"+f)+")</script>"});
      }
      return r.abort();
    });
    await ctx.addInitScript(email => {
      const original = window.fetch;
      window.fetch = (input, init) => {
        const url = String(input);
        if (url.includes("openidconnect.googleapis.com/")) return Promise.resolve(new Response(JSON.stringify({email,email_verified:true})));
        if (url.includes("www.googleapis.com/calendar/")) {
          const data = new URL(url).searchParams.get("timeMin").slice(0,10);
          return Promise.resolve(new Response(JSON.stringify({items:[{summary:"Reunião fictícia",start:{date:data},location:"João Pessoa"}]})));
        }
        return original(input,init);
      };
    },conta);
    const pg = await ctx.newPage();
    pg.setDefaultTimeout(12000);
    await pg.goto(origem+"/#agenda-google");
    await pg.locator("#loginUsuario").selectOption("qa-user");
    await pg.locator("#loginSenha").fill("teste"); await pg.locator("#formLogin button[type=submit]").click();
    await pg.locator("#gcalConnect").click();
    await pg.locator("#gcalBody").getByText("Reunião fictícia").waitFor().catch(async e => {
      throw new Error(e.message + " | " + await pg.locator("#gcalStatus").innerText() + " | " +
        (await Promise.all(ctx.pages().map(async p => new URL(p.url()).pathname+":"+(await p.locator("#retorno").allTextContents()).join("")))).join(","));
    });
    await pg.locator("[data-gcal-mode=MONTH]").click();
    await pg.locator("#gcalStatus").getByText(/Atualizado/).waitFor();
    assert.equal(await pg.locator("[data-gcal-mode=MONTH]").getAttribute("aria-pressed"),"true");
    const bounds = await pg.locator("#view-agendaGoogle").boundingBox();
    assert.ok(bounds.width > 0 && bounds.x + bounds.width <= viewport.width + 2);
    await pg.screenshot({path:path.join(os.tmpdir(),"sr-agenda-google-"+nome+".png")});
    await pg.locator("[data-view=agenda]").click(); await pg.locator("#view-agenda").waitFor();
    await pg.locator("[data-view=agendaGoogle]").click(); await pg.locator("#gcalBody").getByText("Reunião fictícia").waitFor();
    await pg.locator("#gcalExit").click(); assert.equal(await pg.locator("#gcalBody").innerText(),"");
    console.log(nome+": login, retorno de autorização, consulta, navegação e desconexão OK");
  } finally { await browser.close(); }
}
(async () => {
  try {
    const [saida] = await Promise.race([once(qa.stdout,"data"), once(qa,"exit").then(() => { throw new Error("Servidor de teste indisponível."); })]);
    const port = String(saida).match(/127\.0\.0\.1:(\d+)/)[1];
    await testar(port,chromium,{width:1366,height:800},"desktop");
    await testar(port,webkit,{width:390,height:844},"mobile");
  } finally { qa.kill(); }
})().catch(e => { console.error(e.message); process.exitCode=1; });
