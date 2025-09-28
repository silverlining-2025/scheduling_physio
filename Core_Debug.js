/**
 * @file Core_Debug.js
 * @description Contains functions for testing and debugging individual modules.
 * These functions are called from the 'Developer Test' menu and have robust error handling.
 */

/**
 * A private helper to get a UI instance and show a toast, simplifying the test functions.
 * @param {string} testName The name of the test being run.
 * @param {function} testLogic The logic to execute for the test.
 */
function _runTest(testName, testLogic) {
  const ui = SpreadsheetApp.getUi();
  try {
    testLogic();
    ui.showToast(CONFIG.UI_MESSAGES.DEBUG_SUCCESS(testName), 'Debug');
  } catch (e) {
    Util_Logger.log('ERROR', `DEBUG TEST FAILED [${testName}]: ${e.stack}`);
    ui.showToast(CONFIG.UI_MESSAGES.DEBUG_ERROR(testName, e), 'Debug Error', -1);
  }
}

/**
 * Clears only the main schedule grid, leaving headers and staff names intact.
 */
function debug_clearSchedule() {
  _runTest('Clear Schedule', () => {
    const sheet = Service_Sheet._getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const startCell = CONFIG.RANGES.SCHEDULE_GRID_START_CELL;
    const startRow = parseInt(startCell.match(/\d+/)[0]);
    const startCol = startCell.match(/[A-Z]+/)[0].charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    
    if (sheet.getLastRow() >= startRow) {
      const range = sheet.getRange(startRow, startCol, sheet.getLastRow() - startRow + 1, 31);
      range.clearContent();
    }
  });
}

/**
 * Fetches the current context and logs it to the Apps Script console for inspection.
 */
function debug_logCurrentContext() {
  _runTest('Log Current Context', () => {
    console.log("---------- DEBUG: CURRENT CONTEXT ----------");
    const initialData = Service_Sheet.fetchAllInitialData();
    const context = Engine_ContextBuilder.buildInitialContext(initialData);
    Util_Debug.logContextState('Initial Context', context); // Use the verbose logger
    console.log('Context object successfully logged to Apps Script console.');
  });
}

/**
 * Tests only the constraint applier (leave and special OFFs).
 */
function test_runConstraintApplier() {
  _runTest('Constraint Applier', () => {
    const initialData = Service_Sheet.fetchAllInitialData();
    const context = Engine_ContextBuilder.buildInitialContext(initialData);
    Engine_ConstraintApplier.run(context);
    Service_Sheet.writeScheduleToSheet(context);
  });
}

/**
 * Tests only the on-call scheduler.
 */
function test_runOnCallScheduler() {
  _runTest('On-Call Scheduler', () => {
    const initialData = Service_Sheet.fetchAllInitialData();
    const context = Engine_ContextBuilder.buildInitialContext(initialData);
    Engine_ConstraintApplier.run(context); // Prerequisite
    Engine_OnCallScheduler.run(context);
    Service_Sheet.writeScheduleToSheet(context);
  });
}

/**
 * Tests only the weekend scheduler.
 */
function test_runWeekendScheduler() {
  _runTest('Weekend Scheduler', () => {
    const initialData = Service_Sheet.fetchAllInitialData();
    const context = Engine_ContextBuilder.buildInitialContext(initialData);
    Engine_ConstraintApplier.run(context); // Prerequisite
    Engine_WeekendScheduler.run(context);
    Service_Sheet.writeScheduleToSheet(context);
  });
}

/**
 * Runs all core schedulers, then tests the balancer.
 */
function test_runBalancer() {
  _runTest('Balancer', () => {
    const initialData = Service_Sheet.fetchAllInitialData();
    const context = Engine_ContextBuilder.buildInitialContext(initialData);
    Engine_ConstraintApplier.run(context);
    Engine_OnCallScheduler.run(context);
    Engine_WeekendScheduler.run(context);
    Engine_WeekdayScheduler.run(context);
    Engine_OffDayScheduler.run(context);
    Engine_Balancer.run(context); // Test target
    Service_Sheet.writeScheduleToSheet(context);
  });
}

/**
 * Runs the full generation and then tests the validation service.
 */
function test_runValidation() {
  _runTest('Full Validation', () => {
    // We don't want to show the final success toast from Core_Main,
    // so we call the orchestrator directly.
    Core_Orchestrator.run(); 
  });
}

