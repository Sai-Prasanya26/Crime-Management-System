"""
Email Delivery Service for Phase 12 Crime Intelligence Reports.
Provides secure SMTP dispatch, multipart MIME message construction,
HTML/plain-text formatting, and PDF attachment handling.
"""

import smtplib
import socket
from email.message import EmailMessage
from email.utils import formataddr, formatdate
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import logging

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory test mailbox for unit & integration testing
_test_mailbox: List[Dict[str, Any]] = []


class EmailConfigurationError(Exception):
    """Raised when SMTP service settings are missing or incomplete."""
    pass


class EmailDeliveryError(Exception):
    """Raised when SMTP connection, authentication, or dispatch fails."""
    pass


def get_test_mailbox() -> List[Dict[str, Any]]:
    """Return sent messages captured during test mode."""
    return _test_mailbox


def clear_test_mailbox() -> None:
    """Clear sent messages captured during test mode."""
    _test_mailbox.clear()


def build_report_email_content(
    recipient_name: str,
    recipient_email: str,
    report_title: str,
    jurisdiction: str,
    reporting_period: str,
    generated_at_str: Optional[str] = None,
) -> tuple[str, str]:
    """
    Construct standardized plain-text and HTML email body conforming to
    institutional law enforcement standards.
    """
    if not generated_at_str:
        generated_at_str = datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC")

    plain_text = (
        f"Dear {recipient_name},\n\n"
        f"Please find attached your requested crime intelligence report from the "
        f"Crime Intelligence & Management Portal.\n\n"
        f"REPORT DETAILS:\n"
        f"--------------------------------------------------\n"
        f"Report Title:     {report_title}\n"
        f"Jurisdiction:     {jurisdiction}\n"
        f"Reporting Period: {reporting_period}\n"
        f"Generated At:     {generated_at_str}\n"
        f"Recipient Email:  {recipient_email}\n"
        f"--------------------------------------------------\n\n"
        f"The official PDF document has been compiled and attached to this email. "
        f"Please retain this document for official analysis, resource planning, and tactical oversight.\n\n"
        f"System: Crime Intelligence & Management Portal\n"
        f"Division: Law Enforcement & Operational Analytics Division\n\n"
        f"CONFIDENTIALITY NOTICE: This transmission and any attachments are intended exclusively "
        f"for authorized personnel and may contain restricted intelligence data. "
        f"Unauthorized distribution, copying, or forwarding is strictly prohibited.\n"
    )

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{report_title}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <!-- Header Banner -->
    <tr>
      <td style="background-color: #0b1f3a; padding: 24px 28px; text-align: left;">
        <div style="color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
          Government of India &bull; Law Enforcement Intelligence
        </div>
        <div style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0;">
          Crime Intelligence &amp; Management Portal
        </div>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 28px;">
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; color: #1e293b;">
          Dear <strong>{recipient_name}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #334155;">
          Your requested crime intelligence report has been compiled and is attached to this transmission as a high-resolution PDF document.
        </p>

        <!-- Report Metadata Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 0 0 24px 0;">
          <tr>
            <td style="padding: 16px 20px;">
              <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px;">
                <tr>
                  <td width="36%" style="color: #64748b; font-weight: 600;">Report Title:</td>
                  <td style="color: #0b1f3a; font-weight: 700;">{report_title}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Jurisdiction:</td>
                  <td style="color: #0b1f3a; font-weight: 600;">{jurisdiction}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Reporting Period:</td>
                  <td style="color: #0b1f3a;">{reporting_period}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Generated At:</td>
                  <td style="color: #0b1f3a;">{generated_at_str}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Recipient:</td>
                  <td style="color: #0284c7; font-family: monospace;">{recipient_email}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Attachment Notice -->
        <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 12px; color: #1e40af; line-height: 1.5;">
            <strong>Attachment Notice:</strong> The official report PDF is attached to this email. Please review the included summary indicators, predictive models, risk ratings, and resource plans.
          </p>
        </div>

        <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 8px 0;">
          Operational regards,<br>
          <strong>Crime Intelligence &amp; Management Portal</strong><br>
          <span style="font-size: 11px; color: #64748b;">Law Enforcement &amp; Operational Analytics Division</span>
        </p>
      </td>
    </tr>

    <!-- Footer Disclaimer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
        <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.4;">
          CONFIDENTIALITY NOTICE: This email and any attachments are confidential and intended solely for the designated authorized officer. If you have received this transmission in error, please immediately notify the system administrator and delete all copies.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return plain_text, html_content


def send_report_email(
    recipient_email: str,
    recipient_name: str,
    subject: str,
    report_title: str,
    jurisdiction: str,
    reporting_period: str,
    pdf_bytes: bytes,
    filename: str,
) -> Dict[str, Any]:
    """
    Send generated PDF report as an email attachment to the authenticated user.
    Enforces SMTP configuration verification and graceful error handling.
    """
    if not recipient_email or "@" not in recipient_email:
        raise ValueError(f"Invalid recipient email address: '{recipient_email}'")

    if not pdf_bytes or len(pdf_bytes) == 0:
        raise ValueError("Cannot send email: generated PDF attachment is empty.")

    # Construct Email Message
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))
    msg["To"] = formataddr((recipient_name, recipient_email))
    msg["Date"] = formatdate(localtime=True)

    plain_text, html_content = build_report_email_content(
        recipient_name=recipient_name,
        recipient_email=recipient_email,
        report_title=report_title,
        jurisdiction=jurisdiction,
        reporting_period=reporting_period,
    )

    msg.set_content(plain_text)
    msg.add_alternative(html_content, subtype="html")

    # Attach PDF
    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=filename,
    )

    # Test Mode / Simulation Hook
    if settings.SMTP_TEST_MODE:
        logger.info(
            f"[SMTP TEST MODE] Captured email to {recipient_email} with subject '{subject}', "
            f"attachment '{filename}' ({len(pdf_bytes)} bytes)."
        )
        record = {
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "subject": subject,
            "report_title": report_title,
            "jurisdiction": jurisdiction,
            "reporting_period": reporting_period,
            "filename": filename,
            "pdf_size_bytes": len(pdf_bytes),
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
        _test_mailbox.append(record)
        return {
            "status": "success",
            "mode": "test_simulation",
            "recipient": recipient_email,
            "filename": filename,
            "bytes_sent": len(pdf_bytes),
            "message": f"Report email successfully queued and delivered in test mode to {recipient_email}.",
        }

    # Production SMTP Configuration Validation
    if not settings.SMTP_HOST or not settings.SMTP_HOST.strip():
        logger.warning(
            f"SMTP email dispatch attempted for {recipient_email}, but SMTP_HOST is not configured."
        )
        raise EmailConfigurationError(
            "SMTP email delivery service is not configured on the server. "
            "Please configure SMTP_HOST, SMTP_PORT, and SMTP credentials in the backend environment."
        )

    # Dispatch via SMTP
    try:
        if settings.SMTP_SSL:
            server = smtplib.SMTP_SSL(
                settings.SMTP_HOST,
                settings.SMTP_PORT,
                timeout=settings.SMTP_TIMEOUT_SECONDS,
            )
        else:
            server = smtplib.SMTP(
                settings.SMTP_HOST,
                settings.SMTP_PORT,
                timeout=settings.SMTP_TIMEOUT_SECONDS,
            )
            if settings.SMTP_TLS:
                server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.send_message(msg)
        server.quit()

        logger.info(
            f"Successfully dispatched report email to {recipient_email} "
            f"via {settings.SMTP_HOST}:{settings.SMTP_PORT}."
        )
        return {
            "status": "success",
            "mode": "live_smtp",
            "recipient": recipient_email,
            "filename": filename,
            "bytes_sent": len(pdf_bytes),
            "message": f"Report successfully emailed to {recipient_email}.",
        }

    except (socket.error, smtplib.SMTPException, OSError) as exc:
        logger.error(f"Failed to dispatch email to {recipient_email}: {str(exc)}")
        raise EmailDeliveryError(
            f"Failed to connect to SMTP mail server ({settings.SMTP_HOST}:{settings.SMTP_PORT}): {str(exc)}"
        )
