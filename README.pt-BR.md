# Codex Browser Control

Plugin open source para o Codex controlar abas no perfil Chrome que você já usa. Ele usa o Playwright MCP da Microsoft e uma extensão para agrupar as abas conectadas com o nome `codex`.

Este é um projeto independente, sem afiliação com OpenAI ou Microsoft. Ele não contém código do plugin proprietário Browser da OpenAI.

## Instalação

Requisitos: Codex CLI, Google Chrome, Node.js 20 ou superior, npm e `npx` no `PATH`.

Baixe e extraia `codex-browser-extension-v1.1.0.zip` na página de [releases do GitHub](https://github.com/EuZaqueuNilton/codex-browser-playwright/releases/tag/v1.1.0). No Chrome, abra `chrome://extensions`, ative **Modo do desenvolvedor**, clique em **Carregar sem compactação** e selecione a pasta `chrome-extension` extraída. O Playwright MCP usa um ID fixo para a extensão; por isso, esta versão mantém a chave pública do manifesto da Microsoft para preservar esse ID. Remova a extensão Playwright oficial deste perfil Chrome antes de carregar esta versão. O Chrome não pode usar as duas versões com o mesmo ID.

Instale o plugin no Codex:

```sh
codex plugin marketplace add EuZaqueuNilton/codex-browser-playwright --ref v1.1.0
codex plugin add codex-playwright-browser@codex-browser-playwright
```

Reinicie o Codex e peça para abrir um site. O Chrome mostrará uma página de conexão; escolha uma aba e aprove a conexão. A extensão cria o grupo `codex`. As abas abertas pelo Codex ou arrastadas para esse grupo ficam disponíveis para interação; as abas fora dele não são conectadas à sessão Playwright.

Se a extensão estiver instalada em vários perfis Chrome, o Playwright usa por padrão o perfil usado mais recentemente. Para escolher um perfil, defina `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` com o último componente de **Profile Path** em `chrome://version` (por exemplo, `Profile 2`).

Por padrão, aprove cada conexão na janela do Chrome. A extensão pode gerar um token específico do perfil para reconexão automática. Se optar por usá-lo, mantenha `PLAYWRIGHT_MCP_EXTENSION_TOKEN` apenas no ambiente local e nunca o versione. O subprocesso recebe somente as variáveis de caminho, diretório pessoal e temporários de que precisa, esse token e o nome opcional do perfil, além das opções de segurança fixas. As demais variáveis do Codex e do npm não são encaminhadas.

## Privacidade e permissões

A extensão precisa das permissões Chrome `debugger`, `activeTab`, `tabs` e `tabGroups`, além de acesso a todos os endereços de sites. Elas permitem conectar o Playwright à aba escolhida, gerenciar o grupo `codex` e interagir com as páginas desse grupo. As páginas conectadas podem conter sessões autenticadas e dados privados; aprove apenas um cliente em que confia.

A extensão valida que a conexão WebSocket use um endereço local (loopback). O plugin inicia localmente a versão fixa de `@playwright/mcp`, e a extensão envia as mensagens de controle ao servidor local. O repositório não contém cookies do navegador, tokens pessoais nem chave privada de assinatura. A chave no manifesto é pública e necessária para manter o ID fixo da extensão; o token opcional de conexão é gerado e guardado no perfil Chrome de cada pessoa. Na primeira execução, `npx` baixa `@playwright/mcp@0.0.83` do npm. O Chrome e os sites visitados fazem suas conexões de rede normais.

O filtro MCP local remove da descoberta e recusa estas ferramentas de maior risco:

- `browser_run_code_unsafe` — executa JavaScript arbitrário no processo do servidor MCP.
- `browser_evaluate` — executa JavaScript na página.
- `browser_network_request` e `browser_network_requests` — expõem requisições diretas e registros de rede.
- `browser_console_messages` — expõe o console da página, que pode conter dados privados.

O filtro não é um sandbox do sistema operacional. As ferramentas de navegador ainda podem ler páginas conectadas e enviar formulários. Considere o conteúdo das páginas não confiável; não envie senhas ou códigos de uso único pelo chat. Peça confirmação antes de compras, mensagens, publicações, exclusões ou alterações de conta. Pare diante de CAPTCHA, verificação antirobô ou desafio de controle de acesso.

## Desenvolvimento

```sh
npm ci --prefix extension-src
npm run build:extension
npm run check
npm test
npm audit --prefix extension-src
```

`extension-src` contém o código modificado da extensão Playwright, sob licença Apache-2.0. O commit de origem e as alterações estão registrados em [avisos de dependências](THIRD_PARTY_NOTICES.md).
