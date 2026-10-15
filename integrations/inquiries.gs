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
  // Real visitors take more than a few seconds to fill in a form.
  const loadedAt = Number(form._t);
  if (loadedAt && Date.now() - loadedAt < 3000) return reply({ ok: true });
  if (form.booking) return reviewRequest(form);
  const spam = spamReason(form);
  if (spam) return quarantine(form, spam);
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
// Signs of the bot inquiries contact forms get. A flagged inquiry is dropped;
// Executions in the Apps Script editor lists what was blocked and why.
const BLOCKED_NAMES = ['robertgok'];

function spamReason(form) {
  const name = String(form.name || '').trim();
  const message = String(form.message || '');
  if (!form._t) return 'sent without the page\'s script (likely a bot posting directly)';
  if (/https?:\/\/|www\.|\[url|<a\s/i.test(message + ' ' + name)) return 'contains a link';
  if (BLOCKED_NAMES.indexOf(name.toLowerCase()) >= 0) return 'known spam name (' + name + ')';
  if (message.length < 160 && /\b(price|prices|prix|preis|precio|prezzo|pre\u00e7o|phraghas|prijs|pris|hinta|cen\u0119|\u0446\u0435\u043d)/i.test(message) && !/photo|shoot|film|video|campaign|studio|model/i.test(message)) return 'matches the "what is your price" bot template';
  return '';
}

// Flagged submissions are dropped quietly: no Notion row, no email. The bot still
// sees a normal "sent" reply, so it has no reason to try harder.
function quarantine(form, reason) {
  console.log('Blocked spam (' + reason + '): ' + clean(form.name, 60) + ' <' + clean(form.email, 160) + '>');
  return reply({ ok: true });
}

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
// The street address only goes out once a booking is approved (confirmation email and calendar invite).
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
  if (allowReceipt(booking.email)) {
    try { emailBookingReceipt(booking); } catch (error) { problems.push('Receipt: ' + error.message); }
  }
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
  const review = REVIEW_PAGE + '?booking=' + booking.id + '&sig=' + encodeURIComponent(signBooking(booking.id));
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

// A receipt goes to whatever address was typed, so limit how many go out: one per
// address every 6 hours, and no more than 10 an hour overall. Peter's own email is unaffected.
function allowReceipt(email) {
  const cache = CacheService.getScriptCache();
  const addressKey = 'receipt_' + email.toLowerCase();
  const hourKey = 'receipts_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  const sentThisHour = Number(cache.get(hourKey) || 0);
  if (cache.get(addressKey) || sentThisHour >= 10) return false;
  cache.put(addressKey, '1', 21600);
  cache.put(hourKey, String(sentThisHour + 1), 3600);
  return true;
}

function emailBookingReceipt(booking) {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL;
  MailApp.sendEmail({
    to: booking.email,
    replyTo: to,
    name: 'Peter Sanjur Studio',
    subject: 'Your studio request \u2014 ' + bookingWhen(booking),
    body: 'Hi ' + firstName(booking) + ',\n\nThanks for your request to book the studio. I\u2019ll check the calendar and confirm shortly.\n\n' + bookingLines(booking).join('\n') + '\n\nQuestions or changes? Just reply to this email.\n\nPeter Sanjur Studio\nDowntown Dallas',
    htmlBody: emailShell(
      '<p>Hi ' + esc(firstName(booking)) + ',</p><p>Thanks for your request to book the studio. I\u2019ll check the calendar and confirm shortly.</p>' +
      detailTable(booking) +
      '<p style="margin-top:24px">Questions or changes? Just reply to this email.</p><p style="color:#777">Peter Sanjur Studio<br>Downtown Dallas</p>')
  });
}

// The review page walks a request through three steps, each a button on the page:
//   Requested  -> Approve: holds the time on the calendar and asks the client to pay
//   Approved   -> Mark paid: confirms, invites the client, and shares the address
//   (any time) -> Decline: lets the client know kindly
// The review page lives at petersanjur.com/studio-review.html and talks to this
// script with fetch, because Google's own web app pages break for anyone signed
// in to more than one Google account.
const REVIEW_PAGE = 'https://www.petersanjur.com/studio-review.html';

function reviewRequest(form) {
  try {
    if (form.action && form.action !== 'view') return reply({ ok: true, html: bookingAction(form.booking, form.sig, form.action) });
    const booking = loadBooking(form.booking, form.sig);
    if (!booking) return reply({ ok: false, error: 'This booking link is invalid or has expired.' });
    return reply({ ok: true, html: reviewHtml(booking) });
  } catch (error) {
    return reply({ ok: false, error: error.message });
  }
}

function reviewBooking(id, sig) {
  const link = REVIEW_PAGE + '?booking=' + encodeURIComponent(id) + '&sig=' + encodeURIComponent(sig);
  return page('Studio request', '<p>The review page has moved. <a href="' + link + '" target="_top">Open this request on petersanjur.com</a>.</p>');
}

function reviewHtml(booking) {
  const total = '$' + money(booking.hours * STUDIO_RATE);
  const button = function (action, label, dark) {
    return '<button onclick="act(\'' + action + '\')" style="' + (dark ? 'background:#111;color:#fff;border:0' : 'background:#fff;color:#111;border:1px solid #bbb') + ';padding:13px 20px;font:600 15px sans-serif;cursor:pointer;margin:0 8px 8px 0">' + label + '</button>';
  };
  const head = '<h1 style="font-size:24px;margin:0 0 6px">' + esc(bookingWhen(booking)) + '</h1>';
  if (booking.declined) return head + '<p>You declined this request and ' + esc(firstName(booking)) + ' was emailed.</p>';
  if (booking.paid) return head + '<p style="color:#2e7d32"><strong>Booked \u2713</strong> Paid and confirmed. ' + esc(booking.name) + ' has the calendar invite and the address.</p>' + detailTable(booking);
  if (booking.approved) {
    const paidOnSquare = squarePaid(booking);
    const invoiceNote = booking.payUrl
      ? 'A Square invoice for <strong>' + total + '</strong> went to ' + esc(booking.email) + (booking.smsSent ? ' and by text to ' + esc(booking.phone) : '') + ' (<a href="' + booking.payUrl + '" target="_blank" rel="noopener">view invoice</a>). ' + (paidOnSquare ? '<strong style="color:#2e7d32">Square shows it\u2019s paid.</strong>' : 'Square doesn\u2019t show a payment yet.')
      : 'The Square invoice couldn\u2019t be created' + (booking.squareError ? ' (' + esc(booking.squareError) + ')' : '') + ', so send ' + esc(booking.name) + ' one for <strong>' + total + '</strong> from Square directly.';
    return head + '<p style="background:#eef4ff;padding:12px 14px"><strong>Approved, awaiting payment.</strong> ' + invoiceNote + ' The time is held on your calendar.</p>' +
      detailTable(booking) + '<p style="margin-top:22px">' + (booking.payUrl ? '' : button('square', 'Try Square again', false)) + button('paid', 'Mark paid &amp; confirm', true) + button('decline', 'Decline', false) + '</p>' +
      '<p id="note" style="color:#777;font-size:13px">Once they\u2019ve paid, Mark paid sends them the calendar invite and the studio address.</p>';
  }
  const clashes = CalendarApp.getDefaultCalendar().getEvents(studioTime(booking, booking.start), studioTime(booking, booking.end));
  const warning = clashes.length ? '<p style="background:#fff3cd;padding:12px 14px">Heads up: this overlaps ' + clashes.map(function (event) { return '\u201c' + esc(event.getTitle()) + '\u201d'; }).join(', ') + ' on your calendar.</p>' : '<p style="color:#2e7d32">Your calendar is free at this time.</p>';
  return head + detailTable(booking) + warning + '<p style="margin-top:22px">' + button('approve', 'Approve &amp; request payment', true) + button('decline', 'Decline', false) + '</p>' +
    '<p id="note" style="color:#777;font-size:13px">Approving holds the time on your calendar and sends ' + esc(firstName(booking)) + ' a Square payment link for ' + total + ' by email' + (booking.phone ? ' and text' : '') + '. The booking is confirmed once you mark it paid.</p>';
}

function bookingAction(id, sig, action) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const booking = loadBooking(id, sig);
    if (!booking) throw new Error('This booking link is invalid.');
    const props = PropertiesService.getScriptProperties();
    const replyTo = props.getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL;
    const total = '$' + money(booking.hours * STUDIO_RATE);
    const send = function (subject, intro, extra) {
      MailApp.sendEmail({ to: booking.email, replyTo: replyTo, name: 'Peter Sanjur Studio', subject: subject,
        body: 'Hi ' + firstName(booking) + ',\n\n' + intro.replace(/<[^>]+>/g, '') + '\n\n' + bookingLines(booking).join('\n') + (extra ? '\n\n' + extra.replace(/<[^>]+>/g, '') : '') + '\n\nReply to this email with any questions.\n\nPeter Sanjur Studio',
        htmlBody: emailShell('<p>Hi ' + esc(firstName(booking)) + ',</p><p>' + intro + '</p>' + detailTable(booking) + (extra ? '<p style="margin-top:24px">' + extra + '</p>' : '') + '<p>Reply to this email with any questions.</p><p style="color:#777">Peter Sanjur Studio</p>') });
    };
    if (action === 'approve' && !booking.approved && !booking.declined) {
      const hold = CalendarApp.getDefaultCalendar().createEvent('HOLD (awaiting payment) \u2014 Studio: ' + booking.name,
        studioTime(booking, booking.start), studioTime(booking, booking.end),
        { description: bookingLines(booking).join('\n') + (booking.notionUrl ? '\n\nNotion: ' + booking.notionUrl : '') });
      booking.approved = new Date().toISOString();
      booking.eventId = hold.getId();
      setNotionStatus(booking, 'Approved');
      try { squareInvoice(booking); } catch (error) { booking.squareError = String((error && error.message) || error); console.error('Square: ' + booking.squareError); }
      const payButton = booking.payUrl ? '<a href="' + booking.payUrl + '" style="background:#111;color:#fff;padding:14px 22px;text-decoration:none;font-weight:600;display:inline-block">Pay ' + total + ' securely</a>' : '';
      send('Approved \u2014 your studio booking for ' + bookingWhen(booking),
        '<strong>Good news: your studio request is approved.</strong> To lock in the date, please pay <strong>' + total + '</strong>' + (booking.payUrl ? ' through Square using the link below' + (booking.smsSent ? ' (it\u2019s also been texted to you)' : '') : '. I\u2019ll send you a Square invoice shortly') + '. Your booking is confirmed once it\u2019s paid, and I\u2019ll follow up with the calendar invite and studio address.',
        booking.payUrl ? payButton + '<br><span style="color:#777;font-size:13px">' + booking.payUrl + '</span>' : '');
    } else if (action === 'square' && booking.approved && !booking.payUrl && !booking.paid && !booking.declined) {
      try { squareInvoice(booking); } catch (error) { booking.squareError = String((error && error.message) || error); }
      if (booking.payUrl) send('Payment link for your studio booking \u2014 ' + bookingWhen(booking),
        'Here\u2019s the secure Square link to pay <strong>' + total + '</strong> for your studio booking' + (booking.smsSent ? ' (it\u2019s also been texted to you)' : '') + '. Your booking is confirmed once it\u2019s paid.',
        '<a href="' + booking.payUrl + '" style="background:#111;color:#fff;padding:14px 22px;text-decoration:none;font-weight:600;display:inline-block">Pay ' + total + ' securely</a><br><span style="color:#777;font-size:13px">' + booking.payUrl + '</span>');
    } else if (action === 'paid' && booking.approved && !booking.paid && !booking.declined) {
      // Swap the private hold for the real event, which invites the client.
      if (booking.eventId) { try { CalendarApp.getDefaultCalendar().getEventById(booking.eventId).deleteEvent(); } catch (error) {} }
      const event = CalendarApp.getDefaultCalendar().createEvent(
        'Studio: ' + booking.name + (booking.company ? ' (' + booking.company + ')' : '') + ' \u2014 ' + booking.activity,
        studioTime(booking, booking.start), studioTime(booking, booking.end),
        { location: STUDIO_ADDRESS, description: bookingLines(booking).join('\n') + (booking.notionUrl ? '\n\nNotion: ' + booking.notionUrl : ''), guests: booking.email, sendInvites: true });
      booking.eventId = event.getId();
      booking.paid = new Date().toISOString();
      setNotionStatus(booking, 'Booked');
      send('You\u2019re booked \u2014 ' + bookingWhen(booking),
        '<strong>Payment received, and you\u2019re confirmed at the studio.</strong> A calendar invite is on its way.',
        '<strong>Studio address:</strong> ' + STUDIO_ADDRESS);
    } else if (action === 'decline' && !booking.paid && !booking.declined) {
      if (booking.eventId) { try { CalendarApp.getDefaultCalendar().getEventById(booking.eventId).deleteEvent(); } catch (error) {} }
      booking.declined = new Date().toISOString();
      setNotionStatus(booking, 'Declined');
      send('About your studio request for ' + bookingWhen(booking),
        'Thank you for your interest in the studio. Unfortunately I can\u2019t accommodate this booking. If another date works for you, I\u2019d be glad to help. Just reply with a few options.');
    }
    props.setProperty('booking_' + booking.id, JSON.stringify(booking));
    return reviewHtml(booking);
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Square ---------- */
// Needs the SQUARE_TOKEN script property (a production access token from
// developer.squareup.com). The invoice is for the full amount; Square texts the
// link when there's a phone number, and the approval email always carries it.
function squareRequest(method, path, payload) {
  const token = PropertiesService.getScriptProperties().getProperty('SQUARE_TOKEN');
  if (!token) throw new Error('SQUARE_TOKEN script property is missing');
  const options = { method: method, contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token, 'Square-Version': '2025-01-23' } };
  if (payload) options.payload = JSON.stringify(payload);
  const response = UrlFetchApp.fetch('https://connect.squareup.com/v2/' + path, options);
  const body = JSON.parse(response.getContentText() || '{}');
  if (response.getResponseCode() >= 300) throw new Error((body.errors && body.errors[0] && body.errors[0].detail) || ('HTTP ' + response.getResponseCode()));
  return body;
}

function squareLocation() {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('SQUARE_LOCATION_ID');
  if (saved) return saved;
  const locations = (squareRequest('get', 'locations').locations || []).filter(function (l) { return l.status === 'ACTIVE'; });
  if (!locations.length) throw new Error('No active Square location');
  props.setProperty('SQUARE_LOCATION_ID', locations[0].id);
  return locations[0].id;
}

function phoneE164(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return '';
}

function squareInvoice(booking) {
  const location = squareLocation();
  const phone = phoneE164(booking.phone);
  const names = booking.name.split(/\s+/);
  const customer = { idempotency_key: booking.id + '-customer', given_name: names[0], email_address: booking.email, reference_id: booking.id };
  if (names.length > 1) customer.family_name = names.slice(1).join(' ');
  if (booking.company) customer.company_name = booking.company;
  if (phone) customer.phone_number = phone;
  const customerId = squareRequest('post', 'customers', customer).customer.id;
  const order = squareRequest('post', 'orders', { idempotency_key: booking.id + '-order', order: { location_id: location, customer_id: customerId, line_items: [{
    name: 'Studio booking \u2014 ' + bookingWhen(booking), quantity: '1',
    base_price_money: { amount: Math.round(booking.hours * STUDIO_RATE * 100), currency: 'USD' } }] } }).order;
  // Due in three days, or on the booking day if that comes first.
  const inThreeDays = Utilities.formatDate(new Date(Date.now() + 3 * 864e5), STUDIO_TIME_ZONE, 'yyyy-MM-dd');
  const today = Utilities.formatDate(new Date(), STUDIO_TIME_ZONE, 'yyyy-MM-dd');
  const due = booking.date < today ? today : (booking.date < inThreeDays ? booking.date : inThreeDays);
  const draft = squareRequest('post', 'invoices', { idempotency_key: booking.id + '-invoice', invoice: {
    location_id: location, order_id: order.id, primary_recipient: { customer_id: customerId },
    payment_requests: [{ request_type: 'BALANCE', due_date: due }],
    delivery_method: phone ? 'SMS' : 'SHARE_MANUALLY',
    accepted_payment_methods: { card: true, cash_app_pay: true, square_gift_card: false, bank_account: false, buyer_now_pay_later: false },
    title: 'Peter Sanjur Studio', description: 'Studio booking: ' + bookingWhen(booking) + '. Your booking is confirmed once this is paid.' } }).invoice;
  const published = squareRequest('post', 'invoices/' + draft.id + '/publish', { version: draft.version, idempotency_key: booking.id + '-publish' }).invoice;
  booking.invoiceId = published.id;
  booking.payUrl = published.public_url || squareRequest('get', 'invoices/' + published.id).invoice.public_url;
  if (!booking.payUrl) throw new Error('Square created the invoice but did not return a payment link');
  booking.smsSent = !!phone;
  delete booking.squareError;
}

function squarePaid(booking) {
  if (!booking.invoiceId) return false;
  try { return squareRequest('get', 'invoices/' + booking.invoiceId).invoice.status === 'PAID'; } catch (error) { return false; }
}

function setNotionStatus(booking, status) {
  if (!booking.notionId) return;
  try { notionRequest('patch', 'pages/' + booking.notionId, { properties: { 'Status': { select: { name: status } } } }); } catch (error) { console.error('Notion status: ' + error.message); }
}

function money(amount) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: amount % 1 ? 2 : 0 });
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
