/**
 * @file Service_Logger.gs
 * @description A simple service for collecting and writing logs.
 */

const LoggerService = (function() {
  let logMessages = [];

  return {
    /**
     * Adds a message to the internal log array.
     * @param {string} message The message to log.
     */
    log: function(message) {
      console.log(message); // Also log to the Apps Script console for real-time debugging
      logMessages.push(message);
    },

    /**
     * Clears all messages from the log array.
     */
    clear: function() {
      logMessages = [];
    },

    /**
     * Writes all collected logs to the '📈로그' sheet.
     */
    writeToSheet: function() {
      if (logMessages.length === 0) return;
      SheetService.writeLog(logMessages);
    }
  };
})();

