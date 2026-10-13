# Revisao v1.0.47

## Escopo

Revisao do frontend, persistencia local, sincronizacao, anexos, permissoes,
formularios, editor e backend atual. Fluxos existentes mantidos. Integracao
DJEN adicionada dentro de cada processo, sem central de novidades e sem
conversao de publicacoes em prazos. Esta revisao nao e uma certificacao de seguranca.

## Correcoes

- Removida a migracao que substituia jurisdicoes, telefones e textos de dados
  reais por exemplos da Paraiba. Nao se tentou adivinhar ou restaurar valores
  que versoes antigas ja tenham alterado.
- Listas explicitamente vazias de prazos e movimentacoes nao recebem registros
  inventados durante a normalizacao.
- Sem sessao valida, o app nao herda as permissoes do primeiro administrador.
  Excluir o usuario conectado encerra a sessao em vez de trocar sua identidade.
- Honorarios ocultos tambem nos detalhes de clientes e processos sem permissao
  financeira. Operacoes de recebimento e contrato verificam essa permissao.
- Conteudo HTML de atendimentos passa pelo DOMPurify antes de exibicao e
  exportacao. Os originais preservados nao sao reescritos por essa verificacao.
- Repeticao de envio apos falha local reutiliza o identificador de recebimentos,
  processos, usuarios, movimentacoes e prazos, evitando duplicacao.
- O rascunho e confirmado antes de sair. Falha impede o encerramento silencioso.
- Datas locais nao avancam para o dia seguinte depois das 21h no Brasil.
- IndexedDB ja migrado continua funcionando se o navegador negar acesso ao
  localStorage legado; os originais continuam preservados.

## DJEN

Fonte oficial: https://comunicaapi.pje.jus.br/swagger/djen.yml

- Pesquisa pelo numero CNJ de 20 digitos no endpoint de producao, meio D.
- Historico separado do banco principal, com hash de integridade e copias antes
  de incorporar publicacoes novas ou alteradas. Nao grava clientes, processos,
  atendimentos ou anexos.
- Consulta manual, fonte, tentativa mais recente, ultima consulta completa,
  indicacao de falha, consulta parcial e informacao desatualizada (24h).
- Paginacao em lotes, limite de 10.000 resultados sinalizado, protecao contra
  paginas repetidas, resultados de outro processo e respostas invalidas.
- Respeito ao limite de consultas, espera em HTTP 429 e exclusao mutua entre
  consultas manuais e automaticas. Falhas nao apagam o historico.
- Leitura por usuario; retificacao de uma publicacao volta a gerar aviso.
- Alertas dentro do app e identificadores nos processos, sem nova aba.
- Monitoramento no Apps Script: acionador horario, ate 12 processos ativos por
  execucao, intervalo minimo de 6h por processo. Filas maiores podem demorar
  mais. Depende da autorizacao Google e da disponibilidade do tribunal.
- Nao envia notificacoes push, e-mail ou WhatsApp com o app fechado. O servidor
  coleta publicacoes; o app mostra os avisos quando aberto/conectado.
- DJEN nao representa os autos completos, documentos sigilosos ou todas as
  movimentacoes. Ausencia de resultados nao comprova ausencia de andamento.
  Providencias e prazos continuam sujeitos a conferencia profissional.

## Riscos Remanescentes

1. **Alta: autenticacao e confidencialidade.** O protocolo legado sincroniza
   o banco completo, incluindo senhas de usuarios, para o navegador. Permissoes
   de tela nao isolam dados no servidor. Corrigir de verdade exige migracao para
   autenticacao no servidor, senhas derivadas com algoritmo apropriado, sessoes
   e autorizacao por recurso. Nao foi feita troca de senhas nem migracao ampla
   de autenticacao nesta entrega. As rotas DJEN novas verificam usuario e
   permissao no servidor, mas nao eliminam a limitacao do banco legado.
2. **Media: edicao concorrente.** A sincronizacao do banco inteiro resolve
   campos concorrentes por versao/data; nao oferece uma resolucao interativa
   para cada conflito de campo. Exclusoes de usuarios/configuracoes nao possuem
   a mesma trilha de exclusao que clientes/processos. Uma copia antiga pode
   reintroduzir esses registros. Migracao para operacoes por registro e trilha
   de exclusao generalizada requer uma entrega especifica.
3. **Disponibilidade externa.** Google Apps Script/Drive e CNJ podem limitar
   chamadas, atrasar publicacoes ou ficar indisponiveis. A interface informa
   essas situacoes; nao ha promessa de tempo real ou de cobertura integral.

## Verificacao E Recuperacao

- Testes automatizados com dados ficticios cobrem anexos, persistencia,
  formularios, sincronizacao/backend, seguranca de HTML e DJEN.
- Ensaio privado com copia do banco: 21 clientes, 24 processos, 4 atendimentos,
  6 usuarios e 9 anexos preservados; nenhuma chamada externa nesse ensaio.
- Copia protegida no Drive e copias locais do banco, codigo anterior do Apps
  Script e frontend anterior criadas antes da alteracao. Nao fazem parte deste
  repositorio publico.
- Fonte e modulo do Apps Script preparados para atualizar a implantacao
  existente, sem trocar sua URL. A ativacao depende da autorizacao Google;
  a presenca do codigo no editor nao comprova implantacao nem acionador ativo.
- Nao limpar armazenamento, nao restaurar uma copia antiga por cima do banco
  atual e nao executar limpeza geral para instalar esta versao.

## Instalacao Do Modulo Apps Script

O arquivo `apps-script/Djen.gs` nao contem credenciais ou IDs privados.
Adicionar ao mesmo projeto e rotear `djenList`, `djenConsult` e `djenRead` para
`srDjenHandle_(action, payload)` somente depois da verificacao de token existente.
Autorizar as permissoes de Drive, requisicoes externas e acionadores.
Executar `instalarMonitoramentoDjen` e `verificarInstalacaoDjen`, validar uma
consulta e atualizar a **implantacao existente** com uma nova versao.
Nunca substituir o banco por um arquivo de demonstracao.
