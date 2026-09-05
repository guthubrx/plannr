#!/usr/bin/env python3
"""Assemble src/ -> plannr.html (artefact single-file autonome).

Usage : python3 build.py
Les sources editables sont dans src/ ; les libs vendorisees dans src/libs/.
NE PAS editer plannr.html directement — il est genere.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

LIBS = [('chart.js@4.4.0', 'chart.umd.min.js'), ('jspdf@2.5.1', 'jspdf.umd.min.js'), ('jspdf-autotable@3.8.2', 'jspdf.plugin.autotable.min.js'), ('xlsx@0.18.5', 'xlsx.full.min.js')]

GLUE_LIBS_TO_CSS = '\n    <script src="plannr-data.js"></script>\n    <style>\n'
GLUE_CSS_TO_BODY = '    </style>\n</head>\n<body class="">'
APP_OPEN = '<script>'
TAIL = '</script>\n\n\n<div class="toast-container"></div></body></html>'


def build() -> str:
    parts = [(SRC / "head.html").read_text(encoding="utf-8")]
    lib_parts = []
    for name, fname in LIBS:
        code = (SRC / "libs" / fname).read_text(encoding="utf-8")
        assert "</script" not in code, f"{fname} contient '</script' — inline impossible"
        lib_parts.append(
            f"    <script>/* {name} (vendorisé) */\n{code}\n    </script>")
    parts.append("\n".join(lib_parts))
    parts.append(GLUE_LIBS_TO_CSS)
    parts.append((SRC / "styles.css").read_text(encoding="utf-8"))
    parts.append(GLUE_CSS_TO_BODY)
    import base64
    body = (SRC / "body.html").read_text(encoding="utf-8")
    icon = base64.b64encode((ROOT / "icon.svg").read_bytes()).decode()
    parts.append(body.replace('src="icon.svg"', 'src="data:image/svg+xml;base64,' + icon + '"'))
    parts.append(APP_OPEN)
    # features.js AVANT app.js : plugins Chart.js enregistres avant le premier
    # rendu, fonctions hoistees visibles par l'init de app.js
    for module in ["planning.js", "features.js", "document.js", "business.js", "workspace.js", "business-ui.js", "gantt.js", "exports.js", "app.js"]:
        parts.append((SRC / module).read_text(encoding="utf-8"))
    parts.append(TAIL)
    return "".join(parts)


if __name__ == "__main__":
    out = build()
    (ROOT / "plannr.html").write_text(out, encoding="utf-8")
    print(f"plannr.html genere ({len(out)} octets)")
