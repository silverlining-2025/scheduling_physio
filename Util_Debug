/**
 * @fileoverview This file contains all functions related to debugging the scheduler.
 * These functions are called directly from the 'Debug' custom menu in the UI.
 * This version has been completely rewritten to align with the new orchestrator flow.
 * @namespace Util_Debug
 */

/**
 * A generic runner function that executes a specific step of the scheduling process,
 * visualizes the output on the sheet, and logs the results.
 * @param {string} stepName The user-friendly name of the step for UI feedback.
 * @param {function} orchestratorFunction The specific function from Core_Orchestrator to run.
 */
function _runAndVisualizeStep(stepName, orchestratorFunction) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    ss.toast(`Running ${stepName}...`, 'Processing...', -1);
    Util_Logger.clear(); 
    Util_Logger.log(`--- DEBUG: Running ${stepName} ---`);
    
    const schedulingData = _gatherSchedulingData(); 
    const result = orchestratorFunction(schedulingData);
    
    // --- Visualization & Logging ---
    Util_Logger.dayProfiles('Day Profiles (After Step)', result.context.dayProfiles);
    Util_Logger.staffProfiles('Staff Profiles (After Step)', result.context.staffProfiles);
    Util_Logger.grid('Schedule Grid State (After Step)', result.context.scheduleGrid, result.context.staffList);

    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const startCell = scheduleSheet.getRange(CONFIG.SCHEDULE.SCHEDULE_AREA_START_CELL);
    const gridEndRow = startCell.getRow() + result.context.numDays - 1;

    Service_Sheet.clearSummaries(gridEndRow + 1);
    Service_Sheet.writeScheduleGrid(result.context.scheduleGrid, result.context.staffList);
    
    const summaryResults = Service_Summary.calculateAll(result.context);
    Service_Sheet.writeDailySummary(summaryResults.daily);
    let nextRow = Service_Sheet.writeWeeklySummary(summaryResults.weekly, gridEndRow + 3);
    Service_Sheet.writeMonthlySummary(summaryResults.monthly, nextRow + 2);

    // Run a full validation check at the end of every step to see the current state.
    Util_Logger.log(`--- DEBUG: ${stepName} Complete. Running FULL validation check... ---`);
    Service_Validation.validate(result.context);

    ss.toast(`✅ ${stepName} complete! Check sheet and logs.`, 'Success!', 7);

  } catch (e) {
    const errorMessage = `Failed during ${stepName}. Error: ${e.message} | Stack: ${e.stack}`;
    Util_Logger.error(errorMessage);
    ss.toast(`Error in ${stepName}: ${e.message}`, 'Failed!', 10);
  }
}

// --- REWRITTEN Public Debug Functions ---

function debugRunStep1() {
  _runAndVisualizeStep('Step 1: Build Blueprint & Apply Constraints', Core_Orchestrator.runStep1_ApplyConstraints.bind(Core_Orchestrator));
}

function debugRunStep2() {
  _runAndVisualizeStep('Step 2: Schedule Weekend Shifts & OFFs', Core_Orchestrator.runStep2_ScheduleWeekends.bind(Core_Orchestrator));
}

function debugRunStep3() {
  _runAndVisualizeStep('Step 3: Fill Weekday Shifts', Core_Orchestrator.runStep3_FillWeekdays.bind(Core_Orchestrator));
}

function debugRunStep4() {
  _runAndVisualizeStep('Step 4: Assign On-Call Duties', Core_Orchestrator.runStep4_AssignOnCall.bind(Core_Orchestrator));
}

function debugRunStep5() {
  _runAndVisualizeStep('Step 5: Balance & Finalize Schedule', Core_Orchestrator.runStep5_BalanceSchedule.bind(Core_Orchestrator));
}


function debugRunValidation() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    try {
     ss.toast('Running full validation check...', 'Processing...', -1);
     Util_Logger.clear();
     Util_Logger.log('--- DEBUG: Running Full Validation Check on Current Sheet ---');
     const schedulingData = _gatherSchedulingData();
     const ctx = Core_Orchestrator.recreateContextForValidation(schedulingData);
     Service_Validation.validate(ctx);
     ss.toast('✅ Validation check complete! See logs.', 'Complete!', 5);
    } catch(e) {
       const errorMessage = `Validation check failed. Error: ${e.message} | Stack: ${e.stack}`;
       Util_Logger.error(errorMessage);
       ss.toast(`Error during validation: ${e.message}`, 'Failed!', 10);
    }
}

function debugClearScheduleArea() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
  try {
    const year = sheet.getRange(CONFIG.SCHEDULE.YEAR_CELL).getValue();
    const month = sheet.getRange(CONFIG.SCHEDULE.MONTH_CELL).getValue();
    if (!year || !month) throw new Error("Year/Month not selected.");
    
    const startCell = sheet.getRange(CONFIG.SCHEDULE.SCHEDULE_AREA_START_CELL);
    const staffCount = Service_Sheet.getColumn(ss.getSheetByName(CONFIG.SHEET_NAMES.SETTINGS), CONFIG.SETTINGS.STAFF_LIST_RANGE).length;
    if(staffCount === 0) throw new Error("No staff found in Settings sheet.");

    const clearRange = sheet.getRange(startCell.getRow() -1, 4, 32, staffCount + 4);
    clearRange.clearContent();
    Service_Sheet.clearSummaries(startCell.getRow() + 31);
    
    ss.toast('All generated schedule and summary areas have been cleared.', 'Complete', 3);
  } catch(e) {
    ss.toast(`Could not clear area: ${e.message}`, 'Error', 5);
  }
}

