# Calibração do modelo

> Gerado automaticamente pelo pipeline (`pipeline/calc/calibration.py`) a cada atualização dos dados.
> Dados até a rodada 29.

O backtest refaz a conta do jeito que o modelo teria feito depois de cada rodada, usando **só os jogos
disputados até ali** (mesmo modelo, semente fixa por rodada). Com esses retratos dá para comparar o que o
modelo dizia com o que aconteceu.

## Jogo a jogo (previsão feita uma rodada antes)

- Jogos avaliados: **289** (rodadas 2 a 30)
- Brier multiclasse do modelo: **0,645** (quanto menor, melhor)
- Referência (só a frequência de mandante/empate/visitante da liga até ali): 0,660
- Chutar 1/3 para cada resultado: 0,667
- Ganho sobre a referência (skill score): **2,3%**
- Log loss: 1,068 · resultado mais provável acertou 41% dos jogos
- Favoritos (acima de 50%): 60 jogos, chance média prevista 56%, venceram 57%

Calibração por faixa (todas as chances de vitória do mandante, empate e vitória do visitante):

| Faixa prevista | Casos | Chance média prevista | Aconteceu |
|---|---:|---:|---:|
| 0%–10% | 4 | 9% | 25% |
| 10%–20% | 36 | 17% | 11% |
| 20%–30% | 339 | 26% | 27% |
| 30%–40% | 294 | 34% | 36% |
| 40%–50% | 134 | 45% | 37% |
| 50%–60% | 45 | 53% | 47% |
| 60%–70% | 12 | 64% | 92% |
| 70%–80% | 3 | 77% | 67% |

## Temporada (chance de G2 e de G6)

Só dá para avaliar quando os pontos corridos terminarem: aí a chance de G2 e de G6 de cada time, em
cada rodada, é comparada com a posição final. O acesso pelos playoffs não entra (os jogos dos playoffs
não fazem parte da base).
