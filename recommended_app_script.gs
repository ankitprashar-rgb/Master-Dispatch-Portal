/**
 * MASTER DISPATCH BACKEND V3 (Consolidated)
 */

var SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
var SUPABASE_KEY = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';

function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('🚀 Master Dispatch')
        .addItem('Sync to Portal (Supabase)', 'api_syncSheetToSupabase_v3')
        .addToUi();
  } catch (e) {
    Logger.log('UI not available: ' + e.message);
  }
}

function doGet(e) {
  var data = getMasterData();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getMasterData() {
  var SHEET_ID = '1SB1kikWg5B20wE47RBZHsuqLvKFj1wN2XY_mEDpI58g'; // Client DB
  var MASTER_SHEET_ID = '1WVh5Nc_wtBfrFQrJCno63mQXd47oJZjgU27jTApwjJY'; // Masters Tracking Sheet
  
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    
    // --- STEP 1: READ CLIENT DETAILS ---
    var clientDetailsMap = {};
    var sheetClients = ss.getSheetByName('Clients');
    if (sheetClients) {
      var cData = sheetClients.getDataRange().getValues();
      if (cData.length > 1) {
        var cHeaders = cData[0].map(function(h) { return String(h).toLowerCase().trim(); });
        var idxCName = cHeaders.indexOf('client name');
        var idxPoc   = cHeaders.indexOf('poc name');
        if (idxPoc === -1) idxPoc = cHeaders.indexOf('poc');
        var idxPhone = cHeaders.indexOf('phone');
        var idxAddr  = cHeaders.indexOf('address');
        if (idxAddr === -1) idxAddr = cHeaders.indexOf('details');
        var idxEmail = cHeaders.indexOf('email');

        if (idxCName > -1) {
           var cRows = cData.slice(1);
           cRows.forEach(function(r) {
             var nm = String(r[idxCName]).trim();
             if (nm) {
               clientDetailsMap[nm] = {
                 poc:     (idxPoc > -1)   ? String(r[idxPoc] || '').trim() : '',
                 phone:   (idxPhone > -1) ? String(r[idxPhone] || '').trim() : '',
                 address: (idxAddr > -1)  ? String(r[idxAddr] || '').trim() : '',
                 email:   (idxEmail > -1) ? String(r[idxEmail] || '').trim() : ''
               };
             }
           });
        }
      }
    }
    
    // --- STEP 2: READ INSTALLERS ---
    var installersList = [];
    var sheetInstallers = ss.getSheetByName('Installers');
    if (sheetInstallers) {
      var iData = sheetInstallers.getDataRange().getValues();
      if (iData.length > 1) {
        var iHeaders = iData[0].map(function(h) { return String(h).toLowerCase().trim(); });
        var idxIName = iHeaders.indexOf('installer name');
        var idxCity  = iHeaders.indexOf('city');
        var idxAddr  = iHeaders.indexOf('address');
        var idxPoc   = iHeaders.indexOf('poc');
        var idxPhone = iHeaders.indexOf('phone');
        var idxEmail = iHeaders.indexOf('email');

        var iRows = iData.slice(1);
        iRows.forEach(function(r) {
          if (r[idxIName]) {
            installersList.push({
              name:    String(r[idxIName]).trim(),
              city:    (idxCity > -1)  ? String(r[idxCity] || '').trim() : '',
              address: (idxAddr > -1)  ? String(r[idxAddr] || '').trim() : '',
              poc:     (idxPoc > -1)   ? String(r[idxPoc] || '').trim() : '',
              phone:   (idxPhone > -1) ? String(r[idxPhone] || '').trim() : '',
              email:   (idxEmail > -1) ? String(r[idxEmail] || '').trim() : ''
            });
          }
        });
      }
    }

    // --- STEP 3: READ PROJECTS & ITEMS ---
    var SHEET_NAME = 'Project_WorkOrder';
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { clients: [], installers: installersList, error: 'Sheet "' + SHEET_NAME + '" not found' };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { clients: [], installers: installersList };
    
    var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
    var rows = data.slice(1);
    
    var idxClient = headers.indexOf('client name');
    var idxProject = headers.indexOf('project name');
    var idxProduct = headers.indexOf('product name');
    var idxQty = headers.indexOf('master qty');
    var idxPrice = headers.indexOf('unit price');
    if (idxPrice === -1) idxPrice = headers.indexOf('unit price (₹)');
    
    var clientsMap = {};
    
    rows.forEach(function(row) {
      var clientName = row[idxClient];
      var projectName = row[idxProject];
      
      if (!clientName || !projectName) return;
      clientName = String(clientName).trim();
      projectName = String(projectName).trim();
      
      if (!clientsMap[clientName]) {
        var details = clientDetailsMap[clientName] || {};
        clientsMap[clientName] = { 
          name: clientName,
          address: details.address || '',
          poc: details.poc || '',
          phone: details.phone || '',
          email: details.email || '',
          projectsMap: {} 
        };
      }
      
      var clientObj = clientsMap[clientName];
      if (!clientObj.projectsMap[projectName]) {
        clientObj.projectsMap[projectName] = { name: projectName, items: [] };
      }
      
      var item = {
        desc: row[idxProduct] ? String(row[idxProduct]).trim() : '',
        masterQty: row[idxQty] || 0,
        rate: row[idxPrice] || 0
      };
      
      if (item.desc) {
         clientObj.projectsMap[projectName].items.push(item);
      }
    });
    
    var clientList = Object.keys(clientsMap).map(function(cName) {
      var c = clientsMap[cName];
      var projects = Object.keys(c.projectsMap).map(function(pName) { return c.projectsMap[pName]; });
      projects.sort(function(a, b) { return a.name.localeCompare(b.name); });
      return {
        name: c.name,
        address: c.address,
        poc: c.poc,
        phone: c.phone,
        email: c.email,
        projects: projects
      };
    });
    
    clientList.sort(function(a, b) { return a.name.localeCompare(b.name); });
    
    return { clients: clientList, installers: installersList };
    
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * Handle CORS Preflight Requests
 */
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Handle POST Actions: OCR, Create Dispatch, Update Dispatch
 */
function doPost(e) {
  // If the payload is text/plain but actually JSON, parse it
  var postData = {};
  try {
    postData = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSON payload' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var action = postData.action;

  if (action === 'ocr') {
    // Try DocAI first
    var res = api_parseInvoice_docai(postData.filename, postData.dataUrl);
    
    // Fallback to Vision if DocAI failed OR returned fewer than 2 items (often noise)
    if (!res.ok || (!res.items || res.items.length < 2)) {
       var visionRes = api_parseInvoice(postData.filename, postData.dataUrl);
       // If vision found more items, or if DocAI failed completely, use vision result
       if ((visionRes.items && visionRes.items.length > (res.items ? res.items.length : 0)) || !res.ok) {
         res = visionRes;
       }
    }
    
    // Final fallback to Drive OCR for tough images/PDFs
    if (!res.ok || (!res.items?.length && !res.text)) {
      var legacyRes = handleOCR(postData);
      if (legacyRes.status === 'success') {
        res = { ok: true, ...legacyRes };
      }
    }

    // EXTRACTION: Tracking / Candidates (LEGACY STYLE)
    if (res.ok && res.text) {
      var info = extractTrackingInfo(res.text);
      res.detectedTrackingId = info.trackingId;
      res.detectedCourier = info.courier;
      res.candidates = info.candidates || [];
    }

    // Unified Response Standardization
    if (res.ok) {
      res.status = 'success';
      res.ok = true;
      res.ocr_method = res.ocr_method || 'vision_v1';
    }

    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'notify') {
    return ContentService.createTextOutput(JSON.stringify(handleNotify(postData)))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'update_dispatch') {
    return ContentService.createTextOutput(JSON.stringify(handleUpdateDispatch(postData.dispatchId, postData.data)))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'create_dispatch') {
    return ContentService.createTextOutput(JSON.stringify(handleCreateDispatch(postData.data)))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send Email Notification via GmailApp
 */
function handleNotify(postData) {
  try {
    var d = postData.data || {};
    var to = d.client_email || '';
    
    // Fallback if client_email is somehow missing
    if (!to && d.dispatch_data && d.dispatch_data.clientEmail) {
      to = d.dispatch_data.clientEmail;
    }
    
    if (!to) {
      return { status: 'error', message: 'No destination email provided' };
    }
    
    var dispatchId = d.dispatch_id || '';
    var project = d.project_name || '';
    var clientName = d.client_name || '';
    var poc = d.ship_to_poc || '';
    var dateKey = d.date ? d.date.split('T')[0] : '';
    var trackingId = d.tracking_id || '';
    var courier = d.courier_company || '';
    var slipUrl = d.courier_slip_url || '';
    var address = d.ship_to_address || '';

    var subject = 'Dispatch Update – ' + dispatchId + (project ? (' – ' + project) : '');

    try {
      // Create HTML template from CustomerEmailTemplate.html
      var tpl = HtmlService.createTemplateFromFile('CustomerEmailTemplate');
      tpl.clientName = clientName || poc || 'Customer';
      tpl.dispatchId = dispatchId;
      tpl.projectName = project;
      tpl.dateKey = dateKey;
      tpl.courier = courier;
      tpl.trackingId = trackingId;
      tpl.shipLabelUrl = d.shipping_label_url || '';
      tpl.docketUrl = slipUrl || '';
      
      var htmlBody = tpl.evaluate().getContent();

      var options = {
        name: 'IDE Autoworks Operations',
        cc: 'ankit@ideautoworks.com',
        replyTo: 'operations@ideautoworks.com',
        htmlBody: htmlBody
      };

      // Send HTML Email
      GmailApp.sendEmail(to, subject, 'Please view this email in a modern email client.', options);
      
    } catch (tplErr) {
      Logger.log("HTML Template parsing failed, falling back to plain text email: " + tplErr);
      
      // Fallback to plain text if the template file isn't uploaded in Apps Script
      var greeting = poc ? ('Hi ' + poc + ',') : 'Hi,';
      var body =
        greeting + '\n\n' +
        'Your shipment from IDE Autoworks has been dispatched.\n\n' +
        'Dispatch Details:\n' +
        '• Dispatch ID: ' + dispatchId + '\n' +
        (dateKey ? ('• Date: ' + dateKey + '\n') : '') +
        (clientName ? ('• Client: ' + clientName + '\n') : '') +
        (project ? ('• Project: ' + project + '\n') : '') +
        (address ? ('• Delivery Address: ' + address + '\n') : '') +
        '\n' +
        'Tracking Details:\n' +
        (courier    ? ('• Courier: ' + courier + '\n') : '') +
        (trackingId ? ('• Tracking ID: ' + trackingId + '\n') : '') +
        (slipUrl    ? ('• Courier Slip: ' + slipUrl + '\n') : '') +
        '\n' +
        'You can use the tracking ID on the courier website / portal to follow the shipment status.\n\n' +
        'For any support, please reach out to us at operations@ideautoworks.com or call +91 9717498343.\n\n' +
        'Regards,\n' +
        'IDE Autoworks Operations Team';

      var options = {
        name: 'IDE Autoworks Operations',
        cc: 'ankit@ideautoworks.com',
        replyTo: 'operations@ideautoworks.com'
      };

      GmailApp.sendEmail(to, subject, body, options);
    }
    
    return { status: 'success', message: 'Email sent to ' + to };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

/**
 * Perform OCR using Google Drive
 * Requires "Google Drive API" enabled in Services
 */
function handleOCR(params) {
  try {
    var dataUrl = params.dataUrl;
    var filename = params.filename || "ocr_upload";
    
    // Extract base64
    var contentType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    var base64Data = dataUrl.split(',')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, filename);
    
    // Upload to Drive with OCR enabled
    var resource = {
      title: filename,
      mimeType: contentType
    };
    
    // Use Drive API v2 or v3
    var file;
    try {
      // Try Drive API v2
      if (typeof Drive.Files.insert === 'function') {
        file = Drive.Files.insert(resource, blob, { ocr: true });
      } else if (typeof Drive.Files.create === 'function') {
        // Try Drive API v3 (though ocr parameters differ slightly, this is a fallback attempt)
        file = Drive.Files.create(resource, blob, { ocrLanguage: 'en' });
      } else {
         throw new Error("Drive API Advanced Service is not enabled.");
      }
    } catch (e) {
      throw new Error("Drive API Error: " + e.message + ". Please ensure 'Drive API' is added in the 'Services' (+ button) on the left sidebar of the Apps Script Editor.");
    }
    
    // Read the text from the resulting Doc (Drive OCR creates a Doc)
    var doc = DocumentApp.openById(file.id);
    var text = doc.getBody().getText();
    
    // Cleanup: Delete the temp doc
    DriveApp.getFileById(file.id).setTrashed(true);
    
    // Heuristic extraction (Regex for Tracking IDs, Skus, etc.)
    var info = extractTrackingInfo(text);
    
    return { 
      status: 'success', 
      text: text, 
      detectedTrackingId: info.trackingId,
      detectedCourier: info.courier
    };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

function extractTrackingInfo(text) {
  var trackingId = null;
  var courier = null;
  var candSet = {};
  
  var lines = text.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].trim();
    if (!l) continue;
    // Legacy: Find any alphanumeric string with 8+ chars
    var matches = l.match(/[A-Z0-9\-]{8,}/gi) || [];
    for (var j = 0; j < matches.length; j++) {
      var t = matches[j].replace(/\s+/g, '');
      candSet[t] = true;
    }
  }

  var candidates = [];
  for (var k in candSet) { candidates.push(k); }
  candidates.sort(function(a, b) { return b.length - a.length; });
  // 1. Look for explicit labels like "AWB No", "Docket", etc. near a candidate
  var labelMatches = text.match(/(AWB|AIRWAY BILL|DOCKET|TRACKING|CONS\.? NO|FORM NO|NO)\s*(?:NO\.?|#|[:\.#-])*\s*([A-Z0-9\-]{7,})/i);
  if (labelMatches && labelMatches[2]) {
    trackingId = labelMatches[2].replace(/\s+/g, '');
  }

  // 2. Courier Detection
  var tUpper = text.toUpperCase();
  var known = [
    { k: 'PROFESSIONAL', name: 'The Professional Couriers' },
    { k: 'GGN', name: 'The Professional Couriers' }, // GGN is common for their Gurgaon branch
    { k: 'TRACKON', name: 'Trackon' },
    { k: 'BLUEDART', name: 'BlueDart' },
    { k: 'BLUE DART', name: 'BlueDart' },
    { k: 'DELHIVERY', name: 'Delhivery' },
    { k: 'DTDC', name: 'DTDC' },
    { k: 'AMAZON', name: 'Amazon' },
    { k: 'XPRESSBEES', name: 'XpressBees' },
    { k: 'EKART', name: 'Ekart' },
    { k: 'SHADOWFAX', name: 'Shadowfax' }
  ];

  for (var n = 0; n < known.length; n++) {
    if (tUpper.indexOf(known[n].k) !== -1) {
      courier = known[n].name;
      break;
    }
  }

  return { trackingId: trackingId, courier: courier, candidates: candidates.slice(0, 10) };
}

/**
 * Handle Creating Dispatch in Google Sheets
 */
/**
 * 3. Sync Legacy Sheet Data TO Supabase
 * Can be triggered from the "Master Dispatch" menu in the Google Sheet
 */
function api_syncSheetToSupabase_v3() {
  try {
    var MASTER_SHEET_ID = '1WVh5Nc_wtBfrFQrJCno63mQXd47oJZjgU27jTApwjJY';
    var TAB_NAME = 'Masters_Normalized_Verify';
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var sh = ss.getSheetByName(TAB_NAME);
    if (!sh) {
      logMsg('Error: "' + TAB_NAME + '" sheet not found.');
      return;
    }

    var data = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    if (data.length < 2) {
      logMsg('Error: Sheet is empty.');
      return;
    }

    var headers = data[0].map(function(h) { return String(h).trim().toUpperCase(); });
    var rows = data.slice(1);
    
    // Exact mapping based on your sheet structure
    function findIdx(keywords) {
      for (var k = 0; k < keywords.length; k++) {
        var key = keywords[k].toUpperCase();
        var idx = headers.indexOf(key);
        if (idx > -1) return idx;
      }
      return -1;
    }

    var idxDate    = findIdx(['DATE', 'TIMESTAMP']);
    var idxClient  = findIdx(['CLIENT NAME', 'CLIENT']);
    var idxAddress = findIdx(['ADDRESS', 'LOCATION', 'DELIVERY ADDRESS']);
    var idxPOC     = findIdx(['POC', 'CONTACT PERSON', 'POC NAME']);
    var idxPhone   = findIdx(['PHONE', 'MOBILE', 'PHONE NO']);
    var idxEmail   = findIdx(['CLIENT EMAIL', 'EMAIL']);
    var idxProject = findIdx(['PROJECT', 'WORKORDER']);
    var idxProd    = findIdx(['PRODUCT', 'DESCRIPTION', 'ITEM TECHNICAL DESCRIPTION']);
    var idxQty     = findIdx(['QTY', 'QUANTITY', 'UNITS']);
    var idxAmt     = findIdx(['AMOUNT', 'PRICE', 'RATE']);
    var idxEway    = findIdx(['E-WAY', 'EWAY BILL']);
    var idxDID     = findIdx(['DISPATCH ID', 'ID', 'DID']);
    var idxTrack   = findIdx(['TRACKING ID', 'AWB']);
    var idxCourier = findIdx(['COURIER COMPANY', 'COURIER']);
    var idxSlip    = findIdx(['COURIER SLIP LINK', 'SLIP LINK']);

    if (idxDID === -1) {
      logMsg('Error: Could not find "Dispatch ID" column. Found: ' + headers.join('|'));
      return;
    }

    var dispatchMap = {};
    var currentDID = null;
    var itemsCount = 0;

    rows.forEach(function(row) {
      var did = String(row[idxDID] || '').trim();
      if (did && did !== '-') currentDID = did;
      if (!currentDID) return;

      if (!dispatchMap[currentDID]) {
        dispatchMap[currentDID] = {
          dispatch_id: currentDID,
          date: idxDate > -1 ? formatDateToISO(row[idxDate]) : null,
          client_name: idxClient > -1 ? String(row[idxClient] || '').trim() : 'N/A',
          project_name: idxProject > -1 ? String(row[idxProject] || '').trim() : 'N/A',
          ship_to_address: idxAddress > -1 ? String(row[idxAddress] || '').trim() : '',
          ship_to_poc: idxPOC > -1 ? String(row[idxPOC] || '').trim() : '',
          ship_to_phone: idxPhone > -1 ? String(row[idxPhone] || '').trim() : '',
          ship_to_email: idxEmail > -1 ? String(row[idxEmail] || '').trim() : '',
          tracking_id: idxTrack > -1 ? String(row[idxTrack] || '').trim() : '',
          courier_company: idxCourier > -1 ? String(row[idxCourier] || '').trim() : '',
          eway_bill_no: idxEway > -1 ? String(row[idxEway] || '').trim() : 'NO',
          items: []
        };
      }

      var prodDesc = idxProd > -1 ? String(row[idxProd] || '').trim() : '';
      if (prodDesc && prodDesc !== '-' && prodDesc !== '') {
        // Grouping logic within a dispatch to prevent duplicates from multiple sheet rows
        var existingItem = dispatchMap[currentDID].items.find(function(it) {
          return it.desc.toUpperCase() === prodDesc.toUpperCase();
        });

        var q = idxQty > -1 ? Number(row[idxQty]) || 0 : 0;
        var a = idxAmt > -1 ? Number(row[idxAmt]) || 0 : 0;

        if (existingItem) {
          existingItem.qty += q;
          existingItem.amount += a;
        } else {
          dispatchMap[currentDID].items.push({
            desc: prodDesc,
            qty: q,
            amount: a
          });
        }
        itemsCount++;
      }
    });

    var payloads = Object.values(dispatchMap);
    if (payloads.length === 0) {
      logMsg('Info: Found no dispatches to sync.');
      return;
    }

    // --- STEP 1: CLEAN RELOAD (Deduplication) ---
    var idsToClean = payloads.map(function(p) { return p.dispatch_id; });
    idsToClean.forEach(function(id) {
       supabaseRestCall(SUPABASE_URL, SUPABASE_KEY, 'dispatches?dispatch_id=eq.' + encodeURIComponent(id), 'DELETE');
    });

    // --- STEP 2: PREPARE DISPATCHES ---
    var dispatches = payloads.map(function(d) {
      var totals = d.items.reduce(function(acc, item) {
        acc.qty += item.qty;
        acc.amount += item.amount;
        return acc;
      }, { qty: 0, amount: 0 });

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
        eway_bill_no: d.eway_bill_no,
        dispatch_data: { items: d.items, totals: totals }
      };
    });

    // --- STEP 3: INSERT DISPATCHES ---
    // We use return=representation to get the internal UUID IDs back
    var resp = supabaseRestCall(SUPABASE_URL, SUPABASE_KEY, 'dispatches', 'POST', dispatches, { 
      'Prefer': 'resolution=merge-duplicates,return=representation' 
    });
    
    if (resp.error) {
      logMsg('Error inserting dispatches: ' + JSON.stringify(resp.data));
      return;
    }

    // --- STEP 3: INSERT RELATIONAL ITEMS ---
    // Map the internal UUIDs to our sheet-side Dispatch IDs
    var uuidMap = {};
    if (resp.data && Array.isArray(resp.data)) {
      resp.data.forEach(function(r) {
        uuidMap[r.dispatch_id] = r.id; 
      });
    }

    var itemsPayload = [];
    payloads.forEach(function(p) {
      var parentUuid = uuidMap[p.dispatch_id];
      if (!parentUuid) return;
      
      p.items.forEach(function(item) {
        itemsPayload.push({
          dispatch_id: parentUuid,
          description: item.desc,
          quantity: item.qty,
          amount: item.amount
        });
      });
    });

    if (itemsPayload.length > 0) {
      var itemResp = supabaseRestCall(SUPABASE_URL, SUPABASE_KEY, 'dispatch_items', 'POST', itemsPayload);
      if (itemResp.error) {
        logMsg('Warning: Items sync had issues: ' + JSON.stringify(itemResp.data));
      }
    }

    logMsg('Sync Successful! Verified ' + payloads.length + ' dispatches and ' + itemsCount + ' manifest items from "Masters_Normalized_Verify".');

  } catch (err) {
    logMsg('Critical Sync Error: ' + String(err));
  }
}

function logMsg(msg) {
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch(e) {}
}

/**
 * 4. Handle Creating Dispatch in Google Sheets
 */
function handleCreateDispatch(data) {
  try {
    var MASTER_SHEET_ID = '1WVh5Nc_wtBfrFQrJCno63mQXd47oJZjgU27jTApwjJY';
    var TAB_NAME = 'Masters_Normalized_Verify';
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var sh = ss.getSheetByName(TAB_NAME);
    if (!sh) return { status: 'error', message: TAB_NAME + ' sheet not found' };
    
    var lastCol = sh.getLastColumn();
    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var colMap = {};
    header.forEach(function(h, i) { colMap[String(h).trim().toUpperCase()] = i; });
    
    var items = [];
    // Handle both new data format and old
    if (data.dispatch_data && data.dispatch_data.items) {
      items = data.dispatch_data.items;
    } else if (data.items) {
      items = data.items;
    }
    
    var rows = [];
    items.forEach(function(item) {
      var row = new Array(lastCol).fill('');
      
      function set(key, val) {
        if (colMap[key] !== undefined) row[colMap[key]] = val;
      }
      
      set('DATE', data.date);
      set('CLIENT NAME', data.client_name);
      set('PROJECT', data.project_name);
      set('ADDRESS', data.ship_to_address);
      set('POC', data.ship_to_poc);
      set('PHONE', data.ship_to_phone);
      set('CLIENT EMAIL', data.ship_to_email);
      set('DISPATCH ID', data.dispatch_id);
      set('PRODUCT', item.desc || item.description);
      set('QTY', item.qty || item.quantity);
      set('AMOUNT', item.amount);
      
      rows.push(row);
    });
    
    if (rows.length > 0) {
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, lastCol).setValues(rows);
    }
    
    return { status: 'success', rowsAdded: rows.length };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

/**
 * Update tracking in Google Sheets for an existing dispatch
 */
function handleUpdateDispatch(dispatchId, data) {
  try {
    var TAB_NAME = 'Masters_Normalized_Verify';
    var MASTER_SHEET_ID = '1WVh5Nc_wtBfrFQrJCno63mQXd47oJZjgU27jTApwjJY';
    var ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    var sh = ss.getSheetByName(TAB_NAME);
    if (!sh) return { status: 'error', message: TAB_NAME + ' sheet not found' };
    
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var colMap = {};
    header.forEach(function(h, i) { colMap[String(h).trim().toUpperCase()] = i; });
    
    var dataVals = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var dIdx = colMap['DISPATCH ID'];
    
    for (var r = 0; r < dataVals.length; r++) {
      if (String(dataVals[r][dIdx]).trim() === String(dispatchId).trim()) {
        var rowNum = r + 2;
        
        function update(key, val) {
          if (colMap[key] !== undefined && val !== undefined) {
             sh.getRange(rowNum, colMap[key] + 1).setValue(val);
          }
        }
        
        if (data.tracking_id) update('TRACKING ID', data.tracking_id);
        if (data.courier_company) update('COURIER COMPANY', data.courier_company);
        if (data.courier_slip_url) update('COURIER SLIP LINK', data.courier_slip_url);
        if (data.email_sent_at) update('EMAIL SENT AT', data.email_sent_at);
        
        return { status: 'success', msg: 'Row updated' };
      }
    }
    return { status: 'error', message: 'Dispatch ID not found in sheet' };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

function formatDateToISO(d) {
  if (!d) return null;
  var date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function supabaseRestCall(url, key, path, method, payload, extraHeaders) {
  var options = {
    method: method,
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  if (extraHeaders) {
    for (var k in extraHeaders) {
      options.headers[k] = extraHeaders[k];
    }
  }
  if (payload) options.payload = JSON.stringify(payload);

  var res = UrlFetchApp.fetch(url + '/rest/v1/' + path, options);
  var code = res.getResponseCode();
  var text = res.getContentText();
  return { error: code >= 300, data: text ? JSON.parse(text) : null };
}

/**
 * Scheduled Function: Check for Pending Dispatches > 2 Days and Alert Team
 * Set this up as a Time-driven trigger (e.g., Daily at 9am)
 */
function checkAndAlertPendingDispatches() {
  var SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';
  
  // Calculate date 48 hours ago
  var twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  var cutoffIso = twoDaysAgo.toISOString();
  
  var path = 'dispatches?email_sent_at=is.null&date=lt.' + encodeURIComponent(cutoffIso) + '&select=*&is_archived=eq.false';
  
  var result = supabaseRestCall(SUPABASE_URL, SUPABASE_ANON_KEY, path, 'GET', null);
  
  if (result.error) {
    Logger.log("Failed to fetch pending dispatches: " + JSON.stringify(result.data));
    return;
  }
  
  var pendingDispatches = result.data || [];
  
  if (pendingDispatches.length === 0) {
    Logger.log("No pending dispatches found older than 48 hours. No email sent.");
    return;
  }
  
  var now = new Date();
  var emailData = pendingDispatches.map(function(d) {
    var dDate = new Date(d.date);
    var diffTime = Math.abs(now - dDate);
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    return {
      id: d.id,
      dispatch_id: d.dispatch_id,
      client_name: d.client_name,
      project_name: d.project_name,
      date: d.date,
      days_pending: diffDays,
      tracking_id: d.tracking_id,
      courier_company: d.courier_company,
      courier_slip_url: d.courier_slip_url
    };
  });
  
  try {
    var tpl = HtmlService.createTemplateFromFile('TeamAlertEmailTemplate');
    tpl.dispatches = emailData;
    var htmlBody = tpl.evaluate().getContent();
    
    var to = 'operations@ideautoworks.com';
    var subject = 'URGENT: ' + emailData.length + ' Pending Customer Dispatch Emails';
    var options = {
      name: 'Dispatch Portal Automations',
      cc: 'ankit@ideautoworks.com,himanshu@ideautoworks.com',
      htmlBody: htmlBody
    };
    
    GmailApp.sendEmail(to, subject, 'Please view this email in an HTML compatible client.', options);
    Logger.log("Successfully sent digest alert for " + emailData.length + " pending items.");
    
  } catch (e) {
    Logger.log("Failed to send alert email: " + e.message);
  }
}

/**
 * DOC AI INVOICE PARSER
 */
function api_parseInvoice_docai(filename, dataUrl) {
  try {
    var props    = PropertiesService.getScriptProperties();
    var project  = props.getProperty('DOCAI_PROJECT_ID');
    var location = props.getProperty('DOCAI_LOCATION') || 'us';
    var procId   = props.getProperty('DOCAI_PROCESSOR_ID');

    if (!project || !procId) {
      return { ok: false, msg: 'Document AI properties missing (DOCAI_PROJECT_ID / DOCAI_PROCESSOR_ID)' };
    }

    var base64 = String(dataUrl).split(',')[1];
    var url = 'https://' + location +
      '-documentai.googleapis.com/v1/projects/' + project +
      '/locations/' + location + '/processors/' + procId + ':process';

    var payload = {
      rawDocument: {
        content: base64,
        mimeType: (filename || '').toLowerCase().indexOf('.pdf') > -1
          ? 'application/pdf'
          : 'image/*'
      }
    };

    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
      },
      muteHttpExceptions: true
    });

    var status = res.getResponseCode();
    var text   = res.getContentText();
    var json = JSON.parse(text);

    if (status !== 200) {
      return { ok: false, msg: 'DocAI Error: ' + text };
    }

    var doc = json.document || (json.documents && json.documents[0]);
    if (!doc) return { ok: false, msg: 'DocAI: no document found' };

    var items = [];
    var entities = doc.entities || [];
    
    function getChild(eObj, typeNames) {
      if (!eObj.properties) return '';
      for (var ti = 0; ti < typeNames.length; ti++) {
        for (var pi = 0; pi < eObj.properties.length; pi++) {
          var prop = eObj.properties[pi];
          if (prop.type === typeNames[ti]) {
            return prop.normalizedValue?.text || prop.mentionText || '';
          }
        }
      }
      return '';
    }

    entities.forEach(function(le) {
      if (le.type === 'line_item' || le.type === 'invoice_line_item') {
        var desc = getChild(le, ['line_item/description', 'invoice_line_item/description']);
        var qty  = getChild(le, ['line_item/quantity', 'invoice_line_item/quantity']);
        var amt  = getChild(le, ['line_item/amount', 'invoice_line_item/amount']);
        
        var qtyNum = Number(qty.replace(/,/g, ''));
        var amtNum = Number(amt.replace(/,/g, ''));

        if (desc.length > 2 || qtyNum || amtNum) {
          items.push({ desc: desc.trim(), qty: qtyNum || 0, amount: amtNum || 0 });
        }
      }
    });

    return { ok: true, items: items, text: doc.text || '' };
  } catch (err) {
    return { ok: false, msg: String(err) };
  }
}

/**
 * VISION OCR PARSER
 */
function api_parseInvoice(filename, dataUrl) {
  try {
    var key = PropertiesService.getScriptProperties().getProperty('VISION_API_KEY');
    if (!key) return { ok: false, msg: 'VISION_API_KEY missing' };

    var base64 = String(dataUrl).split(',')[1];
    var payload = {
      requests: [{
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION' }]
      }]
    };
    var res = UrlFetchApp.fetch('https://vision.googleapis.com/v1/images:annotate?key=' + key, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var json = JSON.parse(res.getContentText());
    var text = json.responses[0]?.fullTextAnnotation?.text || '';
    if (!text) return { ok: true, items: [], text: '' };

    var lines = text.split('\n');
    var items = [];
    var rowRe = /(.*?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:[.,]\d+)?)(?:\s+₹?\s*([\d,]+(?:\.\d+)?))?$/i;

    lines.forEach(function(L) {
      if (!L.trim()) return;
      var clean = L.replace(/[₹,]/g, '').trim();
      
      // 1. Try strict Regex first
      var m = L.match(rowRe);
      if (m) {
        var desc = m[1].trim();
        var qty = Number(m[2]);
        var amt = m[4] ? Number(m[4].replace(/,/g, '')) : (qty * Number(m[3].replace(/,/g, '')));
        if (desc.length > 2 && isNaN(Number(desc))) {
          items.push({ desc: desc, qty: qty, amount: amt, method: 'regex' });
          return;
        }
      }

      // 1.1 Legacy "Amount Only" Regex Fallback
      var amountOnlyRe = /(.*?)\s+(\d+(?:\.\d+)?)\s+₹?\s*([\d,]+(?:\.\d+)?)/i;
      var matchAmount = L.match(amountOnlyRe);
      if (matchAmount) {
         var d2 = matchAmount[1].trim();
         var q2 = Number(matchAmount[2]);
         var a2 = Number(String(matchAmount[3]).replace(/,/g, ''));
         if (d2.length > 2 && isNaN(Number(d2))) {
           items.push({ desc: d2, qty: q2, amount: a2, method: 'legacy_amt' });
           return;
         }
      }
      
      // 2. Greedy Heuristic
      var parts = clean.split(/\s+/);
      if (parts.length >= 2) {
        var last = Number(parts[parts.length - 1]);
        if (!isNaN(last) && last > 0 && last < 10000000) { 
          var prev = Number(parts[parts.length - 2]);
          var q = (!isNaN(prev) && prev > 0 && prev < 10000) ? prev : 1;
          var sliceIdx = (!isNaN(prev) && prev > 0 && prev < 10000) ? -2 : -1;
          var d = parts.slice(0, sliceIdx).join(' ').trim();
          var lowerD = d.toLowerCase();
          var junk = ['total', 'subtotal', 'tax', 'gst', 'igst', 'sgst', 'cgst', 'discount', 'vat', 'net', 'phone', 'mobile'];
          var isJunk = junk.some(function(j) { return lowerD.indexOf(j) !== -1; });
          if (d.length > 2 && !isJunk && isNaN(Number(d))) {
             items.push({ desc: d, qty: q, amount: last, method: 'greedy' });
             return;
          }
        }
      }

      // 3. Price-First Search (Look for any number > 100 and a word before it)
      for (var i = parts.length - 1; i >= 1; i--) {
        var val = Number(parts[i]);
        if (!isNaN(val) && val > 10) {
           var descParts = parts.slice(0, i);
           var descStr = descParts.join(' ').trim();
           var isJunk2 = ['tax', 'gst', 'vat', 'total', 'discount', 'invoice', 'date'].some(function(j){ return descStr.toLowerCase().indexOf(j) !== -1; });
           if (descStr.length > 3 && !isJunk2 && isNaN(Number(descStr))) {
              items.push({ desc: descStr, qty: 1, amount: val, method: 'price_first' });
              break; 
           }
        }
      }
    });

    // --- SMART TABLE RECONSTRUCTION (Strategy 5) ---
    var descriptions = [];
    var dataBlocks = [];
    
    // Common junk words that indicate a line is NOT a product description
    var junkWords = ['total', 'subtotal', 'tax', 'gst', 'igst', 'sgst', 'cgst', 'discount', 'vat', 'net', 'phone', 'mobile', 'invoice', 'date', 'hsn', 'qty', 'rate', 'amount', 'price', 'description', 'particulars', 'code', 'sac', 'bank', 'ifsc', 'account', 'pan', 'state', 'pincode', 'address', 'name', 'client', 'buyer', 'seller', 'consignee', 'vehicle', 'lr', 'e-way', 'bill'];

    lines.forEach(function(L) {
      var trimmed = L.trim();
      if (!trimmed || trimmed.length < 4) return;
      
      // A. Extract Potential Descriptions
      // Criteria: Starts with Letter or digit, contains mostly letters/spaces, 6+ chars, not in junkWords
      var isPotentialDesc = /^[A-Z0-9]/i.test(trimmed) && !/^\d+\s*$/.test(trimmed);
      if (isPotentialDesc) {
        var lowerL = trimmed.toLowerCase();
        var containsJunk = junkWords.some(function(j) { return lowerL.indexOf(j) !== -1 && lowerL.length < (j.length + 5); });
        
        // Additional Check: If it has too many numbers, it's likely a data row, not a description
        var digitCount = (trimmed.match(/\d/g) || []).length;
        var alphaCount = (trimmed.match(/[a-z]/gi) || []).length;
        
        if (!containsJunk && alphaCount > digitCount) {
          // Remove leading serial numbers if present "1. Product" -> "Product"
          var cleanedDesc = trimmed.replace(/^(\d{1,2})[\s\.\)-]+\s*/, '').trim();
          if (cleanedDesc.length > 5) {
            descriptions.push(cleanedDesc);
          }
        }
      }

      // B. Extract Clumped Numbers (Sliding Window)
      var nums = (trimmed.match(/(\d{1,8}(?:,\d{3})*(?:\.\d{2})?)/g) || []).map(function(n){ return Number(n.replace(/,/g, '')); });
      if (nums.length >= 2) {
         for (var k = 0; k < nums.length; k++) {
            var val = nums[k];
            // Scenario 1: HSN (4-8 digits) + Qty + Rate + Amt
            if (val >= 1000 && val <= 99999999 && (k + 3) < nums.length) {
               var q = nums[k+1], r = nums[k+2], a = nums[k+3];
               if (q > 0 && r > 0 && Math.abs((q * r) - a) < (a * 0.05 + 5)) {
                  dataBlocks.push({ qty: q, rate: r, amt: a });
                  k += 3; continue;
               }
            }
            // Scenario 2: Qty + Rate + Amt
            if (val > 0 && val < 50000 && (k + 2) < nums.length) {
               var r2 = nums[k+1], a2 = nums[k+2];
               if (r2 > 0 && Math.abs((val * r2) - a2) < (a2 * 0.05 + 5)) {
                  dataBlocks.push({ qty: val, rate: r2, amt: a2 });
                  k += 2; continue;
               }
            }
            // Scenario 3: Qty + Amt (Rate implicit)
            if (val > 0 && val < 50000 && (k + 1) < nums.length) {
               var a3 = nums[k+1];
               if (a3 > val && (a3 % val === 0 || a3 > 100)) {
                  // Only add if we don't already have a more complex match on this line
                  dataBlocks.push({ qty: val, rate: a3/val, amt: a3 });
                  k += 1; continue;
               }
            }
         }
      }
    });

    if (descriptions.length > 0 && dataBlocks.length > 0) {
      var tableItems = [];
      // Match them in order. If we have offset (e.g. headers mistaken for descriptions), 
      // the ordering might be off, but this is the best heuristic for Vision results.
      var maxMatch = Math.min(descriptions.length, dataBlocks.length);
      for (var pi = 0; pi < maxMatch; pi++) {
        tableItems.push({ 
          desc: descriptions[pi], 
          qty: dataBlocks[pi].qty, 
          amount: dataBlocks[pi].amt, 
          method: 'smart_reconstruct_v5' 
        });
      }
      // If reconstruction found more items than traditional methods, prefer it
      if (tableItems.length >= items.length) {
        items = tableItems;
      }
    }

    // Deduplicate and filter junk
    var uniqueItems = [];
    var seen = {};
    items.forEach(function(it) {
       var dClean = it.desc.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
       var key = dClean + '|' + it.amount;
       if (!seen[key] && it.desc.length > 3) {
         uniqueItems.push(it);
         seen[key] = true;
       }
    });

    return { 
      ok: true, 
      items: uniqueItems, 
      text: text, 
      debug: { descCount: descriptions.length, dataCount: dataBlocks.length },
      ocr_method: 'vision_v4' 
    };
  } catch (err) {
    return { ok: false, msg: String(err) };
  }
}
