const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Apenas localhost, dados ficticios e sincronizacao em memoria. Nunca usa o Apps Script.
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 5493);
const modo = process.argv[3] || '';
const base = `http://127.0.0.1:${port}`;
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'sradvocacia-qa-'));
function pdfTeste() {
  const conteudo = 'BT /F1 18 Tf 40 140 Td (Anexo de teste - SR Advocacia) Tj ET';
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(conteudo)} >>\nstream\n${conteudo}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objetos.forEach((objeto, indice) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
const fixtures = [
  { nome: 'Contrato de teste.pdf', tipo: 'application/pdf', bytes: pdfTeste() },
  { nome: 'Imagem de teste.png', tipo: 'image/png', bytes: fs.readFileSync(path.join(root, 'icon-192.png')) },
  { nome: 'Notas de teste.txt', tipo: 'text/plain', bytes: Buffer.from('Anexo de teste. Nenhum dado real do escritorio.\n') }
];
fixtures.forEach((item) => fs.writeFileSync(path.join(pasta, item.nome), item.bytes));
const agora = new Date().toISOString();
let data = {
  atualizadoEm: agora, tema: 'classico',
  avancadas: { googleScriptUrl: `${base}/qa-sync`, syncToken: '' },
  configs: { areas: ['Civel'], status: ['Ativo'], orgaos: ['Vara de teste - Joao Pessoa/PB'], movimentacoes: ['Contato com cliente'] },
  usuarios: [{ id: 'qa-user', nome: 'Usuario de teste', senha: 'teste', cargo: 'Advogada', permissoes: ['dashboard', 'atendimentos', 'processos', 'clientes', 'agenda', 'financeiro', 'configuracoes'] }],
  clientes: [{ id: 'qa-client', nome: 'Cliente ficticio', tipoDocumento: 'CPF', documento: '000.000.000-00', criadoEm: agora }],
  atendimentos: [{
    id: 'qa-atendimento', numero: '0001', clienteId: 'qa-client', responsavelId: 'qa-user', area: 'Civel',
    assunto: 'Verificacao dos anexos', data: '2026-10-10T10:00', criadoEm: agora, atualizadoEm: agora,
    conteudoHtml: '<p>Atendimento ficticio para verificar downloads.</p>',
    anexos: fixtures.map((item, indice) => ({ id: `qa-doc-${indice}`, nome: item.nome, tipo: item.tipo, tamanho: item.bytes.length, dataUrl: `data:${item.tipo};base64,${item.bytes.toString('base64')}`, adicionadoEm: agora })),
    versoes: []
  }],
  processos: [], auditoria: []
};
let revision = 1;
let primeiroPull = true;
let offline = false;
let djenLida = false;
if (modo === 'quota-cheia') {
  data.clientes = Array.from({ length: 17 }, (_, i) => ({ ...data.clientes[0], id: i === 0 ? 'qa-client' : `qa-client-${i}`, nome: `Cliente ficticio ${i + 1}` }));
  const grande = (id, tamanho) => ({ id, nome: `${id}.bin`, tipo: 'application/octet-stream', tamanho, dataUrl: `data:application/octet-stream;base64,${Buffer.alloc(tamanho, 77).toString('base64')}`, adicionadoEm: agora });
  data.atendimentos[0].anexos.push(grande('Anexo de teste maior', Math.floor(2.8 * 1024 * 1024)));
  data.atendimentos.push({ ...data.atendimentos[0], id: 'qa-atendimento-2', numero: '0002', assunto: 'Segundo atendimento ficticio', anexos: [grande('Outro anexo de teste', Math.floor(2.5 * 1024 * 1024))] });
}
if (modo === 'primeiro-login' || modo === 'quota-cheia' || modo === 'djen') {
  data.processos = [{
    id: 'qa-processo', numero: '0000001-00.2026.8.15.0000', clienteId: 'qa-client',
    responsavelId: 'qa-user', area: 'Civel', status: 'Ativo', orgao: 'Vara de teste - Joao Pessoa/PB',
    criadoEm: agora, atualizadoEm: agora, prazo: '2026-12-01', honorarios: 0, recebido: 0,
    prazos: [], movimentacoes: [], recebimentos: [], descontos: [], atendimentos: []
  }];
}
const dadosLocais = modo === 'primeiro-login' ? { ...data, clientes: [], processos: [], atendimentos: [] }
  : modo === 'quota-cheia' ? { ...data, clientes: data.clientes.slice(0, 7), processos: [], atendimentos: [] } : data;
function record() {
  return { hasData: true, data, serverVersion: `qa-${revision}`, hash: `qa-hash-${revision}`, revision, updatedAtServer: agora };
}
const permitidos = new Map([
  ['tribunal.js', 'text/javascript'], ['tribunal.css', 'text/css'], ['conteudo-seguro.js', 'text/javascript'], ['vendor/purify.min.js', 'text/javascript'],
  ['app.js', 'text/javascript'], ['armazenamento.js', 'text/javascript'], ['style.css', 'text/css'], ['logo.jpg', 'image/jpeg'],
  ['favicon-32.png', 'image/png'], ['apple-touch-icon.png', 'image/png'],
  ['icon-192.png', 'image/png'], ['icon-512.png', 'image/png'], ['manifest.webmanifest', 'application/manifest+json']
]);
http.createServer(async (req, res) => {
  const url = new URL(req.url, base);
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/qa-controles') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<h1>Teste local DJEN</h1><form method="post" action="/qa-offline"><button>Simular falha do servidor</button></form>');
    return;
  }
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self' blob:; connect-src 'self'; object-src 'self' blob:; base-uri 'none'");
  if (url.pathname === '/qa-offline' && req.method === 'POST') {
    offline = true;
    res.writeHead(303, { Location: '/' });
    res.end();
    return;
  }
  if (url.pathname === '/qa-sync') {
    let request;
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      request = JSON.parse(body);
    } else request = Object.fromEntries(url.searchParams);
    if (offline && !String(request.action).startsWith('djen')) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, requestId: request.requestId, error: 'Servidor ficticio indisponivel' }));
      return;
    }
    if (modo === 'primeiro-login' && primeiroPull && request.action === 'pull') {
      primeiroPull = false;
      await new Promise(resolve => setTimeout(resolve, 8000));
    }
    if (String(request.action).startsWith('djen')) {
      const number = '00000010020268150000';
      const consult = { numero: number, fonte: 'DJEN / CNJ', tentativaEm: new Date().toISOString(), completaEm: new Date().toISOString(), parcial: false,
        erro: offline ? 'DJEN indisponivel (HTTP 503).' : '', publicacoes: [
          { id: '1', numero: number, data: '2026-10-12', tipo: 'Intimação', documento: 'Despacho', tribunal: 'TJPB', orgao: 'Vara de teste - João Pessoa/PB', texto: '<p>Publicação fictícia para testar a integração.</p><p>Este ambiente não contém processos reais.</p>', hash: 'CertidaoFicticia', versao: 'v1', lida: request.action === 'djenRead' },
          { id: '2', numero: number, data: '2026-10-09', tipo: 'Publicação', documento: 'Decisão', tribunal: 'TJPB', orgao: 'Vara de teste - João Pessoa/PB', texto: '<p>Histórico fictício preservado mesmo com falha de conexão.</p>', hash: 'CertidaoFicticia2', versao: 'v2', lida: true }
        ] };
      if (request.action === 'djenRead') djenLida = true;
      consult.publicacoes[0].lida = djenLida;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, requestId: request.requestId, djen: { consultas: { [number]: consult }, monitoramentoAtivo: true } }));
      return;
    }
    if (request.action === 'push') { data = request.payload.data; revision += 1; }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, requestId: request.requestId, serverNow: new Date().toISOString(), syncProtocol: 5, status: 'saved', record: record() }));
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const seed = `<script>
      if (!localStorage.getItem('sr-advocacia-gestao-juridica-v134')) {
        localStorage.setItem('sr-advocacia-gestao-juridica-v134', ${JSON.stringify(modo === 'corrompido' ? '{copia ficticia invalida' : JSON.stringify(dadosLocais))});
        localStorage.setItem('sr-advocacia-sync-meta-v1', JSON.stringify({ serverVersion: '${modo === 'primeiro-login' ? 'qa-0' : 'qa-1'}', serverHash: '${modo === 'primeiro-login' ? 'qa-hash-0' : 'qa-hash-1'}', dirty: false }));
      }
      if (!localStorage.getItem('sr-advocacia-sync-config-v1')) localStorage.setItem('sr-advocacia-sync-config-v1', JSON.stringify({ googleScriptUrl: '${base}/qa-sync', syncToken: 'somente-teste-local' }));
      ${modo === 'quota-cheia' ? `
      if (!localStorage.getItem('outro-app-ficticio')) {
        let filler = '';
        try { for (;;) { filler += 'X'.repeat(128 * 1024); localStorage.setItem('outro-app-ficticio', filler); } } catch (error) { console.info('Limite real de localStorage atingido no teste: ' + error.name); }
      }
      const copiaOriginalQa = localStorage.getItem('sr-advocacia-gestao-juridica-v134');
      window.addEventListener('load', () => {
        const painel = document.createElement('aside');
        painel.id = 'qaDiagnostico';
        painel.innerHTML = '<p id="qaLegadoResultado"></p><form method="post" action="/qa-offline"><button>Simular servidor indisponivel</button></form>';
        document.body.appendChild(painel);
        setInterval(() => {
          const preservado = localStorage.getItem('sr-advocacia-gestao-juridica-v134') === copiaOriginalQa;
          document.querySelector('#qaLegadoResultado').textContent = 'Copia antiga de 7 clientes: ' + (preservado ? 'preservada' : 'ALTERADA') + '. Outro app: ' + localStorage.getItem('outro-app-ficticio').length + ' caracteres.';
        }, 500);
      });` : ''}
      ${modo === 'quota' ? `const gravar = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'sr-advocacia-gestao-juridica-v134') throw new DOMException('Quota ficticia', 'QuotaExceededError'); return gravar.call(this, key, value); };` : ''}
    </script>`;
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('</head>', `${seed}</head>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }
  const nome = url.pathname.slice(1);
  if (permitidos.has(nome)) {
    res.setHeader('Content-Type', permitidos.get(nome));
    res.end(fs.readFileSync(path.join(root, nome)));
  } else { res.statusCode = 404; res.end('Not found'); }
}).listen(port, '127.0.0.1', () => {
  console.log(`QA: ${base} | Senha ficticia: teste | Arquivos: ${pasta}`);
});
