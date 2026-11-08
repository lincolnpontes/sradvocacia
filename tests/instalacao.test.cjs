const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(require.resolve('../index.html'),'utf8');
const fonte = fs.readFileSync(require.resolve('../instalacao.js'),'utf8');
function pagina({ ua = 'Chrome', standalone = false, installedApps } = {}) {
  const dom = new JSDOM(html, { url:'https://qa.invalid/sradvocacia/', runScripts:'outside-only' }), w = dom.window;
  Object.defineProperty(w.navigator, 'userAgent', { value:ua });
  if (installedApps) w.navigator.getInstalledRelatedApps = async () => installedApps;
  w.matchMedia = media => ({matches: standalone && media.includes('standalone'),addEventListener(){}});
  w.eval(fonte);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { w, btn:w.document.querySelector('#btnInstalarApp'), dica:w.document.querySelector('#instrucaoInstalacao') };
}
test('login com convite nativo só pede instalação depois de um clique, sem enviar formulário', async () => {
  const { w, btn } = pagina();
  try {
    assert.ok(btn.hidden); assert.equal(btn.type,'button');
    const convite = new w.Event('beforeinstallprompt', { cancelable:true });
    let abriu = 0;
    Object.assign(convite, { prompt:async () => { abriu++; }, userChoice:Promise.resolve({outcome:'accepted'}) });
    w.dispatchEvent(convite); assert.ok(convite.defaultPrevented); assert.ok(!btn.hidden); assert.equal(abriu,0);
    btn.click(); await new Promise(setImmediate);
    assert.equal(abriu,1); assert.ok(btn.hidden);
    w.dispatchEvent(new w.Event('appinstalled')); assert.ok(btn.hidden);
  } finally { w.close(); }
});

test('Chrome oferece orientação antes do convite e oculta a ação quando identifica o app instalado', async () => {
  const ua = 'Chrome/146.0 Safari/537';
  const sem = pagina({ua}), com = pagina({ua, installedApps:[{platform:'webapp',url:'https://qa.invalid/sradvocacia/manifest.webmanifest'}]});
  try {
    sem.btn.click();
    assert.ok(!sem.btn.hidden && !sem.dica.hidden);
    assert.match(sem.dica.textContent,/Instalar página/);
    await new Promise(setImmediate);
    assert.ok(com.btn.hidden);
  } finally { com.w.close(); sem.w.close(); }
});
test('Safari orienta instalação manual e não mostra botão no web app instalado', () => {
  const ua = 'Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1';
  const ios = pagina({ua}), mac = pagina({ua:'Macintosh Version/18.0 Safari/605.1'}), app = pagina({ua,standalone:true});
  try {
    assert.ok(!ios.btn.hidden); ios.btn.click(); assert.match(ios.dica.textContent,/Tela de Início/);
    mac.btn.click(); assert.match(mac.dica.textContent,/Dock/);
    assert.ok(app.btn.hidden);
  } finally { ios.w.close(); mac.w.close(); app.w.close(); }
});
