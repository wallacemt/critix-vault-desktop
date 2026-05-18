# Guia de Contribuição

Obrigado por querer contribuir com o **Critix Vault**! Este projeto é open source e toda ajuda é bem-vinda — seja um bug reportado, uma ideia de funcionalidade ou um pull request.

Este guia explica como participar da forma mais tranquila possível.

---

## Índice

- [Código de Conduta](#código-de-conduta)
- [Por onde começar?](#por-onde-começar)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Fluxo de desenvolvimento](#fluxo-de-desenvolvimento)
- [Padrões de código](#padrões-de-código)
- [Abrindo um Pull Request](#abrindo-um-pull-request)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Funcionalidades](#sugerindo-funcionalidades)

---

## Código de Conduta

Ao participar deste projeto, você concorda em tratar todos com respeito e colaborar de forma construtiva. Leia o [Código de Conduta](CODE_OF_CONDUCT.md) para entender as expectativas da comunidade.

---

## Por onde começar?

### Contribuições que aceitamos

Não existe contribuição pequena demais. Aqui estão algumas formas de ajudar:

| Tipo | Exemplos |
| --- | --- |
| **Bugs** | Issues marcadas com `bug` — qualquer correção é bem-vinda |
| **UX / UI** | Acessibilidade, responsividade, fluidez de navegação |
| **Performance** | Otimizações de escaneamento, cache, bundle |
| **Documentação** | Melhorar o README, guias técnicos, comentários em código |
| **Testes** | Cobertura de testes unitários ou de integração |
| **i18n** | Suporte a outros idiomas além do PT-BR |
| **Novas funcionalidades** | Veja as issues com label `proposal` ou `good first issue` |

### O que pede discussão prévia

Antes de implementar, abra uma issue para alinhar com a comunidade:

- Novas funcionalidades grandes ou que alteram o comportamento principal
- Mudanças no schema do banco local
- Alterações de arquitetura significativas
- Troca ou adição de dependências relevantes

Isso evita retrabalho e garante que seu esforço seja bem aproveitado.

---

## Configuração do Ambiente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://www.rust-lang.org/tools/install) (stable) + Cargo
- [Tauri CLI](https://tauri.app/start/prerequisites/)
- Chave da [TMDB API](https://www.themoviedb.org/settings/api) (gratuita)

### Setup passo a passo

```bash
# 1. Fork o repositório e clone localmente
git clone https://github.com/SEU_USUARIO/critix_vault_desktop.git
cd critix_vault_desktop

# 2. Adicione o remote upstream
git remote add upstream https://github.com/wallacemt/critix_vault_desktop.git

# 3. Instale as dependências JavaScript
npm install

# 4. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com sua chave TMDB e outras variáveis necessárias

# 5. Inicie o app em modo desenvolvimento
npm run tauri dev
```

O app abrirá automaticamente uma janela desktop com hot-reload ativo.

---

## Fluxo de Desenvolvimento

### 1. Sincronize com o upstream antes de começar

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### 2. Crie uma branch descritiva

```bash
# Padrão: tipo/descricao-curta
git checkout -b fix/scanner-ignora-subpastas
git checkout -b feat/filtro-por-genero
git checkout -b docs/melhorar-readme
```

| Prefixo | Quando usar |
| --- | --- |
| `feat/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `docs/` | Apenas documentação |
| `refactor/` | Refatoração sem mudança de comportamento |
| `style/` | Formatação, lint, sem mudança de lógica |
| `test/` | Adição ou correção de testes |

### 3. Desenvolva e faça commits semânticos

O projeto segue [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(escopo?): descrição curta em minúsculas

Corpo opcional explicando o "porquê" da mudança.

Refs: #123
```

Exemplos:

```
feat(library): adiciona filtro por gênero na grade de filmes
fix(scanner): corrige leitura de subpastas com caracteres especiais
docs: atualiza guia de configuração do ambiente
```

### 4. Checklist antes do PR

```bash
npm run lint          # zero erros de lint
npx tsc --noEmit      # zero erros TypeScript
npm run tauri build   # build de produção sem erros
```

### 5. Sincronize antes de abrir o PR

```bash
git fetch upstream
git rebase upstream/main   # histórico limpo
```

---

## Padrões de Código

### TypeScript

- Sem `any` implícito — use tipos explícitos ou `unknown` + type guard
- Nomes de variáveis, funções, tipos e arquivos em inglês
- Strings visíveis ao usuário em PT-BR
- Prefira funções pequenas e composição
- Comente apenas o "porquê" não-óbvio — nunca o "o quê"

### React / Next.js

- Componentes de apresentação em `src/components/`
- Lógica de domínio separada de componentes
- Evite `useEffect` para dados que podem ser `useMemo`
- Chamadas de API via serviços dedicados, não diretamente em componentes

### Rust / Tauri

- Handlers de comando Tauri em `src-tauri/src/`
- Erros retornados como `Result<_, String>` para o frontend
- Operações de I/O pesadas em threads separadas com `tokio::spawn`

---

## Abrindo um Pull Request

Use o seguinte template ao descrever seu PR:

```markdown
## O que foi feito
- Bullet points do que mudou

## Por que foi feito
- Motivação / issue relacionada (#número)

## Como testar
- Passo a passo para validar a mudança

## Checklist
- [ ] lint e TypeScript sem erros
- [ ] build passou
- [ ] testei manualmente o fluxo afetado
- [ ] documentação atualizada (se aplicável)
- [ ] screenshots incluídas (para mudanças visuais)
```

### Critérios de aceite

- PR foca em **uma** mudança coesa
- Sem arquivos de ambiente (`.env`, `.env.local`) commitados
- Sem `console.log` de debug esquecidos
- Novas dependências justificadas no PR

---

## Reportando Bugs

Abra uma [issue](../../issues/new?template=bug_report.md) com:

- Sistema operacional e versão
- Passos numerados para reproduzir
- Comportamento esperado vs. comportamento atual
- Logs de erro relevantes (console ou terminal)
- Screenshot ou vídeo se o bug for visual

### Bugs de Segurança

**Não abra issue pública para vulnerabilidades.** Use a aba **Security > Advisories** do GitHub ou entre em contato diretamente com o mantenedor.

---

## Sugerindo Funcionalidades

Abra uma [issue](../../issues/new?template=feature_request.md) descrevendo:

- **Problema que resolve** — qual dor ou oportunidade motiva a ideia?
- **Solução proposta** — como você imagina que funcionaria?
- **Alternativas consideradas** — o que mais você avaliou?
- **Escopo estimado** — pequeno, médio ou grande?

Funcionalidades grandes passam por discussão antes de serem aceitas.

---

## Dúvidas?

Abra uma [Discussion](../../discussions) no GitHub ou entre em contato via [Issues](../../issues).

---

Cada contribuição importa — seja uma linha de código, um bug reportado ou uma ideia nova. **Obrigado por fazer parte disso.**
