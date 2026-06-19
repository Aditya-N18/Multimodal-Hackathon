"""
EvidenceLine — Nebius incident photo analyzer (Person C).

Usage:
  python analyze_incident.py --image-url "https://..." --transcript "rear-ended at stop light"
  python analyze_incident.py --image-path ./samples/dented_bumper.jpg --type car_accident

Requires NEBIUS_API_KEY in environment or .env file.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

from openai import OpenAI, InternalServerError, APIStatusError

from prompts import SYSTEM_PROMPT, build_user_message

DEFAULT_MODEL = os.environ.get(
    "NEBIUS_VISION_MODEL", "Qwen/Qwen2.5-VL-72B-Instruct"
)
BASE_URL = "https://api.tokenfactory.nebius.com/v1/"

REQUIRED_KEYS = {
    "hazard_evidence",
    "severity",
    "missing_evidence",
    "matches_description",
    "confidence",
}
VALID_SEVERITIES = {"low", "medium", "high"}


def load_dotenv() -> None:
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def image_path_to_data_uri(path: str) -> str:
    mime, _ = mimetypes.guess_type(path)
    if not mime or not mime.startswith("image/"):
        mime = "image/jpeg"
    raw = Path(path).read_bytes()
    b64 = base64.standard_b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"


def resolve_image_url(image_url: str | None, image_path: str | None) -> str:
    if image_url:
        return image_url
    if image_path:
        return image_path_to_data_uri(image_path)
    raise ValueError("Provide --image-url or --image-path")


def extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown fences if model wraps JSON
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fenced:
        return json.loads(fenced.group(1))

    # Grab first {...} block
    brace = re.search(r"\{[\s\S]*\}", text)
    if brace:
        return json.loads(brace.group(0))

    raise ValueError(f"Model did not return parseable JSON:\n{text[:500]}")


def validate_result(data: dict[str, Any]) -> dict[str, Any]:
    missing = REQUIRED_KEYS - data.keys()
    if missing:
        raise ValueError(f"Response missing keys: {sorted(missing)}")

    if data["severity"] not in VALID_SEVERITIES:
        raise ValueError(f"Invalid severity: {data['severity']}")

    if not isinstance(data["hazard_evidence"], list):
        raise ValueError("hazard_evidence must be a list")
    if not isinstance(data["missing_evidence"], list):
        raise ValueError("missing_evidence must be a list")
    if not isinstance(data["matches_description"], bool):
        raise ValueError("matches_description must be boolean")

    confidence = float(data["confidence"])
    if not 0.0 <= confidence <= 1.0:
        raise ValueError("confidence must be between 0.0 and 1.0")
    data["confidence"] = confidence

    return data


def analyze_incident(
    *,
    image_url: str,
    incident_type: str,
    raw_transcript: str,
    location: str,
    model: str = DEFAULT_MODEL,
    api_key: str | None = None,
) -> dict[str, Any]:
    key = api_key or os.environ.get("NEBIUS_API_KEY")
    if not key:
        raise EnvironmentError(
            "Set NEBIUS_API_KEY (hackathon credits / Token Factory key)"
        )

    client = OpenAI(base_url=BASE_URL, api_key=key)
    user_text = build_user_message(incident_type, raw_transcript, location)

    payload = dict(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            },
        ],
        max_tokens=600,
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    last_error: Exception | None = None
    for attempt in range(3):
        try:
            response = client.chat.completions.create(**payload)
            break
        except (InternalServerError, APIStatusError) as exc:
            last_error = exc
            status = getattr(exc, "status_code", None)
            if status not in (500, 502, 503, 429) or attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    else:
        raise last_error  # type: ignore[misc]

    raw = response.choices[0].message.content or ""
    parsed = extract_json(raw)
    return validate_result(parsed)


def main() -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="EvidenceLine Nebius analyzer")
    parser.add_argument("--image-url", help="Public image URL")
    parser.add_argument("--image-path", help="Local image file path")
    parser.add_argument(
        "--type",
        default="car_accident",
        dest="incident_type",
        help="Incident type (car_accident, slip_fall, etc.)",
    )
    parser.add_argument(
        "--transcript",
        default="I was in a car accident. My rear bumper is damaged.",
        help="Voice transcript summary",
    )
    parser.add_argument("--location", default="San Francisco, CA")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()

    try:
        image = resolve_image_url(args.image_url, args.image_path)
        result = analyze_incident(
            image_url=image,
            incident_type=args.incident_type,
            raw_transcript=args.transcript,
            location=args.location,
            model=args.model,
        )
        print(json.dumps(result, indent=2))
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
