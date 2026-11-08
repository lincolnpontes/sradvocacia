const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Sem DOM, rede, armazenamento, cadastro real ou acesso ao estado da aplicação.
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../documentos-modelos.js"), "utf8"), { window });
const { modelos, gerar } = window.SrModelosDocumentos;
const pf = Object.freeze({
  nome: "Pessoa Fictícia A", tipoDocumento: "CPF", documento: "000.000.000-00",
  nacionalidade: "nacionalidade de teste", estadoCivil: "estado civil de teste", profissao: "profissão de teste",
  domicilio: "Rua do Exemplo, 0", nomeFantasia: "Não usar na PF", representante: "Não usar na PF"
});
const pj = Object.freeze({
  nome: "Sociedade Exemplo de Teste Ltda.", tipoDocumento: "CNPJ", documento: "00.000.000/0000-00",
  nomeFantasia: "Exemplo de Teste", domicilio: "Sede Fictícia, 0", representante: "Pessoa Indicada B",
  representanteCargo: "Cargo de teste", representanteCpf: "111.111.111-11", profissao: "Não usar na PJ"
});
const usuario = Object.freeze({ nome: "Profissional de Teste", oabUf: "ce", oabNumero: "00000" });
const principais = ["procuracao", "contrato-honorarios"];
const data = "2026-11-08";

test("catálogo público e minutas em texto simples, revisáveis mesmo sem cadastro", () => {
  assert.deepEqual(Array.from(modelos, (m) => m.id), [...principais, "recibo"]);
  for (const { id, nome } of modelos) {
    assert.ok(nome.trim());
    const minuta = gerar(id, null, null);
    assert.equal(typeof minuta, "string");
    assert.match(minuta, /\n\nMINUTA PARA REVISÃO/);
    assert.match(minuta, /\[\.\.\.\]/);
    assert.match(minuta, /Assinatura/);
    assert.doesNotMatch(minuta, /undefined|null|Invalid Date|<[^>]+>|OAB\/PB|Brasileir[oa]/i);
  }
  for (const id of ["", "inexistente", "__proto__", undefined]) {
    assert.throws(() => gerar(id), { name: "RangeError", message: "Modelo de documento desconhecido." });
  }
});

test("qualifica PF sem transportar dados de PJ e usa só a inscrição informada", () => {
  for (const id of principais) {
    const minuta = gerar(id, pf, usuario, data);
    for (const valor of [pf.nome, pf.documento, pf.nacionalidade, pf.estadoCivil, pf.profissao, pf.domicilio]) {
      assert.ok(minuta.includes(valor), valor);
    }
    assert.match(minuta, /Profissional de Teste, OAB\/CE 00000, endereço profissional completo: \[\.\.\.\]/);
    assert.doesNotMatch(minuta, /Não usar na PF|OAB\/PB|Ato constitutivo/);
  }
});

test("na PJ, separa razão social, pessoa indicada e prova da representação", () => {
  for (const id of principais) {
    const minuta = gerar(id, pj, usuario, data);
    for (const valor of [pj.nome, pj.nomeFantasia, pj.documento, pj.domicilio, pj.representante, pj.representanteCpf, pj.representanteCargo]) {
      assert.ok(minuta.includes(valor), valor);
    }
    assert.match(minuta, /Representação a conferir antes da assinatura/);
    assert.match(minuta, /limites dos poderes e assinaturas exigidas: \[\.\.\.\]/);
    assert.doesNotMatch(minuta, /devidamente representada|representante legal|Não usar na PJ/i);
    assert.doesNotMatch(minuta.split("Assinatura(s) pela pessoa jurídica").at(-1), /Pessoa Indicada B/);
    const incompleta = gerar(id, { tipoDocumento: "CNPJ", nomeFantasia: pj.nomeFantasia });
    assert.match(incompleta, /\[\.\.\.\], CNPJ: \[\.\.\.\], nome fantasia:/);
    assert.match(incompleta, /Pessoa indicada no cadastro: \[\.\.\.\]/);
  }
});

test("trata CPF/CNPJ legado, divergências e tipo desconhecido sem inventar identificação", () => {
  assert.match(gerar("procuracao", { cpf: pj.documento }), /CNPJ: 00\.000\.000\/0000-00/);
  assert.match(gerar("procuracao", { cpf: pf.documento, documento: "   " }), /CPF: 000\.000\.000-00/);
  assert.match(gerar("procuracao", { ...pj, cpf: pf.documento }), /CNPJ: 00\.000\.000\/0000-00/);
  assert.match(gerar("procuracao", { ...pj, documento: pf.documento }), /CNPJ: \[\.\.\.\]/);
  assert.match(gerar("procuracao", { nome: pf.nome }), /CPF\/CNPJ a confirmar: \[\.\.\.\]/);
});

test("OAB legada inequívoca funciona; dados parciais ou inválidos não são completados de outro perfil ou campo", () => {
  for (const oab of ["OAB/CE 00.000", "00.000/CE"]) {
    assert.match(gerar("procuracao", pf, { nome: usuario.nome, oab }), /Profissional de Teste, OAB\/CE 00000/);
  }
  for (const [campos, esperado] of [
    [{ oabUf: "CE", oab: "OAB/SP 00000" }, "OAB/CE [...]"],
    [{ oabNumero: "00000" }, "OAB/[...] 00000"],
    [{ oabUf: "XX", oabNumero: "nº do cadastro" }, "OAB/[...] [...]"],
    [{ oab: "cadastro incompleto" }, "OAB/[...] [...]"],
    [{ cargo: "Assistente" }, "OAB/[...] [...]"]
  ]) {
    const minuta = gerar("procuracao", pf, { nome: "Conta sem credencial completa", ...campos });
    assert.ok(minuta.includes(esperado));
    assert.doesNotMatch(minuta, /Conta sem credencial completa|OAB\/PB/);
  }
});

test("procuração restringe objeto e fases, não traz cláusula concessiva de poderes especiais", () => {
  const minuta = gerar("procuracao", pf, usuario, data);
  assert.match(minuta, /Objeto: \[\.\.\.\]/);
  assert.match(minuta, /Fases e graus de jurisdição abrangidos: \[\.\.\.\]/);
  assert.match(minuta, /Não são conferidos os poderes.*art\. 105/);
  assert.match(minuta, /Se integrar sociedade de advogados.*registro na OAB: \[\.\.\.\]; endereço completo: \[\.\.\.\]/);
  assert.doesNotMatch(minuta, /receber citação|confessar|reconhecer a procedência|transigir|desistir|renunciar|receber valores|dar quitação|firmar compromisso|hipossuficiência|substabelecer/i);
});

test("contrato explicita escolhas econômicas e extensão sem fixar preço, êxito ou autorização de desconto", () => {
  const minuta = gerar("contrato-honorarios", pf, usuario, data);
  for (const termo of ["Serviços contratados: [...]", "Fases e instâncias incluídas: [...]", "Valor ou critério de cálculo: [...]",
    "Forma de pagamento: [...]", "Parcelas e vencimentos: [...]", "Em caso de acordo", "Sucumbência", "Responsável pelo pagamento: [...]",
    "mediante comprovantes", "sem garantia de resultado", "não autoriza descontar", "trabalho realizado", "prestará contas"]) {
    assert.ok(minuta.includes(termo), termo);
  }
  assert.doesNotMatch(minuta, /\d\s*%|R\$\s*\d|quita[çc][ãa]o geral/i);
});

test("recibo separa cliente, pagador, credor, parcela, pagamento efetivo e data de assinatura", () => {
  const minuta = gerar("recibo", pj, usuario, data);
  for (const termo of ["após conferir o efetivo pagamento", pj.nome, pj.documento, "Pessoa que efetuou o pagamento: [...]",
    "Credor emitente: [...]", "R$ [...]", "parcela de referência: [...]", "Data do pagamento: [...]", "Local do pagamento: [...]",
    "Data de assinatura: 08/11/2026", "Não abrange outros pagamentos", "Assinatura do credor"]) {
    assert.ok(minuta.includes(termo), termo);
  }
  for (const valor of [pj.representante, pj.representanteCpf, usuario.nome, pj.domicilio]) assert.ok(!minuta.includes(valor));
});

test("data civil não muda de dia nem substitui data ausente ou inválida pela de hoje", () => {
  assert.match(gerar("procuracao", pf, usuario, "2028-02-29"), /Data de assinatura: 29\/02\/2028/);
  for (const invalida of [undefined, null, "", "2026-02-29", "2026-04-31", "2026-15-01", "08/11/2026"]) {
    assert.match(gerar("procuracao", pf, usuario, invalida), /Data de assinatura: \[\.\.\.\]/);
  }
});

test("a cópia editada é independente; campos alheios, inclusive credenciais, não são lidos", () => {
  const naoLer = () => { throw new Error("Campo privado lido"); };
  const cliente = Object.freeze(Object.defineProperties({ ...pf, nome: "Pessoa\n\nFictícia A" }, {
    observacoes: { get: naoLer }, whatsapp: { get: naoLer }, email: { get: naoLer }
  }));
  const perfil = Object.freeze(Object.defineProperties({ ...usuario }, {
    senha: { get: naoLer }, permissoes: { get: naoLer }
  }));
  for (const { id } of modelos) {
    const primeira = gerar(id, cliente, perfil, data);
    const editada = primeira.replace("Pessoa Fictícia A", "Nome revisado");
    assert.notEqual(editada, primeira);
    assert.equal(gerar(id, cliente, perfil, data), primeira);
    assert.doesNotMatch(gerar(id, pj, {}, data), /Pessoa Fictícia A|Nome revisado|Profissional de Teste/);
  }
});
