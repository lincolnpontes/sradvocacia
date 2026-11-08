(() => {
  "use strict";
  const modo = window.matchMedia("(display-mode: standalone)");
  const telaCheia = window.matchMedia("(display-mode: fullscreen)");
  let convite = null;
  let instalado = false;
  let solicitando = false;
  let botao, dica;

  function instrucaoManual() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      return "No menu Compartilhar, escolha “Adicionar à Tela de Início” e confirme em “Adicionar”.";
    }
    if (/Macintosh/.test(ua) && /Version\/(\d+).*Safari\//.test(ua) && Number(ua.match(/Version\/(\d+)/)[1]) >= 17) {
      return "No Safari, abra Arquivo → Adicionar ao Dock e confirme em “Adicionar”.";
    }
    if (/Android.*Firefox\//.test(ua)) return "No menu do Firefox, escolha “Instalar” ou “Adicionar à tela inicial”.";
    if (/Edg(?:A)?\//.test(ua)) return "No menu do Edge, abra Aplicativos e escolha “Instalar este site como aplicativo”.";
    if (/Chrome\//.test(ua)) return /Android/.test(ua)
      ? "No menu do Chrome, escolha “Adicionar à tela inicial” ou “Instalar aplicativo”."
      : "No menu do Chrome, abra “Transmitir, salvar e compartilhar” e escolha “Instalar página como app”.";
    return "";
  }

  function atualizar() {
    if (!botao) return;
    const emApp = instalado || modo.matches || telaCheia.matches || navigator.standalone === true;
    botao.hidden = emApp || !(convite || instrucaoManual());
    botao.disabled = solicitando;
    if (botao.hidden) dica.hidden = true;
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    convite = event;
    instalado = false;
    atualizar();
  });
  window.addEventListener("appinstalled", () => { instalado = true; convite = null; atualizar(); });
  modo.addEventListener?.("change", atualizar);
  telaCheia.addEventListener?.("change", atualizar);
  document.addEventListener("DOMContentLoaded", async () => {
    botao = document.getElementById("btnInstalarApp");
    dica = document.getElementById("instrucaoInstalacao");
    atualizar();
    botao.addEventListener("click", async () => {
      if (solicitando || botao.hidden) return;
      if (!convite) {
        dica.textContent = instrucaoManual();
        dica.hidden = !dica.hidden;
        return;
      }
      const atual = convite;
      convite = null;
      solicitando = true;
      botao.disabled = true;
      try {
        await atual.prompt();
        if ((await atual.userChoice).outcome === "accepted") instalado = true;
      } catch {
        dica.textContent = "O navegador não abriu a instalação. Procure a opção de instalar no menu do navegador.";
      } finally {
        solicitando = false;
        atualizar();
        if (!instalado && dica.textContent) dica.hidden = false;
      }
    });
    try {
      const apps = await navigator.getInstalledRelatedApps?.();
      const manifesto = document.querySelector("link[rel=manifest]").href;
      const id = new URL("./index.html", manifesto).href;
      if (apps?.some(app => app.platform === "webapp" && (app.id === id || app.url === manifesto))) {
        instalado = true;
        atualizar();
      }
    } catch { /* A detecção não está disponível em todos os navegadores. */ }
  });
})();
