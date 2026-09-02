#!/usr/bin/env python3
"""render_svg_to_png.py — Rasteriza os diagramas SVG do SorriDente para PNG.

O Pillow não decodifica SVG nativamente; usamos cairosvg (se disponível) ou
svglib/reportlab como fallback para rasterizar e o Pillow para abrir, validar,
escalonar e salvar o PNG final.

Uso:
    python render_svg_to_png.py                 # todos os SVGs de docs/uml/svg/
    python render_svg_to_png.py docs/uml/svg/agent.svg
    python render_svg_to_png.py --max-width 2000 --out dir/png
"""
from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

DEFAULT_SVG_DIR = Path(__file__).resolve().parent / "docs" / "uml" / "svg"
DEFAULT_PNG_DIR = Path(__file__).resolve().parent / "docs" / "uml" / "png"


import re

# O Cairo limita a superfície a ~32767px por lado (e há um limite de pixels total).
# Diagramas mestre/amplos excedem isso e disparam CAIRO_STATUS_INVALID_SIZE;
# por isso limitamos a superfície de rasterização mantendo a proporção.
MAX_SURFACE = 32000


def _svg_intrinsic_size(data: bytes) -> tuple[int, int]:
    """Extrai (largura, altura) intrínsecas do SVG (via viewBox ou atributos)."""
    head = data[:4000].decode("utf-8", "replace")
    m = re.search(r'viewBox="[^"]*0\s+0\s+([\d.]+)\s+([\d.]+)"', head)
    if m:
        return int(round(float(m.group(1)))), int(round(float(m.group(2))))
    m = re.search(r'<svg[^>]*\swidth="([\d.]+)px?"[^>]*\sheight="([\d.]+)px?"', head)
    if m:
        return int(round(float(m.group(1)))), int(round(float(m.group(2))))
    return 0, 0


def svg_to_bytes(data: bytes, scale: float = 1.0) -> bytes:
    """Rasteriza SVG -> PNG bytes com o melhor backend disponível."""
    try:
        import cairosvg
    except ImportError:
        cairosvg = None

    if cairosvg is not None:
        # Limita a superfície quando o SVG nativo é maior que o suportado pelo Cairo.
        w, h = _svg_intrinsic_size(data)
        kwargs = {"scale": scale}
        if w > 0 and max(w, h) * scale > MAX_SURFACE:
            ratio = MAX_SURFACE / max(w, h)
            kwargs = {"output_width": max(1, int(w * ratio)), "output_height": max(1, int(h * ratio))}
        return cairosvg.svg2png(bytestring=data, **kwargs)

    # fallback: svglib (puro-Python) + reportlab
    from reportlab.graphics import renderPM
    from svglib.svglib import svg2rlg

    drawing = svg2rlg(io.BytesIO(data))
    if drawing is None:
        raise RuntimeError("svglib não conseguiu interpretar o SVG")
    drawing.scale(scale, scale)
    buf = io.BytesIO()
    renderPM.drawToFile(drawing, buf, fmt="PNG", dpi=96 * scale)
    return buf.getvalue()


def render_one(svg_path: Path, out_path: Path, max_width: int | None) -> Path:
    from PIL import Image

    data = svg_path.read_bytes()
    # rasteriza na resolução nativa do SVG
    png = svg_to_bytes(data)
    img = Image.open(io.BytesIO(png))
    img.load()
    # Composita sobre fundo branco opaco: o SVG tem o canvas transparente
    # (exceto os caixotes), e sem isso o PNG fica transparente, que muitos
    # visualizadores exibem como um xadrez cinza/branco.
    img = img.convert("RGBA")
    bg = Image.new("RGB", img.size, (255, 255, 255))
    bg.paste(img, mask=img.split()[-1])
    img = bg
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if max_width and img.width > max_width:
        ratio = max_width / img.width
        new_size = (max_width, max(1, int(img.height * ratio)))
        img = img.resize(new_size, Image.LANCZOS)
    img.save(out_path)
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("svgs", nargs="*", help="SVGs a renderizar (padrão: todos em docs/uml/svg/)")
    parser.add_argument("--out", type=Path, default=DEFAULT_PNG_DIR, help="diretório de saída")
    parser.add_argument("--max-width", type=int, default=None, help="limita a largura do PNG")
    args = parser.parse_args()

    svgs = [Path(p) for p in args.svgs] or sorted(DEFAULT_SVG_DIR.glob("*.svg"))
    if not svgs:
        print(f"Nenhum SVG encontrado em {DEFAULT_SVG_DIR}", file=sys.stderr)
        return 1

    ok = 0
    for svg in svgs:
        if not svg.exists():
            print(f"ERRO  {svg}: arquivo não existe", file=sys.stderr)
            continue
        out = args.out / (svg.stem + ".png")
        try:
            render_one(svg, out, args.max_width)
            from PIL import Image
            with Image.open(out) as im:
                print(f"OK    {svg.name:28s} -> {out}  ({im.width}x{im.height})")
            ok += 1
        except Exception as exc:  # noqa: BLE001
            print(f"ERRO  {svg.name}: {type(exc).__name__}: {exc}", file=sys.stderr)
    print(f"\n{ok}/{len(svgs)} renderizados em {args.out}")
    return 0 if ok == len(svgs) else 1


if __name__ == "__main__":
    raise SystemExit(main())
