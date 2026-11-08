(() => {
  "use strict";

  // Textos oficiais para revisão. Gerar uma minuta não consulta essas fontes nem envia dados.
  // CPC, art. 105: https://www2.camara.leg.br/legin/fed/lei/2015/lei-13105-16-marco-2015-780273-normaatualizada-pl.html
  // CC, arts. 47, 320 e 654: https://www2.camara.leg.br/legin/fed/lei/2002/lei-10406-10-janeiro-2002-432893-republicacaoatualizada-1-pl.html
  // Estatuto, arts. 22 a 24: https://www2.camara.leg.br/legin/fed/lei/1994/lei-8906-4-julho-1994-349751-normaatualizada-pl.html
  // CED, art. 48: https://www.oab.org.br/publicacoes/AbrirPDF?LivroId=0000004085
  const lacuna = "[...]";
  const modelos = Object.freeze([
    Object.freeze({ id: "procuracao", nome: "Procuração judicial" }),
    Object.freeze({ id: "contrato-honorarios", nome: "Contrato de honorários advocatícios" }),
    Object.freeze({ id: "recibo", nome: "Recibo de honorários" })
  ]);

  function texto(valor) {
    return typeof valor === "string" ? valor.replace(/\s+/g, " ").trim() : "";
  }

  function identificar(cliente) {
    // Em cadastros antigos, até o CNPJ podia estar no campo chamado "cpf".
    const documento = texto(cliente.documento) || texto(cliente.cpf);
    const compacto = documento.replace(/[.\/\s-]/g, "");
    const inferido = /^\d{11}$/.test(compacto) ? "CPF" : /^[A-Z0-9]{12}\d{2}$/i.test(compacto) ? "CNPJ" : "";
    const tipo = texto(cliente.tipoDocumento).toUpperCase() || inferido;
    const nome = texto(cliente.nome) || lacuna;
    const rotulo = tipo === "CPF" || tipo === "CNPJ" ? tipo : "CPF/CNPJ a confirmar";
    return { tipo, nome, identificacao: `${nome}, ${rotulo}: ${tipo && tipo === inferido ? documento : lacuna}` };
  }

  function qualificar(cliente, parte) {
    const endereco = texto(cliente.domicilio) || lacuna;
    if (parte.tipo === "CNPJ") {
      const fantasia = texto(cliente.nomeFantasia);
      return `${parte.identificacao}${fantasia ? `, nome fantasia: ${fantasia}` : ""}, sede: ${endereco}.\n` +
        `Pessoa indicada no cadastro: ${texto(cliente.representante) || lacuna}; CPF: ${texto(cliente.representanteCpf) || lacuna}; cargo informado: ${texto(cliente.representanteCargo) || lacuna}.\n` +
        `Representação a conferir antes da assinatura. Ato constitutivo, ata ou procuração aplicável: ${lacuna}; limites dos poderes e assinaturas exigidas: ${lacuna}.`;
    }
    if (parte.tipo !== "CPF") {
      return `${parte.identificacao}, endereço: ${endereco}. Confirmar se é pessoa física ou jurídica e completar a qualificação e, se cabível, a representação: ${lacuna}.`;
    }
    const dados = [
      ["nacionalidade", cliente.nacionalidade], ["estado civil", cliente.estadoCivil], ["profissão", cliente.profissao]
    ].filter(([, valor]) => texto(valor)).map(([rotulo, valor]) => `${rotulo}: ${texto(valor)}`);
    return [parte.identificacao, ...dados, `domicílio: ${endereco}`].join(", ") + ".";
  }

  function profissional(usuario) {
    let uf = texto(usuario.oabUf).toUpperCase();
    let numero = texto(usuario.oabNumero);
    if (!uf && !numero) {
      const legado = texto(usuario.oab).toUpperCase().replace(/^OAB\s*[/: -]?\s*/, "");
      const direto = /^([A-Z]{2}|--)\s*[-/ ]?\s*([\d.]+)?$/.exec(legado);
      const inverso = /^([\d.]+)(?:\s*[-/ ]\s*([A-Z]{2}))?$/.exec(legado);
      uf = direto?.[1] || inverso?.[2] || "";
      numero = direto?.[2] || inverso?.[1] || "";
    }
    if (!/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(uf)) uf = "";
    numero = /^\d+(?:\.\d{3})*$/.test(numero) ? numero.replace(/\./g, "") : "";
    // O usuário pode ser assistente. Seu nome não basta para identificá-lo como patrono.
    const nome = (uf && numero && texto(usuario.nome)) || lacuna;
    return `${nome}, OAB/${uf || lacuna} ${numero || lacuna}, endereço profissional completo: ${lacuna}.`;
  }

  // Data civil do formulário (AAAA-MM-DD); não usar a data do relógio ou converter de fuso.
  function dataCivil(dataISO) {
    if (typeof dataISO !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return lacuna;
    const data = new Date(dataISO + "T00:00:00Z");
    if (!Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== dataISO) return lacuna;
    return dataISO.split("-").reverse().join("/");
  }

  function assinaturaParte(tipo, papel) {
    return tipo === "CNPJ"
      ? `Assinatura(s) pela pessoa jurídica, conforme os poderes conferidos: ____________________`
      : `Assinatura da parte ${papel}: ____________________`;
  }

  function gerar(modeloId, cliente, usuario, dataISO) {
    if (!modelos.some(({ id }) => id === modeloId)) throw new RangeError("Modelo de documento desconhecido.");
    cliente = cliente ?? {};
    usuario = usuario ?? {};
    const parte = identificar(cliente);
    const localData = `Local (município/UF): ${lacuna}. Data de assinatura: ${dataCivil(dataISO)}.`;

    if (modeloId === "recibo") {
      return [
        "RECIBO DE HONORÁRIOS",
        "MINUTA PARA REVISÃO. Assinar somente após conferir o efetivo pagamento, o pagador e a identidade do credor.",
        `Cliente: ${parte.identificacao}.\nPessoa que efetuou o pagamento: ${lacuna}.\nCredor emitente: ${lacuna}.`,
        `Recebi R$ ${lacuna} (${lacuna} por extenso), referentes aos honorários do serviço ${lacuna}, contrato e parcela de referência: ${lacuna}.`,
        `Data do pagamento: ${lacuna}. Local do pagamento: ${lacuna}. Forma de pagamento: ${lacuna}.`,
        "A quitação limita-se ao valor e à parcela identificados neste recibo. Não abrange outros pagamentos.",
        localData, "Assinatura do credor: ____________________"
      ].join("\n\n");
    }
    const qualificacao = qualificar(cliente, parte);
    const advogado = profissional(usuario);
    if (modeloId === "procuracao") {
      return [
        "PROCURAÇÃO JUDICIAL",
        "MINUTA PARA REVISÃO. Conferir a identidade das partes, a inscrição profissional, os endereços e os limites do mandato antes da assinatura.",
        `Outorgante: ${qualificacao}`,
        `Outorgado(a): ${advogado}\nSe integrar sociedade de advogados, indicar nome: ${lacuna}; registro na OAB: ${lacuna}; endereço completo: ${lacuna}. Se não integrar, excluir esta linha.`,
        `Objeto: ${lacuna}. Identificação da causa ou do processo: ${lacuna}. Fases e graus de jurisdição abrangidos: ${lacuna}.`,
        "A parte outorgante constitui o(a) profissional acima para representá-la em juízo, com poderes gerais para o foro, restritos ao objeto e às fases indicados neste instrumento.",
        "Não são conferidos os poderes que dependem de cláusula específica nos termos do art. 105 do Código de Processo Civil. Sua eventual inclusão exige decisão expressa da parte outorgante e delimitação de cada ato.",
        localData, assinaturaParte(parte.tipo, "outorgante")
      ].join("\n\n");
    }
    return [
      "CONTRATO DE HONORÁRIOS ADVOCATÍCIOS",
      "MINUTA PARA REVISÃO. Conferir as partes, a inscrição profissional e a tabela da Seccional da OAB do local da prestação do serviço antes de fixar os valores.",
      `Contratante: ${qualificacao}`,
      `Profissional contratado(a): ${advogado}`,
      `1. Objeto e extensão. Serviços contratados: ${lacuna}. Fases e instâncias incluídas: ${lacuna}. Atos não incluídos, inclusive quanto a recursos e cumprimento de sentença: ${lacuna}. A ampliação dos serviços depende de ajuste escrito pelas partes.`,
      "2. Atuação. O serviço será prestado com diligência e sigilo profissional, sem garantia de resultado. O profissional informará os riscos e o andamento do trabalho. A parte contratante fornecerá as informações e os documentos necessários.",
      `3. Honorários contratuais. Valor ou critério de cálculo: ${lacuna}. Forma de pagamento: ${lacuna}. Parcelas e vencimentos: ${lacuna}. Em caso de acordo, o pagamento observará estas condições: ${lacuna}. A solução consensual não implica, por si, redução dos honorários contratados.`,
      "4. Sucumbência. Os honorários de sucumbência eventualmente fixados em favor do patrono pertencem a ele e são distintos dos honorários contratuais. Este contrato não autoriza descontar honorários de quantias devidas ao cliente.",
      `5. Despesas. Custas, diligências e despesas não se confundem com honorários. Responsável pelo pagamento: ${lacuna}. Forma de autorização, adiantamento e reembolso mediante comprovantes: ${lacuna}.`,
      `6. Encerramento. Forma de comunicação: ${lacuna}. No encerramento antecipado, os honorários proporcionais ao trabalho realizado serão apurados pelo seguinte critério: ${lacuna}, considerando os pagamentos já feitos. O profissional prestará contas e devolverá os documentos da parte contratante.`,
      localData, assinaturaParte(parte.tipo, "contratante"), "Assinatura do(a) profissional: ____________________"
    ].join("\n\n");
  }

  window.SrModelosDocumentos = Object.freeze({ modelos, gerar });
})();
