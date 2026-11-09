// Chamado apenas pelo roteador POST existente, depois da validação do token da instalação.
function srMinutas_(action, payload) {
  if (action === 'minutasPing') return { protocoloMinutas:1, ativo:true };
  const usuario = srReadRecord_().data.usuarios.find(u => u.id === payload.usuarioId);
  if (!usuario || !usuario.senha || !srSafeEquals_(usuario.senha, payload.senha) ||
      !(usuario.permissoes || []).includes('documentos')) throw new Error('Sem acesso às minutas deste perfil.');
  const prefixo = 'SR_MINUTA_1_' + srHashText_(usuario.id) + '_';
  const props = PropertiesService.getScriptProperties();
  // A senha legada do app circula no banco geral. Ela não basta para ler uma minuta.
  const chave = String(payload.chave || '');
  if (!/^[a-f0-9]{64}$/.test(chave)) throw new Error('Informe a chave privada das minutas deste perfil.');
  const propriedade = 'SR_CHAVE_MINUTAS_' + srHashText_(usuario.id);
  const hashChave = srHashText_(chave);
  if (action === 'minutasVincular') {
    return srWithLock_(() => {
      const existente = props.getProperty(propriedade);
      if (existente) {
        if (!srSafeEquals_(existente, hashChave)) throw new Error('A chave não corresponde ao perfil.');
      } else {
        if (!payload.admin || !srVerifyAdvancedPassword_(payload.admin, 'minutas-' + srHashText_(usuario.id)).authorized)
          throw new Error('A primeira ativação precisa da senha administrativa do escritório.');
        props.setProperty(propriedade, hashChave);
      }
      return { protocoloMinutas:1, vinculado:true };
    });
  }
  if (!srSafeEquals_(props.getProperty(propriedade), hashChave)) throw new Error('Aparelho não autorizado para estas minutas.');
  function carregar(head) {
    const raw = DriveApp.getFileById(head.file).getBlob().getDataAsString('UTF-8');
    if (srHashText_(raw) !== head.hash) throw new Error('Falha de integridade. Minuta original preservada.');
    const doc = JSON.parse(raw);
    if (doc.id !== head.id || doc.rev !== head.rev) throw new Error('Revisão inválida.');
    return doc;
  }
  if (action === 'minutasList') {
    const conhecidas = new Map((payload.conhecidas || []).map(item => [item.id, item.rev]));
    const dados = props.getProperties();
    const todas = Object.keys(dados).filter(k => k.indexOf(prefixo) === 0).map(k => JSON.parse(dados[k]));
    const atuais = new Map(todas.map(h => [h.id, h.rev]));
    conhecidas.forEach((rev,id) => {
      if (rev > (atuais.get(id) || 0)) throw new Error('O servidor não contém a última revisão confirmada. Cópias locais mantidas.');
    });
    const cabecas = todas.filter(h => h.rev !== conhecidas.get(h.id));
    return { protocoloMinutas: 1, itens: cabecas.slice(0, 8).map(carregar), mais: cabecas.length > 8 };
  }
  if (action !== 'minutasPut') throw new Error('Ação de minutas inválida.');
  const d = payload.doc, campos = ['id','clienteId','modeloId','titulo','texto'];
  if (!d || !campos.every(k => typeof d[k] === 'string') || !/^[a-zA-Z0-9_-]{1,100}$/.test(d.id) ||
      !Number.isSafeInteger(payload.base) || payload.base < 0 || d.texto.length > 500000 || d.titulo.length > 2000) {
    throw new Error('Minuta inválida ou grande demais. A cópia do aparelho deve ser mantida.');
  }
  return srWithLock_(() => {
    const chave = prefixo + srHashText_(d.id);
    const head = JSON.parse(props.getProperty(chave) || 'null');
    const anterior = head && carregar(head);
    if (anterior && campos.every(k => anterior[k] === d[k])) return { protocoloMinutas: 1, item: anterior };
    if (payload.base !== (head ? head.rev : 0)) {
      if (!anterior) throw new Error('Revisão do servidor ausente. Cópia local preservada.');
      return { protocoloMinutas: 1, conflito: true, item: anterior };
    }
    const item = { id:d.id, clienteId:d.clienteId, modeloId:d.modeloId, titulo:d.titulo, texto:d.texto,
      rev:payload.base + 1, salvoEm:srNow_() };
    const raw = JSON.stringify(item), hash = srHashText_(raw);
    const pastaId = props.getProperty('SR_MINUTAS_PASTA_V1');
    const pasta = pastaId ? DriveApp.getFolderById(pastaId) : DriveApp.createFolder('SR Advocacia - versões de minutas');
    if (!pastaId) props.setProperty('SR_MINUTAS_PASTA_V1', pasta.getId());
    const file = pasta.createFile(srHashText_(usuario.id + ':' + d.id).slice(0, 18) + '-v' + item.rev + '.json', raw, MimeType.PLAIN_TEXT);
    const nova = { id:d.id, file:file.getId(), rev:item.rev, hash:hash };
    carregar(nova); // Só troca a referência depois de reler a versão inteira; conserva a anterior.
    props.setProperty(chave, JSON.stringify(nova));
    return { protocoloMinutas:1, item:item };
  });
}
