/**
 * @file Core_Triggers.js
 * @description Manages all automated triggers for the spreadsheet (onOpen, onFormSubmit).
 * This is the only file that should contain these special function names.
 */

/**
 * Creates the custom menu in the spreadsheet UI when the file is opened.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('🗓️ 스케줄 자동생성');
  
  // Main user-facing menu
  menu.addItem('1. 스케줄 초안 생성', 'generateDraftSchedule');
  menu.addSeparator();
  menu.addItem('2. 공휴일 캘린더 업데이트', 'updateHolidayCalendar');
  menu.addItem('3. 설정', 'showSetupSidebar');
  menu.addSeparator();

  // Developer and debugging submenu
  const devMenu = ui.createMenu('🧪 개발자 테스트');
  devMenu.addItem('Context 객체 로그 출력', 'debug_logCurrentContext');
  devMenu.addItem('스케줄 그리드 초기화', 'debug_clearSchedule');
  devMenu.addSeparator();
  devMenu.addItem('단계별 테스트: 제약조건 적용', 'test_runConstraintApplier');
  devMenu.addItem('단계별 테스트: 당직 스케줄러', 'test_runOnCallScheduler');
  devMenu.addItem('단계별 테스트: 주말 스케줄러', 'test_runWeekendScheduler');
  devMenu.addItem('단계별 테스트: 밸런서', 'test_runBalancer');
  devMenu.addSeparator();
  devMenu.addItem('전체 스케줄 유효성 검사', 'test_runValidation');

  menu.addSubMenu(devMenu);
  
  menu.addToUi();
}


/**
 * Runs when a leave request is submitted via Google Forms.
 * Sets the initial status of the request to 'Pending'.
 * @param {GoogleAppsScript.Events.SheetsOnFormSubmit} e The event object from the form submission.
 */
function onFormSubmit(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.LEAVE_REQUESTS);
    if (!sheet) return;
    // The status is expected to be the last column of the form response range.
    const statusColumn = e.range.getLastColumn();
    const statusRange = sheet.getRange(e.range.getRow(), statusColumn);
    statusRange.setValue(CONFIG.LEAVE_STATUS.PENDING);
  } catch (err) {
    Util_Logger.log('ERROR', `Error in onFormSubmit trigger: ${err.message}`);
  }
}

