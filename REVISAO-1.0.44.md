# Revisao de anexos - v1.0.44

Base revisada: commit `1e1bd6bee85f112f7a28ffff00a1eedcc1f9cf52`, v1.0.43.
O projeto do Google Apps Script foi lido pelo editor, sem executar funcoes,
editar o codigo, acessar o arquivo de dados ou alterar a implantacao.

## Correcao

- O botao Abrir dependia do retorno de `window.open` com `noopener,noreferrer`,
  que retorna `null`. A janela ficava vazia e a funcao encerrava antes de carregar
  o documento. Referencia: [MDN Window.open](https://developer.mozilla.org/en-US/docs/Web/API/Window/open).
- Agora existe Baixar separado de Abrir e Excluir. O anexo salvo em `dataUrl`
  e convertido em Blob mantendo nome, tipo e bytes, sem regravar o registro.
- Imagens abrem em uma janela dentro do app. PDFs, Word e demais formatos
  ficam disponiveis para download, sem depender de um visualizador embutido.
- Links externos legados continuam abrindo no provedor original. Nesses casos,
  o download depende da permissao e dos controles do Drive/provedor; nao houve
  mudanca de compartilhamento nem tentativa de tornar documentos publicos.
- Conteudo ausente, invalido ou truncado gera aviso, sem excluir o anexo.
- URLs temporarias dos downloads so sao liberadas apos 60 segundos, em vez
  de imediatamente. A mesma protecao vale para o backup e a exportacao Word.
- Atualizar nao apaga caches ou service workers de outros apps da mesma origem.
  O rascunho e preservado antes de atualizar; falha na gravacao cancela o reload.
- A confirmacao de um envio nao limpa a pendencia de uma edicao mais recente.
  Respostas mescladas e retentativas de conflito usam o estado local atual.
- Foram corrigidas regras antigas de CSS que criavam colunas fora da tela
  em celulares e tablets. Os botoes dos anexos tem alvo de toque de 44px.

## Preservacao

Nao foram alterados `STORAGE_KEY`, chaves de sincronizacao, formato dos anexos,
protocolo do servidor, IDs de registros, tokens ou senhas. Nenhuma rotina de
limpeza, forcePush ou forcePull foi executada no ambiente real.
O ZIP local da v1.0.43 e uma copia do codigo, NAO um backup dos dados do escritorio.

## Verificacao

`node --check app.js`

`node --test tests/anexos.test.cjs`

29 testes automatizados: downloads binarios, nomes, anexos antigos, erros,
preservacao do payload, refresh e alteracoes durante sincronizacao.
O servidor opcional `node tests/servidor-qa.cjs 5493` usa exclusivamente localhost,
dados ficticios, token de teste e banco em memoria. A politica de conteudo bloqueia
conexoes externas, inclusive ao Apps Script real.
No navegador: downloads PDF/PNG/TXT comparados por SHA-256 com os originais;
upload pelo seletor, salvamento, reabertura e download do novo anexo;
larguras 320, 390, 768, 1024 e 1280px sem overflow horizontal no atendimento.
Nao foram testados aparelhos fisicos iOS/Android nem documentos reais da advogada.

## Publicacao Segura

1. No app que o escritorio usa, obter o backup em Configuracoes > Avancadas >
   Salvar historico e guardar esse arquivo em local privado. Ele contem dados
   sigilosos. Preservar tambem uma copia do JSON atual e dos backups no Drive.
2. Revisar e aprovar a alteracao no GitHub. Ela nao depende de reimplantar o Apps Script.
3. Publicar `app.js`, `index.html` e `style.css` juntos, mantendo dominio e caminho
   atuais. Nao limpar os dados do navegador nem reinstalar para atualizar.
4. Confirmar v1.0.44 e testar um anexo existente e um novo no aparelho da advogada.
   Se houver regressao, reverter somente o codigo; nao restaurar dados antigos
   sobre registros mais recentes automaticamente.

## Outros Riscos Identificados

- `carregarEstado` retorna estado vazio quando o JSON local e invalido e a
  inicializacao o regrava. Isso deve passar a bloquear escrita e permitir
  recuperacao, em uma alteracao dedicada com testes de migracao.
- `salvarEstado` nao trata falta de espaco no localStorage. Anexos em base64,
  imagens no editor e copias do rascunho dividem a quota do navegador. Uma futura
  evolucao deve separar os arquivos dos registros e tratar erros de persistencia.
- Senhas de usuarios ficam em texto claro nos registros sincronizados, e as
  permissoes das abas sao aplicadas no cliente. E necessario autenticar usuarios
  e autorizar operacoes no servidor, com migracao planejada e sem trocar senhas
  automaticamente.
- O Apps Script cria backups antes de substituicoes, mas `srReadRecord_` retorna
  estado vazio apos copiar um JSON corrompido. Isso pode permitir sobrescrita do
  banco numa sincronizacao posterior. A leitura deve falhar de forma protegida;
  nenhuma mudanca desse tipo foi aplicada ao servidor em uso nesta revisao.

Estes pontos sao riscos do codigo existente, nao comprovacao de perda de dados
ou de acesso indevido no escritorio. Eles nao foram resolvidos por uma reescrita
ou migracao automatica neste patch.
