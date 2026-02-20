/**
 * API - GET CLIENTS & PROJECTS (Work Orders)
 * Serves structured data from 'Project_WorkOrder' sheet.
 * URL: [Deploy as Web App] -> Current User -> Anyone (Anonymous)
 */

function doGet(e) {
  var data = getClientsData();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getClientsData() {
  var SHEET_ID = '1SB1kikWg5B20wE47RBZHsuqLvKFj1wN2XY_mEDpI58g'; // Client DB
  var SHEET_NAME = 'Project_WorkOrder';
  
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { error: 'Sheet "' + SHEET_NAME + '" not found' };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { clients: [] };
    
    var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
    var rows = data.slice(1);
    
    // --- STEP 1: READ CLIENT DETAILS (POC, Address, Phone) ---
    var clientDetailsMap = {};
    var sheetClients = ss.getSheetByName('Clients');
    if (sheetClients) {
      var cData = sheetClients.getDataRange().getValues();
      if (cData.length > 1) {
        var cHeaders = cData[0].map(function(h) { return String(h).toLowerCase().trim(); });
        var idxCName = cHeaders.indexOf('client name');
        var idxPoc   = cHeaders.indexOf('poc name');
        var idxPhone = cHeaders.indexOf('phone');
        var idxAddr  = cHeaders.indexOf('details'); // User said "Details"
        var idxEmail = cHeaders.indexOf('email');

        if (idxCName > -1) {
           var cRows = cData.slice(1);
           cRows.forEach(function(r) {
             var nm = String(r[idxCName]).trim();
             if (nm) {
               clientDetailsMap[nm] = {
                 poc:     (idxPoc > -1)   ? r[idxPoc] : '',
                 phone:   (idxPhone > -1) ? r[idxPhone] : '',
                 address: (idxAddr > -1)  ? r[idxAddr] : '',
                 email:   (idxEmail > -1) ? r[idxEmail] : ''
               };
             }
           });
        }
      }
    }
    
    // --- STEP 2: READ PROJECTS & ITEMS ---
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { error: 'Sheet "' + SHEET_NAME + '" not found' };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { clients: [] };
    
    var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
    var rows = data.slice(1);
    
    // Map Headers to Column Index
    var idxClient = headers.indexOf('client name');
    var idxProject = headers.indexOf('project name');
    var idxProduct = headers.indexOf('product name');
    var idxQty = headers.indexOf('master qty');
    var idxPrice = headers.indexOf('unit price (₹)');
    if (idxPrice === -1) idxPrice = headers.indexOf('unit price');
    
    var clientsMap = {};
    
    rows.forEach(function(row) {
      var clientName = row[idxClient];
      var projectName = row[idxProject];
      
      if (!clientName || !projectName) return;
      clientName = String(clientName).trim();
      projectName = String(projectName).trim();
      
      if (!clientsMap[clientName]) {
        // Init with details if available
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
        clientObj.projectsMap[projectName] = {
          name: projectName,
          items: []
        };
      }
      
      // Add Line Item
      var item = {
        desc: row[idxProduct] ? String(row[idxProduct]).trim() : '',
        qty: row[idxQty] || 0,
        rate: row[idxPrice] || 0
      };
      
      // Only add if it has a product name
      if (item.desc) {
         clientObj.projectsMap[projectName].items.push(item);
      }
    });
    
    // Convert Map to Sorted Arrays
    var clientList = Object.keys(clientsMap).map(function(cName) {
      var c = clientsMap[cName];
      var projects = Object.keys(c.projectsMap).map(function(pName) {
        return c.projectsMap[pName];
      });
      // Sort Projects
      projects.sort(function(a, b) { return a.name.localeCompare(b.name); });
      
      return {
        name: c.name,
        address: c.address, // Add address
        poc: c.poc,         // Add POC
        phone: c.phone,     // Add phone
        email: c.email,     // Add email
        projects: projects
      };
    });
    
    // Sort Clients
    clientList.sort(function(a, b) { return a.name.localeCompare(b.name); });
    
    return { clients: clientList };
    
  } catch (err) {
    return { error: String(err) };
  }
}
