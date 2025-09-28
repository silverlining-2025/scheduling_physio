/**
 * @file Service_Sheet.js
 * @description Handles all direct interactions (reading/writing) with the Google Sheet.
 */
const Service_Sheet = {
  /**
   * A private helper to get the active spreadsheet.
   * @private
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} The active spreadsheet object.
   */
  _getSpreadsheet: function() {
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  /**
   * A private helper to get a sheet by its name, with robust error handling.
   * @private
   * @param {string} name The name of the sheet to find.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} The sheet object.
   * @throws {MissingSheetError} If the sheet is not found.
   */
  _getSheetByName: function(name) {
    const sheet = this._getSpreadsheet().getSheetByName(name);
    if (!sheet) {
      const err = new Error(`Sheet "${name}" not found.`);
      err.name = 'MissingSheetError';
      err.sheetName = name;
      throw err;
    }
    return sheet;
  },
  
  /**
   * Fetches all the initial data required to build the context object.
   * @returns {Object} An object containing all the raw data from various sheets.
   */
  fetchAllInitialData: function () {
    const settingsSheet = this._getSheetByName(CONFIG.SHEET_NAMES.SETTINGS);
    const scheduleSheet = this._getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const calendarSheet = this._getSheetByName(CONFIG.SHEET_NAMES.CALENDAR);
    const [year, month] = scheduleSheet.getRange(CONFIG.RANGES.SCHEDULE_YEAR_MONTH).getValues()[0];

    const getValues = (sheet, rangeA1) => {
        // Get all data but filter out rows that are completely empty.
        return sheet.getRange(rangeA1 + sheet.getLastRow()).getValues().filter(row => row.some(cell => cell !== ""));
    };

    return {
      year: parseInt(year), month: parseInt(month),
      staffList: getValues(settingsSheet, 'A2:C').map(r => ({ name: r[0], phone: r[1], email: r[2] })),
      rules: new Map(getValues(settingsSheet, 'J2:K').map(r => [r[0], r[1]])),
      shiftDefinitions: new Map(getValues(settingsSheet, 'E2:H').map(r => [r[0], { code: r[0], description: r[1], category: r[2], hours: Number(r[3]) || 0 }])),
      approvedLeave: this._getApprovedLeave(),
      calendarData: calendarSheet.getRange(CONFIG.RANGES.CALENDAR_DATA_RANGE + calendarSheet.getLastRow()).getValues(),
    };
  },

  /**
   * Reads and filters approved leave requests for the current month.
   * @private
   * @returns {Array<Object>} A list of approved leave request objects.
   */
  _getApprovedLeave: function () {
    const sheet = this._getSheetByName(CONFIG.SHEET_NAMES.LEAVE_REQUESTS);
    const data = sheet.getDataRange().getValues();
    // Skip header row, filter by status, and map to a clean object.
    return data.slice(1).filter(row => row[7] === CONFIG.LEAVE_STATUS.APPROVED).map(row => ({
      name: row[2],
      startDay: new Date(row[4]).getDate(),
      endDay: new Date(row[5]).getDate(),
      reason: row[3],
    }));
  },

  /**
   * Writes the completed schedule grid to the spreadsheet.
   * @param {Object} context The global scheduling context.
   */
  writeScheduleToSheet: function (context) {
    const sheet = this._getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const startCell = CONFIG.RANGES.SCHEDULE_GRID_START_CELL;
    const startRow = parseInt(startCell.match(/\d+/)[0]);
    const startCol = startCell.match(/[A-Z]+/)[0].charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    
    const range = sheet.getRange(startRow, startCol, context.scheduleGrid.length, context.numDays);
    range.setValues(context.scheduleGrid);
  },
};

