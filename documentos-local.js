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
      const { escritorio, usuarioId, baseRemota, pendente, ...doc } = item;
      return doc;
    }
    return {
      inventario: () => operar("readonly", (store, chave, ler) => {
        ler(store.index("perfil").getAll(chave), itens => itens.map(item => ({
          doc: publico(item), base: item.baseRemota || 0, pendente: item.pendente !== false
        })));
      }),
      incorporar(remoto, enviado) {
        if (!remoto || !["id","clienteId","modeloId","titulo","texto"].every(k => typeof remoto[k] === "string") ||
            !remoto.id || !Number.isSafeInteger(remoto.rev) || remoto.rev < 1) throw new Error("Minuta remota inválida.");
        return operar("readwrite", (store, chave, ler) => {
          ler(store.get([...chave, remoto.id]), local => {
            const campos = ["id","clienteId","modeloId","titulo","texto"];
            const igual = local && campos.every(k => local[k] === remoto[k]);
            if (local && (local.baseRemota || 0) >= remoto.rev) return { mudou:false };
            // O envio foi confirmado enquanto a advogada continuava a digitar no mesmo aparelho.
            if (!igual && local && enviado && enviado.base === (local.baseRemota || 0) &&
                campos.every(k => enviado.doc[k] === remoto[k])) {
              store.put({ ...local, baseRemota:remoto.rev, pendente:true });
              return { mudou:false };
            }
            const ms = Math.max(Date.now(), local ? Date.parse(local.atualizadoEm) + 1 : 0);
            const atualizadoEm = new Date(ms).toISOString();
            const conflito = local && !igual && local.pendente !== false;
            if (conflito) {
              // A edição offline continua como minuta independente antes de adotar a versão remota.
              const id = crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,"0")).join("");
              store.add({ ...local, id, titulo:local.titulo + " (cópia em conflito)", baseRemota:0, pendente:true, atualizadoEm });
            }
            store.put({ ...Object.fromEntries(campos.map(k => [k, remoto[k]])), escritorio:chave[0], usuarioId:chave[1],
              atualizadoEm:igual ? local.atualizadoEm : atualizadoEm, baseRemota:remoto.rev, pendente:false });
            return { mudou:!igual, conflito:!!conflito };
          });
        });
      },
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
            const item = { ...copia, escritorio: chave[0], usuarioId: chave[1], atualizadoEm: new Date(ms).toISOString(),
              baseRemota: anterior?.baseRemota || 0, pendente:true };
            store.put(item);
            return publico(item);
          });
        });
      }
    };
  }
  window.SrRepositorioDocumentos = { criar };
})();
