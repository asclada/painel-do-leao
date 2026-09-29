"""Calibração: as chances que o modelo dava batem com o que aconteceu?

- Jogos: em cada retrato do backtest (depois da rodada r), a previsão de vitória/empate/derrota dos jogos da
  rodada r+1, comparada com o resultado real. Brier multiclasse (0 = perfeito; chutar 1/3 para tudo dá 0,667),
  comparado com uma referência que só conhece a frequência de mandante/empate/visitante da liga até ali.
- Temporada: quando os pontos corridos terminam, a chance de G2 e de G6 de cada time em cada rodada contra a
  posição final.

O resumo técnico vai para docs/CALIBRACAO.md; no site aparece só uma frase em linguagem de torcedor.
"""

from __future__ import annotations

import numpy as np

from pipeline.calc.backtest import Backtest
from pipeline.calc.standings import compute_standings
from pipeline.models import Match, Model, Team

N_BINS = 10
MIN_FAVORITES = 30  # abaixo disso a frase do site não aparece


class CalibrationBin(Model):
    lo: float
    hi: float
    n: int
    predicted: float  # chance média prevista no grupo
    observed: float  # frequência real


class MatchCalibration(Model):
    n_matches: int
    rounds: list[int]  # primeira e última rodada avaliadas
    brier: float
    brier_reference: float  # só a frequência mandante/empate/visitante da liga até ali
    brier_uniform: float  # 1/3 para tudo
    skill: float  # 1 - brier / brier_reference
    log_loss: float
    accuracy: float  # resultado mais provável = resultado real
    bins: list[CalibrationBin]
    favorites_n: int  # jogos com um favorito acima de 50%
    favorites_predicted: float
    favorites_observed: float
    # Como o Chance de Gol apresenta: em cada jogo, o resultado mais provável ("favorito"), o do meio e o menos
    # provável ("zebra"); com que frequência cada um aconteceu.
    favorite_rate: float
    middle_rate: float
    upset_rate: float
    # "Medida de confiabilidade" do Chance de Gol: soma, nas faixas de 10%, do quadrado da distância entre a
    # frequência real e o meio da faixa (quanto menor, melhor). Não pondera pelo número de casos.
    reliability: float


class SeasonCalibration(Model):
    n: int  # pares (time, rodada)
    brier_direct: float
    brier_g6: float
    bins_g6: list[CalibrationBin]


class Calibration(Model):
    matches: MatchCalibration | None
    season: SeasonCalibration | None
    summary: str | None  # frase para o site, sem termos técnicos


def _r(x: float) -> float:
    return round(float(x), 4)


def _bins(pred: np.ndarray, hit: np.ndarray) -> list[CalibrationBin]:
    out = []
    edges = np.linspace(0, 1, N_BINS + 1)
    which = np.minimum((pred * N_BINS).astype(int), N_BINS - 1)
    for b in range(N_BINS):
        mask = which == b
        if not mask.any():
            continue
        out.append(CalibrationBin(lo=_r(edges[b]), hi=_r(edges[b + 1]), n=int(mask.sum()),
                                  predicted=_r(pred[mask].mean()), observed=_r(hit[mask].mean())))
    return out


def match_calibration(backtest: Backtest, matches: list[Match]) -> MatchCalibration | None:
    by_id = {m.id: m for m in matches}
    probs, outcome, reference, rounds = [], [], [], []
    for snap in backtest.rounds:
        # referência: frequência de mandante/empate/visitante nos jogos até a rodada do retrato
        seen = [m for m in matches if m.round <= snap.round and m.status == "finished"]
        freq = np.bincount([_result(m) for m in seen], minlength=3) / max(len(seen), 1)
        for pred in snap.next_matches:
            m = by_id.get(pred.match_id)
            if m is None or m.status != "finished":
                continue
            probs.append([pred.p_home, pred.p_draw, pred.p_away])
            outcome.append(_result(m))
            reference.append(freq)
            rounds.append(m.round)
    if not probs:
        return None

    p = np.asarray(probs)
    y = np.zeros_like(p)
    y[np.arange(len(p)), outcome] = 1
    ref = np.asarray(reference)
    brier = ((p - y) ** 2).sum(1).mean()
    brier_ref = ((ref - y) ** 2).sum(1).mean()
    log_loss = -np.log(np.clip(p[y == 1], 1e-9, 1)).mean()
    fav = p.max(1) > 0.5
    fav_hit = y[np.arange(len(p)), p.argmax(1)]
    rank = np.argsort(-p, axis=1)  # [favorito, meio, zebra] por jogo
    rates = [float(y[np.arange(len(p)), rank[:, i]].mean()) for i in range(3)]
    bins = _bins(p.ravel(), y.ravel())
    return MatchCalibration(
        n_matches=len(p),
        rounds=[min(rounds), max(rounds)],
        brier=_r(brier),
        brier_reference=_r(brier_ref),
        brier_uniform=_r(2 / 3),
        skill=_r(1 - brier / brier_ref),
        log_loss=_r(log_loss),
        accuracy=_r(fav_hit.mean()),
        bins=bins,
        favorites_n=int(fav.sum()),
        favorites_predicted=_r(p.max(1)[fav].mean()) if fav.any() else 0.0,
        favorites_observed=_r(fav_hit[fav].mean()) if fav.any() else 0.0,
        favorite_rate=_r(rates[0]),
        middle_rate=_r(rates[1]),
        upset_rate=_r(rates[2]),
        reliability=_r(sum((b.observed - (b.lo + b.hi) / 2) ** 2 for b in bins)),
    )


def _result(m: Match) -> int:
    return 0 if m.home_goals > m.away_goals else 1 if m.home_goals == m.away_goals else 2


def season_calibration(backtest: Backtest, teams: list[Team], matches: list[Match]) -> SeasonCalibration | None:
    """Só quando todos os jogos dos pontos corridos terminaram."""
    if not matches or any(m.status != "finished" for m in matches):
        return None
    final = {r.team_id: r.position for r in compute_standings(teams, matches)}
    p_direct, p_g6, direct, g6 = [], [], [], []
    for snap in backtest.rounds:
        for tid, t in snap.teams.items():
            p_direct.append(t.p_direct)
            p_g6.append(min(1.0, t.p_direct + t.p_top6))
            direct.append(final[tid] <= 2)
            g6.append(final[tid] <= 6)
    pd, pg, yd, yg = (np.asarray(x, float) for x in (p_direct, p_g6, direct, g6))
    return SeasonCalibration(
        n=len(pd),
        brier_direct=_r(((pd - yd) ** 2).mean()),
        brier_g6=_r(((pg - yg) ** 2).mean()),
        bins_g6=_bins(pg, yg),
    )


def summary_phrase(mc: MatchCalibration | None) -> str | None:
    if mc is None or mc.favorites_n < MIN_FAVORITES:
        return None
    pred, obs = round(100 * mc.favorites_predicted), round(100 * mc.favorites_observed)
    fav, mid, upset = (round(100 * x) for x in (mc.favorite_rate, mc.middle_rate, mc.upset_rate))
    return (
        f"Conferimos as contas com os {mc.n_matches} jogos já disputados, sempre usando só o que se sabia na rodada "
        f"anterior: quando um time aparecia como favorito, com {pred}% de chance de vencer em média, ele venceu "
        f"{obs}% das vezes. Contando todos os jogos, deu o resultado mais provável em {fav}% deles, o do meio em "
        f"{mid}% e a zebra (o menos provável) em {upset}%."
    )


def compute_calibration(backtest: Backtest, teams: list[Team], matches: list[Match]) -> Calibration:
    mc = match_calibration(backtest, matches)
    return Calibration(matches=mc, season=season_calibration(backtest, teams, matches), summary=summary_phrase(mc))


# --- docs/CALIBRACAO.md ----------------------------------------------------------------------------


def _pct(x: float) -> str:
    return f"{100 * x:.0f}%"


def _num(x: float, d: int = 3) -> str:
    return f"{x:.{d}f}".replace(".", ",")


def calibration_markdown(cal: Calibration, last_round: int) -> str:
    lines = [
        "# Calibração do modelo",
        "",
        "> Gerado automaticamente pelo pipeline (`pipeline/calc/calibration.py`) a cada atualização dos dados.",
        f"> Dados até a rodada {last_round}.",
        "",
        "O backtest refaz a conta do jeito que o modelo teria feito depois de cada rodada, usando **só os jogos",
        "disputados até ali** (mesmo modelo, semente fixa por rodada). Com esses retratos dá para comparar o que o",
        "modelo dizia com o que aconteceu.",
        "",
    ]
    mc = cal.matches
    if mc:
        lines += [
            "## Jogo a jogo (previsão feita uma rodada antes)",
            "",
            f"- Jogos avaliados: **{mc.n_matches}** (rodadas {mc.rounds[0]} a {mc.rounds[1]})",
            f"- Brier multiclasse do modelo: **{_num(mc.brier)}** (quanto menor, melhor)",
            f"- Referência (só a frequência de mandante/empate/visitante da liga até ali): {_num(mc.brier_reference)}",
            f"- Chutar 1/3 para cada resultado: {_num(mc.brier_uniform)}",
            f"- Ganho sobre a referência (skill score): **{_num(100 * mc.skill, 1)}%**",
            f"- Log loss: {_num(mc.log_loss)} · resultado mais provável acertou {_pct(mc.accuracy)} dos jogos",
            f"- Favoritos (acima de 50%): {mc.favorites_n} jogos, chance média prevista "
            f"{_pct(mc.favorites_predicted)}, venceram {_pct(mc.favorites_observed)}",
            f"- Resultado mais provável / do meio / menos provável (zebra): {_pct(mc.favorite_rate)} / "
            f"{_pct(mc.middle_rate)} / {_pct(mc.upset_rate)} dos jogos (Chance de Gol, desde 1998: 51% / 27% / 22%)",
            f"- Medida de confiabilidade (como no Chance de Gol: soma dos quadrados da distância entre a frequência "
            f"real e o meio de cada faixa de 10%): {_num(mc.reliability, 4)} (Chance de Gol: 0,0251). "
            "Com poucos jogos, faixas com 3 ou 4 casos pesam tanto quanto as cheias.",
            "- O Brier multiclasse acima é a \"distância DeFinetti\" do Chance de Gol (0,601 no deles, com todas as "
            "competições; a Série B, equilibrada, é mais difícil de prever).",
            "",
            "Calibração por faixa (todas as chances de vitória do mandante, empate e vitória do visitante):",
            "",
            "| Faixa prevista | Casos | Chance média prevista | Aconteceu |",
            "|---|---:|---:|---:|",
        ]
        lines += [f"| {_pct(b.lo)}–{_pct(b.hi)} | {b.n} | {_pct(b.predicted)} | {_pct(b.observed)} |" for b in mc.bins]
        lines.append("")
    else:
        lines += ["Ainda não há jogos suficientes para avaliar.", ""]

    lines += ["## Temporada (chance de G2 e de G6)", ""]
    sc = cal.season
    if sc:
        lines += [
            f"- Pares (time, rodada) avaliados: {sc.n}",
            f"- Brier da chance de acesso direto (G2): **{_num(sc.brier_direct)}**",
            f"- Brier da chance de G6: **{_num(sc.brier_g6)}**",
            "",
            "| Faixa prevista (G6) | Casos | Chance média prevista | Terminou no G6 |",
            "|---|---:|---:|---:|",
        ]
        lines += [f"| {_pct(b.lo)}–{_pct(b.hi)} | {b.n} | {_pct(b.predicted)} | {_pct(b.observed)} |"
                  for b in sc.bins_g6]
    else:
        lines += [
            "Só dá para avaliar quando os pontos corridos terminarem: aí a chance de G2 e de G6 de cada time, em",
            "cada rodada, é comparada com a posição final. O acesso pelos playoffs não entra (os jogos dos playoffs",
            "não fazem parte da base).",
        ]
    lines.append("")
    return "\n".join(lines)
