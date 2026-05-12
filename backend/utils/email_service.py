import os
import requests


def send_confirmation_email(to_email: str, code: str) -> None:
    """Envía el código de confirmación usando la API de Resend.

    Requiere la variable de entorno RESEND_API_KEY con la API key.
    """
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        raise RuntimeError("RESEND_API_KEY no configurada")

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "from": "onboarding@resend.dev",
        "to": [to_email],
        "subject": "Confirma tu cuenta en Team UP",
        "html": f"<p>Tu código de confirmación es: <strong>{code}</strong></p>",
    }

    resp = requests.post(url, json=payload, headers=headers, timeout=10)
    resp.raise_for_status()
