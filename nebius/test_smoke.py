"""Quick smoke test with a public image URL — no local photos needed."""

import json
import os
import sys

from analyze_incident import analyze_incident, load_dotenv

# Must end in .jpg/.png — Nebius rejects URLs without image extension
TEST_IMAGE = (
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/"
    "Car_accident.jpg/800px-Car_accident.jpg"
)


def main() -> int:
    load_dotenv()
    if not os.environ.get("NEBIUS_API_KEY"):
        print("SKIP: NEBIUS_API_KEY not set. Copy .env.example → .env and add key.")
        return 0

    result = analyze_incident(
        image_url=TEST_IMAGE,
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
