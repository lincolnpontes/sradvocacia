(() => {
  "use strict";
  function criar({ indexedDB, contexto }) {
    let abertura;
    function conectar() {
      if (!abertura) abertura = new Promise((resolve, reject) => {
        const req = indexedDB.open("sr-advocacia-minutas-v1", 1);
        req.onupgradeneeded = () => {
          const store = req.result.createObjectStore("minutas", { keyPath: ["escritorio", "usuarioId", "id"] });
          store.createIndex("perfil", ["escritorio", "usuarioId"]);
        };
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error("Feche outras abas do app para abrir as minutas."));
        req.onsuccess = () => {
          const db = req.result;
          db.onversionchange = () => { db.close(); abertura = null; };
          resolve(db);
        };
      }).catch(error => { abertura = null; throw error; });
      return abertura;
    }
    function perfil() {
      const ctx = contexto();
      if (!ctx?.permitido || !ctx.usuarioId || !ctx.escritorio) throw new Error("Sem acesso aos documentos deste perfil.");
      return [ctx.escritorio, ctx.usuarioId];
    }
    function verificar(chave) {
      if (perfil().some((valor, i) => valor !== chave[i])) throw new Error("O perfil ou o escritório mudou. Reabra Documentos.");
    }
    async function operar(modo, acao) {
      const chave = perfil();
      const db = await conectar();
      verificar(chave);
      return new Promise((resolve, reject) => {
        const tx = db.transaction("minutas", modo);
        let resultado, falha;
        tx.oncomplete = () => { try { verificar(chave); resolve(resultado); } catch (e) { reject(e); } };
        tx.onabort = () => reject(falha || tx.error || new Error("Não foi possível guardar a minuta neste navegador."));
        acao(tx.objectStore("minutas"), chave, (req, fn) => {
          req.onsuccess = () => {
            try { verificar(chave); resultado = fn(req.result); }
            catch (e) { falha = e; tx.abort(); }
          };
        });
      });
    }
    function publico(item) {
      const { escritorio, usuarioId, ...doc } = item;
      return doc;
    }
    return {
      listar: () => operar("readonly", (store, chave, ler) => {
        ler(store.index("perfil").getAll(chave), itens => itens.map(publico).sort((a,b) => b.atualizadoEm.localeCompare(a.atualizadoEm)));
      }),
      salvar(doc, base) {
        const campos = ["id", "titulo", "texto", "clienteId", "modeloId"];
        if (!doc?.id || !campos.every(k => typeof doc[k] === "string")) {
          return Promise.reject(new Error("A minuta está incompleta."));
        }
        const copia = Object.fromEntries(campos.map(k => [k, doc[k]]));
        return operar("readwrite", (store, chave, ler) => {
          ler(store.get([...chave, copia.id]), anterior => {
            if ((anterior?.atualizadoEm || "") !== (base || "")) {
              const erro = new Error("Outra aba salvou uma versão diferente da minuta.");
              erro.code = "CONFLITO"; throw erro;
            }
            const ms = Math.max(Date.now(), anterior ? Date.parse(anterior.atualizadoEm) + 1 : 0);
            const item = { ...copia, escritorio: chave[0], usuarioId: chave[1], atualizadoEm: new Date(ms).toISOString() };
            store.put(item);
            return publico(item);
          });
        });
      }
    };
  }
  window.SrRepositorioDocumentos = { criar };
})();
