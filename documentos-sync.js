(() => {
  "use strict";
  async function conciliar(repo, chamar, conferir) {
    let mudou = false, conflitos = 0;
    async function incorporar(doc, enviado) {
      conferir();
      const r = await repo.incorporar(doc, enviado);
      mudou ||= r.mudou;
      if (r.conflito) conflitos++;
    }
    // Nunca inferir exclusão a partir de uma lista vazia ou incompleta.
    for (let pagina = 0; pagina < 25; pagina++) {
      conferir();
      const locais = await repo.inventario();
      const resposta = await chamar("minutasList", { conhecidas: locais.map(i => ({ id:i.doc.id, rev:i.base })) });
      if (!Array.isArray(resposta.itens) || typeof resposta.mais !== "boolean" ||
          (resposta.mais && !resposta.itens.length)) throw new Error("Lista de minutas inválida.");
      for (const item of resposta.itens) await incorporar(item);
      if (!resposta.mais) break;
      if (pagina === 24) return { mudou, conflitos, continuar:true };
    }
    conferir();
    const fila = (await repo.inventario()).filter(i => i.pendente);
    for (const envio of fila.slice(0, 8)) {
      const resposta = await chamar("minutasPut", { doc:envio.doc, base:envio.base });
      if (resposta.item?.id !== envio.doc.id) throw new Error("O servidor não confirmou esta minuta.");
      await incorporar(resposta.item, resposta.conflito ? null : envio);
    }
    conferir();
    return { mudou, conflitos, continuar:(await repo.inventario()).some(i => i.pendente) };
  }

  function criar({ repo, contexto, ler, guardar, enviar, atualizar, avisar }) {
    let rodada, geracao = 0, timer, escopo = "", proxima = 0, falhas = 0, msg = "", copias = 0;
    let disponivel = false, edicoes = 0;
    const idAtual = () => {
      const c = contexto();
      return c?.usuario && c.endpoint ? JSON.stringify([c.endpoint, c.usuario.id]) : "";
    };
    const chaveLocal = () => "sr-minutas-vinculo:" + idAtual();
    const vinculo = () => idAtual() ? ler(chaveLocal()) || "" : "";
    function dizer(texto) { msg = texto; avisar?.(); }
    function reset() {
      clearTimeout(timer); timer = null; geracao++; escopo = idAtual(); rodada = null;
      falhas = proxima = copias = edicoes = 0; msg = ""; disponivel = false;
    }
    function sessao() { if (escopo !== idAtual()) reset(); }
    function estado() {
      sessao();
      return { vinculado:!!vinculo(), disponivel, texto:msg || (vinculo() ? "Conferência das minutas pendente." : "Somente neste aparelho. Verifique o serviço antes de vincular.") };
    }
    function agendar(ms = 1500) {
      sessao();
      if (!vinculo() || timer) return;
      timer = setTimeout(() => { timer = null; if (!document.hidden) void sincronizar(); }, Math.max(ms, proxima - Date.now()));
    }
    async function chamada(acao, campos, chave, validade) {
      validade();
      const c = contexto();
      const r = await enviar(acao, acao === "minutasPing" ? {} : { ...campos, usuarioId:c.usuario.id, senha:c.usuario.senha, chave });
      validade();
      if (!r?.ok || r.protocoloMinutas !== 1) {
        const erro = String(r?.error || "");
        if ((/desconhecida|inválida|inv[aá]lid|n[aã]o (?:suportad|reconhecid)/i.test(erro) && /a[çc][aã]o/i.test(erro)) || (r?.ok && !r.protocoloMinutas))
          throw new Error("O servidor ainda não está atualizado para sincronizar minutas.");
        throw new Error(erro || "Servidor de minutas indisponível.");
      }
      return r;
    }
    function guarda() {
      sessao();
      const id = idAtual(), g = geracao;
      return () => { if (!id || g !== geracao || id !== idAtual()) throw new Error("O perfil ou escritório mudou."); };
    }
    async function vincular(chave, admin) {
      if (!/^[a-f0-9]{64}$/.test(chave)) throw new Error("Use a chave de 64 caracteres do perfil.");
      const validar = guarda();
      await chamada("minutasPing", {}, "", validar);
      const resp = await chamada("minutasVincular", { admin }, chave, validar);
      if (!resp.vinculado) throw new Error("O servidor não confirmou o vínculo.");
      validar(); await guardar(chaveLocal(), chave); validar();
      dizer("Aparelho vinculado. Conferindo rascunhos…"); await sincronizar(true);
    }
    async function verificar() {
      const validar = guarda();
      try {
        if (!idAtual()) throw new Error("Confira a configuração do servidor do escritório.");
        const r = await chamada("minutasPing", {}, "", validar);
        if (!r.ativo) throw new Error("Servidor de minutas não ativado.");
        disponivel = true; dizer("Servidor disponível. Use a chave do perfil para vincular este aparelho.");
      } catch (e) {
        if (escopo !== idAtual()) return;
        disponivel = false; dizer("Somente neste aparelho. " + e.message);
      }
    }
    function sincronizar(manual = false) {
      sessao();
      if (!vinculo() || !escopo) return Promise.resolve();
      if (rodada) return rodada;
      if (!manual && Date.now() < proxima) { agendar(); return Promise.resolve(); }
      const validar = guarda(), chave = vinculo(), g = geracao, inicio = edicoes;
      dizer("Sincronizando minutas…");
      rodada = (async () => {
        try {
          const r = await conciliar(repo, (a,p) => chamada(a,p,chave,validar), validar);
          validar(); falhas = 0; proxima = 0; copias += r.conflitos;
          r.continuar ||= edicoes !== inicio;
          dizer((r.continuar ? "Alterações aguardando envio." : "Sincronizado com o escritório às " + new Date().toLocaleTimeString("pt-BR") + ".") +
            (copias ? " Edições simultâneas preservadas como cópias em conflito." : ""));
          if (r.mudou || r.conflitos) await atualizar();
          if (r.continuar) agendar();
        } catch (e) {
          if (g !== geracao || idAtual() !== escopo) return;
          proxima = Date.now() + Math.min(300000, 10000 * 2 ** Math.min(falhas++, 5));
          dizer("Sem confirmação do servidor. " + e.message + " Os rascunhos locais foram mantidos.");
          agendar();
        } finally { if (g === geracao) rodada = null; }
      })();
      return rodada;
    }
    function alterado() {
      sessao();
      edicoes++;
      if (vinculo()) { dizer("Salvo no aparelho. Aguardando sincronização."); agendar(4000); }
    }
    return { sincronizar, sessao, reset, estado, verificar, vincular, alterado,
      chave: () => vinculo(),
      gerar: () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,"0")).join("") };
  }
  window.SrMinutasSync = { criar, conciliar };
})();
