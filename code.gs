/**
 * Web App backing store for Survivor Fantasy. 
 * Create a google sheet and go Extensions > Apps Script and paste this.
 * Sheet: columns A:C = leagueId | updatedAt | json
 */

const SHEET_NAME = 'Leagues';

function _sheet() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME).setFrozenRows(1);
  if (sh.getLastRow() === 0) sh.appendRow(['leagueId','updatedAt','json']);
  return sh;
}

function _findRow(sh, leagueId) {
  const vals = sh.getRange(2,1,Math.max(sh.getLastRow()-1,0),1).getValues();
  for (let i=0;i<vals.length;i++){
    if (vals[i][0] === leagueId) return i+2; // row index
  }
  return -1;
}

function doGet(e) {
  const league = (e.parameter.league || '').trim();
  if (!league) return _resp({error:'missing league'}, 400);
  const sh = _sheet();
  const row = _findRow(sh, league);
  if (row === -1) return _resp({exists:false, data:null});
  const json = sh.getRange(row,3).getValue();
  const updatedAt = sh.getRange(row,2).getValue();
  return _resp({exists:true, updatedAt, data: JSON.parse(json)});
}

function doPost(e) {
  if (e?.parameter?.mode === 'options') {
    return _resp({ ok: true });
  }

  // Optional: simple write key check
  const league = (e.parameter.league || '').trim();
  const writeKey = (e.parameter.writeKey || '').trim(); // optional
  // If you want, enforce a secret: if(writeKey !== 'YOUR_SECRET') return _resp({error:'forbidden'}, 403);

  if (!league || !e.postData || !e.postData.contents) {
    return _resp({error:'missing params'}, 400);
  }
  let payload;
  try { payload = JSON.parse(e.postData.contents); }
  catch { return _resp({error:'invalid json'}, 400); }

  const sh = _sheet();
  const row = _findRow(sh, league);
  const now = new Date();
  const json = JSON.stringify(payload);

  if (row === -1) {
    sh.appendRow([league, now, json]);
  } else {
    sh.getRange(row,2,1,2).setValues([[now, json]]);
  }
  return _resp({ok:true, updatedAt: now});
}

function _resp(obj, status) {
  const out = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  const response = out;
  if (status) {
    response.setHeader && response.setHeader('Access-Control-Allow-Origin', '*');
    return response.setStatusCode(status);
  }
  response.setHeader && response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader && response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader && response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  return response;
}
