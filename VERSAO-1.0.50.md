# SR Advocacia 1.0.50

O menu Honorários usa um ícone de mão e moedas. A agenda interna permanece igual e nenhuma integração com Google Agenda foi ativada.

## Minutas entre aparelhos

O editor continua gravando no IndexedDB da v1.0.49: nenhuma migração apaga ou recria a base. A sincronização nova precisa de um módulo específico no **servidor autorizado do escritório**. Publicar somente o site não ativa o servidor. Enquanto ele não estiver instalado e o aparelho não estiver vinculado, as minutas continuam exclusivamente locais.

1. Em **Documentos > Sincronização**, clique em **Verificar servidor**. Se a versão não for reconhecida, não limpe o navegador. Mantenha as minutas no aparelho original.
2. No primeiro aparelho do perfil, abra **Vincular aparelho > Primeiro aparelho**, gere uma chave, informe a senha administrativa do escritório e vincule. O segredo de pareamento não é a senha do Gmail nem a do usuário. Guarde a chave de forma privada.
3. No celular, entre no **mesmo perfil do mesmo escritório**, verifique o servidor e vincule usando **a mesma chave**. Não gere outra. No primeiro aparelho, **Chave para outro aparelho** permite consultá-la.
4. Antes de trocar de aparelho, aguarde **Sincronizado com o escritório**. No destino, abra Documentos ou toque em **Sincronizar agora**. Sem rede ou sem confirmação, a edição ainda pode existir apenas no aparelho em que foi feita.
5. Se os dois aparelhos editarem sem rede, o app preserva as duas versões quando reencontrar o servidor. A edição divergente aparece como **cópia em conflito**. O botão de baixar o rascunho em texto continua disponível.

## Ativação do servidor

Somente uma pessoa autorizada no projeto do Apps Script deve fazer essa etapa. Verifique a identidade de execução antes de ativar: **não use a conta Google pessoal do titular do repositório**. Se a implantação atual depender dessa conta, pare e combine a configuração de uma implantação institucional antes de habilitar o recurso.

- Faça uma cópia privada do código **atualmente implantado** e um backup privado do banco. Não use código de uma versão antiga como substituto.
- O utilitário local aceita o código atual, inclui as quatro rotas POST após a verificação de token e o módulo Minutas.gs. Por exemplo: `node apps-script/preparar-minutas.cjs "C:/pasta-privada/Codigo-atual.gs" "C:/pasta-privada/Codigo-com-minutas.gs"`. Não sobrescreve arquivos e não envia nada ao Google.
- Compare a saída com o original e confirme que sincronização, anexos e DJEN permanecem. No projeto autorizado, atualize **a implantação existente, na mesma URL**; não crie um banco vazio, não altere o token nem redefina a senha administrativa.
- Teste com um perfil autorizado e uma minuta fictícia em dois aparelhos antes de habilitar perfis reais. Mantenha o arquivo de banco principal inalterado na implantação.
- O módulo lê a lista de usuários do banco, mas **não grava minutas no banco geral**. Versões confirmadas ficam em arquivos separados no Drive da implantação; a referência da versão atual só muda depois da verificação de integridade. Não compartilhe a pasta, os arquivos ou a chave de perfil.
- Perda de rede/quota não autoriza marcar “sincronizado”. A pasta acumula versões e consome espaço: acompanhe a capacidade do Drive. Se todos os aparelhos e a chave forem perdidos, recupere com o administrador; não apague propriedades ou arquivos para tentar corrigir.
