# Investigação de Problema de Seleção de Áudio em MKV Multilíngue

## Contexto do Projeto

Estou desenvolvendo uma aplicação desktop utilizando:

* Frontend: React + Vidstack
* Backend: Tauri + Rust
* Transcodificação: FFmpeg
* Fontes de mídia: Arquivos locais (principalmente MKV)
* Streaming interno: HLS gerado sob demanda

Os arquivos MKV geralmente possuem:

* Múltiplas faixas de áudio
* Múltiplas faixas de legenda
* Metadados de idioma
* Faixas marcadas como `default`
* Faixas marcadas como `forced`

Antes de iniciar a reprodução, o usuário seleciona:

* Idioma de áudio
* Idioma de legenda

Essas informações são enviadas para o backend para gerar a transcodificação adequada.

---

# Problema Encontrado

Mesmo após selecionar um idioma específico de áudio, a reprodução continua utilizando uma faixa aparentemente padrão (default) do container.

Foi identificado que muitos arquivos possuem uma faixa de áudio marcada como:

```text
(default)
```

Por exemplo:

```text
Stream #0:1(jpn): Audio ... (default)
Stream #0:8(por): Audio ...
```

Neste exemplo:

* Japonês = stream real 0:1
* Português = stream real 0:8

A suspeita é que a seleção feita pelo usuário não esteja sendo aplicada corretamente durante a transcodificação ou durante a reprodução.

---

# Hipóteses para Investigar

## 1. Mapeamento incorreto de streams no FFmpeg

Verificar se o código está utilizando:

```bash
-map 0:a:X
```

ou

```bash
-map 0:X
```

de forma incorreta.

Exemplo:

```text
Stream real:
0:1 = jpn
0:2 = eng
0:3 = ger
0:4 = spa
0:5 = spa
0:6 = fre
0:7 = ita
0:8 = por
```

Mas para FFmpeg:

```text
0:a:0 = jpn
0:a:1 = eng
0:a:2 = ger
0:a:3 = spa
0:a:4 = spa
0:a:5 = fre
0:a:6 = ita
0:a:7 = por
```

Validar se existe confusão entre:

```bash
-map 0:8
```

e

```bash
-map 0:a:7
```

---

## 2. Uso incorreto do índice exibido na interface

Verificar se a interface armazena apenas a posição visual:

```ts
selectedIndex = 7
```

ao invés do índice real retornado pelo ffprobe:

```ts
{
  language: "por",
  streamIndex: 8
}
```

A seleção deveria utilizar o índice real do stream.

---

## 3. FFprobe e Parsing dos Streams

Revisar a lógica que extrai:

* index
* codec_type
* language
* disposition.default
* disposition.forced
* title

Verificar se a seleção está sendo baseada apenas em idioma ou também no índice correto do stream.

---

## 4. Geração do comando FFmpeg

Analisar todo o código responsável por montar:

```rust
Command::new("ffmpeg")
```

Especialmente:

* parâmetros `-map`
* seleção de áudio
* seleção de legenda
* geração de HLS
* filtros aplicados

Adicionar logs detalhados para confirmar:

```rust
println!("Selected Audio Stream: {}", stream_index);
println!("FFmpeg Args: {:?}", args);
```

---

## 5. Manifest HLS

Caso o sistema gere múltiplas faixas de áudio em HLS, revisar:

```m3u8
#EXT-X-MEDIA
```

Verificar:

* DEFAULT=YES
* AUTOSELECT=YES
* GROUP-ID
* LANGUAGE
* NAME

Possível cenário:

```m3u8
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Japanese",DEFAULT=YES
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Portuguese"
```

Nesse caso o player pode iniciar sempre na faixa japonesa.

---

## 6. Comportamento do Vidstack

Revisar:

* configuração inicial do player
* troca de áudio após carregamento
* integração com HLS.js
* sincronização da seleção do usuário

Verificar se o Vidstack está sobrescrevendo a seleção feita pelo backend.

---

## 7. Teste de Validação

Executar um teste isolado:

```bash
ffmpeg \
-i input.mkv \
-map 0:v:0 \
-map 0:8 \
-c:v copy \
-c:a aac \
output.mkv
```

Depois:

```bash
ffprobe output.mkv
```

Confirmar se existe apenas:

```text
Video
Audio (Portuguese)
```

Resultados esperados:

* Se reproduzir corretamente em português, o problema está na lógica da aplicação.
* Se não reproduzir corretamente, o problema está na seleção de streams durante a transcodificação.

---

# Objetivo da Análise

Identificar exatamente onde ocorre a perda da seleção de idioma:

1. Parsing do ffprobe
2. Mapeamento dos streams
3. Montagem do comando FFmpeg
4. Geração do HLS
5. Manifest HLS
6. Integração com Vidstack
7. Seleção automática causada por flags default/forced

A análise deve apontar o fluxo completo desde a escolha do idioma pelo usuário até a faixa efetivamente reproduzida.
