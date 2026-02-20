/**
 * MIGRATION UPLOAD SCRIPT (ROBUST + IDEMPOTENT)
 * 1. Reads 'Masters_Normalized_Verify'.
 * 2. Maps columns dynamically.
 * 3. Upserts Dispatches.
 * 4. *CLEARS* existing items for these dispatches (Prevent Duplicates).
 * 5. Inserts new Dispatch Items.
 */

var SUPABASE_URL = 'YOUR_SUPABASE_URL';
var SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

function runMigrationUpload() {
  if (SUPABASE_URL.includes('YOUR_')) {
    SpreadsheetApp.getUi().alert('Please set SUPABASE_URL and KEY in the script first!');
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Masters_Normalized_Verify');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "Masters_Normalized_Verify" not found.');
    return;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    SpreadsheetApp.getUi().alert('No data found in sheet.');
    return;
  }

  var headers = data[0];
  var rows = data.slice(1);
  
  // 1. DYNAMIC HEADER MAPPING
  var map = createHeaderMap(headers);
  if (map['DISPATCH ID'] === undefined || map['PRODUCT'] === undefined) {
    SpreadsheetApp.getUi().alert('Error: Missing "Dispatch ID" or "Product" column.');
    return;
  }

  // 2. PROCESS ROWS
  var dispatchMap = {}; 

  rows.forEach(function(row) {
    var rawDid = getColVal(row, map, 'DISPATCH ID');
    var did = String(rawDid).trim();
    if (!did) return;

    if (!dispatchMap[did]) {
      dispatchMap[did] = {
        dispatch_id: did,
        legacy_created_at: getColVal(row, map, 'TIMESTAMP'),
        date: formatDateForSupabase(getColVal(row, map, 'DATE')),
        client_name: String(getColVal(row, map, 'CLIENT NAME')).trim(),
        ship_to_address: String(getColVal(row, map, 'ADDRESS')).trim(),
        ship_to_poc: String(getColVal(row, map, 'POC')).trim(),
        ship_to_phone: String(getColVal(row, map, 'PHONE')).trim(),
        ship_to_email: String(getColVal(row, map, 'CLIENT EMAIL')).trim(),
        project_name: String(getColVal(row, map, 'PROJECT')).trim(),
        
        // Tracking / Docs
        eway_bill_no: String(getColVal(row, map, ['E-WAY', 'EWAY'])).trim(),
        shipping_label_url: String(getColVal(row, map, ['SHIPPING LABEL', 'LABEL'])).trim(),
        delivery_challan_url: String(getColVal(row, map, ['DELIVERY CHALLAN', 'CHALLAN'])).trim(),
        tracking_id: String(getColVal(row, map, 'TRACKING ID')).trim(),
        courier_company: String(getColVal(row, map, 'COURIER COMPANY')).trim(),
        courier_slip_url: String(getColVal(row, map, ['COURIER SLIP LINK', 'SLIP', 'URL'])).trim(),
        email_sent_at: formatDateForSupabase(getColVal(row, map, 'EMAIL SENT AT'), true),
        
        items: []
      };
    }

    // Add Item
    var prod = getColVal(row, map, 'PRODUCT');
    var qty = getColVal(row, map, 'QTY');
    var amt = getColVal(row, map, 'AMOUNT');
    
    if (prod && prod !== '-') {
      dispatchMap[did].items.push({
        description: String(prod).trim(),
        quantity: Number(qty) || 0,
        amount: Number(amt) || 0
      });
    }
  });

  // 3. PREPARE DISPATCHES
  var dispatchesPayload = [];
  var dispatchIds = Object.keys(dispatchMap);
  
  dispatchIds.forEach(function(did) {
    var d = dispatchMap[did];
    var payload = {
      dispatch_id: d.dispatch_id,
      date: d.date,
      client_name: d.client_name,
      project_name: d.project_name,
      ship_to_address: d.ship_to_address,
      ship_to_poc: d.ship_to_poc,
      ship_to_phone: d.ship_to_phone,
      ship_to_email: d.ship_to_email,
      eway_bill_no: d.eway_bill_no,
      shipping_label_url: d.shipping_label_url,
      delivery_challan_url: d.delivery_challan_url,
      tracking_id: d.tracking_id,
      courier_company: d.courier_company,
      courier_slip_url: d.courier_slip_url,
      email_sent_at: d.email_sent_at
    };
    if (d.legacy_created_at) {
       try { payload.legacy_created_at = new Date(d.legacy_created_at).toISOString(); } catch(e) {}
    }
    dispatchesPayload.push(payload);
  });

  // 4. UPLOAD DISPATCHES (Batch Upsert)
  Logger.log('Uploading ' + dispatchesPayload.length + ' dispatches...');
  var chunk = 100;
  for (var i=0; i<dispatchesPayload.length; i+=chunk) {
    var sub = dispatchesPayload.slice(i, i+chunk);
    var response = supabaseRest('dispatches', 'POST', sub, { 'Prefer': 'resolution=merge-duplicates' });
    if (response.error) Logger.log('Error uploading batch ' + i + ': ' + JSON.stringify(response));
  }

  // 5. FETCH UUIDs
  var uuidMap = {}; 
  var allDispatches = fetchAllDispatches(); 
  allDispatches.forEach(function(rec) {
    if (rec.dispatch_id) uuidMap[rec.dispatch_id] = rec.id;
  });

  // --- NEW: DELETE EXISTING ITEMS TO PREVENT DUPLICATES ---
  var uuidsToProcess = [];
  dispatchIds.forEach(function(did) {
     if(uuidMap[did]) uuidsToProcess.push(uuidMap[did]);
  });
  
  if (uuidsToProcess.length > 0) {
    Logger.log('Clearing existing items for ' + uuidsToProcess.length + ' dispatches...');
    // Delete in chunks to avoid URL length issues
    var delChunk = 50; 
    for (var i=0; i<uuidsToProcess.length; i+=delChunk) {
      var batch = uuidsToProcess.slice(i, i+delChunk);
      // Construct filter: dispatch_id=in.(id1,id2,id3)
      var filter = 'dispatch_id=in.(' + batch.join(',') + ')';
      // Call DELETE
      var res = supabaseRest('dispatch_items?' + filter, 'DELETE');
      if (res.error) Logger.log('Error clearing items: ' + JSON.stringify(res));
    }
  }
  // -------------------------------------------------------

  // 6. UPLOAD ITEMS
  var itemsPayload = [];
  dispatchIds.forEach(function(did) {
    var uuid = uuidMap[did];
    if (!uuid) return;
    
    var items = dispatchMap[did].items;
    items.forEach(function(item) {
      itemsPayload.push({
        dispatch_id: uuid,
        description: item.description,
        quantity: item.quantity,
        amount: item.amount
      });
    });
  });

  if (itemsPayload.length > 0) {
    Logger.log('Uploading ' + itemsPayload.length + ' items...');
    var chunkSize = 500;
    for (var i = 0; i < itemsPayload.length; i += chunkSize) {
      var chunk = itemsPayload.slice(i, i + chunkSize);
      var res = supabaseRest('dispatch_items', 'POST', chunk);
      if (res.error) Logger.log('Error uploading items chunk ' + i);
    }
  }

  SpreadsheetApp.getUi().alert('Migration Complete!');
}

// --- HELPER FUNCTIONS ---

function createHeaderMap(headerRow) {
  var map = {};
  headerRow.forEach(function(h, i) {
    var key = String(h).trim().toUpperCase();
    map[key] = i;
  });
  return map;
}

function getColVal(row, map, keyOrKeys) {
  var idx = undefined;
  if (Array.isArray(keyOrKeys)) {
    for (var i=0; i<keyOrKeys.length; i++) {
      var k = String(keyOrKeys[i]).trim().toUpperCase();
      if (map[k] !== undefined) {
        idx = map[k];
        break;
      }
    }
  } else {
    idx = map[String(keyOrKeys).trim().toUpperCase()];
  }
  
  if (idx !== undefined) return row[idx];
  return '';
}

function formatDateForSupabase(dateObj, isTimestamp) {
  if (!dateObj) return null;
  var d = new Date(dateObj);
  if (isNaN(d.getTime())) return null; 
  if (isTimestamp) return d.toISOString();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function fetchAllDispatches() {
  var url = SUPABASE_URL + '/rest/v1/dispatches?select=id,dispatch_id';
  var all = [];
  var offset = 0;
  var limit = 1000;
  
  while (true) {
    var options = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Range': offset + '-' + (offset + limit - 1)
      }
    };
    var res = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(res.getContentText());
    if (json.length === 0) break;
    all = all.concat(json);
    if (json.length < limit) break;
    offset += limit;
  }
  return all;
}

function supabaseRest(tableAndData, method, payload, extraHeaders) {
  // tableAndData can contain query params, e.g. "dispatch_items?dispatch_id=..."
  var url = SUPABASE_URL + '/rest/v1/' + tableAndData;
  var headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  };
  
  if (extraHeaders) {
    for (var k in extraHeaders) headers[k] = extraHeaders[k];
  }

  var options = {
    method: method,
    headers: headers,
    muteHttpExceptions: true
  };

  if (payload) {
    options.payload = JSON.stringify(payload);
  }

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  var text = response.getContentText();
  
  // 204 No Content is common for DELETE
  if (code >= 200 && code < 300) {
    return { error: false, data: text ? JSON.parse(text) : null };
  } else {
    return { error: true, code: code, msg: text };
  }
}
