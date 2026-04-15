const API_KEY = 'your-api-key';

/**
 * Apps Script Web App entry
 * Accepts JSON POST:
 * {
 *   "apiKey": "xxx",
 *   "subject": "Hello",
 *   "body": "Plain text",
 *   "htmlBody": "<p>Hello</p><img src=\"cid:logo\">",
 *   "to": ["a@example.com"],
 *   "cc": ["b@example.com"],
 *   "bcc": ["c@example.com"],
 *   "attachments": [
 *     {
 *       "filename": "report.pdf",
 *       "mimeType": "application/pdf",
 *       "contentBase64": "BASE64..."
 *     }
 *   ],
 *   "inlineImages": [
 *     {
 *       "cid": "logo",
 *       "filename": "logo.png",
 *       "mimeType": "image/png",
 *       "contentBase64": "BASE64..."
 *     }
 *   ]
 * }
 */
function doPost(e) {
  const startedAt = Date.now();
  const executionId = Utilities.getUuid();
  const executionSummary = {
    executionId: executionId,
    action: 'sendEmail',
    subject: '',
    toList: [],
    ccList: [],
    bccList: [],
    contentPreview: '',
    toCount: 0,
    ccCount: 0,
    bccCount: 0,
    attachmentCount: 0,
    inlineImageCount: 0
  };

  try {
    console.log(JSON.stringify({
      executionId: executionId,
      action: 'sendEmail',
      stage: 'started',
      at: new Date(startedAt).toISOString()
    }));

    if (!e || !e.postData || !e.postData.contents) {
      logExecutionResult_(executionSummary, startedAt, false, 'empty request body');
      return jsonResponse_({
        ok: false,
        error: 'empty request body'
      });
    }

    const data = JSON.parse(e.postData.contents);

    const apiKey = String(data.apiKey || '').trim();
    if (apiKey !== API_KEY) {
      logExecutionResult_(executionSummary, startedAt, false, 'unauthorized');
      return jsonResponse_({
        ok: false,
        error: 'unauthorized'
      });
    }

    const subject = String(data.subject || '').trim();
    const body = String(data.body || '');
    const htmlBody = String(data.htmlBody || '');

    const to = normalizeEmailList_(data.to);
    const cc = normalizeEmailList_(data.cc);
    const bcc = normalizeEmailList_(data.bcc);

    if (!subject) {
      logExecutionResult_(executionSummary, startedAt, false, 'subject is required');
      return jsonResponse_({
        ok: false,
        error: 'subject is required'
      });
    }

    if (!body && !htmlBody) {
      logExecutionResult_(executionSummary, startedAt, false, 'body or htmlBody is required');
      return jsonResponse_({
        ok: false,
        error: 'body or htmlBody is required'
      });
    }

    if (to.length === 0) {
      logExecutionResult_(executionSummary, startedAt, false, 'to is required');
      return jsonResponse_({
        ok: false,
        error: 'to is required'
      });
    }

    validateEmailList_(to, 'to');
    validateEmailList_(cc, 'cc');
    validateEmailList_(bcc, 'bcc');

    const attachments = buildAttachments_(data.attachments);
    const inlineImages = buildInlineImages_(data.inlineImages);

    executionSummary.subject = subject;
    executionSummary.toList = to;
    executionSummary.ccList = cc;
    executionSummary.bccList = bcc;
    executionSummary.contentPreview = buildContentPreview_(body, htmlBody);
    executionSummary.toCount = to.length;
    executionSummary.ccCount = cc.length;
    executionSummary.bccCount = bcc.length;
    executionSummary.attachmentCount = attachments.length;
    executionSummary.inlineImageCount = Object.keys(inlineImages).length;

    const mailOptions = {
      to: to.join(','),
      subject: subject,
      body: body || stripHtml_(htmlBody)
    };

    if (cc.length > 0) {
      mailOptions.cc = cc.join(',');
    }

    if (bcc.length > 0) {
      mailOptions.bcc = bcc.join(',');
    }

    if (htmlBody) {
      mailOptions.htmlBody = htmlBody;
    }

    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    if (Object.keys(inlineImages).length > 0) {
      mailOptions.inlineImages = inlineImages;
    }

    MailApp.sendEmail(mailOptions);

    logExecutionResult_(executionSummary, startedAt, true);

    return jsonResponse_({
      ok: true,
      message: 'email sent',
      toCount: to.length,
      ccCount: cc.length,
      bccCount: bcc.length,
      attachmentCount: attachments.length,
      inlineImageCount: Object.keys(inlineImages).length
    });
  } catch (err) {
    console.error(JSON.stringify({
      executionId: executionId,
      action: 'sendEmail',
      stage: 'exception',
      error: String(err),
      at: new Date().toISOString()
    }));

    logExecutionResult_(executionSummary, startedAt, false, String(err));
    return jsonResponse_({
      ok: false,
      error: String(err)
    });
  }
}

function logExecutionResult_(summary, startedAt, ok, errorMessage) {
  console.log(JSON.stringify({
    executionId: summary.executionId,
    action: summary.action,
    result: ok ? 'success' : 'failed',
    durationMs: Date.now() - startedAt,
    subject: summary.subject,
    toList: summary.toList,
    ccList: summary.ccList,
    bccList: summary.bccList,
    contentPreview: summary.contentPreview,
    toCount: summary.toCount,
    ccCount: summary.ccCount,
    bccCount: summary.bccCount,
    attachmentCount: summary.attachmentCount,
    inlineImageCount: summary.inlineImageCount,
    error: errorMessage || null,
    at: new Date().toISOString()
  }));
}

function buildContentPreview_(body, htmlBody) {
  const rawContent = body ? String(body) : stripHtml_(htmlBody);
  return rawContent.substring(0, 120);
}

function normalizeEmailList_(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .map(function(item) {
        return String(item || '').trim();
      })
      .filter(function(item) {
        return item !== '';
      });
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map(function(item) {
        return item.trim();
      })
      .filter(function(item) {
        return item !== '';
      });
  }

  throw new Error('email list must be array or comma-separated string');
}

function validateEmailList_(emails, fieldName) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    if (!emailRegex.test(email)) {
      throw new Error('invalid email in ' + fieldName + ': ' + email);
    }
  }
}

function buildAttachments_(attachmentsInput) {
  if (!attachmentsInput) {
    return [];
  }

  if (!Array.isArray(attachmentsInput)) {
    throw new Error('attachments must be an array');
  }

  return attachmentsInput.map(function(file, index) {
    const filename = String(file.filename || ('attachment_' + index));
    const mimeType = String(file.mimeType || 'application/octet-stream');
    const contentBase64 = String(file.contentBase64 || '').trim();

    if (!contentBase64) {
      throw new Error('attachments[' + index + '].contentBase64 is required');
    }

    const bytes = Utilities.base64Decode(contentBase64);
    return Utilities.newBlob(bytes, mimeType, filename);
  });
}

function buildInlineImages_(inlineImagesInput) {
  if (!inlineImagesInput) {
    return {};
  }

  if (!Array.isArray(inlineImagesInput)) {
    throw new Error('inlineImages must be an array');
  }

  const result = {};

  inlineImagesInput.forEach(function(img, index) {
    const cid = String(img.cid || '').trim();
    const filename = String(img.filename || (cid || ('inline_' + index + '.png')));
    const mimeType = String(img.mimeType || 'image/png');
    const contentBase64 = String(img.contentBase64 || '').trim();

    if (!cid) {
      throw new Error('inlineImages[' + index + '].cid is required');
    }

    if (!contentBase64) {
      throw new Error('inlineImages[' + index + '].contentBase64 is required');
    }

    const bytes = Utilities.base64Decode(contentBase64);
    result[cid] = Utilities.newBlob(bytes, mimeType, filename);
  });

  return result;
}

function stripHtml_(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
