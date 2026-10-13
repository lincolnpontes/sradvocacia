(function (root) {
  'use strict';
  const SOURCE = 'https://comunica.pje.jus.br/';
  const API = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
  const STALE_MS = 24 * 60 * 60 * 1000;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const numero = value => {
    const number = String(value || '').replace(/[.\-\s]/g, '');
    return /^\d{20}$/.test(number) && !/^0+$/.test(number) ? number : '';
  };
  function situacao(entry, now = Date.now()) {
    if (!entry) return { tipo: 'neutro', texto: 'Ainda não consultado' };
    if (entry.erro) return { tipo: 'erro', texto: 'Falha na última consulta' };
    if (entry.limiteAtingido) return { tipo: 'aviso', texto: 'Limite de resultados do DJEN' };
    if (entry.parcial) return { tipo: 'aviso', texto: 'Histórico parcialmente consultado' };
    const time = Date.parse(entry.completaEm || '');
    if (!Number.isFinite(time) || now - time > STALE_MS || time > now + 300000) return { tipo: 'aviso', texto: 'Informação desatualizada' };
    return { tipo: 'ok', texto: 'Consulta concluída' };
  }
  function certidao(hash) {
    return /^[a-zA-Z0-9_-]+$/.test(hash || '') ? `${API}/${encodeURIComponent(hash)}/certidao` : '';
  }
  function textoPublicacao(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed,svg,math').forEach(el => el.remove());
    doc.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    doc.querySelectorAll('p,div,li,tr').forEach(el => el.append('\n'));
    return doc.body.textContent.trim();
  }
  function validarResposta(value) {
    if (!value || typeof value.consultas !== 'object' || Array.isArray(value.consultas)) throw new Error('Resposta DJEN incompleta.');
    for (const [key, entry] of Object.entries(value.consultas)) {
      if (!numero(key) || entry.numero !== key || !Array.isArray(entry.publicacoes)) throw new Error('Histórico DJEN inválido.');
      if (entry.publicacoes.some(item => item.numero !== key || !/^\d+$/.test(item.id) || typeof item.texto !== 'string')) throw new Error('Publicação de outro processo ou incompleta.');
    }
    return value;
  }
  const helpers = { numero, situacao, certidao, validarResposta };
  if (typeof module !== 'undefined' && module.exports) { module.exports = helpers; return; }

  let contexto, dados = { consultas: {} }, identidade = '', erro = '', ativo = false;
  let consultaEmCurso = '', leituraEmCurso = '', atualizando = false, recebidoEm = 0, sequencia = 0;
  let avisoVisto = '';
  const formatarHora = value => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Ainda não realizada';
  const formatarDia = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
    ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data não informada';
  const atual = () => contexto?.usuario();
  const autorizado = () => !!atual()?.id && (atual().permissoes || []).includes('processos');
  const cacheKey = () => 'sr-advocacia-djen-cache-v1:' + identidade;
  function novaSessao() {
    const user = atual();
    const id = autorizado() ? contexto.endpoint() + '|' + user.id : '';
    if (id !== identidade) {
      identidade = id; sequencia += 1; dados = { consultas: {} }; erro = ''; recebidoEm = 0; avisoVisto = '';
      consultaEmCurso = ''; leituraEmCurso = ''; atualizando = false;
      if (id) {
        try {
          const raw = contexto.storage()?.getItem(cacheKey());
          if (raw) dados = validarResposta(JSON.parse(raw));
        } catch (_) { erro = 'A cópia local do DJEN não pôde ser lida. Consulte novamente.'; }
      }
    }
    return sequencia;
  }
  async function enviar(action, payload) {
    const user = atual();
    if (!autorizado()) throw new Error('Acesso a processos não autorizado.');
    const result = await contexto.enviar(action, { ...payload, usuarioId: user.id, senha: user.senha });
    if (!result.ok) throw new Error(result.error || 'Não foi possível consultar o DJEN.');
    return validarResposta(result.djen);
  }
  async function guardar(result, substituir, sessao) {
    if (sessao !== sequencia || !autorizado()) return;
    const next = { ...dados, ...result, consultas: substituir ? result.consultas : { ...dados.consultas, ...result.consultas } };
    await contexto.storage().setItem(cacheKey(), JSON.stringify(next));
    if (sessao !== sequencia || !autorizado()) return;
    dados = next; erro = ''; recebidoEm = Date.now(); atualizar();
  }
  async function carregar(forcar = false) {
    const sessao = novaSessao();
    if (!autorizado() || !contexto.endpoint() || atualizando || consultaEmCurso || leituraEmCurso || (!forcar && Date.now() - recebidoEm < 300000)) return;
    atualizando = true;
    try { await guardar(await enviar('djenList', {}), true, sessao); }
    catch (error) {
      if (sessao === sequencia) { erro = traduzirErro(error); recebidoEm = Date.now(); atualizar(); }
    } finally { if (sessao === sequencia) { atualizando = false; atualizar(); } }
  }
  function traduzirErro(error) {
    if (error?.name === 'SrPersistenciaError') return 'Não foi possível guardar o histórico neste aparelho. A cópia anterior foi preservada.';
    if (error?.message === 'Ação desconhecida.') return 'A integração DJEN ainda não está disponível no servidor.';
    return error?.message || 'Falha de conexão com o DJEN. O histórico anterior foi preservado.';
  }
  async function consultar(processoId) {
    const sessao = novaSessao();
    if (!autorizado() || consultaEmCurso || atualizando) return;
    const process = contexto.processos().find(p => p.id === processoId);
    if (!process) return;
    if (!numero(process.numero)) { erro = 'Informe o número CNJ completo, com 20 dígitos, no cadastro do processo.'; atualizar(); return; }
    consultaEmCurso = processoId; erro = ''; atualizar();
    try { await guardar(await enviar('djenConsult', { processoId }), false, sessao); }
    catch (error) { if (sessao === sequencia) erro = traduzirErro(error); }
    finally { if (sessao === sequencia) { consultaEmCurso = ''; atualizar(); } }
  }
  async function marcarLida(processoId, publicacaoId) {
    const sessao = novaSessao();
    if (!autorizado() || leituraEmCurso || consultaEmCurso || atualizando) return;
    leituraEmCurso = publicacaoId; atualizar();
    try { await guardar(await enviar('djenRead', { processoId, publicacaoId }), false, sessao); }
    catch (error) { if (sessao === sequencia) erro = traduzirErro(error); }
    finally { if (sessao === sequencia) { leituraEmCurso = ''; atualizar(); } }
  }
  function badge(number) {
    if (!autorizado()) return '';
    const entry = dados.consultas[numero(number)];
    const unread = entry?.publicacoes.filter(p => !p.lida).length || 0;
    return unread ? `<span class="djen-badge">${unread} publicaç${unread === 1 ? 'ão não lida' : 'ões não lidas'}</span>` : '';
  }
  function painel(process) {
    if (!autorizado()) return '';
    const entry = dados.consultas[numero(process.numero)];
    const status = situacao(entry);
    const busy = consultaEmCurso === process.id;
    const oldLink = erro ? '<span class="djen-state aviso">Conexão não confirmada</span>' : '';
    return `<section id="painelTribunal" class="djen-panel" aria-labelledby="djenTitulo" data-djen-process="${esc(process.id)}">
      <header class="djen-header"><div><h3 id="djenTitulo">Publicações do tribunal</h3><a href="${SOURCE}" target="_blank" rel="noopener noreferrer">DJEN / CNJ</a></div>
        <button type="button" class="ghost-button" data-djen-consult="${esc(process.id)}" ${busy || atualizando || leituraEmCurso ? 'disabled' : ''}>${busy ? 'Consultando…' : 'Consultar tribunal'}</button></header>
      <div class="djen-meta"><span class="djen-state ${status.tipo}">${status.texto}</span>${oldLink}
        <span>Última consulta: <strong>${esc(formatarHora(entry?.tentativaEm))}</strong></span>
        ${(entry?.erro || entry?.parcial) && entry?.completaEm ? `<span>Última consulta completa: ${esc(formatarHora(entry.completaEm))}</span>` : ''}</div>
      ${erro || entry?.erro ? `<p class="djen-error" role="status">${esc(erro || entry.erro)} O histórico salvo continua disponível.</p>` : ''}
      ${entry?.parcial ? `<p class="djen-note">Consulta parcial. ${entry.limiteAtingido ? 'A API limita esta pesquisa a 10.000 resultados.' : 'Consulte novamente para continuar o histórico.'}</p>` : ''}
      ${dados.monitoramentoAtivo === false ? '<p class="djen-note">Consulta automática desativada.</p>' : ''}
      <p class="djen-note">Publicações do diário, conforme disponibilizadas pelo tribunal. Confira o teor oficial para providências e prazos.</p>
      <div class="djen-history">${(entry?.publicacoes || []).map(item => publicacao(item, process.id)).join('') || `<p class="djen-empty">${entry?.completaEm && !entry.parcial && !entry.erro ? 'Nenhuma publicação foi retornada pelo DJEN para este número. Isso não comprova ausência de movimentações nos autos.' : 'Nenhuma publicação guardada para este processo.'}</p>`}</div>
    </section>`;
  }
  function publicacao(item, processoId) {
    const url = certidao(item.hash);
    return `<details class="djen-item" data-djen-item="${esc(item.id)}"><summary><span class="djen-item-title"><strong>${esc(item.tipo)}${item.documento ? ' · ' + esc(item.documento) : ''}</strong><span>${esc(item.tribunal)} · Disponibilizada em ${esc(formatarDia(item.data))}</span></span><span class="djen-state ${item.ativo === false ? 'erro' : item.lida ? 'neutro' : 'aviso'}">${item.ativo === false ? 'Cancelada' : item.lida ? 'Lida' : 'Não lida'}</span></summary>
      <div class="djen-item-body"><p class="djen-orgao">${esc(item.orgao)}</p><div class="djen-text">${esc(textoPublicacao(item.texto))}</div><div class="djen-item-actions">
      ${url ? `<a class="ghost-button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Certidão oficial</a>` : `<a class="ghost-button" href="${SOURCE}" target="_blank" rel="noopener noreferrer">Abrir DJEN</a>`}
      ${!item.lida ? `<button class="ghost-button" type="button" data-djen-read="${esc(item.id)}" data-djen-process="${esc(processoId)}" ${leituraEmCurso || consultaEmCurso || atualizando ? 'disabled' : ''}>${leituraEmCurso === item.id ? 'Salvando…' : 'Marcar como lida'}</button>` : ''}</div></div></details>`;
  }
  function atualizar() {
    const panel = document.querySelector('#painelTribunal');
    if (panel) {
      const process = contexto.processos().find(p => p.id === panel.dataset.djenProcess);
      const opened = [...panel.querySelectorAll('details[open]')].map(el => el.dataset.djenItem);
      if (process) {
        panel.outerHTML = painel(process);
        document.querySelectorAll('#painelTribunal details').forEach(el => { el.open = opened.includes(el.dataset.djenItem); });
      }
    }
    document.querySelectorAll('[data-djen-badge]').forEach(el => { el.innerHTML = badge(el.dataset.djenBadge); });
    const alert = document.querySelector('#djenAlerta');
    if (!alert) return;
    const unread = autorizado() ? contexto.processos().reduce((sum, process) => sum + (dados.consultas[numero(process.numero)]?.publicacoes.filter(p => !p.lida).length || 0), 0) : 0;
    const fingerprint = identidade + '|' + Object.values(dados.consultas).flatMap(e => e.publicacoes.filter(p => !p.lida).map(p => p.versao)).sort().join('|');
    alert.hidden = !unread || avisoVisto === fingerprint;
    alert.querySelector('[data-djen-alert-text]').textContent = `${unread} publicaç${unread === 1 ? 'ão não lida' : 'ões não lidas'} nos processos.`;
    alert.querySelector('[data-djen-dismiss]').onclick = () => { avisoVisto = fingerprint; alert.hidden = true; };
  }
  function iniciar(options) {
    if (ativo) return;
    ativo = true; contexto = options; novaSessao();
    document.addEventListener('click', event => {
      const consult = event.target.closest('[data-djen-consult]');
      const read = event.target.closest('[data-djen-read]');
      if (consult) { event.preventDefault(); void consultar(consult.dataset.djenConsult); }
      if (read) { event.preventDefault(); void marcarLida(read.dataset.djenProcess, read.dataset.djenRead); }
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void carregar(); });
    window.addEventListener('online', () => { void carregar(true); });
    setInterval(() => { if (!document.hidden) void carregar(); }, 60000);
  }
  root.SrDjen = { iniciar, carregar, painel, badge, atualizar, sessao: () => { novaSessao(); atualizar(); }, ...helpers };
})(typeof window !== 'undefined' ? window : globalThis);
