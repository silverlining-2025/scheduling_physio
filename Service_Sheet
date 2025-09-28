/**
 * @fileoverview This is the dedicated Data Access Layer for the Spreadsheet.
 * It is the ONLY file that should directly read from or write to the Google Sheet.
 * This rewritten version ensures clean, formatted, and dynamically positioned tables.
 * @namespace Service_Sheet
 */
const Service_Sheet = (function() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function _writeTable(sheet, title, headers, data, startRow, startCol) {
    if (!headers || headers.length === 0) return startRow;
    const numColumns = headers.length;
    
    const titleRange = sheet.getRange(startRow, startCol, 1, numColumns);
    titleRange.mergeAcross().setValue(title).setHorizontalAlignment('center').setFontWeight('bold').setFontSize(12);
    
    const headerRange = sheet.getRange(startRow + 1, startCol, 1, numColumns);
    headerRange.setValues([headers]).setFontWeight('bold').setBackground('#f3f3f3').setHorizontalAlignment('center');

    if (data && data.length > 0) {
      const dataRange = sheet.getRange(startRow + 2, startCol, data.length, numColumns);
      dataRange.setValues(data).setHorizontalAlignment('center');
      return startRow + 2 + data.length;
    }
    return startRow + 2;
  }
  
  return {
    // --- READ Operations ---
    getSheetData: function(sheetName, rangeA1 = null) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);
      const range = rangeA1 ? sheet.getRange(rangeA1) : sheet.getDataRange();
      return range.getValues();
    },
    getScheduleGrid: function(numRows, numCols) {
        const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
        const startCell = sheet.getRange(CONFIG.SCHEDULE.SCHEDULE_AREA_START_CELL);
        return sheet.getRange(startCell.getRow(), startCell.getColumn(), numRows, numCols).getValues();
    },
    getColumn: function(sheet, rangeA1) {
      return this.getSheetData(sheet.getName(), rangeA1).flat().filter(String);
    },
    /**
     * REWRITTEN to be more robust. It can now handle complex keys and correctly parse various data types.
     */
    getSchedulingRules: function(settingsSheet) {
      const rulesArray = this.getSheetData(settingsSheet.getName(), CONFIG.SETTINGS.SCHEDULING_RULES_RANGE);
      const rulesMap = new Map();
      rulesArray.forEach(row => {
        const key = String(row[0]).trim();
        let value = row[1];
        if (key && (value !== null && value !== '')) {
          const upperValue = String(value).toUpperCase();
          if (upperValue === 'TRUE') value = true;
          else if (upperValue === 'FALSE') value = false;
          else if (!isNaN(Number(value)) && !String(value).includes(',')) value = Number(value); // Convert numbers
          else if (typeof value === 'string' && value.includes(',')) value = value.split(',').map(item => item.trim());
          rulesMap.set(key, value);
        }
      });
      return rulesMap;
    },
    getShiftDefinitions: function(settingsSheet) {
      const shiftsArray = this.getSheetData(settingsSheet.getName(), CONFIG.SETTINGS.SHIFT_DEFINITIONS_RANGE);
      const shiftsMap = new Map();
      shiftsArray.forEach(row => {
        const code = String(row[0] || '').trim();
        if (code) {
          shiftsMap.set(code, {
            description: String(row[1] || '').trim(), category: String(row[2] || '').trim(), hours: Number(row[3]) || 0
          });
        }
      });
      return shiftsMap;
    },
    getApprovedLeave: function(year, month) {
      const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.REQUESTS);
      const allRequests = this.getSheetData(sheet.getName());
      const headers = allRequests[0];
      const indices = {
        name: headers.indexOf(CONFIG.REQUESTS.NAME_COLUMN_NAME), type: headers.indexOf(CONFIG.REQUESTS.TYPE_COLUMN_NAME),
        start: headers.indexOf(CONFIG.REQUESTS.START_DATE_COLUMN_NAME), end: headers.indexOf(CONFIG.REQUESTS.END_DATE_COLUMN_NAME),
        status: headers.indexOf(CONFIG.REQUESTS.STATUS_COLUMN_NAME)
      };
      if (Object.values(indices).some(i => i === -1)) throw new Error("Required columns missing in '⛱️휴가신청' sheet.");
      
      const approvedLeaveDays = [];
      const targetMonthStart = new Date(year, month - 1, 1);
      const targetMonthEnd = new Date(year, month, 0);

      allRequests.slice(1).filter(row => row[indices.status] === CONFIG.REQUESTS.APPROVED_STATUS_VALUE).forEach(row => {
          const startDate = new Date(row[indices.start]);
          const endDate = new Date(row[indices.end]);
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d >= targetMonthStart && d <= targetMonthEnd) {
              approvedLeaveDays.push({ name: row[indices.name], type: row[indices.type], date: new Date(d) });
            }
          }
      });
      return approvedLeaveDays;
    },

    // --- WRITE Operations ---
    writeScheduleGrid: function(grid, staffList) {
        if (!grid || grid.length === 0) return;
        const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
        const startCell = sheet.getRange(CONFIG.SCHEDULE.SCHEDULE_AREA_START_CELL);
        sheet.getRange(startCell.getRow() - 1, startCell.getColumn(), 1, staffList.length).setValues([staffList]).setFontWeight('bold').setHorizontalAlignment('center');
        sheet.getRange(startCell.getRow(), startCell.getColumn(), grid[0].length, grid.length).setValues(Util_Helpers.transpose(grid)).setHorizontalAlignment('center');
    },
    writeDailySummary: function(dailySummaryData) {
        if (!dailySummaryData || dailySummaryData.length === 0) return;
        const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
        sheet.getRange(3, 4, dailySummaryData.length, 2).setValues(dailySummaryData).setHorizontalAlignment('center');
    },
    /**
     * REWRITTEN to handle a single weekly summary object.
     * @param {object} weeklySummaryObject The single pivot-table-style summary object.
     * @param {number} startRow The starting row for the table.
     * @returns {number} The last row used by the table.
     */
    writeWeeklySummary: function(weeklySummaryObject, startRow) {
        const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
        return _writeTable(sheet, weeklySummaryObject.title, weeklySummaryObject.headers, weeklySummaryObject.data, startRow, 1);
    },
    writeMonthlySummary: function(monthlySummaryObject, startRow) {
        const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
        return _writeTable(sheet, monthlySummaryObject.title, monthlySummaryObject.headers, monthlySummaryObject.data, startRow, 1);
    },
    updateCalendarSheet: function(calendarRows) {
      const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CALENDAR);
      sheet.clearContents();
      sheet.getRange(1, 1, 1, CONFIG.CALENDAR.HEADERS.length).setValues([CONFIG.CALENDAR.HEADERS]).setFontWeight('bold');
      if (calendarRows.length > 0) sheet.getRange(2, 1, calendarRows.length, calendarRows[0].length).setValues(calendarRows);
    },
    clearSummaries: function(startRow) {
      const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
      if (startRow > sheet.getMaxRows()) return;
      const rangeToClear = sheet.getRange(startRow, 1, sheet.getMaxRows() - startRow + 1, sheet.getMaxColumns());
      rangeToClear.clear({ contentsOnly: true, formatOnly: true });
    }
  };
})();
