#!/usr/bin/env python3
"""Строит карту книг (страницы глав, задачника, ответов) и глоссарий терминов RU/EN/HE.
Запуск: python3 scripts/index-books.py   (нужен poppler: pdftotext)
Результат: src/data/bookIndex.json, src/data/terms.json
"""
import json, re, subprocess, sys, pathlib, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
BOOKS = {
    "matan":    "Matan1_full.pdf",
    "linal":    "Linal2_full.pdf",
    "discrete": "Discrete3_full.pdf",
}

def pages_text(pdf, layout=True):
    n = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True).stdout).group(1))
    out = []
    for i in range(1, n + 1):
        args = ["pdftotext", "-f", str(i), "-l", str(i)]
        if layout: args.append("-layout")
        args += [str(pdf), "-"]
        out.append(subprocess.run(args, capture_output=True, text=True).stdout)
    return out

def clean_math(s):
    # математические курсивные/жирные буквы -> обычные (NFKC)
    return unicodedata.normalize("NFKC", s)

def first_lines(t, k=3):
    return [l.strip() for l in t.splitlines() if l.strip()][:k]

HEB = re.compile(r"[\u0590-\u05FF]")
import html as _html

def bbox_words(pdf, page):
    x = subprocess.run(["pdftotext", "-f", str(page), "-l", str(page), "-bbox", str(pdf), "-"], capture_output=True, text=True).stdout
    ws = re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', x)
    return [(float(a), float(b), float(c), float(d), _html.unescape(t)) for a, b, c, d, t in ws]

def he_word(t):
    # в PDF иврит лежит в визуальном порядке: буквы слова перевёрнуты, скобки зеркальны
    if not HEB.search(t): return t
    t = t[::-1]
    return t.translate(str.maketrans("()", ")("))

def parse_terms_bbox(pdf, page, after_header=True):
    ws = bbox_words(pdf, page)
    y_hdr = None; en_x0 = 227.0
    for a, b, c, d, t in ws:
        if t == "Русский": y_hdr = b
        if t == "English" and y_hdr is not None and abs(b - y_hdr) < 4: en_x0 = a
    if after_header and y_hdr is None: return []
    ymin = (y_hdr + 8) if y_hdr is not None else 60
    ws = [w for w in ws if w[1] > ymin]
    ws.sort(key=lambda w: w[1])
    clusters = []
    for w in ws:
        if clusters and w[1] - clusters[-1][-1][1] <= 8 and w[1] - clusters[-1][0][1] <= 12:
            clusters[-1].append(w)
        else:
            clusters.append([w])
    rows = []
    for cl in clusters:
        ru, en, he = [], [], []
        for a, b, c, d, t in cl:
            if HEB.search(t) or a >= 420: he.append((a, t))
            elif a >= en_x0 - 6: en.append((a, t))
            else: ru.append((a, t))
        ru = " ".join(t for a, t in sorted(ru)); en = " ".join(t for a, t in sorted(en))
        he = " ".join(he_word(t) for a, t in sorted(he, reverse=True))
        if re.fullmatch(r"\d+", ru) and not en and not he: continue  # номер страницы
        if not en and not he and rows and ru:   # перенос строки в русской колонке
            rows[-1]["ru"] += " " + clean_math(ru); continue
        if not ru and not en and not he: continue
        rows.append({"ru": clean_math(ru), "en": clean_math(en), "he": clean_math(he)})
    return [r for r in rows if r["ru"] and r["en"]]

TITLE_FIX = {("matan", 5): "Непрерывность, теоремы о промежуточном значении и Вейерштрасса", ("matan", 10): "Неопределённый интеграл: подстановка и интегрирование по частям", ("matan", 11): "Дробно-рациональные функции. Суммы Римана и определённый интеграл", ("linal", 12): "Собственные значения, собственные векторы, диагонализация"}
result = {}
terms = {}
for key, fn in BOOKS.items():
    pdf = ROOT / fn
    txt = pages_text(pdf)
    N = len(txt)
    info = {"file": fn, "pages": N, "chapters": [], "sections": {}}
    # --- главы
    ch = []
    cur = None
    sect_marks = {}
    for i, t in enumerate(txt, start=1):
        fl = first_lines(t, 3)
        if not fl: continue
        m = re.match(r"^Неделя (\d+)$", fl[0])
        if m and len(fl) > 1 and i > 6 and "sections_started" not in sect_marks:
            ch.append({"n": int(m.group(1)), "title": clean_math(fl[1]), "start": i})
            continue
        for name, title in (("formulas", "Листок формул( и теорем)?"), ("problems", "Задачник"), ("answers", "Ответы и решения"),
                            ("walk", "Подробные разборы"), ("exam", "Пробный экзамен"), ("glossary", "Глоссарий(: .*)?")):
            # заголовок раздела может быть первой строкой, либо после колонтитула с номером страницы
            if any(re.match(r"^" + title + r"(\s+\d+)?$", l) for l in fl[:2]) and name not in sect_marks and i > 20:
                # «Листок формул» мог начаться с шапки предыдущей главы -> берём только если ещё нет такого раздела
                sect_marks[name] = i
        if "formulas" in sect_marks: sect_marks["sections_started"] = True
    # границы разделов
    order = sorted((v, k) for k, v in sect_marks.items() if k != "sections_started")
    for idx, (start, name) in enumerate(order):
        end = (order[idx + 1][0] - 1) if idx + 1 < len(order) else N
        info["sections"][name] = {"start": start, "end": end}
    first_back = order[0][0] if order else N + 1
    for idx, c in enumerate(ch):
        c["end"] = (ch[idx + 1]["start"] - 1) if idx + 1 < len(ch) else first_back - 1
    # страницы с терминами
    for c in ch:
        for p in range(c["start"], c["end"] + 1):
            if "Термины недели: русский" in txt[p - 1]:
                c["termsPage"] = p
                rows = parse_terms_bbox(pdf, p, True)
                q = p + 1
                while q <= c["end"]:
                    cont = parse_terms_bbox(pdf, q, False)
                    if not cont or not any(HEB.search(r["he"]) for r in cont): break
                    rows += cont; q += 1
                terms[f"{key}-{c['n']}"] = rows
    for c in ch:
        c["title"] = TITLE_FIX.get((key, c["n"]), re.sub(r"\s+", " ", c["title"]).strip())
    info["chapters"] = ch
    # недели внутри задачника/ответов/разборов
    for sec in ("problems", "answers", "walk"):
        if sec not in info["sections"]: continue
        s, e = info["sections"][sec]["start"], info["sections"][sec]["end"]
        byw = {}
        for p in range(s, e + 1):
            for line in txt[p - 1].splitlines():
                m = re.match(r"^\s*Неделя (\d+)(\.\s|\s*$)", line)
                if m and int(m.group(1)) not in byw:
                    byw[int(m.group(1))] = p
        info["sections"][sec]["byWeek"] = byw
    result[key] = info
    print(key, N, "pages;", len(ch), "chapters;", {k: (v["start"], v["end"]) for k, v in info["sections"].items()}, file=sys.stderr)

(ROOT / "src/data").mkdir(parents=True, exist_ok=True)
(ROOT / "src/data/bookIndex.json").write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
(ROOT / "src/data/terms.json").write_text(json.dumps(terms, ensure_ascii=False, indent=1), encoding="utf-8")
print("terms:", sum(len(v) for v in terms.values()), "in", len(terms), "chapters", file=sys.stderr)
