from openai import OpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_PROVIDER


def _required_api_key() -> str:
    if LLM_API_KEY:
        return LLM_API_KEY

    env_name = "GROQ_API_KEY" if LLM_PROVIDER == "groq" else "OPENAI_API_KEY"
    raise RuntimeError(
        f"Missing API key for provider '{LLM_PROVIDER}'. "
        f"Set {env_name} or LLM_API_KEY before running the app."
    )


def _create_client() -> OpenAI:
    kwargs = {"api_key": _required_api_key()}
    if LLM_BASE_URL:
        kwargs["base_url"] = LLM_BASE_URL
    return OpenAI(**kwargs)


client = _create_client()


def chat_completion(messages, **kwargs):
    return client.chat.completions.create(model=LLM_MODEL, messages=messages, **kwargs)
