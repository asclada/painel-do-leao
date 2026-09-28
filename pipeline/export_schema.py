"""Exporta o JSON Schema dos arquivos lidos pelo site (schema/), para `pnpm gen:types`."""

from __future__ import annotations

import json

from pipeline.config import ROOT
from pipeline.model.scenario import ScenarioResult
from pipeline.outputs import Outputs

SCHEMA = ROOT / "schema"


def strip_field_titles(node):
    """Remove o 'title' dos campos (senão o json2ts cria um alias por campo);
    mantém o título dos modelos, que vira o nome da interface."""
    if isinstance(node, dict):
        for key in ("properties", "items", "anyOf", "additionalProperties", "prefixItems"):
            child = node.get(key)
            if isinstance(child, dict) and key == "properties":
                for prop in child.values():
                    prop.pop("title", None)
                    strip_field_titles(prop)
            elif isinstance(child, dict):
                child.pop("title", None)
                strip_field_titles(child)
            elif isinstance(child, list):
                for c in child:
                    if isinstance(c, dict):
                        c.pop("title", None)
                        strip_field_titles(c)
        for d in node.get("$defs", {}).values():
            strip_field_titles(d)
    return node


def main() -> None:
    SCHEMA.mkdir(exist_ok=True)
    for f in SCHEMA.glob("*.json"):
        f.unlink()
    for name, model in {"outputs": Outputs, "scenario": ScenarioResult}.items():
        schema = strip_field_titles(model.model_json_schema(by_alias=True, mode="serialization"))
        (SCHEMA / f"{name}.json").write_text(
            json.dumps(schema, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
        )
    print(f"Schemas em {SCHEMA}")


if __name__ == "__main__":
    main()
