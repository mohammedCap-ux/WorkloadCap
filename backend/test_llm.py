import os
from openai import OpenAI

# Configuration
API_KEY = "xvPlXxhM5X55oaxmkHQ09a0TA37hnlW89WL4bSBT"  # <- COLLEZ VOTRE VRAIE CLE ICI
BASE_URL = "https://openai.generative.engine.capgemini.com/v1"

# Client OpenAI-compatible
client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL,
)

# Test simple
print("Test de connexion a l'API Capgemini GenAI...")
response = client.chat.completions.create(
    model="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    messages=[
        {"role": "user", "content": "Dis juste 'Connexion OK' en francais, rien d'autre."}
    ],
    max_tokens=20,
)

print("Reponse du modele :")
print(response.choices[0].message.content)
print("\nSucces ! API fonctionnelle.")