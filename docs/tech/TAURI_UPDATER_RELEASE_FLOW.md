# Tauri Updater: Chaves, Pubkey e Release Assinada

Este documento descreve o fluxo completo para publicar atualizacoes automaticas do Critix Vault com assinatura valida.

## 1) Gerar a chave privada e a pubkey

Execute uma vez na sua maquina local (na raiz do projeto):

```powershell
.\node_modules\.bin\tauri.exe signer generate --ci -w "$env:USERPROFILE\.tauri\critix-updater.key" -p "SUA_SENHA_FORTE"
```

Saida esperada:

- arquivo privado: `C:\Users\<user>\.tauri\critix-updater.key`
- arquivo publico: `C:\Users\<user>\.tauri\critix-updater.key.pub`
- variaveis de CI: `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## 2) Preencher o pubkey no Tauri

Leia o conteudo da pubkey e copie como uma string unica:

```powershell
(Get-Content "$env:USERPROFILE\.tauri\critix-updater.key.pub" -Raw).Trim()
```

Cole o resultado em `src-tauri/tauri.conf.json` no campo:

```json
"plugins": {
  "updater": {
    "pubkey": "COLE_AQUI_A_STRING_DA_PUBKEY"
  }
}
```

Importante:

- o valor deve ser exatamente o conteudo da `.pub`, sem alterar caracteres.
- nao commite a chave privada.

## 3) Configurar segredos no GitHub

No repositorio, crie estes secrets:

- `BACKEND_URL`
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Como preencher `TAURI_SIGNING_PRIVATE_KEY`:

```powershell
Get-Content "$env:USERPROFILE\.tauri\critix-updater.key" -Raw
```

Copie toda a saida (incluindo quebras de linha) e salve no secret.

## 4) Workflow de release

Arquivo: `.github/workflows/tauri-updater-release.yml`

Gatilhos:

- push de tag `v*` (ex: `v1.2.0`)
- `workflow_dispatch` manual

O workflow:

1. valida tag e secrets obrigatorios.
2. faz build Tauri com `createUpdaterArtifacts=true`.
3. valida que `latest.json` e arquivos `*.sig` foram gerados.
4. publica assets no GitHub Release, incluindo `latest.json`.

## 5) Como publicar uma nova versao

1. Atualize versoes no projeto (`package.json` e `src-tauri/tauri.conf.json`).
2. Commit e push para `main`.
3. Crie e envie a tag:

```powershell
git tag v1.2.0
git push origin v1.2.0
```

4. Aguarde o workflow `Tauri Updater Release` concluir.

## 6) Validacao pos-release

Confira no GitHub Release se existem:

- instalador (`*.exe` ou `*.msi`)
- assinatura (`*.sig`)
- `latest.json`

Depois teste no app:

1. abrir Configuracoes > Atualizacoes.
2. clicar em verificar atualizacao.
3. instalar update e confirmar relaunch automatico.

## 7) Troubleshooting rapido

- Erro de assinatura/pubkey invalida:
  - confirme se `pubkey` no `tauri.conf.json` corresponde exatamente ao arquivo `.pub`.
- `latest.json` ausente:
  - confirme `bundle.createUpdaterArtifacts = true`.
  - confirme secrets de assinatura no GitHub.
- App nao reinicia apos instalar:
  - confirme plugin process registrado no Rust (`tauri_plugin_process::init()`) e permissao `process:allow-restart` na capability.
