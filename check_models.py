"""Check text model + try more vision model IDs."""
import urllib.request, json, os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

key = os.environ["XAI_API_KEY"]
base = os.environ["XAI_BASE_URL"]

# Test text model first
text_model = os.environ.get("XAI_MODEL", "llama-3.3-70b-versatile")
payload = {
    "model": text_model,
    "messages": [{"role": "user", "content": "Say OK"}],
    "max_tokens": 5,
    "stream": False,
}
req = urllib.request.Request(
    f"{base}/chat/completions",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
        print(f"Text model ({text_model}): OK - {data['choices'][0]['message']['content']}")
except Exception as e:
    print(f"Text model ({text_model}): FAILED - {e}")

# More vision candidates
extras = [
    "llama3-groq-8b-8192-tool-use-preview",
    "llama-3.3-70b-versatile",  # try the text model with image content
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
]
for m in extras:
    payload = {
        "model": m,
        "messages": [{"role": "user", "content": "say ok"}],
        "max_tokens": 5,
        "stream": False,
    }
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"  OK: {m}")
    except Exception as e:
        print(f"  {getattr(e, 'code', '?')}: {m}")
