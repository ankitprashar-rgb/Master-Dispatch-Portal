/************************************************************
 *  DISPATCH / TRACKING / SUMMARY BACKEND — STABLE V3
 *  - Uses header-based column mapping (no magic indexes)
 *  - Never deletes rows or clears Dispatch ID
 *  - Tracking list shows rows with a Dispatch ID for a date
 *  - Summary supports simple date range
 *  - NEW function names: api_listDispatchesByDate_v3,
 *    api_updateTrackingAndNotify_v3, api_getSummary_v3
 ************************************************************/

/**
 * Central config accessor (no global const to avoid redeclaration).
 */
function _getDispatchBackendConfig_v3_() {
  return {
    MASTER_SHEET_ID: '1WVh5Nc_wtBfrFQrJCno63mQXd47oJZjgU27jTApwjJY', // Master sheet ID
    MASTER_SHEET_NAME: 'Masters',

    EMAIL_FROM_NAME: 'IDE Autoworks Operations',
    EMAIL_FROM_ALIAS: 'operations@ideautoworks.com', // send-as in Gmail
    EMAIL_CC: 'ankit@ideautoworks.com'
  };
}

/**
 * Open Master sheet for Dispatch / Tracking / Summary.
 */
function _getMasterSheetForDispatch_v3_() {
  var cfg = _getDispatchBackendConfig_v3_();
  var ss = SpreadsheetApp.openById(cfg.MASTER_SHEET_ID);
  var sh = ss.getSheetByName(cfg.MASTER_SHEET_NAME);
  if (!sh) {
    throw new Error('Master sheet "' + cfg.MASTER_SHEET_NAME + '" not found.');
  }
  return sh;
}

/**
 * Build a column index map from header row.
 * Works with your current header row:
 * A: (empty / Timestamp)
 * B: Date
 * C: Client Name
 * D: Address
 * E: POC
 * F: Phone
 * G: Client Email
 * H: Project
 * I: Qty
 * J: Amount
 * K: E-Way
 * L: Shipping Label
 * M: Delivery Challan
 * N: Dispatch ID
 * O: Tracking ID
 * P: Courier Company
 * Q: Courier Slip Link
 * R: Email Sent At
 */
function _resolveMasterColumns_v3_(headerRow) {
  var normalized = [];
  for (var i = 0; i < headerRow.length; i++) {
    normalized.push(String(headerRow[i] || '').trim().toUpperCase());
  }

  function flexIdx(variants) {
    for (var c = 0; c < normalized.length; c++) {
      var name = normalized[c];
      if (!name) continue;
      for (var j = 0; j < variants.length; j++) {
        if (name === variants[j]) return c;
      }
    }
    return -1;
  }

  var cols = {
    rawHeader: headerRow.slice(),

    idxDate:        flexIdx(['DATE']),
    idxClient:      flexIdx(['CLIENT NAME', 'CLIENT']),
    idxAddress:     flexIdx(['ADDRESS', 'CLIENT ADDRESS']),
    idxPoc:         flexIdx(['POC', 'CONTACT PERSON']),
    idxPhone:       flexIdx(['PHONE', 'CONTACT PHONE', 'MOBILE']),
    idxClientEmail: flexIdx(['CLIENT EMAIL', 'EMAIL', 'EMAIL ID']),
    idxProject:     flexIdx(['PROJECT', 'PROJECT DETAILS', 'PROJECT DETAIL']),
    idxQty:         flexIdx(['QTY', 'QUANTITY']),
    idxAmount:      flexIdx(['AMOUNT', 'VALUE']),
    idxEway:        flexIdx(['E-WAY', 'E WAY', 'EWAY REQUIRED', 'EWAY']),
    idxLabel:       flexIdx(['SHIPPING LABEL', 'SHIPPING LABEL PDF']),
    idxChallan:     flexIdx(['DELIVERY CHALLAN', 'DELIVERY CHALLAN PDF', 'CHALLAN']),
    idxDispatchId:  flexIdx(['DISPATCH ID']),
    idxTrackingId:  flexIdx(['TRACKING ID']),
    idxCourier:     flexIdx(['COURIER COMPANY', 'COURIER']),
    idxSlip:        flexIdx(['COURIER SLIP LINK', 'COURIER SLIP', 'SLIP', 'DOCKET URL']),
    idxEmailSentAt: flexIdx(['EMAIL SENT AT', 'MAILED AT'])
  };

  if (cols.idxDate < 0) {
    throw new Error('Master header missing "Date" column.');
  }
  if (cols.idxClient < 0) {
    throw new Error('Master header missing "Client Name" column.');
  }
  if (cols.idxDispatchId < 0) {
    throw new Error('Master header missing "Dispatch ID" column.');
  }

  return cols;
}

/**
 * Normalise any sheet date cell to 'YYYY-MM-DD'.
 */
function _formatDateCellToYMD_v3_(cellVal) {
  if (!cellVal) return '';

  if (Object.prototype.toString.call(cellVal) === '[object Date]') {
    var d = cellVal;
    var yyyy = d.getFullYear();
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
  }

  var s = String(cellVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  var parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    var yyyy2 = parsed.getFullYear();
    var mm2 = ('0' + (parsed.getMonth() + 1)).slice(-2);
    var dd2 = ('0' + parsed.getDate()).slice(-2);
    return yyyy2 + '-' + mm2 + '-' + dd2;
  }

  return '';
}

/**
 * 1) TRACKING SHEET — list dispatches for a given date
 * Only returns rows that have a non-empty Dispatch ID.
 */
function api_listDispatchesByDate_v3(dateStr) {
  try {
    if (!dateStr) {
      return { ok: false, msg: 'No date provided.' };
    }

    var targetKey = String(dateStr);
    var sh = _getMasterSheetForDispatch_v3_();
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastRow < 2) {
      return { ok: true, rows: [] };
    }

    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var cols = _resolveMasterColumns_v3_(header);

    var data = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var out = [];

    for (var r = 0; r < data.length; r++) {
      var rowVals  = data[r];
      var dateKey  = _formatDateCellToYMD_v3_(rowVals[cols.idxDate]);
      var dispatch = rowVals[cols.idxDispatchId];

      if (!dispatch || dateKey !== targetKey) continue;

      out.push({
        rowIndex:    r + 2,
        clientName:  rowVals[cols.idxClient] || '',
        project:     (cols.idxProject >= 0 ? rowVals[cols.idxProject] : '') || '',
        dispatchId:  dispatch,
        trackingId:  (cols.idxTrackingId >= 0 ? rowVals[cols.idxTrackingId] : '') || '',
        courier:     (cols.idxCourier >= 0 ? rowVals[cols.idxCourier] : '') || '',
        docketLink:  (cols.idxSlip >= 0 ? rowVals[cols.idxSlip] : '') || '',
        emailSentAt: (cols.idxEmailSentAt >= 0 ? rowVals[cols.idxEmailSentAt] : '') || ''
      });
    }

    return { ok: true, rows: out };

  } catch (err) {
    return { ok: false, msg: String(err) };
  }
}

/**
 * 2) TRACKING SHEET — update tracking + courier + slip + Email Sent At
 *    AND send email to client.
 */
function api_updateTrackingAndNotify_v3(rowIndex, trackingId, courier, slipUrl) {
  try {
    if (!rowIndex) {
      return { ok: false, msg: 'No row index provided.' };
    }
    trackingId = trackingId || '';
    courier    = courier    || '';
    slipUrl    = slipUrl    || '';

    var sh = _getMasterSheetForDispatch_v3_();
    var lastCol = sh.getLastColumn();
    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var cols = _resolveMasterColumns_v3_(header);

    var rowVals = sh.getRange(rowIndex, 1, 1, lastCol).getValues()[0];

    if (!rowVals[cols.idxDispatchId]) {
      return { ok: false, msg: 'Row ' + rowIndex + ' has no Dispatch ID.' };
    }

    if (cols.idxTrackingId >= 0) rowVals[cols.idxTrackingId] = trackingId;
    if (cols.idxCourier    >= 0) rowVals[cols.idxCourier]    = courier;
    if (cols.idxSlip       >= 0) rowVals[cols.idxSlip]       = slipUrl;

    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    if (cols.idxEmailSentAt >= 0) {
      rowVals[cols.idxEmailSentAt] = nowStr;
    }

    sh.getRange(rowIndex, 1, 1, lastCol).setValues([rowVals]);

    var clientEmail = (cols.idxClientEmail >= 0 ? rowVals[cols.idxClientEmail] : '') || '';
    var clientName  = rowVals[cols.idxClient]  || '';
    var poc         = (cols.idxPoc >= 0 ? rowVals[cols.idxPoc] : '') || '';
    var dispatchId  = rowVals[cols.idxDispatchId] || '';
    var address     = (cols.idxAddress >= 0 ? rowVals[cols.idxAddress] : '') || '';
    var project     = (cols.idxProject >= 0 ? rowVals[cols.idxProject] : '') || '';
    var dateKey     = _formatDateCellToYMD_v3_(rowVals[cols.idxDate]);

    if (clientEmail) {
      _sendTrackingMail_v3_({
        to:          clientEmail,
        clientName:  clientName,
        poc:         poc,
        dispatchId:  dispatchId,
        dateKey:     dateKey,
        address:     address,
        project:     project,
        trackingId:  trackingId,
        courier:     courier,
        slipUrl:     slipUrl
      });
    }

    return { ok: true, msg: 'Row updated and email sent (if client email present).' };

  } catch (err) {
    return { ok: false, msg: String(err) };
  }
}

/**
 * Email helper: operations@ideautoworks.com + CC Ankit
 */
function _sendTrackingMail_v3_(info) {
  var cfg        = _getDispatchBackendConfig_v3_();
  var to         = info.to;
  var clientName = info.clientName || '';
  var poc        = info.poc || '';
  var dispatchId = info.dispatchId || '';
  var dateKey    = info.dateKey || '';
  var address    = info.address || '';
  var project    = info.project || '';
  var trackingId = info.trackingId || '';
  var courier    = info.courier || '';
  var slipUrl    = info.slipUrl || '';

  var subject = 'Dispatch Update – ' + dispatchId + (project ? (' – ' + project) : '');
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
    name:   cfg.EMAIL_FROM_NAME,
    cc:     cfg.EMAIL_CC,
    replyTo: cfg.EMAIL_FROM_ALIAS
  };

  try {
    GmailApp.sendEmail(to, subject, body, options);
  } catch (e) {
    Logger.log('Email send error (v3): ' + e);
  }
}

/**
 * 3) SUMMARY SHEET — simple date range + optional client
 * Called as: api_getSummary_v3(fromDate, toDate, clientName)
 * Dates are YYYY-MM-DD strings.
 */
function api_getSummary_v3(fromStr, toStr, clientName) {
  try {
    var sh = _getMasterSheetForDispatch_v3_();
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastRow < 2) {
      return { ok: true, rows: [] };
    }

    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var cols = _resolveMasterColumns_v3_(header);

    var data = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var out  = [];

    var fromKey = fromStr ? String(fromStr) : '';
    var toKey   = toStr   ? String(toStr)   : '';
    if (fromKey && !toKey) toKey = fromKey;
    if (!fromKey && toKey) fromKey = toKey;

    var clientFilter = clientName ? String(clientName).trim() : '';

    for (var r = 0; r < data.length; r++) {
      var rowVals = data[r];
      var dateKey = _formatDateCellToYMD_v3_(rowVals[cols.idxDate]);
      if (!dateKey) continue;

      if (fromKey && dateKey < fromKey) continue;
      if (toKey   && dateKey > toKey)   continue;

      var thisClient = rowVals[cols.idxClient] || '';
      if (clientFilter && thisClient !== clientFilter) continue;

      out.push({
        date:    dateKey,
        client:  thisClient,
        address: (cols.idxAddress >= 0 ? rowVals[cols.idxAddress] : '') || '',
        poc:     (cols.idxPoc >= 0 ? rowVals[cols.idxPoc] : '') || '',
        project: (cols.idxProject >= 0 ? rowVals[cols.idxProject] : '') || '',
        qty:     (cols.idxQty >= 0 ? rowVals[cols.idxQty] : '') || '',
        amount:  (cols.idxAmount >= 0 ? rowVals[cols.idxAmount] : '') || '',
        eway:    (cols.idxEway >= 0 ? rowVals[cols.idxEway] : '') || '',
        label:   (cols.idxLabel >= 0 ? rowVals[cols.idxLabel] : '') || '',
        challan: (cols.idxChallan >= 0 ? rowVals[cols.idxChallan] : '') || '',
        did:     (cols.idxDispatchId >= 0 ? rowVals[cols.idxDispatchId] : '') || '',
        track:   (cols.idxTrackingId >= 0 ? rowVals[cols.idxTrackingId] : '') || '',
        courier: (cols.idxCourier >= 0 ? rowVals[cols.idxCourier] : '') || '',
        slip:    (cols.idxSlip >= 0 ? rowVals[cols.idxSlip] : '') || '',
        mailed:  (cols.idxEmailSentAt >= 0 ? rowVals[cols.idxEmailSentAt] : '') || ''
      });
    }

    return { ok: true, rows: out };

  } catch (err) {
    return { ok: false, msg: String(err) };
  }
}
