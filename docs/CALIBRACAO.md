# Calibração do modelo

> Gerado automaticamente pelo pipeline (`pipeline/calc/calibration.py`) a cada atualização dos dados.
> Dados até a rodada 31.

O backtest refaz a conta do jeito que o modelo teria feito depois de cada rodada, usando **só os jogos
disputados até ali** (mesmo modelo, semente fixa por rodada). Com esses retratos dá para comparar o que o
modelo dizia com o que aconteceu.

## Jogo a jogo (previsão feita uma rodada antes)

- Jogos avaliados: **302** (rodadas 2 a 32)
- Brier multiclasse do modelo: **0,641** (quanto menor, melhor)
- Referência (só a frequência de mandante/empate/visitante da liga até ali): 0,657
- Chutar 1/3 para cada resultado: 0,667
- Ganho sobre a referência (skill score): **2,4%**
- Log loss: 1,062 · resultado mais provável acertou 42% dos jogos
- Favoritos (acima de 50%): 65 jogos, chance média prevista 57%, venceram 57%
- Resultado mais provável / do meio / menos provável (zebra): 42% / 33% / 25% dos jogos
- Calibração ponderada pelo número de casos (média do quadrado da distância entre a chance prevista e o que aconteceu, faixa a faixa; quanto menor, melhor): **0,0027**
- No formato do Chance de Gol (soma dos quadrados da distância entre a frequência real e o meio de cada faixa de 10%, sem ponderar): 0,1380. Com poucos jogos essa conta é dominada pelas faixas pequenas: as de menos de 30 casos respondem por 86% do valor.

**Referência, não comparação direta.** O site Chance de Gol publica os mesmos indicadores para o modelo dele,
com outro método e todas as competições desde 1998: resultado mais provável / do meio / zebra em 51% / 27% /
22% dos jogos, confiabilidade 0,0251 e Brier multiclasse ("distância DeFinetti") 0,601. São populações
diferentes (milhares de jogos de várias ligas x uma temporada da Série B, que é equilibrada), então os
números servem de ordem de grandeza, não de placar entre os dois modelos.

Calibração por faixa (todas as chances de vitória do mandante, empate e vitória do visitante):

| Faixa prevista | Casos | Chance média prevista | Aconteceu |
|---|---:|---:|---:|
| 0%–10% | 5 | 8% | 20% |
| 10%–20% | 41 | 16% | 10% |
| 20%–30% | 355 | 26% | 28% |
| 30%–40% | 300 | 34% | 36% |
| 40%–50% | 140 | 45% | 38% |
| 50%–60% | 47 | 53% | 45% |
| 60%–70% | 12 | 64% | 92% |
| 70%–80% | 5 | 75% | 80% |
| 80%–90% | 1 | 81% | 100% |

## Temporada (chance de G2 e de G6)

Só dá para avaliar quando os pontos corridos terminarem: aí a chance de G2 e de G6 de cada time, em
cada rodada, é comparada com a posição final. O acesso pelos playoffs não entra (os jogos dos playoffs
não fazem parte da base).
