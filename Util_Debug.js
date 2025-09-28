/**
 * @file Util_Debug.js
 * @description Contains functions for detailed, console-based debugging.
 * These logs are for developers and are generally too verbose for the log sheet.
 */
const Util_Debug = {
  /**
   * A flag to easily enable or disable verbose debugging throughout the script.
   */
  IS_DEBUG_MODE: true,

  /**
   * Logs a message only if IS_DEBUG_MODE is true.
   * @param {string} message The message to log.
   */
  log: function(message) {
    if (this.IS_DEBUG_MODE) {
      console.log(message);
    }
  },

  /**
   * Logs a snapshot of the current context to the Apps Script console.
   * @param {string} stage A label for when the snapshot was taken (e.g., "After Constraints").
   * @param {Object} context The global scheduling context.
   */
  logContextState: function(stage, context) {
    if (!this.IS_DEBUG_MODE) return;

    console.log(`---------- CONTEXT SNAPSHOT: ${stage} ----------`);
    
    // Log a simplified version of the schedule grid for readability.
    const header = Array.from({length: context.numDays}, (_, i) => (i+1).toString().padStart(4)).join(' | ');
    console.log('Day:'.padStart(10) + ' | ' + header);
    console.log('-'.repeat(12 + header.length));

    const grid = context.scheduleGrid.map((row, i) => {
      const name = context.staffList[i].name.padEnd(10);
      const shifts = row.map(cell => (cell || '----').padEnd(4)).join(' | ');
      return name + ' | ' + shifts;
    }).join('\n');
    console.log(grid);
    
    // Log staff profile summaries.
    Service_Summary.recalculateStaffProfiles(context); // Ensure summary is up to date
    const summaries = Array.from(context.staffProfiles.values()).map(p => ({
        Name: p.name,
        'Total Hrs': p.summary.totalHours,
        'Target Hrs': p.summary.targetHours,
        'Weekend': p.summary.weekendWorkCount,
        'On-Call': p.summary.onCallCount,
    }));
    console.log('\nStaff Summaries:');
    console.table(summaries);
    console.log('--------------------------------------------------');
  }
};

