# Armazenamento local e sincronizacao - v1.0.46

## Problema

O app guardava todo o JSON, incluindo anexos e imagens, em localStorage.
Esse espaco tem uma quota pequena e e compartilhado por aplicativos no mesmo
dominio. A falha de gravacao interrompia a sincronizacao para proteger os dados,
mantendo uma copia antiga com sete clientes.

O aviso da v1.0.44 era uma protecao, nao a correcao da falta de capacidade.
A v1.0.45 corrigiu a atualizacao do painel, mas nao esse problema de gravacao.

## Correcao

- Dados, rascunhos, configuracao privada e metadados passam a usar IndexedDB.
- Gravar o estado e sua pendencia de sincronizacao na mesma transacao.
- Confirmar sucesso somente depois de a transacao terminar, com durabilidade estrita.
- Aguardar gravacoes antes de sincronizar, fechar formularios ou atualizar a pagina.
- Evitar cadastros duplicados por duplo submit durante uma gravacao pendente.
- Manter digitacao posterior a um salvamento lento como alteracao pendente.
- Conciliar gravacoes de abas diferentes sem ignorar exclusoes locais conhecidas.
- Manter o diagnostico da falha e a exportacao de recuperacao.

## Preservacao

O app nao escreve, limpa nem exclui as chaves antigas de localStorage.
A primeira migracao guarda as copias originais na tabela `originais` do banco
local `sr-advocacia-local-v1`, antes de usar os dados migrados. Uma edicao feita
posteriormente por uma versao antiga tambem recebe uma copia de recuperacao.
JSON invalido ou armazenamento indisponivel bloqueiam a inicializacao, sem
substituir os registros por dados demonstrativos ou por um cadastro vazio.

A confirmacao antiga de sincronizacao e invalidada durante a migracao para
consultar novamente o servidor. Dados locais pendentes continuam protegidos
e sao conciliados usando a logica de sincronizacao existente.

Nao altera a URL, o token ou o codigo do Apps Script, nem as senhas dos usuarios.
Nao publica backups ou dados reais no repositorio. A autenticacao existente
nao foi redesenhada nesta correcao.

## Verificacao

89 testes aprovados, incluindo a verificacao estatica de todos os pontos que
precisam aguardar gravacoes assincronas.

- Testes automatizados de migracao, abortamento, concorrencia, edicao durante
  gravacao, rascunhos, recuperacao, formularios, anexos e sincronizacao.
- Teste no navegador com localStorage realmente cheio, cache antigo de sete
  clientes e servidor ficticio com 17 clientes e mais de 7 MB de JSON.
- Edicao salva, recarga com servidor indisponivel e anotacoes ainda presentes.
- Download de anexo de 2,8 MB com verificacao de todos os bytes.
- Verificacao privada e sem rede das copias reais: IDs, campos, senhas,
  anotacoes e bytes dos nove anexos existentes permanecem preservados.

```powershell
pnpm install --frozen-lockfile
pnpm test
node tests/servidor-qa.cjs 5499 quota-cheia
```

O teste de backend exige `SR_BACKEND_SOURCE_PATH` apontando para a copia
privada do Apps Script. Esse codigo nao deve ser incluido no repositorio publico.

## Recuperacao

Abrir a v1.0.46 em uma nova aba do mesmo navegador, mantendo a aba antiga e
sua copia de recuperacao ate conferir os registros recebidos. Nao limpar dados,
excluir anexos ou forcar o envio de uma copia antiga para o servidor.

Para reverter codigo, primeiro exportar a copia atual do app e conferir o banco
do servidor. A v1.0.45 nao le o banco IndexedDB novo: nao fazer um downgrade
cego nem apagar IndexedDB ou localStorage para voltar a uma versao anterior.

IndexedDB tambem depende do espaco disponivel e das permissoes do navegador;
nao significa armazenamento ilimitado nem elimina a necessidade de backups.

Referencias: [quotas de armazenamento](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria),
[transacoes IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).
