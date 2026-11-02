#!/usr/bin/env python3
"""Notify IndexNow only after the public ownership file is reachable."""
import json
import pathlib
import re
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
ORIGIN = "https://diqtovoice.com"

def main():
    keys = [p for p in (ROOT / "public").glob("*.txt") if re.fullmatch(r"[a-f0-9]{32}\.txt", p.name)]
    if len(keys) != 1:
        raise RuntimeError("Expected exactly one public IndexNow ownership key")
    key = keys[0].read_text(encoding="utf-8").strip()
    if keys[0].stem != key:
        raise RuntimeError("IndexNow ownership filename and content differ")
    tree = ET.parse(ROOT / "out" / "sitemap.xml")
    urls = sorted({ORIGIN + "/"} | {e.text for e in tree.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")})
    if not all(isinstance(u, str) and u.startswith(ORIGIN + "/") for u in urls):
        raise RuntimeError("Unexpected host in sitemap")
    location = ORIGIN + "/" + keys[0].name
    for attempt in range(6):
        try:
            with urllib.request.urlopen(location, timeout=20) as response:
                if response.read().decode("utf-8").strip() == key:
                    break
        except (urllib.error.URLError, TimeoutError):
            if attempt == 5:
                raise
        if attempt == 5:
            raise RuntimeError("Public ownership key does not match this publication")
        time.sleep(10)
    payload = json.dumps({"host": "diqtovoice.com", "key": key, "keyLocation": location, "urlList": urls}).encode()
    request = urllib.request.Request("https://api.indexnow.org/indexnow", data=payload, headers={"Content-Type": "application/json; charset=utf-8"}, method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        status = response.status
        if status not in (200, 202):
            raise RuntimeError(f"Unexpected IndexNow status: {status}")
    print(json.dumps({"operation": "indexnow", "http_status": status, "submitted_count": len(urls), "urls": urls, "indexed": "not_proven"}))

if __name__ == "__main__":
    main()
