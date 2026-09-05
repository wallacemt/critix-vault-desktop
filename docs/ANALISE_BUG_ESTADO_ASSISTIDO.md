# Análise: mídias assistidas reaparecem como não assistidas

Análise realizada em 04/09/2026; documento salvo em 05/09/2026.

## Resumo

A biblioteca usa somente os **100 registros mais recentes do histórico global** para calcular quais mídias estão assistidas. Registros antigos continuam no banco, mas sua ausência nessa consulta é interpretada como “não assistido”.

Marcar mídias de outra pasta atualiza suas datas no histórico e desloca registros anteriores para fora desse limite. Isso explica o looping entre pastas e sua relação com o uso prolongado do aplicativo.

O comportamento foi confirmado no código da tag **v2.0.0**, correspondente à [última release publicada na data da análise](https://github.com/wallacemt/critix-vault-desktop/releases/tag/v2.0.0), publicada em 26/06/2026. O diagnóstico também foi confrontado com o banco local do usuário em modo somente leitura.

## Onde está o problema

1. Em [`src/app/api/watch-history/route.ts`](../src/app/api/watch-history/route.ts), o GET aplica `parseInt(searchParams.get("limit") || "100")` e consulta o histórico com `orderBy: { watchedAt: "desc" }` e `take: limit`.
2. Em [`src/services/databaseService.ts`](../src/services/databaseService.ts), `getWatchHistory()` só envia filtro e limite quando seus argumentos são fornecidos.
3. Em [`src/hooks/useMediaLibrary.ts`](../src/hooks/useMediaLibrary.ts), `loadMediaFromStorage()` chama `getWatchHistory()` sem argumentos, recebendo apenas os últimos 100 registros de todas as pastas. Filmes sem conclusão nessa resposta recebem `isWatched: false`; episódios e séries também têm seu estado calculado a partir dessa resposta incompleta.
4. O POST do histórico atualiza `watchedAt` para a data atual mesmo quando o registro já existe. Marcar novamente como assistido muda a posição do registro na consulta.
5. O scan em `useMediaLibrary.ts` marca automaticamente mídias ausentes como assistidas quando encontra arquivos na pasta e identifica caminhos cadastrados que não estão mais presentes. Para séries, essa detecção exige que todos os caminhos de episódios considerados estejam ausentes. O scan preserva os cadastros existentes, inclusive os de arquivos removidos.

O limite conta **registros**, incluindo episódios individuais e registros não concluídos; não representa 100 filmes ou séries.

## Por que ocorre o looping

1. O usuário marca mídias da pasta A como assistidas; os registros passam para o início do histórico.
2. Ao marcar mídias da pasta B, esses registros recebem datas mais recentes e empurram registros de A para fora dos primeiros 100.
3. Ao voltar à pasta A, a biblioteca recarrega o histórico limitado e interpreta as marcações ausentes da resposta como “não assistido”.
4. Repetir a marcação ou o scan em A pode deslocar registros de B, invertendo quais itens aparecem como pendentes.

As mídias removidas fisicamente reaparecem na lista porque seus cadastros permanecem no banco por decisão do scan. O erro no cálculo de assistido faz esses cadastros voltarem à lista de pendentes; os arquivos físicos não estão sendo recriados.

## Evidências no banco local

Banco consultado: `C:\Users\walla\AppData\Roaming\critix-vault\data\critix.db`.

O caminho usado pelo servidor desktop é definido em [`src-tauri/src/server.rs`](../src-tauri/src/server.rs), repassado por `CRITIX_DATA_DIR` e utilizado por [`src/lib/prisma.ts`](../src/lib/prisma.ts) para localizar `critix.db`.

Resultados da leitura em 04/09/2026:

| Verificação | Resultado |
| --- | ---: |
| Registros em `watch_history` | 398 |
| Registros concluídos | 394 |
| Registros concluídos fora dos últimos 100 | 294 |
| Filmes cadastrados que a lógica classificaria incorretamente como não assistidos | 20 |

Naquele momento, os 100 registros mais recentes eram todos de episódios. Entre os filmes afetados estavam **Hamnet: A Vida Antes de Hamlet**, **Home Sweet Home: Recomeço** e **Mortal Kombat 2**.

Exemplos de séries cujo histórico completo indicava conclusão de todos os episódios cadastrados, mas cuja consulta limitada omitia essas marcações:

| Série | Episódios cadastrados | Concluídos no histórico completo | Concluídos nos últimos 100 registros |
| --- | ---: | ---: | ---: |
| Dexter: New Blood | 11 | 11 | 0 |
| BULLET/BULLET | 12 | 12 | 0 |
| Dexter: Pecado Original | 10 | 10 | 0 |
| Stranger Things: Histórias de 85 | 10 | 10 | 0 |
| Devil May Cry | 16 | 16 | 0 |

Essas contagens refletem os cadastros do banco analisado, não necessariamente o catálogo oficial de episódios de cada série.

## Validação e limites da análise

- Comparação do fluxo de consulta e cálculo com a tag `v2.0.0`: o limite e o uso do histórico incompleto estão presentes nessa versão.
- Consulta SQLite com `mode=ro`, comparando o histórico completo com `ORDER BY watchedAt DESC LIMIT 100`.
- Simulação em memória da reordenação de registros concluídos por pasta, confirmando o deslocamento de registros de outras pastas para fora da janela de 100.
- Não foi executada uma reprodução interativa no aplicativo Windows. As evidências vêm do código, do banco e da simulação em memória.
- Nenhum código ou dado do aplicativo foi alterado durante a análise. Para os casos confirmados, as marcações continuam salvas; isso não constitui uma auditoria de toda possível perda histórica de dados.

## Orientação para correção

A consulta usada para determinar o estado de assistido deve cobrir todos os registros relevantes à biblioteca ou às mídias consultadas. Limites de histórico recente devem ficar restritos às telas que efetivamente mostram atividade recente.

Também é necessário revisar os consumidores de `getWatchHistory`, incluindo as consultas por série: o limite padrão de 100 pode truncar o histórico de uma única série extensa.

Aumentar o limite para outro valor fixo apenas adia o problema. A correção deve ser validada com mais de 100 registros, distribuídos entre pastas, incluindo episódios e mídias removidas do disco, verificando que remarcar itens de uma pasta não altera o estado exibido em outra.

**Status:** diagnóstico concluído; correção não implementada nesta análise.
