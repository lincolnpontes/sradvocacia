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
if (modo === 'primeiro-login') {
  data.processos = [{
    id: 'qa-processo', numero: '0000000-00.2026.8.15.0000', clienteId: 'qa-client',
    responsavelId: 'qa-user', area: 'Civel', status: 'Ativo', orgao: 'Vara de teste - Joao Pessoa/PB',
    criadoEm: agora, atualizadoEm: agora, prazo: '2026-12-01', honorarios: 0, recebido: 0,
    prazos: [], movimentacoes: [], recebimentos: [], descontos: [], atendimentos: []
  }];
}
const dadosLocais = modo === 'primeiro-login' ? { ...data, clientes: [], processos: [], atendimentos: [] } : data;
function record() {
  return { hasData: true, data, serverVersion: `qa-${revision}`, hash: `qa-hash-${revision}`, revision, updatedAtServer: agora };
}
const permitidos = new Map([
  ['app.js', 'text/javascript'], ['style.css', 'text/css'], ['logo.jpg', 'image/jpeg'],
  ['favicon-32.png', 'image/png'], ['apple-touch-icon.png', 'image/png'],
  ['icon-192.png', 'image/png'], ['icon-512.png', 'image/png'], ['manifest.webmanifest', 'application/manifest+json']
]);
http.createServer(async (req, res) => {
  const url = new URL(req.url, base);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self' blob:; connect-src 'self'; object-src 'self' blob:; base-uri 'none'");
  if (url.pathname === '/qa-sync') {
    let request;
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      request = JSON.parse(body);
    } else request = Object.fromEntries(url.searchParams);
    if (modo === 'primeiro-login' && primeiroPull && request.action === 'pull') {
      primeiroPull = false;
      await new Promise(resolve => setTimeout(resolve, 8000));
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
      localStorage.setItem('sr-advocacia-sync-config-v1', JSON.stringify({ googleScriptUrl: '${base}/qa-sync', syncToken: 'somente-teste-local' }));
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
