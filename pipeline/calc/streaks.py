"""Sequências do time na Série B."""

from __future__ import annotations

from pipeline.calc.common import finished, goals, opponent, plural, result, team_matches
from pipeline.models import Match
from pipeline.outputs import Streaks


def _longest(flags: list[bool]) -> int:
    best = cur = 0
    for f in flags:
        cur = cur + 1 if f else 0
        best = max(best, cur)
    return best


def _tail(flags: list[bool]) -> int:
    n = 0
    for f in reversed(flags):
        if not f:
            break
        n += 1
    return n


def compute_streaks(matches: list[Match], team: str) -> Streaks:
    done = team_matches(finished(matches), team)
    res = [result(m, team) for m in done]
    clean = [goals(m, team)[1] == 0 for m in done]

    wins, unbeaten = _tail([r == "V" for r in res]), _tail([r != "D" for r in res])
    winless, losses = _tail([r != "V" for r in res]), _tail([r == "D" for r in res])
    if wins >= 3:
        kind, count, label = "wins", wins, f"{plural(wins, 'vitória')} seguidas"
    elif unbeaten >= 2:
        kind, count, label = "unbeaten", unbeaten, f"{plural(unbeaten, 'jogo')} sem perder"
    elif losses >= 2:
        kind, count, label = "losses", losses, f"{plural(losses, 'derrota')} seguidas"
    elif winless >= 2:
        kind, count, label = "winless", winless, f"{plural(winless, 'jogo')} sem vencer"
    elif res:
        last = {"V": "Venceu", "E": "Empatou", "D": "Perdeu"}[res[-1]]
        kind, count, label = "none", 1, f"{last} o último jogo"
    else:
        kind, count, label = "none", 0, "Ainda sem jogos"

    last_loss = next((m for m in reversed(done) if result(m, team) == "D"), None)
    return Streaks(
        current_kind=kind,
        current_count=count,
        current_label=label,
        longest_unbeaten=_longest([r != "D" for r in res]),
        longest_wins=_longest([r == "V" for r in res]),
        clean_sheets=sum(clean),
        longest_clean_sheets=_longest(clean),
        form=res[-5:],
        last_loss_date=last_loss.kickoff_utc if last_loss else None,
        last_loss_opponent_id=opponent(last_loss, team) if last_loss else None,
    )
