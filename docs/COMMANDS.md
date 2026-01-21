# 🛠️ Comandos Úteis - Critix Vault

## Desenvolvimento

### Iniciar o aplicativo em modo desenvolvimento

```bash
pnpm tauri dev
```

### Instalar dependências

```bash
pnpm install
```

### Instalar dependências Rust

```bash
cd src-tauri
cargo build
cd ..
```

---

## Build

### Build de produção

```bash
pnpm tauri build
```

### Build apenas do frontend

```bash
pnpm build
```

### Build apenas do Rust

```bash
cd src-tauri
cargo build --release
cd ..
```

---

## Limpeza

### Limpar cache do Node

```bash
rm -rf node_modules
pnpm install
```

### Limpar build do Rust

```bash
cd src-tauri
cargo clean
cd ..
```

### Limpeza completa

```bash
rm -rf node_modules
rm -rf src-tauri/target
pnpm install
cd src-tauri && cargo build
```

---

## Verificação

### Verificar erros TypeScript

```bash
pnpm tsc --noEmit
```

### Verificar formatação (se ESLint configurado)

```bash
pnpm lint
```

### Verificar build Rust sem executar

```bash
cd src-tauri
cargo check
cd ..
```

---

## Tauri CLI

### Atualizar Tauri

```bash
pnpm update @tauri-apps/cli @tauri-apps/api
cd src-tauri
cargo update tauri
cd ..
```

### Informações do Tauri

```bash
pnpm tauri info
```

### Criar ícone do app (a partir de PNG)

```bash
pnpm tauri icon path/to/icon.png
```

---

## Git

### Commit inicial após implementação

```bash
git add .
git commit -m "feat: implementação completa do MVP do Critix Vault"
```

### Push para repositório

```bash
git push origin main
```

---

## Debugging

### Abrir DevTools no Tauri

- **Windows/Linux**: F12 ou Ctrl+Shift+I
- **macOS**: Cmd+Option+I

### Ver logs do Rust

Os logs aparecem no terminal onde você executou `pnpm tauri dev`

### Ver logs do frontend

Abra o DevTools no aplicativo Tauri

---

## Instalação de Plugins

### Adicionar plugin Tauri

```bash
cd src-tauri
cargo add tauri-plugin-[nome-do-plugin]
cd ..
```

### Plugins já instalados

- ✅ tauri-plugin-opener
- ✅ tauri-plugin-dialog

---

## Dependências do Projeto

### Frontend

```bash
pnpm add [pacote]         # Adicionar dependência
pnpm remove [pacote]      # Remover dependência
pnpm update [pacote]      # Atualizar dependência
```

### Rust

```bash
cd src-tauri
cargo add [crate]         # Adicionar crate
cargo remove [crate]      # Remover crate
cargo update [crate]      # Atualizar crate
cd ..
```

---

## Testes (para implementação futura)

### Executar testes frontend

```bash
pnpm test
```

### Executar testes Rust

```bash
cd src-tauri
cargo test
cd ..
```

---

## Variáveis de Ambiente

### Criar arquivo de ambiente local

```bash
cp .env.example .env.local
```

### Variáveis disponíveis

- `NEXT_PUBLIC_CRITIX_API_URL` - URL base da API Critix

---

## Estrutura de Diretórios

### Ver estrutura do projeto

```bash
tree -L 3 -I 'node_modules|target|.next'
```

### Ver tamanho do build

```bash
du -sh src-tauri/target/release/bundle/
```

---

## Performance

### Analisar bundle do Next.js

```bash
pnpm build
# Verifique a saída para ver tamanhos dos chunks
```

### Build otimizado do Rust

```bash
cd src-tauri
cargo build --release
cd ..
```

---

## Dicas Rápidas

### Recarregar apenas o frontend

Durante `pnpm tauri dev`, salve qualquer arquivo `.tsx` ou `.ts` no `src/`

### Recompilar o Rust

Durante `pnpm tauri dev`, salve `src-tauri/src/lib.rs`

### Ver versão do Tauri

```bash
pnpm tauri --version
```

### Ver versão do Rust

```bash
rustc --version
cargo --version
```

---

## Solução de Problemas Comuns

### Erro de compilação do Rust

```bash
cd src-tauri
cargo clean
cargo build
cd ..
```

### Erro de TypeScript

```bash
rm -rf .next
pnpm build
```

### Plugin não encontrado

```bash
cd src-tauri
cargo update
cd ..
pnpm tauri dev
```

### API não conecta

1. Verifique se a API está rodando
2. Confira o `.env.local`
3. Verifique CORS na API

---

**Para mais informações, consulte:**

- `SETUP.md` - Setup completo
- `IMPLEMENTATION.md` - Detalhes de implementação
- `SUMMARY.md` - Resumo do projeto
