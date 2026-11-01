# Run with fontTools: python make_wordmark.py fonts/Ubuntu-Bold.ttf wordmark.svg
"""Draws the ShiftNG wordmark from Ubuntu Bold as SVG paths: "Shift" in
Forest green, "NG" in Leaf green, the same letter spacing as the site's CSS."""
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

font = TTFont(sys.argv[1])
out = sys.argv[2]
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font['head'].unitsPerEm
asc, desc = font['hhea'].ascent, font['hhea'].descent
spacing = -0.3 / 24 * upm          # CSS letter-spacing: -0.3px at 24px

x = 0
parts = {'#0E5C35': [], '#539940': []}
for i, ch in enumerate('ShiftNG'):
    name = cmap[ord(ch)]
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
    parts['#0E5C35' if i < 5 else '#539940'].append(pen.getCommands())
    x += glyphs[name].width + spacing
width = x - spacing
paths = ''.join(f'<path fill="{c}" d="{" ".join(d)}"/>' for c, d in parts.items())
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-asc} {round(width)} {asc - desc}" '
       f'role="img" aria-label="ShiftNG"><title>ShiftNG</title>{paths}</svg>')
open(out, 'w', encoding='utf-8').write(svg)
print(len(svg), 'bytes; width/height', round(width / (asc - desc), 3))
