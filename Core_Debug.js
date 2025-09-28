/**
 * @file Core_Debug.js
 * @description Contains functions for testing and debugging individual modules.
 * These functions are called from the 'Developer Test' menu.
 */

/**
 * A private helper function to create a fresh context for testing.
 * @returns {Object} The initialized context object.
 */
function _getTestContext() {
  const initialData = Service_Sheet.fetchAllInitialData();
  return Engine_ContextBuilder.buildInitialContext(initialData);
}

/**
 * Clears only the main schedule grid, leaving headers and staff names intact.
 */
function debug_clearSchedule() {
  const ui = SpreadsheetApp.getUi();
  const sheet = Service_Sheet._getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
  const startCell = CONFIG.RANGES.SCHEDULE_GRID_START_CELL;
  const startRow = parseInt(startCell.match(/\d+/)[0]);
  const startCol = startCell.match(/[A-Z]+/)[0].charCodeAt(0) - 'A'.charCodeAt(0) + 1;
  
  if (sheet.getLastRow() >= startRow) {
    const range = sheet.getRange(startRow, startCol, sheet.getLastRow() - startRow + 1, 31);
    range.clearContent();
    ui.showToast('Schedule grid has been cleared.', 'Debug');
  }
}

/**
 * Fetches the current context and logs it to the Apps Script console for inspection.
 */
function debug_logCurrentContext() {
  const ui = SpreadsheetApp.getUi();
  console.log("---------- DEBUG: CURRENT CONTEXT ----------");
  const context = _getTestContext();
  console.log(JSON.stringify(context, null, 2)); // Pretty print the JSON object
  ui.showToast('Context has been logged. View from Apps Script > Executions.', 'Debug');
}

/**
 * Tests only the constraint applier (leave and special OFFs).
 */
function test_runConstraintApplier() {
  const context = _getTestContext();
  Engine_ConstraintApplier.run(context);
  Service_Sheet.writeScheduleToSheet(context);
  SpreadsheetApp.getUi().showToast('Constraint Applier Test Complete.', 'Debug');
}

/**
 * Tests only the on-call scheduler.
 */
function test_runOnCallScheduler() {
  const context = _getTestContext();
  Engine_ConstraintApplier.run(context); // Prerequisite
  Engine_OnCallScheduler.run(context);
  Service_Sheet.writeScheduleToSheet(context);
  SpreadsheetApp.getUi().showToast('On-Call Scheduler Test Complete.', 'Debug');
}

/**
 * Tests only the weekend scheduler.
 */
function test_runWeekendScheduler() {
  const context = _getTestContext();
  Engine_ConstraintApplier.run(context); // Prerequisite
  Engine_WeekendScheduler.run(context);
  Service_Sheet.writeScheduleToSheet(context);
  SpreadsheetApp.getUi().showToast('Weekend Scheduler Test Complete.', 'Debug');
}

/**
 * Runs all core schedulers, then tests the balancer.
 */
function test_runBalancer() {
  const context = _getTestContext();
  Engine_ConstraintApplier.run(context);
  Engine_OnCallScheduler.run(context);
  Engine_WeekendScheduler.run(context);
  Engine_WeekdayScheduler.run(context);
  Engine_OffDayScheduler.run(context);
  Engine_Balancer.run(context); // Test target
  Service_Sheet.writeScheduleToSheet(context);
  SpreadsheetApp.getUi().showToast('Balancer Test Complete.', 'Debug');
}

/**
 * Runs the full generation and then tests the validation service.
 */
function test_runValidation() {
  const ui = SpreadsheetApp.getUi();
  try {
    const context = _getTestContext();
    // Run full generation
    Core_Orchestrator.run(); 
    ui.showToast('✅ Validation Test Passed!', 'Debug');
  } catch (e) {
    if (e.name === 'ValidationError') {
      ui.showToast('❌ Validation Test Failed. Check logs.', 'Debug Error', -1);
      Util_Logger.log('ERROR', `VALIDATION TEST FAILED WITH ERRORS:\n${e.message}`);
    } else {
      // Re-throw other unexpected errors to be caught by the main handler
      throw e;
    }
  }
}

