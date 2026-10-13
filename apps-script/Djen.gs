// Publicacoes isoladas do banco principal. Nenhuma funcao deste modulo grava o cadastro.
const SR_DJEN = Object.freeze({
  API: 'https://comunicaapi.pje.jus.br/api/v1/comunicacao',
  FILE_PROPERTY: 'SR_ADVOCACIA_DJEN_FILE',
  COOLDOWN_PROPERTY: 'SR_ADVOCACIA_DJEN_RETRY_AT',
  LEASE_PROPERTY: 'SR_ADVOCACIA_DJEN_LEASE',
  HOURS: 6,
  PAGE_SIZE: 100,
  MAX_RESULTS: 10000
});

function instalarMonitoramentoDjen() {
  srReadRecord_();
  srWithLock_(() => srDjenFile_(true));
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'monitorarPublicacoesDjen');
  if (!exists) ScriptApp.newTrigger('monitorarPublicacoesDjen').timeBased().everyHours(1).create();
  Logger.log('DJEN instalado. Verificacao horaria em lotes; cada processo e consultado a cada 6 horas. Banco principal preservado.');
}

function verificarInstalacaoDjen() {
  const record = srReadRecord_();
  const store = srDjenRead_();
  Logger.log(JSON.stringify({ instalado: !!srDjenFile_(false),
    acionadores: ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'monitorarPublicacoesDjen').length,
    processos: record.data.processos.length, consultas: Object.keys(store.consultas).length,
    publicacoes: Object.keys(store.consultas).reduce((n, key) => n + store.consultas[key].publicacoes.length, 0) }));
}

function srDjenHandle_(action, payload) {
  const record = srReadRecord_();
  const user = record.data.usuarios.find(u => u.id === payload.usuarioId);
  if (!user || !srSafeEquals_(user.senha, payload.senha) || !(user.permissoes || []).includes('processos')) {
    throw new Error('Acesso a processos nao autorizado. Entre novamente no app.');
  }
  if (action === 'djenList') return srDjenView_(srDjenRead_(), record.data.processos, user.id);
  const process = record.data.processos.find(p => p.id === payload.processoId);
  if (!process) throw new Error('Sincronize este processo antes de consultar o tribunal.');
  const number = srDjenNumber_(process.numero);
  if (!number) throw new Error('Informe o numero CNJ completo, com 20 digitos, no cadastro do processo.');
  if (action === 'djenRead') {
    return srWithLock_(() => {
      const store = srDjenRead_();
      const entry = store.consultas[number];
      const item = entry && entry.publicacoes.find(p => p.id === String(payload.publicacaoId));
      if (!item) throw new Error('Publicacao nao localizada. Consulte novamente.');
      const key = srHashText_(user.id);
      item.leituras = item.leituras || {};
      item.leituras[key] = item.versao;
      srDjenWrite_(store, false);
      return srDjenView_(store, [process], user.id);
    });
  }
  if (action !== 'djenConsult') throw new Error('Acao DJEN desconhecida.');
  srDjenConsult_(number, 2);
  return srDjenView_(srDjenRead_(), [process], user.id);
}

function srDjenNumber_(value) {
  const number = String(value || '').replace(/[.\-\s]/g, '');
  return /^\d{20}$/.test(number) && !/^0+$/.test(number) ? number : '';
}

function srDjenView_(store, processes, userId) {
  const key = srHashText_(userId);
  const consultas = {};
  processes.forEach(process => {
    const number = srDjenNumber_(process.numero);
    const entry = store.consultas[number];
    if (!entry) return;
    consultas[number] = Object.assign({}, entry, { publicacoes: entry.publicacoes.map(item => {
      const copy = Object.assign({}, item, { lida: item.leituras && item.leituras[key] === item.versao });
      delete copy.leituras;
      delete copy.textoOriginal;
      return copy;
    }) });
  });
  return { djen: { fonte: 'DJEN / CNJ', consultas, servidorEm: srNow_(),
    monitoramentoAtivo: ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'monitorarPublicacoesDjen') } };
}

function srDjenFile_(create) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(SR_DJEN.FILE_PROPERTY);
  if (id) {
    const file = DriveApp.getFileById(id);
    if (file.isTrashed()) throw new Error('Historico DJEN na lixeira. Restaure o arquivo original.');
    return file;
  }
  if (!create) return null;
  const value = { schema: 1, consultas: {} };
  const file = srGetDataFolder_().createFile('sr-advocacia-djen-v1.json', JSON.stringify({ data: value, hash: srHash_(value) }), MimeType.PLAIN_TEXT);
  props.setProperty(SR_DJEN.FILE_PROPERTY, file.getId());
  return file;
}

function srDjenRead_() {
  const file = srDjenFile_(false);
  if (!file) return { schema: 1, consultas: {} };
  let record;
  try { record = JSON.parse(file.getBlob().getDataAsString('UTF-8')); } catch (_) {}
  if (!record || !record.data || record.data.schema !== 1 || !record.data.consultas || record.hash !== srHash_(record.data)) {
    throw new Error('Historico DJEN com integridade nao confirmada. O original foi preservado.');
  }
  return record.data;
}

function srDjenWrite_(store, backup) {
  const file = srDjenFile_(true);
  const previous = srDjenRead_();
  if (backup && Object.keys(previous.consultas).length) {
    const text = file.getBlob().getDataAsString('UTF-8');
    const copy = srGetBackupFolder_().createFile('djen-protegido-' + Date.now() + '.json', text, MimeType.PLAIN_TEXT);
    if (copy.getBlob().getDataAsString('UTF-8') !== text) throw new Error('Backup DJEN nao confirmado.');
  }
  const raw = JSON.stringify({ data: store, hash: srHash_(store) });
  file.setContent(raw);
  if (file.getBlob().getDataAsString('UTF-8') !== raw) throw new Error('Gravacao DJEN nao confirmada.');
}

function srDjenAcquire_(number) {
  return srWithLock_(() => {
    const props = PropertiesService.getScriptProperties();
    const now = Date.now();
    if (Number(props.getProperty(SR_DJEN.COOLDOWN_PROPERTY) || 0) > now) throw new Error('DJEN limitou as consultas. Aguarde alguns minutos.');
    const lease = JSON.parse(props.getProperty(SR_DJEN.LEASE_PROPERTY) || '{}');
    if (lease.ate > now) throw new Error('Uma consulta ao DJEN esta em andamento. Tente novamente em instantes.');
    const entry = srDjenRead_().consultas[number];
    if (entry && now - Date.parse(entry.tentativaEm || 0) < 60000) throw new Error('Aguarde um minuto entre consultas ao mesmo processo.');
    const id = Utilities.getUuid();
    props.setProperty(SR_DJEN.LEASE_PROPERTY, JSON.stringify({ id, ate: now + 360000 }));
    return { id, entry: entry || { numero: number, publicacoes: [], proximaPagina: 1 } };
  });
}

function srDjenConsult_(number, maxPages) {
  const lease = srDjenAcquire_(number);
  const entry = lease.entry;
  const tentativaEm = srNow_();
  let page = Number(entry.proximaPagina || 1);
  let total = Number(entry.total || 0);
  let complete = false, failure = '', blocked = false;
  const received = [];
  const seen = new Set(page > 1 ? entry.cicloIds || [] : []);
  try {
    for (let i = 0; i < maxPages; i += 1) {
      const response = UrlFetchApp.fetch(SR_DJEN.API + '?numeroProcesso=' + number + '&meio=D&itensPorPagina=100&pagina=' + page,
        { method: 'get', muteHttpExceptions: true, followRedirects: false, headers: { Accept: 'application/json' } });
      const status = response.getResponseCode();
      const headers = response.getAllHeaders();
      const h = {}; Object.keys(headers).forEach(k => h[k.toLowerCase()] = headers[k]);
      if (status === 429 || Number(h['x-ratelimit-remaining']) === 0) {
        const seconds = Math.max(60, Math.min(3600, Number(h['retry-after']) || 60));
        PropertiesService.getScriptProperties().setProperty(SR_DJEN.COOLDOWN_PROPERTY, String(Date.now() + seconds * 1000));
        blocked = true;
      }
      if (status !== 200) throw new Error(status === 429 ? 'Limite de consultas do DJEN. Nova tentativa depois do intervalo de espera.' : 'DJEN indisponivel (HTTP ' + status + ').');
      let body;
      try { body = JSON.parse(response.getContentText('UTF-8')); } catch (_) { throw new Error('Resposta invalida do DJEN.'); }
      if (body.status !== 'success' || !Array.isArray(body.items) || !Number.isInteger(body.count) || body.count < 0) throw new Error('Resposta incompleta do DJEN.');
      if (page > 1 && total !== body.count) {
        // O diario mudou durante a paginacao. Recomece para nao pular publicacoes.
        page = 1; total = body.count; seen.clear(); break;
      }
      total = body.count;
      if (body.items.length > SR_DJEN.PAGE_SIZE || (body.items.length === 0 && (page - 1) * SR_DJEN.PAGE_SIZE < Math.min(total, SR_DJEN.MAX_RESULTS))) throw new Error('Paginacao incompleta do DJEN.');
      const pageItems = body.items.map(raw => srDjenItem_(raw, number, tentativaEm));
      const pageIds = new Set(pageItems.map(item => item.id));
      if (pageIds.size !== pageItems.length || pageItems.some(item => seen.has(item.id))) {
        throw new Error('O DJEN repetiu uma pagina. O historico anterior foi preservado.');
      }
      pageItems.forEach(item => { seen.add(item.id); received.push(item); });
      const end = page * SR_DJEN.PAGE_SIZE >= total;
      if (end && seen.size < Math.min(total, SR_DJEN.MAX_RESULTS)) throw new Error('Paginacao incompleta do DJEN.');
      complete = end && total < SR_DJEN.MAX_RESULTS;
      page += 1;
      if (complete || page > 100 || blocked) break;
    }
  } catch (error) {
    failure = error.message || 'Falha na consulta ao DJEN.';
    // Reinicie um ciclo inconsistente sem descartar publicacoes ja preservadas.
    page = 1;
    seen.clear();
  }
  try {
    return srWithLock_(() => {
      const store = srDjenRead_();
      const current = store.consultas[number] || entry;
      const items = new Map(current.publicacoes.map(item => [item.id, item]));
      let changed = false;
      received.forEach(item => {
        const old = items.get(item.id);
        if (!old || old.versao !== item.versao) changed = true;
        items.set(item.id, Object.assign({}, item, { encontradaEm: old && old.encontradaEm || tentativaEm, leituras: old && old.leituras || {} }));
      });
      store.consultas[number] = Object.assign({}, current, {
        numero: number, fonte: 'DJEN / CNJ', tentativaEm,
        sucessoEm: !failure ? tentativaEm : (current.sucessoEm || ''),
        completaEm: complete && !failure ? tentativaEm : (current.completaEm || ''),
        erro: failure, parcial: !complete || !!failure, total,
        limiteAtingido: total >= SR_DJEN.MAX_RESULTS,
        proximaPagina: complete || page > 100 ? 1 : page,
        cicloIds: complete ? [] : Array.from(seen),
        publicacoes: Array.from(items.values()).sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id))
      });
      srDjenWrite_(store, changed);
      return store.consultas[number];
    });
  } finally {
    srWithLock_(() => {
      const props = PropertiesService.getScriptProperties();
      const current = JSON.parse(props.getProperty(SR_DJEN.LEASE_PROPERTY) || '{}');
      if (current.id === lease.id) props.deleteProperty(SR_DJEN.LEASE_PROPERTY);
    });
  }
}

function srDjenItem_(raw, number, now) {
  if (!raw || srDjenNumber_(raw.numero_processo || raw.numeroprocessocommascara) !== number) throw new Error('DJEN retornou outro processo. Resultado rejeitado.');
  if (raw.meio && raw.meio !== 'D') throw new Error('DJEN retornou uma fonte diferente da solicitada.');
  const id = String(raw.id || '');
  const date = String(raw.data_disponibilizacao || '');
  if (!/^\d+$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof raw.texto !== 'string') throw new Error('Publicacao sem identificacao, data ou texto.');
  const item = { id, data: date, numero: number, tribunal: String(raw.siglaTribunal || ''),
    orgao: String(raw.nomeOrgao || ''), tipo: String(raw.tipoComunicacao || 'Publicacao'),
    documento: String(raw.tipoDocumento || ''), texto: raw.texto,
    hash: /^[a-zA-Z0-9_-]+$/.test(raw.hash || '') ? raw.hash : '',
    ativo: raw.ativo !== false, encontradaEm: now };
  item.versao = srHash_({ id, data: date, tribunal: item.tribunal, orgao: item.orgao, tipo: item.tipo,
    documento: item.documento, texto: item.texto, hash: item.hash, ativo: item.ativo });
  return item;
}

function monitorarPublicacoesDjen() {
  const started = Date.now();
  const record = srReadRecord_();
  const store = srDjenRead_();
  const numbers = Array.from(new Set(record.data.processos.filter(p => p.status !== 'Encerrado' && !p.arquivado)
    .map(p => srDjenNumber_(p.numero)).filter(Boolean)));
  const last = number => Date.parse(store.consultas[number] && store.consultas[number].tentativaEm || '1970-01-01');
  const pending = numbers.filter(number => started - last(number) > SR_DJEN.HOURS * 3600000)
    .sort((a, b) => last(a) - last(b)).slice(0, 12);
  let done = 0;
  for (const number of pending) {
    if (Date.now() - started > 210000) break;
    try { srDjenConsult_(number, 2); done += 1; }
    catch (_) { break; }
    if (Number(PropertiesService.getScriptProperties().getProperty(SR_DJEN.COOLDOWN_PROPERTY) || 0) > Date.now()) break;
  }
  Logger.log(JSON.stringify({ consultados: done, pendentesNoLote: pending.length - done, bancoPrincipalAlterado: false }));
}
