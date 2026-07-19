"""Thin LLM client wrapper. Uses Grok (xAI) API — OpenAI-compatible
chat completions endpoint with proper system/user role separation.

Usage:
    from agents.llm_client import call_llm
    answer = call_llm("You are a helpful assistant.", "What is 2+2?")

Credentials loaded from .env file via python-dotenv.
"""
import os
import json
import urllib.request

# Load .env file from project root
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

XAI_API_KEY = os.environ.get("XAI_API_KEY", "")
XAI_BASE_URL = os.environ.get("XAI_BASE_URL", "https://api.x.ai/v1")
XAI_MODEL = os.environ.get("XAI_MODEL", "grok-3-mini-fast")


def call_llm(system_prompt: str, user_prompt: str, timeout: int = 120,
             temperature: float = 0.3, max_tokens: int = 2048) -> str:
    """Call Grok (xAI) chat completions endpoint. Returns the raw text response.

    Uses the OpenAI-compatible /v1/chat/completions format with proper
    system and user message roles (not concatenated into a single prompt).

    If the API isn't reachable or the key is missing, raises a clear error
    rather than hanging silently -- callers should catch this and fall back
    to returning raw retrieved evidence instead of a synthesized answer.
    """
    if not XAI_API_KEY:
        raise RuntimeError(
            "XAI_API_KEY not set. Add it to your .env file: "
            "XAI_API_KEY=xai-..."
        )

    payload = {
        "model": XAI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    req = urllib.request.Request(
        f"{XAI_BASE_URL}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {XAI_API_KEY}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body["choices"][0]["message"]["content"].strip()
    except Exception as e:
        raise RuntimeError(
            f"Could not reach Grok API at {XAI_BASE_URL} with model "
            f"'{XAI_MODEL}': {e}"
        )


def call_llm_stream(system_prompt: str, user_prompt: str, timeout: int = 120,
                    temperature: float = 0.3, max_tokens: int = 2048):
    """Call Grok (xAI) chat completions endpoint and stream the response.
    Yields chunks of text as they arrive.
    """
    if not XAI_API_KEY:
        raise RuntimeError("XAI_API_KEY not set.")

    payload = {
        "model": XAI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    
    import requests
    import json
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {XAI_API_KEY}",
    }
    
    try:
        # Use requests for easier streaming than urllib
        response = requests.post(
            f"{XAI_BASE_URL}/chat/completions",
            json=payload,
            headers=headers,
            stream=True,
            timeout=timeout
        )
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data_str = line[6:]
                    if data_str == '[DONE]':
                        break
                    try:
                        data = json.loads(data_str)
                        if data['choices'] and 'delta' in data['choices'][0]:
                            if 'content' in data['choices'][0]['delta']:
                                yield data['choices'][0]['delta']['content']
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        raise RuntimeError(f"Streaming failed: {e}")


def call_llm_json(system_prompt: str, user_prompt: str, timeout: int = 120,
                  temperature: float = 0.1, max_tokens: int = 2048) -> dict:
    """Call Grok and parse the response as JSON. Used for structured extraction.

    The system prompt should instruct the model to return valid JSON only.
    Falls back to returning an empty dict if parsing fails.
    """
    raw = call_llm(system_prompt, user_prompt, timeout=timeout,
                   temperature=temperature, max_tokens=max_tokens)

    # Strip markdown code fences if the model wraps its JSON output
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (```json or ```)
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find JSON object within the response
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(cleaned[start:end])
            except json.JSONDecodeError:
                pass
        return {}
