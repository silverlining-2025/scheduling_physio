/**
 * @file Util_Logger.js
 * @description A simple logging utility to write persistent messages to the log sheet.
 */
const Util_Logger = {
  _logSheet: null,

  /**
   * Gets the log sheet object, caching it for efficiency.
   * @private
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} The log sheet object.
   */
  _getSheet: function () {
    if (!this._logSheet) {
      try {
        this._logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.LOG);
      } catch (e) {
        // Fail silently if sheet doesn't exist during certain operations
        return null;
      }
    }
    return this._logSheet;
  },

  /**
   * Appends a new row to the log sheet.
   * @param {string} level The log level (e.g., 'INFO', 'ERROR', 'WARNING', 'DEBUG').
   * @param {string} message The message to log.
   */
  log: function (level, message) {
    try {
      const sheet = this._getSheet();
      if (sheet) {
        // sv-SE locale is a good hack for getting a near-ISO 8601 timestamp.
        const timestamp = new Date().toLocaleString('sv-SE');
        sheet.appendRow([timestamp, level, message]);
      }
      // Also log to the default Apps Script logger for real-time debugging during execution.
      Logger.log(`[${level}] ${message}`);
    } catch (e) {
      // If logging fails, log the failure to the default logger.
      Logger.log(`Failed to write to log sheet: ${e.message}`);
    }
  },

  /**
   * Clears all content from the log sheet, except for the header row.
   */
  clear: function () {
    try {
      const sheet = this._getSheet();
      if (sheet && sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
      this.log('INFO', 'Log cleared.');
    } catch (e) {
      Logger.log(`Failed to clear log sheet: ${e.message}`);
    }
  },
};

