/**
 * @file Engine_OffDayScheduler.js
 * @description Final scheduling step to fill all remaining empty slots with 'OFF'.
 * This ensures the schedule grid is complete before validation and writing.
 */
const Engine_OffDayScheduler = {
  /**
   * Iterates through the entire schedule grid and replaces any `null` values
   * with the standard 'OFF' shift code.
   * @param {Object} context The global scheduling context.
   */
  run: function(context) {
    for (let r = 0; r < context.scheduleGrid.length; r++) {
      for (let c = 0; c < context.scheduleGrid[r].length; c++) {
        if (context.scheduleGrid[r][c] === null) {
          context.scheduleGrid[r][c] = CONFIG.SPECIAL_SHIFTS.OFF;
        }
      }
    }
    Util_Logger.log('DEBUG', "Filled all remaining empty slots with 'OFF'.");
  }
};

