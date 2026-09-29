import io

from PIL import Image, ImageDraw

from pipeline.calc.next_match import compute_next_match, usual_venue
from pipeline.crests import normalize
from pipeline.models import Match


def _match(mid, rnd, day, h, a, status="finished", venue=None, city=None):
    return Match(id=mid, round=rnd, kickoff_utc=f"2026-05-{day:02d}T20:00Z", status=status, home_id=h, away_id=a,
                 home_goals=1 if status == "finished" else None, away_goals=0 if status == "finished" else None,
                 venue=venue, city=city, source="espn")


def test_next_match_uses_home_team_usual_venue_when_missing():
    matches = [
        _match("sport--crb", 1, 1, "sport", "crb", venue="Ilha do Retiro", city="Recife"),
        _match("sport--nautico", 2, 8, "sport", "nautico", venue="Ilha do Retiro", city="Recife"),
        _match("sport--fortaleza", 3, 15, "sport", "fortaleza", status="scheduled"),
    ]
    assert usual_venue(matches, "sport") == ("Ilha do Retiro", "Recife")
    nxt = compute_next_match(matches, "fortaleza", {"sport": "Sport", "fortaleza": "Fortaleza", "crb": "CRB", "nautico": "Náutico"})
    assert nxt.venue == "Ilha do Retiro" and nxt.city == "Recife"


def test_next_match_keeps_venue_from_source():
    matches = [
        _match("sport--crb", 1, 1, "sport", "crb", venue="Ilha do Retiro"),
        _match("sport--fortaleza", 2, 8, "sport", "fortaleza", status="scheduled", venue="Arena de Pernambuco"),
    ]
    assert compute_next_match(matches, "fortaleza", {"sport": "Sport", "fortaleza": "Fortaleza", "crb": "CRB"}).venue == "Arena de Pernambuco"


def test_crest_with_solid_background_becomes_transparent_and_trimmed():
    im = Image.new("RGB", (300, 300), (255, 255, 255))
    ImageDraw.Draw(im).ellipse((100, 100, 200, 200), fill=(200, 0, 0))
    buf = io.BytesIO()
    im.save(buf, "PNG")
    out = normalize(buf.getvalue())
    assert out.mode == "RGBA"
    assert out.size[0] <= 102 and out.size[1] <= 102  # margens recortadas
    assert out.getpixel((0, 0))[3] == 0  # canto (fora do círculo) transparente
    assert out.getpixel((out.width // 2, out.height // 2))[:3] == (200, 0, 0)
