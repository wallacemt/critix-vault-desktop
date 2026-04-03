# Releases e Versionamento (Git + GitHub Actions)

## Objetivo

Este guia define o fluxo oficial para publicar novas versoes do Critix Vault:

- versionar corretamente no Git
- criar release manual via GitHub Actions com inputs obrigatorios
- gerar build do app desktop
- anexar instaladores na release automaticamente

---

## Segredos obrigatorios

No repositorio, configure em **Settings > Secrets and variables > Actions**:

- `BACKEND_URL` (obrigatorio)

A pipeline de release injeta esse valor em:

- `BACKEND_URL`
- `NEXT_PUBLIC_CRITIX_API_URL`
- `CRITIX_EXTERNAL_API_URL`

---

## Padrao de versao

Use **SemVer**:

- `MAJOR.MINOR.PATCH`
- Exemplo: `1.4.0`

Regra rapida:

- `MAJOR`: quebra compatibilidade
- `MINOR`: nova funcionalidade compativel
- `PATCH`: bugfix

Na pipeline, informar a versao **sem** `v` (ex: `1.4.0`).
A tag criada sera `v1.4.0`.

---

## Passo a passo no Git (antes da release)

### 1. Atualizar branch principal

```bash
git checkout main
git pull origin main
```

### 2. Criar branch de release (recomendado)

```bash
git checkout -b release/1.4.0
```

### 3. Ajustar versoes no codigo

Atualize os pontos necessarios, por exemplo:

- `package.json`
- `src-tauri/Cargo.toml`
- docs/changelog

### 4. Rodar validacoes locais

```bash
bun install
bun run lint
bun run build
bun run tauri:build
```

### 5. Commit e push

```bash
git add .
git commit -m "release: prepare version 1.4.0"
git push origin release/1.4.0
```

### 6. Merge para `main`

Via PR no GitHub (recomendado). Depois do merge:

```bash
git checkout main
git pull origin main
```

---

## Como disparar a release (CD manual)

1. Abra **Actions** no GitHub.
2. Selecione workflow **CD Release**.
3. Clique em **Run workflow** na branch `main`.
4. Preencha os campos obrigatorios:
   - `version` (ex: `1.4.0`)
   - `release_name` (ex: `Critix Vault 1.4.0`)
   - `release_description` (descricao/changelog)
   - `prerelease` (`true/false`)
   - `draft` (`true/false`)
5. Execute.

---

## O que a pipeline CD faz

Workflow: `.github/workflows/cd.yml`

1. valida formato da versao
2. instala dependencias
3. executa build completo do app desktop (`bun run tauri:build`)
4. coleta instaladores em `src-tauri/target/release/bundle/**`
5. publica release no GitHub com:
   - tag `v<version>`
   - nome `release_name`
   - descricao `release_description`
   - assets anexados (`.exe`, `.msi`, `.AppImage`, `.deb`, quando existirem)

---

## Pipeline de CI

Workflow: `.github/workflows/ci.yml`

Executa em push/PR para `main` e `develop`:

- lint
- typecheck
- build web
- `cargo check` do Tauri

Objetivo: bloquear regressao antes de chegar na release.

---

## Checklist de publicacao

Antes de rodar a release:

- [ ] `main` atualizado
- [ ] versao definida (SemVer)
- [ ] `BACKEND_URL` configurado em secrets
- [ ] CI verde
- [ ] changelog/descricao pronta

Depois da release:

- [ ] validar assets anexados na release
- [ ] instalar e abrir build gerado
- [ ] smoke test rapido (startup, scan, play, backup)

---

## Troubleshooting rapido

### Erro de secret ausente

Mensagem esperada: `BACKEND_URL secret is required for release pipeline.`

Acao: criar secret `BACKEND_URL` no repositorio.

### Versao invalida

Formato aceito: `1.2.3` ou `1.2.3-rc.1`

### Release sem arquivo anexado

A pipeline publica release mesmo sem alguns formatos.
Verifique quais bundles foram gerados no job e no sistema operacional do runner.
