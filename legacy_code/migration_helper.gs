/**
 * MIGRATION HELPER SCRIPT
 * Parses "Project" column to extract [Item] lines.
 * Creates 'Masters_Normalized_Verify' with ALL legacy columns + 'Product'.
 */

function generateVerificationSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var srcSheet = ss.getSheetByName('Masters');
  var targetName = 'Masters_Normalized_Verify';
  
  // Delete existing
  var old = ss.getSheetByName(targetName);
  if (old) ss.deleteSheet(old);
  
  var targetSheet = ss.insertSheet(targetName);
  
  // Read Data
  var data = srcSheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  // Desired Headers (Order specified by user)
  var outputHeaders = [
    'Timestamp', 'Date', 'Client Name', 'Address', 'POC', 'Phone', 'Client Email', 
    'Project', 'Product', 'Qty', 'Amount', 'E-Way', 'Shipping Label', 
    'Delivery Challan', 'Dispatch ID', 'Tracking ID', 'Courier Company', 
    'Courier Slip Link', 'Email Sent At'
  ];
  
  targetSheet.appendRow(outputHeaders);
  
  // Create Map of Header Name -> Index in Source
  var colMap = {};
  headers.forEach(function(h, i) {
    var clean = String(h).trim().toUpperCase();
    colMap[clean] = i;
  });
  
  // Helper to get value loosely
  function getVal(row, namePart) {
    // Find key containing namePart
    for (var k in colMap) {
      if (k.includes(namePart.toUpperCase())) {
        return row[colMap[k]];
      }
    }
    return '';
  }
  
  // Specific getters for exact mapping if needed, else loose matching
  function getRaw(row, exactName) {
    var idx = colMap[String(exactName).trim().toUpperCase()];
    return (idx !== undefined) ? row[idx] : '';
  }

  var outputRows = [];
  
  rows.forEach(function(row) {
    // 1. Get Project String & Parse
    // Try to find 'PROJECT' column
    var projIdx = -1;
    for (var k in colMap) { if (k.includes('PROJECT')) projIdx = colMap[k]; }
    
    var rawProj = (projIdx >= 0) ? row[projIdx] : '';
    var parsed = parseProjectString(rawProj);
    
    // 2. Prepare Base Row Data (everything except Product)
    // We map output headers to source values
    var baseData = {};
    outputHeaders.forEach(function(h) {
      if (h === 'Product') return; // Skip product, we fill later
      if (h === 'Project') {
        baseData[h] = parsed.projectName; // Use cleaned project name
        return;
      }
      // Try to find matching column in source
      // We accept exact match or "includes" for some flexibility
      var val = '';
      var upperH = h.toUpperCase();
      
      // Known mappings based on user list vs likely source headers
      if (colMap[upperH] !== undefined) val = row[colMap[upperH]];
      else if (h === 'E-Way') val = getVal(row, 'E-WAY') || getVal(row, 'EWAY');
      else if (h === 'Shipping Label') val = getVal(row, 'SHIPPING LABEL') || getVal(row, 'LABEL');
      else if (h === 'Delivery Challan') val = getVal(row, 'DELIVERY CHALLAN') || getVal(row, 'CHALLAN');
      else if (h === 'Courier Slip Link') val = getVal(row, 'SLIP') || getVal(row, 'URL') || getVal(row, 'LINK');
      else if (h === 'Email Sent At') val = getVal(row, 'SENT AT') || getVal(row, 'MAILED');
      else val = getVal(row, h); // Fallback to includes
      
      baseData[h] = val;
    });

    // 3. Generate Item Rows
    if (parsed.products.length > 0) {
      parsed.products.forEach(function(prod) {
        var newRow = [];
        outputHeaders.forEach(function(h) {
          if (h === 'Product') newRow.push(prod.name);
          else newRow.push(baseData[h]);
        });
        outputRows.push(newRow);
      });
    } else {
      // Single row (no sub-products)
      var newRow = [];
      outputHeaders.forEach(function(h) {
        if (h === 'Product') newRow.push('-');
        else newRow.push(baseData[h]);
      });
      outputRows.push(newRow);
    }
  });

  // Batch Write
  if (outputRows.length > 0) {
    targetSheet.getRange(2, 1, outputRows.length, outputHeaders.length).setValues(outputRows);
  }
  
  SpreadsheetApp.getUi().alert('Done! Created ' + targetName);
}

// Logic to split "Project Name \n [Item] Item 1 \n [Item] Item 2"
function parseProjectString(str) {
  var str = String(str).trim();
  if (!str) return { projectName: '', products: [] };
  
  var lines = str.split(/\r?\n/);
  var projectNameParts = [];
  var products = [];
  
  lines.forEach(function(line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    
    // Check if line starts with [Item]
    if (/^\[Item\]/i.test(trimmed)) {
       var prodName = trimmed.replace(/^\[Item\]/i, '').trim();
       if (prodName) {
         products.push({ name: prodName, qty: '', amt: '' });
       }
    } else {
       projectNameParts.push(trimmed);
    }
  });
  
  return {
    projectName: projectNameParts.join(' ').trim(),
    products: products
  };
}
