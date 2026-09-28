# Relatório da API

Gerado por `pipeline/probe_api.py` em 2026-09-28T19:00:13+00:00.

## footballsoccerapi.com

- Liga `lg_1VQKEDM`: {"league_id": "lg_1VQKEDM", "country_name": "Brazil", "league_name": "Serie B", "match_count": 5580, "priced_count": 3967, "season_first": 2012, "season_last": 2026, "coverage": {"held": {"kickoff_price_pct": 71.1}, "available": {"season": 2026, "events": true, "lineups": true, "match_statistics": t
- **Jogos retornados:** 5 (esperado: 380)
- **Status:** {'scheduled': 2, 'finished': 3}
- **Times distintos:** 10 (esperado: 20)
- **ID do Fortaleza:** `tm_32Q1KEK`
- **Campos de rodada na listagem:** nenhum
- **Campos de intervalo na listagem:** ['half_time_home_goals', 'half_time_away_goals', 'half_time_result', 'betfair.home_half_time_price', 'betfair.draw_half_time_price', 'betfair.away_half_time_price']
- **Chaves de um jogo da listagem:** `match_id, league_id, country_name, league_name, season_start_year, kickoff_utc, kickoff_date, kickoff_local_date, kickoff_local_time, match_status, home_team_id, home_team_name, away_team_id, away_team_name, home_goals, away_goals, full_time_result, half_time_home_goals, half_time_away_goals, half_time_result, stoppage_minutes, is_kickoff_rescheduled, home_league_position, away_league_position, away_travel_km, venue_name, city_name, latitude, longitude, referee_name, kickoff_book_pct, betfair, best_odds, held_back`

### Times

| ID | Nome |
|---|---|
| `tm_01T3FT5` | America Mineiro |
| `tm_0F9D47P` | Athletic Club |
| `tm_2ZJNFR2` | Avai |
| `tm_24W2CF2` | Botafogo SP |
| `tm_3X8DDRK` | CRB |
| `tm_160A40H` | Criciuma |
| `tm_34M63SV` | Cuiaba |
| `tm_32Q1KEK` | Fortaleza EC |
| `tm_01B0813` | Juventude |
| `tm_3465PWS` | Ponte Preta |

### Detalhe de um jogo do Fortaleza

- Jogo `mt_1SDPQYD` -> HTTP 200
- **Chaves do detalhe:** `match_id, league_id, country_name, league_name, season_start_year, kickoff_utc, kickoff_date, kickoff_local_date, kickoff_local_time, match_status, home_team_id, home_team_name, away_team_id, away_team_name, home_goals, away_goals, full_time_result, half_time_home_goals, half_time_away_goals, half_time_result, stoppage_minutes, is_kickoff_rescheduled, home_league_position, away_league_position, away_travel_km, venue_name, city_name, latitude, longitude, referee_name, kickoff_book_pct, home_formation, away_formation, venue_id, capacity, surface, betfair, best_odds, held_back, statistics, lineups`
- **Campos de rodada no detalhe:** nenhum
- **Estatísticas por time:** não -> ``
- **Cartões:** não encontrados
- **Gols com minuto no detalhe:** ['stoppage_minutes']

- `/matches/{id}/events` (gols com minuto) -> HTTP 403

### Uso do plano

- Requisições feitas nesta sondagem: **6**
- Uso depois da sondagem: `{"plan": "free", "per_minute_limit": 60, "per_day_limit": 50, "per_month_limit": null, "used_today": 5, "errors_today": 1, "resets_at": "2026-09-29T00:00:00Z"}`

