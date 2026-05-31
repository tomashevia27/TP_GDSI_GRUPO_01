import os
import requests


def send_confirmation_email(to_email: str, code: str) -> None:
    """Envía el código de confirmación usando la API de Brevo."""


    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        raise RuntimeError("BREVO_API_KEY no está configurado")


    sender_email = os.getenv("BREVO_SENDER_EMAIL", "teamupnoreply7@gmail.com")
    sender_name = os.getenv("BREVO_SENDER_NAME", "Team UP")


    url = "https://api.brevo.com/v3/smtp/email"
   
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json"
    }


    payload = {
        "sender": {"email": sender_email, "name": sender_name},
        "to": [{"email": to_email}],
        "subject": "Confirma tu cuenta en Team UP",
        "htmlContent": f"<p>Tu código de confirmación es: <strong>{code}</strong></p><p>Si no solicitaste este registro, podés ignorar este mensaje.</p>"
    }


    response = requests.post(url, json=payload, headers=headers)


    if response.status_code != 201:
        raise RuntimeError(f"Error al enviar email con Brevo: {response.text}")
    