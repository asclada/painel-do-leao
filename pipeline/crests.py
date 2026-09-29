"""Escudos dos adversários para o card do próximo jogo (F1).

Baixa da ESPN só o escudo que ainda não existe em public/escudos/{time}.png (0 chamadas no dia a
dia; ~19 na primeira vez ou quando um time novo aparece), garante fundo transparente, recorta as
margens e reduz para 256px. O Fortaleza usa o próprio escudo do site (assets/escudo-fortaleza.png,
escolha do Lucas), então não é baixado.

Uso manual: uv run python -m pipeline.crests [--force]
"""

from __future__ import annotations

import argparse
import io
import sys

from PIL import Image

from pipeline.config import CRESTS_DIR, ESPN_CREST_URL, FORTALEZA_ID
from pipeline.http import PoliteClient
from pipeline.models import Team
from pipeline.providers.base import load_teams

SIZE = 256
BG_TOLERANCE = 40  # distância de cor até o fundo (quando o PNG vem sem transparência)


def _remove_background(im: Image.Image) -> Image.Image:
    """Torna transparente a cor de fundo ligada às bordas (flood fill a partir dos cantos)."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = px[0, 0][:3]

    def close(c: tuple[int, ...]) -> bool:
        return sum(abs(a - b) for a, b in zip(c[:3], bg)) <= BG_TOLERANCE and c[3] > 0

    seen = bytearray(w * h)
    stack = [(x, y) for x in (0, w - 1) for y in (0, h - 1)]
    while stack:
        x, y = stack.pop()
        if not (0 <= x < w and 0 <= y < h) or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        if not close(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def normalize(data: bytes) -> Image.Image:
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    corners = [im.getpixel(p)[3] for p in ((0, 0), (im.width - 1, 0), (0, im.height - 1), (im.width - 1, im.height - 1))]
    if min(corners) > 0:  # veio com fundo sólido
        im = _remove_background(im)
    box = im.getbbox()
    if box:
        im = im.crop(box)
    im.thumbnail((SIZE, SIZE), Image.LANCZOS)
    return im


def ensure_crests(teams: list[Team], force: bool = False) -> list[str]:
    """Baixa os escudos que faltam. Devolve os times atualizados; erros não derrubam o pipeline."""
    CRESTS_DIR.mkdir(parents=True, exist_ok=True)
    todo = [
        t for t in teams
        if t.id != FORTALEZA_ID and t.aliases.espn and (force or not (CRESTS_DIR / f"{t.id}.png").exists())
    ]
    if not todo:
        return []
    done = []
    client = PoliteClient("", pause_s=1.0)
    try:
        for t in todo:
            try:
                data = client.get_bytes(ESPN_CREST_URL.format(espn_id=t.aliases.espn))
                normalize(data).save(CRESTS_DIR / f"{t.id}.png", optimize=True)
                done.append(t.id)
            except Exception as exc:  # noqa: BLE001 — escudo é enfeite: segue sem ele
                print(f"AVISO: escudo de {t.id} não baixado ({exc}). O card mostra a sigla no lugar.")
    finally:
        client.close()
    return done


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true", help="baixa de novo todos os escudos")
    args = ap.parse_args(argv)
    done = ensure_crests(load_teams(), force=args.force)
    print(f"Escudos baixados: {', '.join(done) if done else 'nenhum (todos já existem)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
