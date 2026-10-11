# Revisao de anexos - v1.0.44

Base revisada: commit `1e1bd6bee85f112f7a28ffff00a1eedcc1f9cf52`, v1.0.43.
A primeira revisao foi somente de leitura. Apos autorizacao do usuario,
foram obtidos backups privados e publicada a protecao de integridade no
Apps Script, editando a implantacao existente da versao 7 para a versao 8.
O endereco `/exec`, o token e as permissoes da implantacao foram mantidos.

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
O ZIP local da v1.0.43 e uma copia do codigo. Separadamente, o JSON completo
do banco foi copiado para o Drive fora da retencao automatica, e baixado para
uma pasta privada local junto ao codigo original e atualizado do Apps Script.
Os arquivos de backup e o codigo privado nao fazem parte deste repositorio publico.

## Protecoes Adicionais

- Leitura local invalida bloqueia gravacao e sincronizacao, sem apagar a copia
  original. Uma janela no tema permite baixar o conteudo para recuperacao.
- A normalizacao nao regrava automaticamente o banco local ao abrir o app.
- Falta de espaco nao anuncia atendimento ou rascunho salvo. A janela mantem
  as alteracoes abertas e permite baixar uma copia; refresh e sync ficam bloqueados.
- A resposta remota so substitui o estado em memoria depois de persistida,
  com liberacao da trava de sincronizacao em `finally`.
- O servidor usa os IDs do arquivo e pasta existentes, sem criar banco vazio
  quando a localizacao original fica indisponivel.
- JSON vazio, invalido, estrutura incompleta ou hash divergente bloqueiam escrita
  no servidor. A leitura nao grava nada e nao substitui o arquivo original.
- Backups automaticos sao lidos de volta e conferidos antes da substituicao;
  gravacoes sao conferidas antes de confirmar sucesso. Retencao so inclui arquivos
  nos padroes automaticos, mantendo copias manuais e arquivos corrompidos fora dela.

## Verificacao

`node --check app.js`

`node --test tests/anexos.test.cjs`

55 testes automatizados: downloads binarios, nomes, anexos antigos, erros,
preservacao do payload, refresh, alteracoes durante sincronizacao, corrupcao,
quota, backups e escrita protegida. Os testes privados de backend exigem
`SR_BACKEND_SOURCE_PATH` apontando para a copia local do Apps Script e rodam
somente com Drive e banco ficticios em memoria.
O servidor opcional `node tests/servidor-qa.cjs 5493` usa exclusivamente localhost,
dados ficticios, token de teste e banco em memoria. A politica de conteudo bloqueia
conexoes externas, inclusive ao Apps Script real.
No navegador: downloads PDF/PNG/TXT comparados por SHA-256 com os originais;
upload pelo seletor, salvamento, reabertura e download do novo anexo;
larguras 320, 390, 768, 1024 e 1280px sem overflow horizontal no atendimento.
Nao foram testados aparelhos fisicos iOS/Android. A copia real do banco foi
validada localmente: IDs de usuarios, clientes, processos e atendimentos,
senhas existentes, anotacoes e anexos foram preservados pela normalizacao;
os bytes dos anexos passaram na validacao do novo downloader. Nenhum dado real
foi enviado ao ambiente de QA ou ao repositorio publico.
No Apps Script, `verificarIntegridadeSrAdvocacia` executou somente leitura e
confirmou o hash e as quantidades do banco original. Detalhes operacionais
ficam somente no registro privado, fora deste repositorio publico.

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

- Anexos em base64,
  imagens no editor e copias do rascunho dividem a quota do navegador. Uma futura
  evolucao deve separar os arquivos dos registros. Esta versao avisa quando a
  persistencia falha e oferece copia de recuperacao, mas nao aumenta a quota.
- Senhas de usuarios ficam em texto claro nos registros sincronizados, e as
  permissoes das abas sao aplicadas no cliente. E necessario autenticar usuarios
  e autorizar operacoes no servidor, com migracao planejada e sem trocar senhas
  automaticamente.
Estes pontos sao riscos do codigo existente, nao comprovacao de perda de dados
ou de acesso indevido no escritorio. Eles nao foram resolvidos por uma reescrita
ou migracao automatica de autenticacao/armazenamento neste patch.
