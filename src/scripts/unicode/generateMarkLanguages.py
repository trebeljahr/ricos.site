#!/usr/bin/env python3
"""Writes src/lib/unicodeMarkLanguages.json for CharacterComposer.

Reads the standard exemplar sets (CLDR, the letters a language needs for everyday
writing) from the ICU that ships with macOS, so it needs no download and runs only
on a Mac. Keep BASES and MARKS in step with MARK_SCRIPTS in src/lib/unicodeRecipes.ts.
"""

import ctypes
import json
import unicodedata
from pathlib import Path

BASES = set(
    "aeiouncsz"  # Latin
    "иеуа"  # Cyrillic
    "αειοω"  # Greek
    "かさたは"  # Kana
    "بتنس"  # Arabic
    "कनमर"  # Devanagari
)
MARKS = {
    0x301, 0x300, 0x302, 0x308, 0x303, 0x327, 0x323, 0x30a, 0x30c, 0x306, 0x314,
    0x3099, 0x309a,
    0x64e, 0x64f, 0x650, 0x651, 0x652,
    0x93f, 0x941, 0x947, 0x94d, 0x902,
}
OUTPUT = Path(__file__).resolve().parents[2] / "lib" / "unicodeMarkLanguages.json"

icu = ctypes.CDLL("/usr/lib/libicucore.dylib")
icu.ulocdata_open.restype = ctypes.c_void_p
icu.ulocdata_open.argtypes = [ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
icu.ulocdata_getExemplarSet.restype = ctypes.c_void_p
icu.ulocdata_getExemplarSet.argtypes = [
    ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.POINTER(ctypes.c_int),
]
icu.uset_getItemCount.argtypes = [ctypes.c_void_p]
icu.uset_getItem.argtypes = [
    ctypes.c_void_p, ctypes.c_int, ctypes.POINTER(ctypes.c_int32), ctypes.POINTER(ctypes.c_int32),
    ctypes.POINTER(ctypes.c_uint16), ctypes.c_int, ctypes.POINTER(ctypes.c_int),
]
icu.uloc_getAvailable.argtypes = [ctypes.c_int]
icu.uloc_getAvailable.restype = ctypes.c_char_p
icu.ulocdata_close.argtypes = [ctypes.c_void_p]

STANDARD_EXEMPLARS = 0  # ULOCDATA_ES_STANDARD


def exemplars(locale: bytes):
    status = ctypes.c_int(0)
    data = icu.ulocdata_open(locale, ctypes.byref(status))
    found = icu.ulocdata_getExemplarSet(data, None, 0, STANDARD_EXEMPLARS, ctypes.byref(status))
    items = []
    if status.value <= 0 and found:
        for index in range(icu.uset_getItemCount(found)):
            start, end = ctypes.c_int32(), ctypes.c_int32()
            buffer = (ctypes.c_uint16 * 64)()
            length = icu.uset_getItem(
                found, index, ctypes.byref(start), ctypes.byref(end), buffer, 64, ctypes.byref(status)
            )
            if length >= 2:
                items.append(bytes(buffer)[: length * 2].decode("utf-16-le"))
            else:
                items.extend(chr(code) for code in range(start.value, end.value + 1))
    icu.ulocdata_close(data)
    return items


def usable(item: str) -> bool:
    """A base from the demo with marks from the demo, or one mark on its own."""
    points = unicodedata.normalize("NFD", item)
    if len(points) == 1 and ord(points) in MARKS:
        return True
    return points[0] in BASES and all(ord(point) in MARKS for point in points[1:])


languages: dict[str, set[str]] = {}
for index in range(icu.uloc_countAvailable()):
    locale = icu.uloc_getAvailable(index)
    code = locale.decode().split("_")[0]
    for item in exemplars(locale):
        if usable(item):
            languages.setdefault(unicodedata.normalize("NFC", item), set()).add(code)

result = {key: " ".join(sorted(codes)) for key, codes in sorted(languages.items())}
OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
print(len(result), "entries,", OUTPUT.stat().st_size, "bytes")
