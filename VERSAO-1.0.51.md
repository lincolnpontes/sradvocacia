# SR Advocacia 1.0.51

## Google Agenda

- Nova aba ao lado de Agenda, com acesso pelo mesmo controle de permissão. A Agenda local, os lembretes, os processos e o Apps Script não mudam.
- Somente o Gmail institucional confirmado pode consultar a agenda principal. A conta é conferida pelo Google antes da primeira leitura dos eventos.
- Consultas por semana ou mês, com recorrências, dia inteiro, paginação e horário de João Pessoa. Atualização manual e a cada minuto enquanto a aba está visível.
- Criar ou editar abre o Google na conta do escritório. Os lembretes continuam sob controle do Google; não há envio dos prazos locais nem gravação de eventos pela API.
- O acesso e os resultados ficam apenas na memória da sessão. Desconectar, sair do perfil e expirar a sessão descartam os dados. A autorização também pode ser revogada em https://myaccount.google.com/connections.
- Sem conexão, a última consulta bem-sucedida do período pode ficar visível enquanto a sessão está aberta; não é apresentada como resultado atualizado.

## Configuração do escritório

O projeto institucional usa o cliente web público e o retorno exclusivo em `/sradvocacia/agenda-retorno.html`. A página de retorno não carrega o app, não faz chamadas de rede e limpa o fragmento recebido. O projeto OAuth fica em modo de teste com apenas a conta institucional. Não utiliza Gmail API, Drive API, senha Google, segredo do cliente ou token de longa duração.

O primeiro acesso é pelo menu **Google Agenda > Conectar Google Agenda**. O link `/#agenda-google` relativo à pasta do site também abre a aba depois do login no SR.
