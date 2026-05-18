# Critix Vault

<div align="center">

<img src="public/images/logo-full.png" alt="Critix Vault" width="280" />

### Sua biblioteca pessoal de filmes e séries — com cara de streaming

[![Status](https://img.shields.io/badge/status-ativo-22c55e)](#)
[![Plataforma](https://img.shields.io/badge/plataforma-desktop-0ea5e9)](#)
[![Licença](https://img.shields.io/badge/licença-MIT-64748b)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-bem%20vindos-brightgreen)](CONTRIBUTING.md)
[![Contribuições](https://img.shields.io/badge/contribuições-abertas-orange)](CONTRIBUTING.md)

</div>

---

## O que é o Critix Vault?

O **Critix Vault** transforma as pastas de filmes e séries que você já tem no computador em uma biblioteca visual bonita, rápida e fácil de navegar — sem precisar renomear arquivos, mover pastas ou assinar nenhum serviço.

O app escaneia seus diretórios, busca informações e capas automaticamente, separa temporadas, e entrega uma experiência de catálogo similar à de plataformas de streaming — só que com o seu próprio acervo.

---

## Funcionalidades

- Adicionar pastas da coleção com poucos cliques
- Escaneamento automático e montagem da biblioteca
- Layout visual moderno para filmes e séries
- Detalhes completos de cada mídia (sinopse, elenco, gênero, etc.)
- Correção manual de dados e caminhos quando necessário
- Edição individual ou em lote por temporada
- Marcação de episódios e temporadas como assistidos
- Backup e restauração da biblioteca
- Modo demonstração para explorar o app sem arquivos reais

---

## Capturas de Tela

> Para atualizar esta seção, substitua as imagens em `public/images/readme/` mantendo os mesmos nomes de arquivo.

| Biblioteca | Catálogo |
| --- | --- |
| ![Biblioteca](public/images/readme/library-movies.png) | ![Catálogo](public/images/readme/library-movie-2.png) |

| Configurações | Ajuda |
| --- | --- |
| ![Config](public/images/readme/config.png) | ![Help](public/images/readme/help.png) |

| Tela de Série | Tela de Filme |
| --- | --- |
| ![Série](public/images/readme/serie-screen.png) | ![Filme](public/images/readme/movie-screen.png) |

| Destaques | Interface |
| --- | --- |
| ![Destaques](public/images/readme/home.png) | ![Interface](public/images/readme/library-series.png) |

---

## Primeiros Passos

1. Baixe o instalador na [página de releases](../../releases)
2. Abra o app e clique em **Adicionar Pasta**
3. Aguarde o escaneamento inicial
4. Pronto — sua biblioteca começa a aparecer

Quer testar antes de apontar suas pastas reais? Ative o **Modo Demonstração** nas configurações.

---

## Stack Técnica

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js + React + Tailwind CSS |
| Desktop | Tauri (Rust) |
| Dados de mídia | TMDB API + Critix API |
| Banco local | SQLite via Tauri |

---

## Documentação

- Visão geral técnica: [docs/tech/TECHNICAL_OVERVIEW.md](docs/tech/TECHNICAL_OVERVIEW.md)
- Releases e versionamento: [docs/tech/RELEASES_AND_VERSIONS.md](docs/tech/RELEASES_AND_VERSIONS.md)

---

## Contribuindo

O Critix Vault é open source e contribuições são muito bem-vindas — desde uma correção de typo até uma nova funcionalidade completa.

Se você quer ajudar, comece pelo guia de contribuição:

**[Leia o CONTRIBUTING.md](CONTRIBUTING.md)**

Algumas formas de contribuir agora mesmo:

- Reportar bugs ou comportamentos inesperados via [Issues](../../issues)
- Sugerir melhorias de UX ou novas funcionalidades
- Melhorar a documentação
- Adicionar suporte a novos idiomas
- Abrir um PR com uma correção ou melhoria

---

## Créditos

- Criado por [Wallace Santana](https://github.com/wallacemt)
- Dados de mídia via [TMDB](https://www.themoviedb.org/) e [Critix API](https://github.com/wallacemt/critix-backend)

---

## Licença

MIT — veja [LICENSE](LICENSE) para detalhes.
