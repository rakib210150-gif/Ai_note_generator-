/**
 * Brain Nest - Google Sheets Authentication & Activity Tracker Script
 * 
 * Instructions:
 * 1. Open your Google Spreadsheet (e.g. "Brain Nest User Database").
 * 2. In Google Sheets, click: Extensions > Apps Script.
 * 3. Delete any code in the editor and paste this entire file.
 * 4. Click: Deploy > New deployment.
 * 5. Select type: "Web app".
 * 6. Configuration:
 *    - Description: "Brain Nest Auth Sync"
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone"
 * 7. Click "Deploy", authorize access with your Google account, and copy the Web App URL.
 * 8. Paste the Web App URL into your backend/.env file:
 *    GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/XXXXX/exec"
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "No post data received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Ensure "Registered Users" tab exists with correct headers
    var sheetUsers = ss.getSheetByName("Registered Users");
    if (!sheetUsers) {
      sheetUsers = ss.insertSheet("Registered Users");
      sheetUsers.appendRow([
        "User ID",
        "Full Name",
        "Email Address",
        "Mobile Number",
        "Country",
        "Registration Date",
        "Last Login",
        "Total Login Count"
      ]);
      // Styling
      var headerRange = sheetUsers.getRange("A1:H1");
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#0f172a");
      headerRange.setFontColor("#38bdf8");
      sheetUsers.setFrozenRows(1);
    }

    // 2. Ensure "Login History" tab exists with correct headers
    var sheetLogins = ss.getSheetByName("Login History");
    if (!sheetLogins) {
      sheetLogins = ss.insertSheet("Login History");
      sheetLogins.appendRow([
        "User ID",
        "User Name",
        "Email Address",
        "Login Date",
        "Login Time",
        "Login Count"
      ]);
      var loginHeaderRange = sheetLogins.getRange("A1:F1");
      loginHeaderRange.setFontWeight("bold");
      loginHeaderRange.setBackground("#0f172a");
      loginHeaderRange.setFontColor("#38bdf8");
      sheetLogins.setFrozenRows(1);
    }

    var now = new Date();
    var dateStr = Utilities.formatDate(now, "GMT+6", "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(now, "GMT+6", "HH:mm:ss");
    var dateTimeStr = Utilities.formatDate(now, "GMT+6", "yyyy-MM-dd HH:mm:ss");

    if (data.action === "register") {
      var userRows = sheetUsers.getDataRange().getValues();
      var userRowIndex = -1;

      // Check if user already exists by User ID or Email Address
      for (var i = 1; i < userRows.length; i++) {
        if (userRows[i][0] == data.userId || (data.email && userRows[i][2] == data.email)) {
          userRowIndex = i + 1; // 1-based index
          break;
        }
      }

      var regDate = data.registrationDate || dateTimeStr;
      var lastLogin = data.lastLogin || dateTimeStr;
      var loginCount = Number(data.totalLoginCount || 1);

      if (userRowIndex > 0) {
        // Update existing row
        sheetUsers.getRange(userRowIndex, 2).setValue(data.fullName || userRows[userRowIndex - 1][1]);
        sheetUsers.getRange(userRowIndex, 4).setValue(data.mobileNumber || userRows[userRowIndex - 1][3]);
        sheetUsers.getRange(userRowIndex, 5).setValue(data.country || userRows[userRowIndex - 1][4]);
        sheetUsers.getRange(userRowIndex, 7).setValue(lastLogin);
        sheetUsers.getRange(userRowIndex, 8).setValue(loginCount);
      } else {
        // Append brand new registered user
        sheetUsers.appendRow([
          data.userId || "",
          data.fullName || "",
          data.email || "",
          data.mobileNumber || "",
          data.country || "",
          regDate,
          lastLogin,
          loginCount
        ]);
      }

      // Also record initial login event in Login History
      sheetLogins.appendRow([
        data.userId || "",
        data.fullName || "",
        data.email || "",
        data.loginDate || dateStr,
        data.loginTime || timeStr,
        1
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "User successfully registered in Google Sheets",
        userId: data.userId
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "login") {
      var userRows = sheetUsers.getDataRange().getValues();
      var userRowIndex = -1;

      for (var j = 1; j < userRows.length; j++) {
        if (userRows[j][0] == data.userId || (data.email && userRows[j][2] == data.email)) {
          userRowIndex = j + 1;
          break;
        }
      }

      var currentCount = Number(data.loginCount || 1);
      var loginTimestamp = data.lastLogin || dateTimeStr;

      if (userRowIndex > 0) {
        // Update Sheet 1: Registered Users with latest login and updated count
        sheetUsers.getRange(userRowIndex, 7).setValue(loginTimestamp);
        var existingCount = Number(sheetUsers.getRange(userRowIndex, 8).getValue()) || 0;
        sheetUsers.getRange(userRowIndex, 8).setValue(Math.max(existingCount + 1, currentCount));
      } else {
        // If not found in sheet 1, create row
        sheetUsers.appendRow([
          data.userId || "",
          data.userName || "",
          data.email || "",
          data.mobileNumber || "N/A",
          data.country || "N/A",
          dateTimeStr,
          loginTimestamp,
          currentCount
        ]);
      }

      // Append new event to Sheet 2: Login History
      sheetLogins.appendRow([
        data.userId || "",
        data.userName || "",
        data.email || "",
        data.loginDate || dateStr,
        data.loginTime || timeStr,
        currentCount
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Login successfully recorded in Google Sheets",
        userId: data.userId,
        loginCount: currentCount
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Unrecognized action: " + data.action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Brain Nest Google Sheets Integration",
    version: "1.0",
    tabs: ["Registered Users", "Login History"],
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

