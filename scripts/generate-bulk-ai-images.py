from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "src" / "lib" / "bulk-fixtures.ts"
OUT_DIR = ROOT / "public" / "bulk-images"
DEFAULT_SIZE = "1024x1536"
OUTPUT_SIZE = (900, 1350)


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    env_file = ROOT / ".env"
    if env_file.exists():
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip().lstrip("\ufeff")] = value.strip().strip('"').strip("'")
    values.update(os.environ)
    return values


def parse_styles() -> list[tuple[str, str, str, str, str, str, str]]:
    text = FIXTURE.read_text(encoding="utf-8")
    pattern = re.compile(
        r'\["(DH-\d+-\d+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\]'
    )
    rows = [match.groups() for match in pattern.finditer(text)]
    if not rows:
        raise RuntimeError(f"No bulk styles found in {FIXTURE}")
    return rows


def prompt_for(style: tuple[str, str, str, str, str, str, str], side: str) -> str:
    sku, chinese_name, english_name, category, color, fabric, tag = style
    view = "front view, model facing camera" if side == "front" else "back view, model facing away from camera"
    return "\n".join(
        [
            "Use case: product-mockup",
            "Asset type: ecommerce catalog test image for a garment sample management platform",
            f"Primary request: generate a photorealistic vertical 2:3 white-background fashion model photo for SKU {sku}.",
            f"Subject: a European white adult female model wearing {english_name}; Chinese style name: {chinese_name}.",
            f"Garment details: category {category}, color {color}, fabric/material {fabric}, style tag {tag}.",
            f"Composition/framing: full-body studio catalog shot, {view}, garment centered and clearly visible.",
            "Product priority: the listed garment is the hero product; use only minimal neutral styling when needed, and do not turn a single item into a matching set unless the category is explicitly a set.",
            "Scene/backdrop: clean seamless pure white ecommerce studio background.",
            "Lighting/mood: bright softbox lighting, accurate fabric texture, natural shadows, premium retail catalog quality.",
            "Constraints: vertical 2:3 image, no text, no watermark, no logo, no props, no extra people, no illustration, no cartoon style.",
        ]
    )


def post_json(url: str, api_key: str, body: dict[str, object], timeout: int) -> dict[str, object]:
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "api-key": api_key,
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def download(url: str, timeout: int) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "samplefit-image-generator/1.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def image_bytes_from_response(payload: dict[str, object], timeout: int) -> bytes:
    data = payload.get("data")
    if not isinstance(data, list) or not data:
        raise RuntimeError(f"Image API response has no data array: {json.dumps(payload, ensure_ascii=False)[:500]}")

    first = data[0]
    if not isinstance(first, dict):
        raise RuntimeError("Image API response data[0] is not an object")

    for url_key in ("url", "image_url"):
        value = first.get(url_key)
        if isinstance(value, str) and value.startswith("http"):
            return download(value, timeout)

    b64_value = first.get("b64_json") or first.get("base64") or first.get("image_base64")
    if not isinstance(b64_value, str):
        raise RuntimeError(f"Image API response has no URL or base64 image: {json.dumps(first, ensure_ascii=False)[:500]}")

    if b64_value.startswith("http"):
        return download(b64_value, timeout)
    if b64_value.startswith("data:"):
        b64_value = b64_value.split(",", 1)[1]
    return base64.b64decode(b64_value)


def save_catalog_jpeg(raw: bytes, path: Path) -> None:
    image = Image.open(io.BytesIO(raw))
    image = ImageOps.exif_transpose(image).convert("RGB")
    image = ImageOps.fit(image, OUTPUT_SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.48))
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "JPEG", quality=88, optimize=True, progressive=True)


def generate_one(
    style: tuple[str, str, str, str, str, str, str],
    side: str,
    *,
    endpoint: str,
    api_key: str,
    model: str,
    size: str,
    quality: str,
    timeout: int,
    retries: int,
    force: bool,
) -> Path:
    sku = style[0].lower()
    out_path = OUT_DIR / f"{sku}-{side}.jpg"
    if out_path.exists() and not force:
        return out_path

    body = {
        "model": model,
        "prompt": prompt_for(style, side),
        "n": 1,
        "size": size,
        "quality": quality,
    }

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            payload = post_json(endpoint, api_key, body, timeout)
            raw = image_bytes_from_response(payload, timeout)
            save_catalog_jpeg(raw, out_path)
            return out_path
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, RuntimeError, OSError, ValueError) as exc:
            last_error = exc
            if attempt >= retries:
                break
            sleep_seconds = min(20, attempt * 3)
            time.sleep(sleep_seconds)
    raise RuntimeError(f"Failed to generate {style[0]} {side}: {last_error}") from last_error


def parse_sides(value: str) -> list[str]:
    sides = [side.strip().lower() for side in value.split(",") if side.strip()]
    invalid = [side for side in sides if side not in {"front", "back"}]
    if invalid:
        raise argparse.ArgumentTypeError(f"Invalid side(s): {', '.join(invalid)}")
    return sides


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate AI ecommerce model photos for bulk test styles.")
    parser.add_argument("--limit", type=int, default=0, help="Generate only the first N styles. 0 means all styles.")
    parser.add_argument("--sides", type=parse_sides, default=["front", "back"], help="Comma-separated sides: front,back")
    parser.add_argument("--concurrency", type=int, default=2)
    parser.add_argument("--quality", default="medium", choices=["low", "medium", "high", "auto"])
    parser.add_argument("--size", default=DEFAULT_SIZE)
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    env = load_env()
    api_key = env.get("LLM_API_KEY")
    base_url = env.get("LLM_IMAGE_EDIT_BASE_URL", "https://llm.guohe-sh.com/api/openai/v2").rstrip("/")
    model = env.get("LLM_IMAGE_MODEL", "gpt-image-2")
    if not api_key:
        print("LLM_API_KEY is missing. Set it in .env or the environment.", file=sys.stderr)
        return 2

    styles = parse_styles()
    if args.limit > 0:
        styles = styles[: args.limit]

    endpoint = f"{base_url}/images/generations"
    jobs = [(style, side) for style in styles for side in args.sides]
    print(f"Generating {len(jobs)} AI images with model {model}, quality {args.quality}, size {args.size}", flush=True)

    completed = 0
    with ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as executor:
        future_map = {
            executor.submit(
                generate_one,
                style,
                side,
                endpoint=endpoint,
                api_key=api_key,
                model=model,
                size=args.size,
                quality=args.quality,
                timeout=args.timeout,
                retries=args.retries,
                force=args.force,
            ): (style[0], side)
            for style, side in jobs
        }
        for future in as_completed(future_map):
            sku, side = future_map[future]
            path = future.result()
            completed += 1
            print(f"[{completed}/{len(jobs)}] {sku} {side} -> {path.relative_to(ROOT)}", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
