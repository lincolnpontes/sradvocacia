(() => {
  "use strict";
  const campos = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, "", location.pathname);
  const estado = campos.get("state");
  const aviso = document.getElementById("retorno");
  if (!/^[a-f0-9]{64}$/.test(estado || "") || typeof BroadcastChannel !== "function") {
    aviso.textContent = "Abra Google Agenda dentro do SR Advocacia para iniciar a conexão.";
    return;
  }
  const canal = new BroadcastChannel("sr-agenda:" + estado);
  canal.onmessage = ({data}) => {
    if (data !== "recebido") return;
    canal.close();
    aviso.textContent = "Retorne à aba do SR Advocacia.";
    window.close();
  };
  canal.postMessage({estado, acesso:campos.get("access_token"), expira:campos.get("expires_in"),
    escopos:campos.get("scope"), erro:campos.get("error")});
  setTimeout(() => {
    canal.close();
    aviso.textContent = "Volte ao SR Advocacia. Se a conexão não apareceu, tente conectar novamente.";
  }, 8000);
})();
