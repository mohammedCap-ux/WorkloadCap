"""
llm_service.py
--------------
Client LLM Capgemini GenAI Platform (OpenAI-compatible).
Utilise par l'agent IA pour toutes les requetes au modele.
"""

import os
from openai import OpenAI

API_KEY = os.getenv("CAPGEMINI_GENAI_API_KEY")
BASE_URL = os.getenv("CAPGEMINI_GENAI_BASE_URL", "https://openai.generative.engine.capgemini.com/v1")
MODEL = os.getenv("CAPGEMINI_GENAI_MODEL", "us.anthropic.claude-sonnet-4-5-20250929-v1:0")


def get_client() -> OpenAI:
    """Retourne un client OpenAI configure pour Capgemini GenAI."""
    if not API_KEY:
        raise RuntimeError("CAPGEMINI_GENAI_API_KEY manquant dans .env")
    return OpenAI(api_key=API_KEY, base_url=BASE_URL)


def chat_completion(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2000,
    temperature: float = 0.2,
) -> str:
    """
    Envoie un prompt au LLM et retourne le contenu texte de la reponse.

    - system_prompt : instructions generales (role, format attendu)
    - user_prompt   : la question / la tache specifique
    - max_tokens    : limite de reponse (defaut 2000, largement assez pour du JSON)
    - temperature   : 0.0 = deterministe, 1.0 = creatif. 0.2 = bon compromis pour affectation
    """
    client = get_client()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content


def get_model_info() -> str:
    """Retourne le nom du modele actuellement configure."""
    return MODEL