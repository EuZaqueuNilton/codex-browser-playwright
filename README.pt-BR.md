# Codex Playwright Browser

Plugin open source para controlar um navegador local dedicado usando Playwright. Ele usa o pacote oficial Playwright MCP da Microsoft e adiciona um pequeno filtro MCP local que oculta e recusa chamadas a ferramentas de maior risco.

Este é um projeto independente, sem afiliação com OpenAI ou Microsoft. Ele não contém código do plugin proprietário Browser da OpenAI.

## Instalação

Requisitos: Codex CLI, Node.js 20 ou superior, npm e `npx` no `PATH`.

Instale o Chromium uma vez:

```sh
npx -y @playwright/mcp@0.0.83 install-browser chromium
```

Adicione o marketplace e instale o plugin:

```sh
codex plugin marketplace add EuZaqueuNilton/codex-browser-playwright --ref v1.0.0
codex plugin add codex-playwright-browser@codex-browser-playwright
```

Reinicie o Codex e peça para abrir um site. Na primeira abertura, o Playwright iniciará uma janela Chromium própria. Entre nos sites manualmente nessa janela; o plugin não se conecta a um perfil Chrome já aberto nem ao navegador interno do ChatGPT.

## Perfil local e privacidade

O perfil fica fora do repositório, em `~/.codex/playwright-browser-profile` (ou dentro de `CODEX_HOME`, quando definido). Ele pode manter cookies de login e dados dos sites entre sessões. Trate essa pasta como sensível, não a compartilhe e não versione dados do navegador nem arquivos de estado. Defina `PLAYWRIGHT_BROWSER_PROFILE` antes de iniciar o Codex para escolher outra pasta local.

O wrapper não envia dados do navegador para um serviço remoto. Na primeira execução, `npx` baixa do npm a versão fixa do Playwright MCP; o navegador e os sites acessados fazem suas próprias conexões de rede. O conteúdo e as ações dos sites não ficam isolados das permissões do usuário local.

## Filtro de segurança

O wrapper remove estas ferramentas da descoberta MCP e recusa chamadas diretas a elas:

- `browser_run_code_unsafe` — executa JavaScript arbitrário no processo do servidor MCP.
- `browser_evaluate` — executa JavaScript na página.
- `browser_network_request` e `browser_network_requests` — expõem requisições diretas e registros de rede.
- `browser_console_messages` — expõe a saída do console da página, que pode conter dados privados.

O wrapper inicia `@playwright/mcp` exatamente na versão `0.0.83`, desativa ferramentas WebMCP fornecidas pelas páginas e limpa variáveis `PLAYWRIGHT_MCP_*` herdadas antes de iniciar o servidor. O filtro reduz exposições acidentais, mas não é um sandbox do sistema operacional. O servidor tem as permissões do usuário atual; as ferramentas comuns do navegador ainda podem acessar sites e enviar formulários.

Considere o conteúdo das páginas não confiável. Não envie senhas ou códigos de uso único pelo chat. Peça confirmação antes de compras, mensagens, publicações, exclusões, alterações de conta ou outras ações relevantes. Pare ao encontrar CAPTCHA, verificação antirobô ou desafio de controle de acesso; não os contorne.

## Desenvolvimento

```sh
npm run check
npm test
```

O proxy está em `server.mjs` e `src/policy.mjs`. O perfil do navegador nunca fica neste repositório. Consulte [os avisos de dependências](THIRD_PARTY_NOTICES.md).
