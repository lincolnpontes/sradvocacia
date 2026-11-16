// Projeto independente. Nenhum acesso ao banco do SR, Drive, Gmail ou escrita no calendário.
const SR_CONTA_ = '66baa8dfb04ba767b7c7cdece1107fbe1c29ba73183254d5639770db7e2e4587';
const SR_APARELHO_ = /^SR2-[0-9a-f]{64}$/;
function hashAgenda_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8)
    .map(x => ('0'+((x+256)%256).toString(16)).slice(-2)).join('');
}
function titularAgenda_(usuario) {
  const email = String(usuario.getEmail() || '').toLowerCase().trim();
  return !!email && hashAgenda_(email) === SR_CONTA_;
}
function gestoraAgenda_() {
  return titularAgenda_(Session.getActiveUser()) && titularAgenda_(Session.getEffectiveUser());
}
function jsonAgenda_(valor) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({protocolo:2},valor)))
    .setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  try {
    const raw=e && e.postData && e.postData.contents;
    if (typeof raw !== 'string' || raw.length>4096) return jsonAgenda_({erro:'invalido'});
    const p=JSON.parse(raw);
    if (p.acao!=='listar' || typeof p.perfil!=='string' || !/^[\w-]{1,128}$/.test(p.perfil) ||
      !/^[0-9a-f]{64}$/.test(p.chave || '')) return jsonAgenda_({erro:'invalido'});
    const id='SR2-'+hashAgenda_(p.perfil+'\n'+p.chave);
    // Verificar a liberação em TODAS as páginas, inclusive quando houver resposta em cache.
    if (!PropertiesService.getScriptProperties().getProperty(id)) return jsonAgenda_({erro:'sem_acesso'});
    if (!titularAgenda_(Session.getEffectiveUser())) return jsonAgenda_({erro:'conta'});
    const dia=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
    if (!dia(p.inicio) || !dia(p.fim) || p.fim<=p.inicio || Date.parse(p.fim)-Date.parse(p.inicio)>31*86400000 ||
      (p.pagina!=null && (typeof p.pagina!=='string' || p.pagina.length>1800))) return jsonAgenda_({erro:'periodo'});
    const parametros={timeMin:p.inicio+'T00:00:00-03:00',timeMax:p.fim+'T00:00:00-03:00',
      singleEvents:true,orderBy:'startTime',timeZone:'America/Recife',maxResults:250,
      fields:'kind,nextPageToken,items(status,summary,start,end,location,htmlLink)'};
    if(p.pagina) parametros.pageToken=p.pagina;
    const r=Calendar.Events.list('primary',parametros);
    if (!r || r.kind!=='calendar#events') return jsonAgenda_({erro:'google'});
    return jsonAgenda_({items:r.items || [],nextPageToken:r.nextPageToken || '',consultadoEm:new Date().toISOString()});
  } catch (_) { return jsonAgenda_({erro:'indisponivel'}); }
}
function doGet(e) {
  if (!e || !e.parameter || e.parameter.gestao!=='1') return jsonAgenda_({servico:'agenda-escritorio'});
  if (!gestoraAgenda_()) return HtmlService.createHtmlOutput('A gestão de aparelhos é exclusiva da conta Google do escritório. Abra este endereço no navegador dessa conta.');
  const nonce=Utilities.getUuid()+Utilities.getUuid();
  CacheService.getUserCache().put('portal:'+nonce,'1',900);
  const pedido=String(e.parameter.pedido || '');
  const codigo=SR_APARELHO_.test(pedido) ? pedido : '';
  return HtmlService.createHtmlOutput(`<!doctype html><html lang="pt-BR"><meta charset="utf-8">
    <style>*{box-sizing:border-box}body{font:16px/1.5 system-ui;color:#302d2d;background:#faf7f1;margin:0}main{max-width:680px;margin:auto;padding:28px 20px}h1,h2{line-height:1.2}h2{margin-top:32px;font-size:20px}label{display:block;margin:12px 0}input{width:100%;padding:10px;border:1px solid #bcb4a6;border-radius:5px}button{padding:11px 16px;border:0;border-radius:5px;background:#383436;color:white;cursor:pointer}li{margin:8px 0}li button{margin-left:10px}small{color:#655f58}#msg{min-height:24px}</style>
    <main><small>SR Advocacia · Google Agenda</small><h1>Aparelhos autorizados</h1>
    <p>A liberação permite consultar os compromissos da agenda do escritório. Confira de quem é o pedido antes de autorizar.</p>
    <form id="f"><label>Código público do aparelho<input id="id" required maxlength="68" pattern="SR2-[a-f0-9]{64}" value="${codigo}"></label>
    <label>Identificação do perfil e aparelho<input id="nome" required maxlength="80" placeholder="Ex.: Advogada · MacBook do escritório"></label>
    <button id="aprovar">Autorizar consulta neste aparelho</button></form>
    <p id="msg" role="status"></p><h2>Liberações ativas</h2><ul id="lista"></ul></main>
    <script>const el=id=>document.getElementById(id);
    function acao(tipo,id='',nome=''){el('aprovar').disabled=true;
      google.script.run.withFailureHandler(()=>{el('msg').textContent='Não foi possível confirmar. Reabra o painel e tente novamente.';el('aprovar').disabled=false;})
      .withSuccessHandler(r=>{el('aprovar').disabled=false;el('msg').textContent=r.msg;el('lista').replaceChildren();
        r.itens.forEach(item=>{const linha=document.createElement('li');linha.textContent=item.nome+' · '+item.id.slice(-8);
          const b=document.createElement('button');b.textContent='Revogar';b.onclick=()=>{if(confirm('Revogar a leitura para '+item.nome+'?'))acao('revogar',item.id);};
          linha.append(b);el('lista').append(linha);});
        if(!r.itens.length) el('lista').textContent='Nenhum aparelho liberado.';if(tipo==='autorizar')el('f').reset();})
      .administrarAgenda('${nonce}',tipo,id,nome);}
    el('f').onsubmit=e=>{e.preventDefault();acao('autorizar',el('id').value.trim(),el('nome').value.trim());};acao('listar');</script></html>`)
    .addMetaTag('viewport','width=device-width, initial-scale=1').setTitle('Aparelhos da agenda | SR Advocacia');
}
function administrarAgenda(nonce,acao,id,nome) {
  if (!gestoraAgenda_() || !/^[a-f0-9-]{72}$/i.test(nonce||'') ||
      !CacheService.getUserCache().get('portal:'+nonce)) throw new Error('Reabra o painel na conta do escritório.');
  const props=PropertiesService.getScriptProperties();
  let msg='';
  if (acao==='autorizar' || acao==='revogar') {
    if (!SR_APARELHO_.test(id||'')) throw new Error('Aparelho inválido.');
    if (acao==='revogar') { props.deleteProperty(id); msg='Acesso revogado.'; }
    else {
      if(typeof nome!=='string' || !nome.trim() || nome.length>80) throw new Error('Identifique o aparelho.');
      props.setProperty(id,nome.trim()); msg='Aparelho autorizado. A advogada já pode abrir a agenda no SR.';
    }
  } else if (acao!=='listar') throw new Error('Operação inválida.');
  const liberados=props.getProperties();
  return {msg:msg,itens:Object.keys(liberados).filter(k=>SR_APARELHO_.test(k)).map(k=>({id:k,nome:liberados[k]}))};
}
