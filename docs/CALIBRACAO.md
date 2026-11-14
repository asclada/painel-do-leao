# Calibração do modelo

> Gerado automaticamente pelo pipeline (`pipeline/calc/calibration.py`) a cada atualização dos dados.
> Dados até a rodada 38.

O backtest refaz a conta do jeito que o modelo teria feito depois de cada rodada, usando **só os jogos
disputados até ali** (mesmo modelo, semente fixa por rodada). Com esses retratos dá para comparar o que o
modelo dizia com o que aconteceu.

## Jogo a jogo (previsão feita uma rodada antes)

- Jogos avaliados: **370** (rodadas 2 a 38)
- Brier multiclasse do modelo: **0,639** (quanto menor, melhor)
- Referência (só a frequência de mandante/empate/visitante da liga até ali): 0,655
- Chutar 1/3 para cada resultado: 0,667
- Ganho sobre a referência (skill score): **2,5%**
- Log loss: 1,059 · resultado mais provável acertou 43% dos jogos
- Favoritos (acima de 50%): 82 jogos, chance média prevista 58%, venceram 56%
- Resultado mais provável / do meio / menos provável (zebra): 43% / 32% / 25% dos jogos
- Calibração ponderada pelo número de casos (média do quadrado da distância entre a chance prevista e o que aconteceu, faixa a faixa; quanto menor, melhor): **0,0012**
- No formato do Chance de Gol (soma dos quadrados da distância entre a frequência real e o meio de cada faixa de 10%, sem ponderar): 0,0583. Com poucos jogos essa conta é dominada pelas faixas pequenas: as de menos de 30 casos respondem por 80% do valor.

**Referência, não comparação direta.** O site Chance de Gol publica os mesmos indicadores para o modelo dele,
com outro método e todas as competições desde 1998: resultado mais provável / do meio / zebra em 51% / 27% /
22% dos jogos, confiabilidade 0,0251 e Brier multiclasse ("distância DeFinetti") 0,601. São populações
diferentes (milhares de jogos de várias ligas x uma temporada da Série B, que é equilibrada), então os
números servem de ordem de grandeza, não de placar entre os dois modelos.

Calibração por faixa (todas as chances de vitória do mandante, empate e vitória do visitante):

| Faixa prevista | Casos | Chance média prevista | Aconteceu |
|---|---:|---:|---:|
| 0%–10% | 8 | 8% | 12% |
| 10%–20% | 53 | 16% | 11% |
| 20%–30% | 444 | 26% | 27% |
| 30%–40% | 345 | 34% | 36% |
| 40%–50% | 178 | 45% | 40% |
| 50%–60% | 58 | 54% | 47% |
| 60%–70% | 15 | 64% | 73% |
| 70%–80% | 7 | 74% | 86% |
| 80%–90% | 2 | 82% | 100% |

## Temporada (chance de G2 e de G6)

- Pares (time, rodada) avaliados: 760
- Brier da chance de acesso direto (G2): **0,068**
- Brier da chance de G6: **0,119**

| Faixa prevista (G6) | Casos | Chance média prevista | Terminou no G6 |
|---|---:|---:|---:|
| 0%–10% | 263 | 2% | 1% |
| 10%–20% | 119 | 15% | 20% |
| 20%–30% | 70 | 25% | 23% |
| 30%–40% | 72 | 35% | 35% |
| 40%–50% | 49 | 44% | 45% |
| 50%–60% | 47 | 54% | 49% |
| 60%–70% | 33 | 65% | 64% |
| 70%–80% | 34 | 75% | 65% |
| 80%–90% | 24 | 85% | 100% |
| 90%–100% | 49 | 98% | 100% |
