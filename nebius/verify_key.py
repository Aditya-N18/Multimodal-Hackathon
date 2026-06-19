"""
Step 2 test: confirm your Nebius API key works (text-only, no image).

Usage:
  python verify_key.py
"""

import os
import sys
from pathlib import Path

from openai import OpenAI

BASE_URL = "https://api.tokenfactory.nebius.com/v1/"


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


def main() -> int:
    load_dotenv()
    api_key = os.environ.get("NEBIUS_API_KEY", "").strip()

    if not api_key or api_key == "your_key_here":
        print("FAIL: No API key found.")
        print()
        print("Do this:")
        print("  1. Copy .env.example to .env")
        print("  2. Paste your real key after NEBIUS_API_KEY=")
        print("  3. Run this script again")
        return 1

    print("Checking API key...")
    print(f"  URL:  {BASE_URL}")
    print(f"  Key:  {api_key[:8]}...{api_key[-4:]} (hidden)")
    print()

    client = OpenAI(base_url=BASE_URL, api_key=api_key)

    try:
        response = client.chat.completions.create(
            model="meta-llama/Llama-3.3-70B-Instruct",
            messages=[{"role": "user", "content": "Reply with exactly: OK"}],
            max_tokens=10,
        )
        text = (response.choices[0].message.content or "").strip()
        print("SUCCESS! Nebius answered:")
        print(f"  -> {text}")
        print()
        print("Your key and URL are correct. Next run:")
        print("  python test_smoke.py")
        return 0
    except Exception as e:
        print("FAIL:", e)
        print()
        print("Common fixes:")
        print("  - Key copied wrong (extra spaces, missing characters)")
        print("  - Key not created at https://tokenfactory.nebius.com")
        print("  - No credits on account yet (check hackathon $100 credits)")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
