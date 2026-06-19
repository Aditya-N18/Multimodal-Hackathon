"""Smoke test — uses local sample photo (remote URLs often fail on Nebius)."""

import json
import os
import sys
from pathlib import Path

from analyze_incident import analyze_incident, image_path_to_data_uri, load_dotenv

SAMPLE_CANDIDATES = [
    Path(__file__).parent / "samples" / "dented_car.png",
    Path(__file__).parent / "dented_car.png",
]


def find_sample_image() -> Path:
    for path in SAMPLE_CANDIDATES:
        if path.exists():
            return path
    raise FileNotFoundError(
        "No sample image found. Put dented_car.png in nebius/ or nebius/samples/"
    )


def main() -> int:
    load_dotenv()
    if not os.environ.get("NEBIUS_API_KEY"):
        print("SKIP: NEBIUS_API_KEY not set. Copy .env.example → .env and add key.")
        return 0

    sample = find_sample_image()
    print(f"Using local sample: {sample}")
    image_data_uri = image_path_to_data_uri(str(sample))

    result = analyze_incident(
        image_url=image_data_uri,
        incident_type="car_accident",
        raw_transcript=(
            "I was rear-ended at a stop light. I'm okay but my car is damaged."
        ),
        location="Market St, San Francisco",
    )
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
