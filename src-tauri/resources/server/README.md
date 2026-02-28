# Este diretório é populado pelo script scripts/prepare-build.mjs

# antes do comando tauri build.

#

# Execute: bun run build:app

#

# O script realiza:

# 1. next build → .next/standalone/

# 2. prepare-build → copia .next/standalone/ para cá

# 3. tauri build → empacota tudo no .exe

#

# NÃO COMMITAR os arquivos gerados nesta pasta (adicione ao .gitignore).
