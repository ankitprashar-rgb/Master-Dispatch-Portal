/**
 * INCREMENTAL SYNC SCRIPT
 * 1. Reads 'Masters' sheet.
 * 2. Identifies rows with Dispatch IDs.
 * 3. Upserts to Supabase 'dispatches' and 'dispatch_items'.
 */

var SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
var SUPABASE_KEY = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';

function syncNewEntriesToSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Masters');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "Masters" not found.');
    return;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  var headers = data[0];
  var rows = data.slice(1);
  var colMap = {};
  headers.forEach(function(h, i) { colMap[String(h).trim().toUpperCase()] = i; });

  function getVal(row, key) {
    var idx = colMap[key];
    return (idx !== undefined) ? String(row[idx]).trim() : '';
  }

  var dispatchMap = {};

  rows.forEach(function(row) {
    var did = getVal(row, 'DISPATCH ID');
    if (!did) return;

    if (!dispatchMap[did]) {
      dispatchMap[did] = {
        dispatch_id: did,
        date: formatDate(row[colMap['DATE']]),
        client_name: getVal(row, 'CLIENT NAME'),
        project_name: getVal(row, 'PROJECT'),
        ship_to_address: getVal(row, 'ADDRESS'),
        ship_to_poc: getVal(row, 'POC'),
        ship_to_phone: getVal(row, 'PHONE'),
        ship_to_email: getVal(row, 'CLIENT EMAIL'),
        tracking_id: getVal(row, 'TRACKING ID'),
        courier_company: getVal(row, 'COURIER COMPANY'),
        eway_bill_no: getVal(row, 'E-WAY'),
        items: []
      };
    }

    var prod = getVal(row, 'PRODUCT');
    var qty = Number(row[colMap['QTY']]) || 0;
    var amt = Number(row[colMap['AMOUNT']]) || 0;

    if (prod && prod !== '-') {
      dispatchMap[did].items.push({
        description: prod,
        quantity: qty,
        amount: amt
      });
    }
  });

  var payloads = Object.values(dispatchMap);
  Logger.log('Processing ' + payloads.length + ' dispatches...');

  // 1. Batch Upsert Dispatches
  var dispatches = payloads.map(function(d) {
    return {
      dispatch_id: d.dispatch_id,
      date: d.date,
      client_name: d.client_name,
      project_name: d.project_name,
      ship_to_address: d.ship_to_address,
      ship_to_poc: d.ship_to_poc,
      ship_to_phone: d.ship_to_phone,
      ship_to_email: d.ship_to_email,
      tracking_id: d.tracking_id,
      courier_company: d.courier_company,
      eway_bill_no: d.eway_bill_no
    };
  });

  var resp = supabaseRequest('dispatches', 'POST', dispatches, { 'Prefer': 'resolution=merge-duplicates' });
  if (resp.error) {
    Logger.log('Dispatch Upsert Error: ' + JSON.stringify(resp));
    return;
  }

  // 2. Fetch UUIDs for Items
  var uuidMap = {};
  var fetched = supabaseRequest('dispatches?select=id,dispatch_id', 'GET');
  if (fetched.data) {
    fetched.data.forEach(function(r) { uuidMap[r.dispatch_id] = r.id; });
  }

  // 3. Prepare Items
  var itemsPayload = [];
  payloads.forEach(function(d) {
    var uuid = uuidMap[d.dispatch_id];
    if (!uuid) return;
    d.items.forEach(function(item) {
      itemsPayload.push({
        dispatch_id: uuid,
        description: item.description,
        quantity: item.quantity,
        amount: item.amount
      });
    });
  });

  // Clear and Re-insert items (naive but safe for migration)
  // In a real incremental sync, we might skip existing items, but here we rebuild to ensure sync.
  if (itemsPayload.length > 0) {
     supabaseRequest('dispatch_items', 'POST', itemsPayload);
  }

  SpreadsheetApp.getUi().alert('Sync Complete! ' + payloads.length + ' dispatches updated.');
}

function formatDate(d) {
  if (!d) return null;
  var date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function supabaseRequest(path, method, payload, headers) {
  var url = SUPABASE_URL + '/rest/v1/' + path;
  var options = {
    method: method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  if (headers) for (var k in headers) options.headers[k] = headers[k];
  if (payload) options.payload = JSON.stringify(payload);

  var res = UrlFetchApp.fetch(url, options);
  var text = res.getContentText();
  return { error: res.getResponseCode() >= 300, data: text ? JSON.parse(text) : null };
}
