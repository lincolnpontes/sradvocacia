(function (root) {
  "use strict";

  class ArmazenamentoSrAdvocacia {
    constructor({ keys, stateKeys, stateKey, metaKey, legacy, indexedDB, crypto, resolverConflito, validarEstado }) {
      this.keys = keys;
      this.stateKeys = stateKeys;
      this.stateKey = stateKey;
      this.metaKey = metaKey;
      this.legacy = legacy;
      this.indexedDB = indexedDB;
      this.crypto = crypto;
      this.resolverConflito = resolverConflito;
      this.validarEstado = validarEstado || (() => {});
      this.valores = new Map();
      this.originais = [];
      this.revisao = 0;
      this.epocaMesclagem = 0;
      this.pendentes = 0;
      this.fila = Promise.resolve();
      this.erro = null;
    }

    async inicializar() {
      if (!this.indexedDB) throw new Error("IndexedDB indisponivel neste navegador.");
      this.db = await new Promise((resolve, reject) => {
        const request = this.indexedDB.open("sr-advocacia-local-v1", 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore("valores", { keyPath: "key" });
          db.createObjectStore("originais", { keyPath: "id" });
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Outra aba esta impedindo a abertura do banco local."));
        request.onsuccess = () => resolve(request.result);
      });
      this.db.onversionchange = () => this.db.close();
      const legado = this.keys.map(key => ({ key, value: this.legacy.getItem(key) })).filter(item => item.value !== null);
      this.copiaLegada = legado;
      const primeiro = this.stateKeys.map(key => legado.find(item => item.key === key)).find(Boolean);
      this.hashLegado = await this.hash(primeiro?.value || "");
      const armazenado = await this.transacao(["valores", "originais"], "readonly", (tx, result) => {
        tx.objectStore("valores").getAll().onsuccess = event => { result.valores = event.target.result; };
        tx.objectStore("originais").getAll().onsuccess = event => { result.originais = event.target.result; };
      });
      this.migrado = armazenado.valores.some(item => item.key === "_migracao-v1");
      this.originais = armazenado.originais;
      for (const item of this.migrado ? armazenado.valores : legado) {
        this.valores.set(item.key, item.value);
        if (item.key === this.stateKey) this.revisao = item.revisao || 0;
      }
      this.legadoAlterado = this.migrado && this.valores.get("_hash-legado") !== this.hashLegado ? primeiro?.value || null : null;
      this.inicializado = true;
    }

    async hash(value) {
      const bytes = new TextEncoder().encode(value);
      const digest = await this.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    }

    getItem(key) {
      return this.valores.get(key) ?? null;
    }

    async confirmarMigracao(entries) {
      if (this.migrado && !this.legadoAlterado) return false;
      const original = {
        id: this.migrado ? `legado-${Date.now()}-${this.crypto.randomUUID()}` : "localStorage-v1",
        criadoEm: new Date().toISOString(), copias: this.copiaLegada
      };
      await this.gravarItens([
        ...(!this.migrado ? this.copiaLegada : []), ...entries,
        { key: "_migracao-v1", value: "1" }, { key: "_hash-legado", value: this.hashLegado }
      ], { original });
      this.originais.push(original);
      this.migrado = true;
      this.legadoAlterado = null;
      return true;
    }

    gravarItens(entries, { original = null } = {}) {
      const itens = new Map(entries.map(item => [item.key, item.value === null ? null : String(item.value)]));
      const conhecido = this.valores.get(this.stateKey) || null;
      const epoca = this.epocaMesclagem;
      this.pendentes += 1;
      const operacao = this.fila.then(async () => {
        const stores = original ? ["valores", "originais"] : ["valores"];
        const result = await this.transacao(stores, "readwrite", (tx, output, proteger) => {
          const store = tx.objectStore("valores");
          let estadoAtual;
          let metaAtual;
          let lidos = 0;
          const escrever = () => {
            if (++lidos !== 2) return;
            const outraRevisao = (estadoAtual?.revisao || 0) !== this.revisao;
            const conciliar = outraRevisao || epoca !== this.epocaMesclagem;
            const values = new Map(itens);
            if (values.has(this.stateKey)) this.validarEstado(JSON.parse(values.get(this.stateKey)));
            if (values.has(this.stateKey) && estadoAtual?.value && conciliar) {
              values.set(this.stateKey, this.resolverConflito(estadoAtual.value, values.get(this.stateKey), conhecido));
              this.validarEstado(JSON.parse(values.get(this.stateKey)));
            }
            if (conciliar && values.has(this.metaKey)) {
              const recebido = JSON.parse(values.get(this.metaKey));
              const atual = JSON.parse(metaAtual?.value || "{}");
              const base = Number(atual.revision || 0) > Number(recebido.revision || 0) ? atual : recebido;
              values.set(this.metaKey, JSON.stringify({ ...recebido, ...base, dirty: true }));
            }
            output.valores = Array.from(values, ([key, value]) => ({ key, value }));
            for (const item of output.valores) {
              if (item.value === null) store.delete(item.key);
              else store.put({ ...item, revisao: item.key === this.stateKey ? (estadoAtual?.revisao || 0) + 1 : 0 });
            }
            output.revisao = values.has(this.stateKey) ? (estadoAtual?.revisao || 0) + 1 : this.revisao;
            output.outraRevisao = outraRevisao;
            if (original) {
              const backups = tx.objectStore("originais");
              backups.get(original.id).onsuccess = proteger(event => {
                const anterior = event.target.result;
                if (!anterior) backups.add(original);
                else if (JSON.stringify(anterior.copias) !== JSON.stringify(original.copias)) {
                  original.id = `legado-${Date.now()}-${this.crypto.randomUUID()}`;
                  backups.add(original);
                }
              });
            }
          };
          store.get(this.stateKey).onsuccess = proteger(event => { estadoAtual = event.target.result; escrever(); });
          store.get(this.metaKey).onsuccess = proteger(event => { metaAtual = event.target.result; escrever(); });
        });
        for (const item of result.valores) {
          if (item.value === null) this.valores.delete(item.key);
          else this.valores.set(item.key, item.value);
        }
        this.revisao = result.revisao;
        if (result.outraRevisao) this.epocaMesclagem += 1;
        this.erro = null;
        return result.valores;
      }).catch(error => {
        const protegido = new Error("A gravacao local nao foi confirmada.", { cause: error });
        protegido.name = "SrPersistenciaError";
        protegido.causa = error?.name || "Erro de armazenamento";
        this.erro = protegido;
        throw protegido;
      }).finally(() => { this.pendentes -= 1; });
      this.fila = operacao.catch(() => {});
      return operacao;
    }

    setItem(key, value) {
      return this.gravarItens([{ key, value }]);
    }

    removeItem(key) {
      return this.gravarItens([{ key, value: null }]);
    }

    async aguardar() {
      await this.fila;
      if (this.erro) throw this.erro;
    }

    lerCompartilhado() {
      return this.transacao(["valores"], "readonly", (tx, result) => {
        tx.objectStore("valores").get(this.stateKey).onsuccess = event => { result.estado = event.target.result; };
        tx.objectStore("valores").get(this.metaKey).onsuccess = event => { result.meta = event.target.result; };
      });
    }

    adotarCompartilhado(snapshot) {
      this.validarEstado(JSON.parse(snapshot.estado.value));
      this.valores.set(this.stateKey, snapshot.estado.value);
      if (snapshot.meta) this.valores.set(this.metaKey, snapshot.meta.value);
      this.revisao = snapshot.estado.revisao;
    }

    transacao(stores, mode, executar) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(stores, mode, mode === "readwrite" ? { durability: "strict" } : undefined);
        const result = {};
        let erroLocal;
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(erroLocal || tx.error || new Error("Transacao local cancelada."));
        tx.onerror = () => {};
        const proteger = callback => event => {
          try { callback(event); }
          catch (error) { erroLocal = error; tx.abort(); }
        };
        try { executar(tx, result, proteger); }
        catch (error) { erroLocal = error; tx.abort(); }
      });
    }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = ArmazenamentoSrAdvocacia;
  else root.ArmazenamentoSrAdvocacia = ArmazenamentoSrAdvocacia;
})(typeof window !== "undefined" ? window : globalThis);
