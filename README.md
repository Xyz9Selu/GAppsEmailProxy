# GAppsEmailProxy

A lightweight email proxy built on Google Apps Script.

It exposes a simple HTTP POST API through an Apps Script Web App, allowing external systems or other Apps Script projects to send emails through Google Mail without duplicating mail-sending logic everywhere.

## Features

- Send emails via HTTP POST
- Supports `to`, `cc`, and `bcc`
- Supports plain text and HTML body
- Supports attachments
- Supports inline images via `cid`
- Simple API key authentication
- Can be called from Apps Script, n8n, Power Automate, custom backends, or any HTTP client

## Use Cases

- Centralized internal mail gateway
- Apps Script-to-Apps Script mail sending
- Notification emails from automation workflows
- Reusing one mail endpoint across multiple scripts or systems
- Decoupling business logic from direct `MailApp.sendEmail()` calls

## Architecture

```
Client / External System
        ↓
HTTP POST
        ↓
Apps Script Web App
        ↓
MailApp.sendEmail()
        ↓
Gmail / Google Mail infrastructure
```

## Request Payload

```
{
  "apiKey": "your-secret",
  "subject": "Test Email",
  "body": "Plain text fallback body",
  "htmlBody": "<h2>Hello</h2><p>This is an HTML email.</p><img src=\"cid:logo\">",
  "to": ["a@example.com"],
  "cc": ["b@example.com"],
  "bcc": ["c@example.com"],
  "attachments": [
    {
      "filename": "report.pdf",
      "mimeType": "application/pdf",
      "contentBase64": "BASE64_CONTENT"
    }
  ],
  "inlineImages": [
    {
      "cid": "logo",
      "filename": "logo.png",
      "mimeType": "image/png",
      "contentBase64": "BASE64_CONTENT"
    }
  ]
}
```

## Request Fields

### Required

- `apiKey`: API key used for simple authentication
- `subject`: Email subject
- `to`: Recipient list
- `body` or `htmlBody`: At least one must be provided

### Optional

- `cc`: CC recipient list
- `bcc`: BCC recipient list
- `attachments`: Array of attachments
- `inlineImages`: Array of inline images for HTML body

## Response Format

### Success

```
{
  "ok": true,
  "message": "email sent"
}
```

### Error

```
{
  "ok": false,
  "error": "unauthorized"
}
```

## Deploy as Web App

1. Open the Apps Script project
2. Click **Deploy** → **New deployment**
3. Select **Web app**
4. Set:
   - **Execute as**: Me
   - **Who has access**: according to your use case
5. Deploy and copy the generated `/exec` URL

Your API URL should look like this:

```
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxx/exec
```

Do not use:

- Google Sheets URLs
- Apps Script editor URLs
- Document URLs
- Random `/dev` URLs unless you know exactly why

## Example Client (Apps Script)

```
function sendMailViaApi_demo() {
  const API_URL = 'https://script.google.com/macros/s/your-deployment-id/exec';
  const API_KEY = 'replace-with-your-secret';

  const SUBJECT = 'Test Email From Apps Script Client';
  const BODY = 'This is the plain text fallback body.';
  const HTML_BODY =
    '<h2>Test Email</h2>' +
    '<p>This email is sent via Apps Script client calling Apps Script Web App.</p>';

  const TO = ['a@example.com'];
  const CC = [];
  const BCC = [];

  const ATTACHMENTS = [];
  const INLINE_IMAGES = [];

  const payload = {
    apiKey: API_KEY,
    subject: SUBJECT,
    body: BODY,
    htmlBody: HTML_BODY,
    to: TO,
    cc: CC,
    bcc: BCC,
    attachments: ATTACHMENTS,
    inlineImages: INLINE_IMAGES
  };

  const response = UrlFetchApp.fetch(API_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  Logger.log('HTTP Status: ' + statusCode);
  Logger.log('Response: ' + responseText);

  if (statusCode !== 200) {
    throw new Error('HTTP request failed: ' + responseText);
  }

  const result = JSON.parse(responseText);
  if (!result.ok) {
    throw new Error('Server returned error: ' + result.error);
  }

  Logger.log('Email sent successfully.');
}
```

## Attachments and Inline Images

### Attachments

Attachments must be provided as Base64 content:

```
{
  "filename": "report.pdf",
  "mimeType": "application/pdf",
  "contentBase64": "BASE64_CONTENT"
}
```

### Inline Images

Inline images are referenced from `htmlBody` using `cid`:

```
<img src="cid:logo">
```

And passed in the payload like this:

```
{
  "cid": "logo",
  "filename": "logo.png",
  "mimeType": "image/png",
  "contentBase64": "BASE64_CONTENT"
}
```

The `cid` in `htmlBody` must match the `cid` in `inlineImages`.

## Limitations

This project is intentionally lightweight, so keep these constraints in mind:

- Google Apps Script execution time is limited
- Email sending quota depends on your Google account type
- Gmail email size is limited
- Base64 increases payload size by roughly 33%
- Large attachments are a bad fit for this proxy design
- Very large HTML bodies may be clipped by Gmail clients

## Recommendations

For production use:

- Keep payloads small
- Avoid large Base64 attachments
- Prefer sending metadata plus Drive file IDs or URLs for larger files
- Store API keys in Script Properties instead of hardcoding them
- Add domain allowlists or recipient validation if needed
- Add logging and throttling if this becomes a shared internal service

## Security Notes

Current authentication is based on a simple API key. This is fine for internal tools and low-risk environments, but not enough for high-security usage.

For stronger protection, consider:

- Script Properties for secret storage
- Request signing
- Allowlisted callers
- Recipient or domain restrictions
- Rate limiting

## Project Scope

This project is not trying to be a full mail platform.

It is a thin Apps Script-based email gateway designed for simple automation, internal integrations, and lightweight notification workflows.

## Licence

GNU
