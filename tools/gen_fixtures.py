#!/usr/bin/env python
"""生成带 <harmony> 标记的最小 MusicXML 语料样本（tools/fixtures/）。

用程序生成而非手写，便于之后扩充进行类型；样本覆盖不同调号，
以验证 to_C 归一化。运行：
    python tools/gen_fixtures.py
"""
from __future__ import annotations

import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURES = os.path.join(ROOT, "tools", "fixtures")

# (文件名, 调号 fifths, mode, [(root-step, alter, kind), ...])，每小节一个和弦
SCORES = [
    ("c_major_ii_v_i.musicxml", 0, "major",
     [("D", 0, "minor"), ("G", 0, "dominant"), ("C", 0, "major"), ("C", 0, "major"),
      ("D", 0, "minor"), ("G", 0, "dominant"), ("C", 0, "major"), ("G", 0, "dominant")]),
    ("c_major_turnaround.musicxml", 0, "major",
     [("C", 0, "major"), ("G", 0, "major"), ("A", 0, "minor"), ("F", 0, "major"),
      ("C", 0, "major"), ("G", 0, "major"), ("A", 0, "minor"), ("F", 0, "major"),
      ("D", 0, "minor"), ("G", 0, "dominant"), ("C", 0, "major"), ("C", 0, "major")]),
    ("g_major_ii_v_i.musicxml", 1, "major",
     [("A", 0, "minor"), ("D", 0, "dominant"), ("G", 0, "major"), ("G", 0, "major"),
      ("A", 0, "minor"), ("D", 0, "dominant"), ("G", 0, "major"), ("C", 0, "major")]),
    ("f_major_iv_v.musicxml", -1, "major",
     [("F", 0, "major"), ("C", 0, "dominant"), ("B", -1, "major"), ("F", 0, "major"),
      ("G", 0, "minor"), ("C", 0, "dominant"), ("F", 0, "major"), ("B", -1, "major")]),
    ("a_minor_i_v.musicxml", 0, "minor",
     [("A", 0, "minor"), ("E", 0, "major"), ("A", 0, "minor"), ("A", 0, "minor"),
      ("D", 0, "minor"), ("E", 0, "major"), ("A", 0, "minor"), ("E", 0, "major")]),
    ("e_minor_i_v.musicxml", 1, "minor",
     [("E", 0, "minor"), ("B", 0, "major"), ("E", 0, "minor"), ("E", 0, "minor"),
      ("A", 0, "minor"), ("B", 0, "major"), ("E", 0, "minor"), ("B", 0, "major")]),
]

TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Music</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>%(fifths)d</fifths><mode>%(mode)s</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
%(body)s
    </measure>
  </part>
</score-partwise>
"""


def render(fifths: int, mode: str, chords) -> str:
    events = []
    for step, alter, kind in chords:
        root = "        <root><root-step>%s</root-step>%s</root>" % (
            step, "<root-alter>%d</root-alter>" % alter if alter else "")
        events.append("      <harmony>%s<kind>%s</kind></harmony>" % (root, kind))
        events.append("      <note><pitch><step>%s</step><octave>4</octave></pitch>"
                      "<duration>4</duration><type>whole</type></note>" % step)
    return TEMPLATE % {"fifths": fifths, "mode": mode, "body": "\n".join(events)}


def main() -> None:
    os.makedirs(FIXTURES, exist_ok=True)
    for name, fifths, mode, chords in SCORES:
        path = os.path.join(FIXTURES, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(render(fifths, mode, chords))
        print("写出 %s" % path)


if __name__ == "__main__":
    main()
