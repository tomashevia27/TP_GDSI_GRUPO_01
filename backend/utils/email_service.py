import os
import smtplib
import ssl
from email.message import EmailMessage


def send_confirmation_email(to_email: str, code: str) -> None:
    """Envía el código de confirmación usando SMTP."""

    smtp_host = os.getenv("SMTP_HOST")
    if not smtp_host:
        raise RuntimeError("SMTP_HOST no está configurado")

    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL")
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}

    message = EmailMessage()
    message["Subject"] = "Confirma tu cuenta en Team UP"
    message["From"] = smtp_from
    message["To"] = to_email
    message.set_content(
        f"Tu código de confirmación es: {code}\n\n"
        "Si no solicitaste este registro, podés ignorar este mensaje."
    )
    message.add_alternative(
        f"<p>Tu código de confirmación es: <strong>{code}</strong></p>",
        subtype="html",
    )

    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
        if use_tls:
            server.starttls(context=context)
        if smtp_username:
            server.login(smtp_username, smtp_password)
        server.send_message(message)
