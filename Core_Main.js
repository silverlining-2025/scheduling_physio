/**
 * @file Core_Main.js
 * @description Main entry point for user-initiated actions from the custom menu.
 * This file bridges the UI and the core application logic.
 */

/**
 * Primary function called from the 'Generate Schedule' menu item.
 * It orchestrates the entire schedule generation process.
 */
function generateDraftSchedule() {
  const ui = SpreadsheetApp.getUi();
  ui.showToast(CONFIG.UI_MESSAGES.GENERATION_START, '시작');
  
  try {
    // Hand off the main logic to the orchestrator.
    Core_Orchestrator.run();
    
    ui.showToast(CONFIG.UI_MESSAGES.GENERATION_SUCCESS, '완료');
    Util_Logger.log('INFO', '========== Schedule Generation Run Finished Successfully ==========');

  } catch (e) {
    // Catch any errors bubbling up from the orchestrator and show a user-friendly message.
    Util_Logger.log('ERROR', `Generation failed! ${e.name}: ${e.message}\nStack: ${e.stack}`);
    let userMessage = CONFIG.UI_MESSAGES.GENERIC_ERROR;
    if (e.name === 'MissingSheetError') {
      userMessage = CONFIG.UI_MESSAGES.MISSING_SETTINGS_ERROR(e.sheetName);
    } else if (e.name === 'ValidationError') {
      userMessage = CONFIG.UI_MESSAGES.VALIDATION_ERROR;
    }
    ui.showToast(userMessage, '오류', -1);
  }
}

/**
 * Function called from the menu to update the holiday calendar.
 */
function updateHolidayCalendar() {
    const ui = SpreadsheetApp.getUi();
    ui.showToast(CONFIG.UI_MESSAGES.CALENDAR_UPDATE_START, '시작');
    
    try {
        const year = new Date().getFullYear(); // Or get from a cell in the sheet
        Service_Calendar.updateCalendarWithHolidays(year);
        ui.showToast(CONFIG.UI_MESSAGES.CALENDAR_UPDATE_SUCCESS, '완료');
    } catch (e) {
        Util_Logger.log('ERROR', `Calendar update failed: ${e.message}`);
        ui.showToast(`캘린더 업데이트 실패: ${e.message}`, '오류');
    }
}

