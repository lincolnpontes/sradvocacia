# Atualizacao do painel apos sincronizacao - v1.0.45

## Defeito confirmado

No primeiro acesso, o login cria uma alteracao local de auditoria. Quando o
servidor devolve dados mais recentes, o app mescla e persiste esses dados antes
de enviar a alteracao local. Esse caminho nao atualizava a interface. Se o envio
terminava com `saved` ou `unchanged`, o painel permanecia mostrando zero mesmo
com clientes e processos ja presentes no estado e no historico exportado.

## Correcao

- Atualizar a interface imediatamente depois de aplicar o pull mesclado.
- Atualizar tambem depois da mesclagem usada na retentativa de conflito.
- Compartilhar a mesma atualizacao de interface nos caminhos de pull limpo,
  resposta mesclada e atualizacao por outra aba.
- Manter os dados recebidos visiveis mesmo se o envio posterior falhar.

## Preservacao

Nao altera o Apps Script, a URL da implantacao, o protocolo, os tokens, as
senhas, as permissoes, a chave de armazenamento ou os dados do escritorio.
Nao limpa caches, anexos ou registros. As protecoes de gravacao local da
v1.0.44 continuam ativas.

O aviso de falha ao gravar no Chrome e um problema distinto: esta correcao
nao amplia a quota do navegador nem remove essa protecao. Nao confundir a
atualizacao da interface com a resolucao de um erro de armazenamento local.

## Verificacao

Os testes reproduzem primeiro pull com alteracao local e confirmam que os
clientes e processos aparecem antes do push, inclusive para respostas `saved`,
`unchanged` e falha de rede. Os tres casos falhavam antes da correcao.

Para reproduzir no navegador sem acessar o banco real:

```powershell
node tests/servidor-qa.cjs 5497 primeiro-login
```

Entrar com o usuario ficticio e senha `teste` antes de oito segundos. O painel
inicialmente vazio deve mostrar um cliente e um processo sem trocar de aba.
Esse servidor aceita apenas localhost, usa dados ficticios em memoria e
bloqueia conexoes externas por CSP.

Verificacao realizada: 58 testes aprovados; no navegador, o primeiro login
passou de zero para um cliente e um processo sem qualquer navegacao adicional,
sem erros de console. As copias privadas conferidas mantiveram os mesmos IDs
de clientes, processos e atendimentos e os bytes dos nove anexos existentes.
