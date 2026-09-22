/**
 * petersanjur.com inquiries — Google Apps Script web app.
 *
 * Receives the contact form from the website, emails the inquiry to Peter
 * (Reply goes straight to the visitor), and adds it to the Client Submissions
 * database in Notion as a "New Submission".
 *
 * Setup (see README "Contact form: email and Notion"):
 *   Project Settings → Script properties:
 *     NOTION_TOKEN        Internal integration secret from notion.so/profile/integrations (required)
 *     NOTIFY_EMAIL        Where inquiries are emailed (optional, defaults below)
 *     NOTION_DATABASE_ID  Client Submissions database (optional, defaults below)
 *   Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 */
const DEFAULT_NOTIFY_EMAIL = 'info@petersanjur.com';
const DEFAULT_DATABASE_ID = '1c871ce3e001806490b5e1206eb25ee3';
const PROJECT_TYPES = ['Photography campaign', 'Film / direction', 'Portrait / editorial', 'Creative collaboration', 'Studio inquiry', 'Something else'];
// These match the Budget Range options in Notion exactly.
const BUDGET_RANGES = ['$1000 - $2500', '$2500 - $5000', '$5000 - $10000', '$10000+'];

function doPost(e) {
  const form = (e && e.parameter) || {};
  // The hidden _gotcha field is invisible to people, so anything in it came from a bot.
  if (form._gotcha) return reply({ ok: true });

  const inquiry = {
    name: clean(form.name, 100),
    email: clean(form.email, 160),
    type: PROJECT_TYPES.indexOf(form.type) >= 0 ? form.type : 'Something else',
    date: /^\d{4}-\d{2}-\d{2}$/.test(form.preferred_date || '') ? form.preferred_date : '',
    budget: BUDGET_RANGES.indexOf(form.budget) >= 0 ? form.budget : '',
    message: clean(form.message, 2000),
    subject: clean(form._subject, 200)
  };
  if (!inquiry.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inquiry.email) || !inquiry.message) {
    return reply({ ok: false, error: 'Please include your name, a valid email, and a message.' });
  }

  // Each delivery is attempted separately; the visitor sees success if either lands.
  const problems = [];
  let notionUrl = '';
  try { notionUrl = addToNotion(inquiry); } catch (error) { problems.push('Notion: ' + error.message); }
  try { emailInquiry(inquiry, notionUrl, problems); } catch (error) { problems.push('Email: ' + error.message); }
  if (problems.length) console.error(problems.join('\n'));
  return reply({ ok: problems.length < 2 });
}

// Visiting the web app URL in a browser just confirms it is running.
function doGet() {
  return reply({ ok: true, service: 'petersanjur.com inquiries' });
}

function addToNotion(inquiry) {
  const settings = PropertiesService.getScriptProperties();
  const token = settings.getProperty('NOTION_TOKEN');
  if (!token) throw new Error('NOTION_TOKEN script property is missing.');
  const properties = {
    'Name': { title: [{ text: { content: inquiry.name } }] },
    'Email': { email: inquiry.email },
    'Project Type': { select: { name: inquiry.type } },
    'Project Description': { rich_text: [{ text: { content: inquiry.message } }] },
    'Customer Journey': { select: { name: 'New Submission' } },
    'Source': { select: { name: 'Website' } }
  };
  if (inquiry.date) properties['Project Date'] = { date: { start: inquiry.date } };
  if (inquiry.budget) properties['Budget Range'] = { select: { name: inquiry.budget } };
  const response = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, 'Notion-Version': '2022-06-28' },
    payload: JSON.stringify({ parent: { database_id: settings.getProperty('NOTION_DATABASE_ID') || DEFAULT_DATABASE_ID }, properties: properties }),
    muteHttpExceptions: true
  });
  const body = JSON.parse(response.getContentText() || '{}');
  if (response.getResponseCode() >= 300) throw new Error(body.message || ('HTTP ' + response.getResponseCode()));
  return body.url || '';
}

function emailInquiry(inquiry, notionUrl, problems) {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL;
  const lines = [
    'Name: ' + inquiry.name,
    'Email: ' + inquiry.email,
    'Project: ' + inquiry.type,
    'Preferred date: ' + (inquiry.date || 'Flexible / to discuss'),
    'Budget: ' + (inquiry.budget || 'Not given'),
    '',
    inquiry.message,
    '',
    notionUrl ? 'In Notion: ' + notionUrl : 'Not added to Notion: ' + (problems.join('; ') || 'unknown error')
  ];
  MailApp.sendEmail({
    to: to,
    replyTo: inquiry.email,
    name: 'petersanjur.com',
    subject: inquiry.subject || ('Project inquiry \u2014 ' + inquiry.type + ' \u2014 ' + inquiry.name),
    body: lines.join('\n')
  });
}

/**
 * Run this once from the editor after adding NOTION_TOKEN. It asks for Google's
 * permissions, confirms Notion can see the database, and emails you a test note.
 */
function checkSetup() {
  const settings = PropertiesService.getScriptProperties();
  const token = settings.getProperty('NOTION_TOKEN');
  if (!token) throw new Error('Add the NOTION_TOKEN script property first.');
  const databaseId = settings.getProperty('NOTION_DATABASE_ID') || DEFAULT_DATABASE_ID;
  const response = UrlFetchApp.fetch('https://api.notion.com/v1/databases/' + databaseId, {
    headers: { Authorization: 'Bearer ' + token, 'Notion-Version': '2022-06-28' },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Notion could not open Client Submissions (HTTP ' + response.getResponseCode() + '). Share the table with your integration under \u2022\u2022\u2022 \u2192 Connections.');
  }
  MailApp.sendEmail(settings.getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL, 'petersanjur.com inquiries: setup check passed', 'Notion can see Client Submissions, and inquiry emails will arrive here.');
  console.log('Setup check passed.');
}

function clean(value, limit) {
  return String(value || '').trim().slice(0, limit);
}

function reply(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
