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
    var combinedItems = [];
    var combinedText = "";
    var sourceResults = {};
    var log = [];

    // --- PRIORITY SOURCE: Legacy Drive OCR ---
    try {
      var drRes = handleOCR(postData); 
      sourceResults.Drive = drRes;
      if (drRes.status === 'success' && drRes.text) {
        combinedText += "\n--- DRIVE SOURCE (Legacy) ---\n" + drRes.text;
        var drMatch = api_spatialMatch(drRes.text, "Drive");
        combinedItems = combinedItems.concat(drMatch.items);
        log = log.concat(drMatch.logs);
      }
    } catch (e) { log.push("Drive OCR Failed: " + String(e)); }

    // --- SECONDARY SOURCE: DocAI ---
    try {
      var dRes = api_parseInvoice_docai(postData.filename, postData.dataUrl);
      sourceResults.DocAI = dRes;
      if (dRes.ok && dRes.text) {
        combinedText += "\n--- DOCAI SOURCE ---\n" + dRes.text;
        var dMatch = api_spatialMatch(dRes.text, "DocAI");
        combinedItems = combinedItems.concat(dMatch.items);
        log = log.concat(dMatch.logs);
      }
    } catch (e) { log.push("DocAI Failed: " + String(e)); }

    // --- TERTIARY SOURCE: Vision API ---
    try {
      var vRes = api_parseInvoice(postData.filename, postData.dataUrl);
      sourceResults.Vision = vRes;
      if (vRes.ok && vRes.text) {
        combinedText += "\n--- VISION SOURCE ---\n" + vRes.text;
        var vMatch = api_spatialMatch(vRes.text, "Vision");
        combinedItems = combinedItems.concat(vMatch.items);
        log = log.concat(vMatch.logs);
      }
    } catch (e) { log.push("Vision GPT Failed: " + String(e)); }

    // Deduplicate Results
    var uniqueItems = [];
    var seenItems = {};
    combinedItems.forEach(function(it) {
      var key = (it.desc || "").slice(0,10).toLowerCase() + "|" + Number(it.amount);
      if (!seenItems[key]) {
        uniqueItems.push(it);
        seenItems[key] = true;
      }
    });

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      status: 'success',
      items: uniqueItems,
      text: combinedText,
      ocr_method: 'legacy_v11.0_fusion',
      sourceResults: sourceResults,
      debug: { log: log }
    })).setMimeType(ContentService.MimeType.JSON);
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
      return { ok: false, msg: 'DocAI API Error (' + status + '): ' + text, text: '' };
    }

    var doc = json.document || (json.documents && json.documents[0]);
    if (!doc) return { ok: false, msg: 'DocAI: No document data in response', text: '' };

    var fullText = doc.text || '';
    var entities = doc.entities || [];
    var items = [];
    
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

    return { ok: true, items: items, text: fullText, ocr_method: 'docai_v11' };
  } catch (err) {
    return { ok: false, msg: String(err), text: '' };
  }
}

/**
 * VISION OCR PARSER
 */
/**
 * STRUCTURAL ROW MATCHER (v13.0) - THE DEFINITIVE PARSER
 * Anchors on line-based patterns (HSN, Qty/Rate/Amt sequences)
 */
function api_spatialMatch(rawText, sourceTag) {
  var debugLogs = [];
  var resultItems = [];
  var lines = rawText.split('\n').filter(function(L) { return L.trim().length > 0; });
  
  // Strict keywords that disqualify a line from being an item row
  var DISQUALIFY = ['plot', 'sector', 'street', 'road', 'village', 'state', 'pincode', 'gstin', 'pan', 'regd', 'email', 'mobile', 'phone', 'total', 'tax', 'discount', 'invoice', 'date', 'sac', 'terms', 'condition', 'signat', 'bank', 'account'];
  
  // 1. Identify Start of Table
  var startIdx = 0;
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].toLowerCase();
    if ((l.indexOf('qty') > -1 || l.indexOf('rate') > -1) && (l.indexOf('amount') > -1 || l.indexOf('value') > -1)) {
      startIdx = i;
      debugLogs.push("Start found at line " + i);
      break;
    }
  }

  // 2. Iterate Rows below Start
  for (var i = startIdx + 1; i < lines.length; i++) {
    var rawLine = lines[i].trim();
    var lowerLine = rawLine.toLowerCase();
    
    // Skip if disqualifier found
    if (DISQUALIFY.some(function(d) { return lowerLine.indexOf(d) > -1; })) continue;

    // Pattern A: Look for HSN (6-8 digits)
    var hsnMatch = rawLine.match(/\b(\d{6,8})\b/);
    var numbers = rawLine.match(/(\d[\d,]*(\.\d+)?)/g) || [];
    var numericVals = numbers.map(function(m) { return Number(m.replace(/,/g, '')); }).filter(function(n) { return !isNaN(n); });

    var item = null;

    if (hsnMatch && numericVals.length >= 3) {
      // Common pattern: HSN ... Qty ... Rate ... Amount
      // Find numbers to the right of HSN
      var hsnVal = Number(hsnMatch[1]);
      var hsnIdxInArray = numericVals.indexOf(hsnVal);
      if (hsnIdxInArray > -1 && numericVals.length > hsnIdxInArray + 2) {
        var q = numericVals[hsnIdxInArray + 1];
        var r = numericVals[hsnIdxInArray + 2];
        var a = numericVals[numericVals.length - 1]; // Assume last is Total
        
        // Simple Math cross-check
        if (Math.abs(q * r - a) < (a * 0.1 + 10)) {
           item = { desc: rawLine.split(hsnMatch[1])[0].trim(), qty: q, amount: a };
        }
      }
    } else if (numericVals.length >= 3) {
      // Pattern B: No HSN but valid row math [Qty, Rate, Total] at end
      var a = numericVals[numericVals.length - 1];
      var r = numericVals[numericVals.length - 2];
      var q = numericVals[numericVals.length - 3];
      
      if (Math.abs(q * r - a) < (a * 0.1 + 10)) {
         var descPart = rawLine.replace(/[\d,.]/g, '').trim(); // Strip numbers for desc
         if (descPart.length < 5) {
           // Desc might be on the line above
           descPart = (i > 0) ? lines[i-1].trim() : "Line Item";
         }
         item = { desc: descPart, qty: q, amount: a };
      }
    }

    if (item && item.desc.length > 3) {
      item.desc = item.desc.replace(/^[\s\d.-]+/, '').trim();
      if (item.desc.length > 5) {
        item.method = sourceTag + '_v13_structural';
        resultItems.push(item);
        debugLogs.push("Matched structural row: " + item.desc);
      }
    }
  }

  // Deduplicate
  var unique = [];
  var seen = {};
  resultItems.forEach(function(it) {
    var key = it.desc.slice(0,10) + "|" + it.amount;
    if (!seen[key]) {
      unique.push(it);
      seen[key] = true;
    }
  });

  return { items: unique, logs: debugLogs };
}

function api_parseInvoice(filename, dataUrl) {
  // Logic deprecated in favor of omni-parse inside doPost to maximize context.
  // This function now exists as a Vision API wrapper.
  try {
    var key = PropertiesService.getScriptProperties().getProperty('VISION_API_KEY');
    if (!key) return { ok: false, msg: 'VISION_API_KEY missing' };
    var isPdf = (filename || '').toLowerCase().indexOf('.pdf') > -1;
    if (isPdf) return { ok: true, items: [], text: '', msg: 'Skip Vision for PDF' };

    var base64 = String(dataUrl).split(',')[1];
    var res = UrlFetchApp.fetch('https://vision.googleapis.com/v1/images:annotate?key=' + key, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION' }] }] }),
      muteHttpExceptions: true
    });
    var json = JSON.parse(res.getContentText());
    return { ok: true, text: json.responses[0]?.fullTextAnnotation?.text || '' };
  } catch (e) {
    return { ok: false, msg: String(e) };
  }
}
