#!/usr/bin/env python3
"""Fetch small, redistributable music examples from Wikimedia Commons."""

from __future__ import annotations

import html
import json
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "frontend" / "assets" / "audio" / "library"
MANIFEST_PATH = ROOT / "frontend" / "src" / "js" / "20h-library-audio.js"
API_URL = "https://commons.wikimedia.org/w/api.php"
MAX_FILE_BYTES = 8 * 1024 * 1024
ALLOWED_EXTENSIONS = {".ogg", ".mp3", ".wav"}
USER_AGENT = "cipai-website-library-audio/1.0 (educational project)"

TARGETS = (
    ("mozart-sonata", "filetype:audio Mozart Piano Sonata No. 14"),
    ("bach-passacaglia", "filetype:audio Bach C minor Passacaglia Variation 1"),
    ("blues-scale", "filetype:audio C-Blues-Scale"),
)


class PlainText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def plain_text(value: str) -> str:
    parser = PlainText()
    parser.feed(value)
    return re.sub(r"\s+", " ", html.unescape(" ".join(parser.parts))).strip()


def commons_json(params: dict[str, str]) -> dict:
    url = API_URL + "?" + urlencode(params)
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def allowed_license(metadata: dict[str, dict[str, str]]) -> tuple[str, str] | None:
    short_name = plain_text(metadata.get("LicenseShortName", {}).get("value", ""))
    normalized = short_name.casefold()
    license_url = plain_text(metadata.get("LicenseUrl", {}).get("value", ""))
    if normalized in {"cc0", "cc0 1.0"}:
        return "CC0", license_url or "https://creativecommons.org/publicdomain/zero/1.0/"
    if normalized in {"public domain", "pd"}:
        if metadata.get("Copyrighted", {}).get("value", "").casefold() == "false":
            return "Public domain", license_url or "https://commons.wikimedia.org/wiki/Commons:Licensing"
        return None
    if re.fullmatch(r"CC BY (?:[1-4]\.0|2\.5|2\.0|1\.0)(?: [A-Z]{2})?", short_name):
        return short_name, license_url or "https://creativecommons.org/licenses/by/4.0/"
    return None


def find_candidate(query: str) -> dict:
    data = commons_json(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": "6",
            "gsrlimit": "20",
            "prop": "imageinfo",
            "iiprop": "url|size|extmetadata",
            "format": "json",
        }
    )
    pages = data.get("query", {}).get("pages", {})
    for page in sorted(pages.values(), key=lambda item: item.get("index", 0)):
        info_list = page.get("imageinfo", [])
        if not info_list:
            continue
        info = info_list[0]
        file_url = info.get("url", "")
        extension = Path(urlsplit(file_url).path).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS or info.get("size", MAX_FILE_BYTES + 1) > MAX_FILE_BYTES:
            continue
        metadata = info.get("extmetadata", {})
        license_info = allowed_license(metadata)
        if not license_info:
            continue
        return {
            "title": plain_text(page.get("title", "")),
            "url": file_url,
            "extension": extension,
            "size": info["size"],
            "duration": info.get("duration"),
            "source_url": info.get("descriptionurl", ""),
            "artist": plain_text(metadata.get("Artist", {}).get("value", "")),
            "description": plain_text(metadata.get("ImageDescription", {}).get("value", "")),
            "license": license_info[0],
            "license_url": license_info[1],
        }
    raise RuntimeError(f"No audio file under 8 MB with an allowed license matched: {query}")


def download(url: str, destination: Path, expected_size: int) -> None:
    source = urlsplit(url)
    clean_url = urlunsplit((source.scheme, source.netloc, source.path, "", ""))
    request = Request(clean_url, headers={"User-Agent": USER_AGENT})
    temporary = destination.with_suffix(destination.suffix + ".part")
    written = 0
    try:
        with urlopen(request, timeout=60) as response, temporary.open("wb") as output:
            while chunk := response.read(64 * 1024):
                written += len(chunk)
                if written > MAX_FILE_BYTES:
                    raise RuntimeError(f"Download exceeded the 8 MB limit: {destination.name}")
                output.write(chunk)
        if written != expected_size:
            raise RuntimeError(
                f"Download size mismatch for {destination.name}: expected {expected_size}, got {written}"
            )
        temporary.replace(destination)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def main() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    catalog = {}
    for key, query in TARGETS:
        item = find_candidate(query)
        filename = key + item["extension"]
        destination = AUDIO_DIR / filename
        if not destination.exists() or destination.stat().st_size != item["size"]:
            download(item["url"], destination, item["size"])
        item["src"] = "assets/audio/library/" + filename
        catalog[key] = item
        print(f"Fetched {key}: {item['title']} ({item['license']}, {item['size']} bytes)")
        time.sleep(0.5)

    source = "/* >>> file: src/js/20h-library-audio.js */\n"
    source += "const LIBRARY_AUDIO = Object.freeze("
    source += json.dumps(catalog, ensure_ascii=False, indent=2)
    source += ");\n"
    MANIFEST_PATH.write_text(source, encoding="utf-8", newline="\n")
    print(f"Wrote source and license catalog: {MANIFEST_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Audio crawl failed: {error}", file=sys.stderr)
        raise
