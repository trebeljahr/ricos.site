#!/usr/bin/env python3
"""Writes src/lib/unicodeNames.json: official names for the code points the Unicode demos show.

A full name table is over a megabyte, so this keeps the blocks readers meet in
ordinary text and every emoji. Hangul syllables and CJK ideographs have
computed names and need no table. Run: python3 src/scripts/generateUnicodeNames.py
"""

import json
import subprocess
import unicodedata
from pathlib import Path

BLOCKS = [
    (0x0020, 0x024F),  # ASCII, Latin-1, Latin Extended
    (0x0300, 0x04FF),  # Combining marks, Greek, Cyrillic
    (0x0590, 0x06FF),  # Hebrew, Arabic
    (0x0900, 0x097F),  # Devanagari
    (0x0E00, 0x0E7F),  # Thai
    (0x1100, 0x11FF),  # Hangul jamo
    (0x1E00, 0x1EFF),  # Latin Extended Additional, as in Vietnamese
    (0x2000, 0x206F),  # General punctuation
    (0x20A0, 0x20C0),  # Currency
    (0x20D0, 0x20F0),  # Marks for symbols
    (0x3000, 0x30FF),  # CJK punctuation, kana
    (0xFE00, 0xFE0F),  # Variation selectors
    (0xFEFF, 0xFEFF),
    (0xFFFD, 0xFFFD),
    (0x1D11E, 0x1D11E),  # Musical G clef, the usual four-byte example
    (0x1F3FB, 0x1F3FF),  # Skin tones
    (0xE0020, 0xE007F),  # Tags
]

# Symbol blocks are large, and only their emoji earn a place. Python has no Emoji property.
EMOJI = json.loads(
    subprocess.check_output(
        [
            "node",
            "-p",
            "const out=[];for(let c=0x80;c<0x20000;c++)"
            "if(/\\p{Emoji}/u.test(String.fromCodePoint(c)))out.push(c);JSON.stringify(out)",
        ]
    )
)

names = {}
for code in [c for start, end in BLOCKS for c in range(start, end + 1)] + EMOJI:
    name = unicodedata.name(chr(code), None)
    if name:
        names[format(code, "X")] = name

path = Path(__file__).resolve().parents[1] / "lib" / "unicodeNames.json"
path.write_text(json.dumps(names, separators=(",", ":"), ensure_ascii=False) + "\n")
print(f"{len(names)} names, {path.stat().st_size} bytes, Unicode {unicodedata.unidata_version}")
