/**
 * petersanjur.com inquiries — Google Apps Script web app.
 *
 * Receives the contact form from the website, emails the inquiry to Peter
 * (Reply goes straight to the visitor), and adds it to the Client Submissions
 * database in Notion as a "New Submission".
 *
 * Studio booking requests (studio.html) also email the client a receipt and give
 * Peter a review link: approving it adds the booking to his Google Calendar,
 * invites the client, and emails them a confirmation.
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
  if (form.action === 'approve') return approveBooking(form);
  if (form.form_kind === 'studio') return studioRequest(form, (e.parameters && e.parameters.gear) || []);

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
// The review link in a studio request email opens the booking to approve.
function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.booking) return reviewBooking(params.booking, params.sig);
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
  CalendarApp.getDefaultCalendar(); // asks for calendar access, used when approving studio bookings
  MailApp.sendEmail(settings.getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL, 'petersanjur.com inquiries: setup check passed', 'Notion can see Client Submissions, and inquiry emails will arrive here.');
  console.log('Setup check passed.');
}

function clean(value, limit) {
  return String(value || '').trim().slice(0, limit);
}

function reply(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Studio bookings ---------- */

const STUDIO_DATABASE_ID = 'e04b2d26da204b77a69ae6d6e56bd7f2'; // Studio Bookings, next to Client Submissions
const STUDIO_TIME_ZONE = 'America/Chicago';
const STUDIO_ADDRESS = '1409 Botham Jean Blvd, Dallas, Texas';
const STUDIO_MIN_HOURS = 2;
const STUDIO_RATE = 125; // dollars per hour
const STUDIO_ACTIVITIES = ['Photo shoot', 'Video / film', 'Content creation', 'Event', 'Something else'];
const STUDIO_CREW = ['1\u20135', '6\u201315', '16\u201330', '30+'];
const STUDIO_GEAR = ['Lenses', 'Continuous lighting & strobes', 'Generators & V-mount batteries', 'DJI Ronin RS4', 'Wireless audio', 'Haze & smoke'];

function studioRequest(form, gear) {
  const booking = {
    name: clean(form.name, 100),
    email: clean(form.email, 160),
    phone: clean(form.phone, 40),
    company: clean(form.company, 120),
    date: /^\d{4}-\d{2}-\d{2}$/.test(form.booking_date || '') ? form.booking_date : '',
    start: /^\d{2}:\d{2}$/.test(form.start_time || '') ? form.start_time : '',
    end: /^\d{2}:\d{2}$/.test(form.end_time || '') ? form.end_time : '',
    activity: STUDIO_ACTIVITIES.indexOf(form.activity) >= 0 ? form.activity : 'Something else',
    crew: STUDIO_CREW.indexOf(form.crew) >= 0 ? form.crew : '',
    gear: gear.filter(function (item) { return STUDIO_GEAR.indexOf(item) >= 0; }),
    message: clean(form.message, 2000)
  };
  if (!booking.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(booking.email) || !booking.date || !booking.start || !booking.end) {
    return reply({ ok: false, error: 'Please include your name, a valid email, a date, and your hours.' });
  }
  booking.hours = (studioTime(booking, booking.end) - studioTime(booking, booking.start)) / 36e5;
  if (booking.hours < STUDIO_MIN_HOURS) return reply({ ok: false, error: 'Bookings are ' + STUDIO_MIN_HOURS + ' hours minimum.' });
  if (studioTime(booking, booking.start) < new Date()) return reply({ ok: false, error: 'Please choose a time in the future.' });

  booking.id = Utilities.getUuid();
  const problems = [];
  try { booking.notionUrl = addBookingToNotion(booking); } catch (error) { problems.push('Notion: ' + error.message); }
  PropertiesService.getScriptProperties().setProperty('booking_' + booking.id, JSON.stringify(booking));
  try { emailBookingToPeter(booking, problems); } catch (error) { problems.push('Email: ' + error.message); }
  try { emailBookingReceipt(booking); } catch (error) { problems.push('Receipt: ' + error.message); }
  if (problems.length) console.error(problems.join('\n'));
  return reply({ ok: problems.length < 3 });
}

function addBookingToNotion(booking) {
  const properties = {
    'Name': { title: [{ text: { content: booking.name } }] },
    'Status': { select: { name: 'Requested' } },
    'Date': { date: { start: booking.date + 'T' + booking.start + ':00', end: booking.date + 'T' + booking.end + ':00', time_zone: STUDIO_TIME_ZONE } },
    'Hours': { number: booking.hours },
    'Estimate': { number: booking.hours * STUDIO_RATE },
    'Email': { email: booking.email },
    'Activity': { select: { name: booking.activity } },
    'Gear': { multi_select: booking.gear.map(function (item) { return { name: item }; }) }
  };
  if (booking.phone) properties['Phone'] = { phone_number: booking.phone };
  if (booking.company) properties['Company'] = { rich_text: [{ text: { content: booking.company } }] };
  if (booking.crew) properties['Headcount'] = { select: { name: booking.crew } };
  if (booking.message) properties['Notes'] = { rich_text: [{ text: { content: booking.message } }] };
  const database = PropertiesService.getScriptProperties().getProperty('STUDIO_DATABASE_ID') || STUDIO_DATABASE_ID;
  const page = notionRequest('post', 'pages', { parent: { database_id: database }, properties: properties });
  booking.notionId = page.id;
  return page.url || '';
}

function notionRequest(method, path, payload) {
  const token = PropertiesService.getScriptProperties().getProperty('NOTION_TOKEN');
  if (!token) throw new Error('NOTION_TOKEN script property is missing.');
  const response = UrlFetchApp.fetch('https://api.notion.com/v1/' + path, {
    method: method,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, 'Notion-Version': '2022-06-28' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const body = JSON.parse(response.getContentText() || '{}');
  if (response.getResponseCode() >= 300) throw new Error(body.message || ('HTTP ' + response.getResponseCode()));
  return body;
}

function emailBookingToPeter(booking, problems) {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL;
  const review = ScriptApp.getService().getUrl() + '?booking=' + booking.id + '&sig=' + signBooking(booking.id);
  const notion = booking.notionUrl ? 'In Notion: ' + booking.notionUrl : 'Not added to Notion: ' + (problems.join('; ') || 'unknown error');
  const lines = bookingLines(booking);
  MailApp.sendEmail({
    to: to,
    replyTo: booking.email,
    name: 'Peter Sanjur Studio',
    subject: 'Studio request \u2014 ' + bookingWhen(booking) + ' \u2014 ' + booking.name,
    body: lines.join('\n') + '\n\nReview and approve: ' + review + '\n\nReply to this email to message ' + booking.name + ' directly.\n' + notion,
    htmlBody: emailShell(
      '<p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#777">New studio request</p>' +
      '<h1 style="margin:0 0 20px;font-size:24px">' + esc(bookingWhen(booking)) + '</h1>' +
      detailTable(booking) +
      '<p style="margin:28px 0"><a href="' + review + '" style="background:#111;color:#fff;padding:14px 22px;text-decoration:none;font-weight:600;display:inline-block">Review &amp; approve</a></p>' +
      '<p style="color:#555">Reply to this email to message ' + esc(booking.name) + ' directly.</p>' +
      '<p style="color:#999;font-size:12px">' + (booking.notionUrl ? '<a href="' + booking.notionUrl + '" style="color:#999">Open in Notion</a>' : esc(notion)) + '</p>')
  });
}

function emailBookingReceipt(booking) {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL;
  MailApp.sendEmail({
    to: booking.email,
    replyTo: to,
    name: 'Peter Sanjur Studio',
    subject: 'Your studio request \u2014 ' + bookingWhen(booking),
    body: 'Hi ' + firstName(booking) + ',\n\nThanks for your request to book the studio. I\u2019ll check the calendar and confirm shortly.\n\n' + bookingLines(booking).join('\n') + '\n\nQuestions or changes? Just reply to this email.\n\nPeter Sanjur Studio\n' + STUDIO_ADDRESS,
    htmlBody: emailShell(
      '<p>Hi ' + esc(firstName(booking)) + ',</p><p>Thanks for your request to book the studio. I\u2019ll check the calendar and confirm shortly.</p>' +
      detailTable(booking) +
      '<p style="margin-top:24px">Questions or changes? Just reply to this email.</p><p style="color:#777">Peter Sanjur Studio<br>' + STUDIO_ADDRESS + '</p>')
  });
}

// The review page shows the request and any calendar conflicts. Approving is a
// button (a POST), so link scanners that open emails can't approve by accident.
function reviewBooking(id, sig) {
  const booking = loadBooking(id, sig);
  if (!booking) return page('Link not valid', '<p>This booking link is invalid or has expired.</p>');
  if (booking.approved) return page('Already booked', '<p>' + esc(booking.name) + ' is booked for ' + esc(bookingWhen(booking)) + '. It\u2019s on your calendar.</p>');
  const clashes = CalendarApp.getDefaultCalendar().getEvents(studioTime(booking, booking.start), studioTime(booking, booking.end));
  const warning = clashes.length ? '<p style="background:#fff3cd;padding:12px 14px">Heads up: this overlaps ' + clashes.map(function (event) { return '\u201c' + esc(event.getTitle()) + '\u201d'; }).join(', ') + ' on your calendar.</p>' : '<p style="color:#2e7d32">Your calendar is free at this time.</p>';
  return page('Studio request', '<h1 style="font-size:24px;margin:0 0 20px">' + esc(bookingWhen(booking)) + '</h1>' + detailTable(booking) + warning +
    '<form method="post" action="' + ScriptApp.getService().getUrl() + '" target="_top">' +
    '<input type="hidden" name="action" value="approve"><input type="hidden" name="booking" value="' + esc(id) + '"><input type="hidden" name="sig" value="' + esc(sig) + '">' +
    '<button style="background:#111;color:#fff;border:0;padding:14px 22px;font:600 15px sans-serif;cursor:pointer">Approve &amp; add to calendar</button></form>' +
    '<p style="color:#777;font-size:13px">Approving adds it to your Google Calendar, sends ' + esc(booking.name) + ' an invite, and emails them a confirmation. To decline or ask questions, just reply to the request email.</p>');
}

function approveBooking(form) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const booking = loadBooking(form.booking, form.sig);
    if (!booking) return page('Link not valid', '<p>This booking link is invalid or has expired.</p>');
    if (booking.approved) return page('Already booked', '<p>' + esc(booking.name) + ' is already on your calendar for ' + esc(bookingWhen(booking)) + '.</p>');
    const event = CalendarApp.getDefaultCalendar().createEvent(
      'Studio: ' + booking.name + (booking.company ? ' (' + booking.company + ')' : '') + ' \u2014 ' + booking.activity,
      studioTime(booking, booking.start), studioTime(booking, booking.end),
      { location: STUDIO_ADDRESS, description: bookingLines(booking).join('\n') + (booking.notionUrl ? '\n\nNotion: ' + booking.notionUrl : ''), guests: booking.email, sendInvites: true });
    booking.approved = new Date().toISOString();
    booking.eventId = event.getId();
    PropertiesService.getScriptProperties().setProperty('booking_' + booking.id, JSON.stringify(booking));
    if (booking.notionId) {
      try { notionRequest('patch', 'pages/' + booking.notionId, { properties: { 'Status': { select: { name: 'Booked' } } } }); } catch (error) { console.error('Notion status: ' + error.message); }
    }
    const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL;
    MailApp.sendEmail({
      to: booking.email,
      replyTo: to,
      name: 'Peter Sanjur Studio',
      subject: 'You\u2019re booked \u2014 ' + bookingWhen(booking),
      body: 'Hi ' + firstName(booking) + ',\n\nYou\u2019re confirmed at the studio. A calendar invite is on its way.\n\n' + bookingLines(booking).join('\n') + '\n\nAddress: ' + STUDIO_ADDRESS + '\n\nReply to this email with any questions.\n\nPeter Sanjur Studio',
      htmlBody: emailShell('<p>Hi ' + esc(firstName(booking)) + ',</p><p><strong>You\u2019re confirmed at the studio.</strong> A calendar invite is on its way.</p>' + detailTable(booking) +
        '<p style="margin-top:24px">' + STUDIO_ADDRESS + '</p><p>Reply to this email with any questions.</p><p style="color:#777">Peter Sanjur Studio</p>')
    });
    return page('Booked', '<h1 style="font-size:24px;margin:0 0 12px">Booked \u2713</h1><p>' + esc(booking.name) + ' is on your calendar for ' + esc(bookingWhen(booking)) + '. They\u2019ve been sent an invite and a confirmation email.</p><p><a href="https://calendar.google.com/calendar/r/day/' + booking.date.replace(/-/g, '/') + '" target="_top">Open Google Calendar</a></p>');
  } finally {
    lock.releaseLock();
  }
}

function loadBooking(id, sig) {
  if (!/^[0-9a-f-]{36}$/.test(id || '') || sig !== signBooking(id)) return null;
  const saved = PropertiesService.getScriptProperties().getProperty('booking_' + id);
  return saved ? JSON.parse(saved) : null;
}

// Review links are signed with a key only this script knows.
function signBooking(id) {
  const settings = PropertiesService.getScriptProperties();
  let key = settings.getProperty('SIGNING_KEY');
  if (!key) { key = Utilities.getUuid() + Utilities.getUuid(); settings.setProperty('SIGNING_KEY', key); }
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(id, key)).replace(/=+$/, '');
}

function studioTime(booking, time) {
  return Utilities.parseDate(booking.date + ' ' + time, STUDIO_TIME_ZONE, 'yyyy-MM-dd HH:mm');
}

function bookingWhen(booking) {
  const day = Utilities.formatDate(studioTime(booking, booking.start), STUDIO_TIME_ZONE, 'EEE, MMM d');
  const time = function (t) { return Utilities.formatDate(studioTime(booking, t), STUDIO_TIME_ZONE, 'h:mm a'); };
  return day + ', ' + time(booking.start) + '\u2013' + time(booking.end) + ' (' + booking.hours + ' hrs)';
}

function bookingEstimate(booking) {
  return '$' + (booking.hours * STUDIO_RATE).toLocaleString('en-US', { minimumFractionDigits: booking.hours % 1 ? 2 : 0 }) + ' (' + booking.hours + ' hrs \u00d7 $' + STUDIO_RATE + '/hr)';
}

function bookingRows(booking) {
  return [
    ['When', bookingWhen(booking)],
    ['Estimate', bookingEstimate(booking)],
    ['Name', booking.name],
    ['Email', booking.email],
    ['Phone', booking.phone],
    ['Company', booking.company],
    ['Activity', booking.activity],
    ['Headcount', booking.crew],
    ['Gear requests', booking.gear.join(', ')],
    ['About the project', booking.message]
  ].filter(function (row) { return row[1]; });
}

function bookingLines(booking) {
  return bookingRows(booking).map(function (row) { return row[0] + ': ' + row[1]; });
}

function detailTable(booking) {
  return '<table style="border-collapse:collapse;width:100%;font-size:15px">' + bookingRows(booking).map(function (row) {
    return '<tr><td style="padding:8px 14px 8px 0;color:#777;vertical-align:top;white-space:nowrap;border-top:1px solid #eee">' + esc(row[0]) + '</td><td style="padding:8px 0;border-top:1px solid #eee;white-space:pre-wrap">' + esc(row[1]) + '</td></tr>';
  }).join('') + '</table>';
}

function emailShell(inner) {
  return '<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;max-width:560px;line-height:1.5">' + inner + '</div>';
}

function page(title, inner) {
  return HtmlService.createHtmlOutput(emailShell(inner)).setTitle(title + ' \u2014 Peter Sanjur Studio').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function firstName(booking) {
  return booking.name.split(/\s+/)[0];
}

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
