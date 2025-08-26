// Google Apps Script for Google Spreadsheet Integration

// This function will be called when accessing the web app
function doGet(e) {
  // Enable CORS
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Handle the request
  if (e.parameter.sheet) {
    // Get data from the specific sheet
    var sheetName = e.parameter.sheet;
    var data = getSheetData(sheetName);
    output.setContent(JSON.stringify(data));
  } else {
    // Return list of available sheets
    var sheets = getSheetNames();
    output.setContent(JSON.stringify({ sheets: sheets }));
  }
  
  return output;
}

// Get all sheet names from the spreadsheet
function getSheetNames() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var sheetNames = [];
  
  for (var i = 0; i < sheets.length; i++) {
    sheetNames.push(sheets[i].getName());
  }
  
  return sheetNames;
}

// Get data from a specific sheet
function getSheetData(sheetName) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    return { error: "Sheet not found" };
  }
  
  var data = sheet.getDataRange().getValues();
  
  if (data.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Extract headers (first row)
  var headers = data[0];
  
  // Extract rows (all rows except the first one)
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    rows.push(data[i]);
  }
  
  return {
    headers: headers,
    rows: rows
  };
}
