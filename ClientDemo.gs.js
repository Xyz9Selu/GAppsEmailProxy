function sendMailViaApi_demo() {
  const API_URL = '<your-app-script-url>';
  const API_KEY = 'your-api-key';

  const SUBJECT = 'Test Email From Apps Script Client';
  const BODY = 'This is the plain text fallback body.';
  const HTML_BODY =
    '<h2>Test Email</h2>' +
    '<p>This email is sent via Apps Script client calling Apps Script Web App.</p>' +
    '<p>Inline image below:</p>' +
    '<img src="cid:logo" style="max-width:240px;">';

  const TO = [
    'huangjun.emc2@gmail.com'
  ];

  const CC = [
    // 'b@example.com'
  ];

  const BCC = [
    // 'c@example.com'
  ];

  // ===== Optional attachment from Drive =====
  const ATTACHMENT_FILE_ID = '<your-attachment-file-id>';
  const attachmentBlob = DriveApp.getFileById(ATTACHMENT_FILE_ID).getBlob();

  const ATTACHMENTS = [
    {
      filename: attachmentBlob.getName(),
      mimeType: attachmentBlob.getContentType(),
      contentBase64: Utilities.base64Encode(attachmentBlob.getBytes())
    }
  ];

  // ===== Optional inline image from Drive =====
  const INLINE_IMAGE_FILE_ID = '<your-inline-image-file-id>';
  const inlineImageBlob = DriveApp.getFileById(INLINE_IMAGE_FILE_ID).getBlob();

  const INLINE_IMAGES = [
    {
      cid: 'logo',
      filename: inlineImageBlob.getName(),
      mimeType: inlineImageBlob.getContentType(),
      contentBase64: Utilities.base64Encode(inlineImageBlob.getBytes())
    }
  ];


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

  MailApiUtil.postJsonMailWebApp(API_URL, payload);

  Logger.log('Email sent successfully.');
}
