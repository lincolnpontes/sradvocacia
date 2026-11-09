// Gera um novo arquivo para revisão. Não acessa Google, não publica e não sobrescreve arquivos.
const fs = require("node:fs");
const path = require("node:path");
function preparar(original) {
  if (/function srMinutas_\s*\(|action === 'minutasVincular'/.test(original)) throw Error("O módulo já existe; revise sem duplicar.");
  const token = original.match(/^\s*srValidateToken_\(request\.token\);[^\S\n]*$/gm);
  const ancora = /^([ \t]*)if \(action === 'ping'\) \{/gm;
  if (token?.length !== 1 || [...original.matchAll(ancora)].length !== 1) throw Error("Roteador não reconhecido. Nenhum arquivo alterado.");
  const entre = original.slice(original.indexOf("srValidateToken_(request.token);"), original.search(ancora));
  if (!entre.includes("method === 'GET'") || !entre.includes("throw new Error")) throw Error("Proteção de GET não reconhecida.");
  const novas = original.replace(ancora, (linha, indent) =>
    indent + "if (['minutasPing','minutasList','minutasPut','minutasVincular'].includes(action)) {\n" +
    indent + "  if (method !== 'POST') throw new Error('Minutas exigem POST.');\n" +
    indent + "  return srResponse_({ ok:true, requestId, action, ...srMinutas_(action, payload) }, request.direct);\n" +
    indent + "}\n\n" + linha);
  return novas + "\n\n" + fs.readFileSync(path.join(__dirname,"Minutas.gs"),"utf8");
}
if (require.main === module) {
  const [entrada,saida] = process.argv.slice(2);
  if (!entrada || !saida) throw Error("Informe o Codigo.gs atual e o caminho NOVO de saída, ambos fora do repositório.");
  const repo = fs.realpathSync(path.resolve(__dirname,".."));
  const destino = fs.realpathSync(path.dirname(path.resolve(saida)));
  const relativo = path.relative(repo,destino);
  if (!relativo || (!path.isAbsolute(relativo) && relativo !== ".." && !relativo.startsWith(".." + path.sep))) {
    throw Error("O código privado não pode ser colocado no repositório.");
  }
  fs.writeFileSync(saida,preparar(fs.readFileSync(entrada,"utf8")),{flag:"wx"});
  console.log("Cópia preparada para revisão. Nenhuma implantação alterada.");
}
module.exports = { preparar };
