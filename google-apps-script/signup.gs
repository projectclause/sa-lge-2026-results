/**
 * Preamble sign-ups: receives sign-ups from the website and keeps them in the first tab of the
 * Preamble sign-ups Google Sheet. Columns: Signed up (SAST) · Email · Page · Device · Name · Surname.
 *
 * Two kinds of message arrive:
 *  - a sign-up: email (and, from the "save story" prompt, name and surname)  → adds a row, or fills in a missing name
 *  - action=name: a signed-up reader adding their name and surname later        → fills in their row
 *
 * Setup (once): open the sheet → Extensions → Apps Script → paste this file → Deploy →
 * New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy.
 * Copy the web app URL into SIGNUP_URL at the top of js/signup.js.
 * After changing this file later: Deploy → Manage deployments → edit → Version: New version → Deploy.
 */
function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return json_({ ok: true });                       // hidden field: bots fill it, people don't
  var email = String(p.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json_({ ok: false, error: 'invalid' });
  var first = clean_(p.first, 60), last = clean_(p.last, 60);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // column headings, written once if the sheet is new or older than the name columns
    if (sheet.getRange(1, 1).getValue() === '') sheet.getRange(1, 1, 1, 6).setValues([['Signed up (SAST)', 'Email', 'Page', 'Device', 'Name', 'Surname']]);
    else if (sheet.getRange(1, 5).getValue() === '') sheet.getRange(1, 5, 1, 2).setValues([['Name', 'Surname']]);
    var lastRow = sheet.getLastRow(), row = 0;
    if (lastRow > 1) {
      var emails = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < emails.length; i++) if (String(emails[i][0]).toLowerCase() === email) { row = i + 2; break; }
    }
    if (row) {
      if (first || last) sheet.getRange(row, 5, 1, 2).setValues([[first, last]]);   // name added or updated
    } else {
      sheet.appendRow([
        Utilities.formatDate(new Date(), 'Africa/Johannesburg', 'yyyy-MM-dd HH:mm'),
        email, clean_(p.page, 200), clean_(p.device, 20), first, last
      ]);
    }
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

// keep text short, and stop anything that looks like a spreadsheet formula
function clean_(v, n) { var s = String(v || '').trim().slice(0, n); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
