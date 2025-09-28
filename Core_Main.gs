/**
 * @file Core_Main.gs
 * @description Main entry point for the script. Contains menu functions and triggers.
 */

// --- GLOBAL CONSTANTS ---
const SHEETS = {
  CONFIG: '⚙️설정',
  VACATION: '⛱️휴가신청',
  SCHEDULE: '⭐근무표',
  CALENDAR: '📅캘린더',
  MY_SCHEDULE: '👤내 근무 확인',
  LOG: '📈로그'
};

/**
 * Main function to run the scheduler from the menu.
 */
function runScheduler() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('스케줄 생성을 시작하시겠습니까?', '기존 "⭐근무표" 시트의 내용은 모두 삭제되고 새로운 스케줄로 덮어쓰기 됩니다.', ui.ButtonSet.OK_CANCEL);

  if (response !== ui.Button.OK) {
    ui.alert('스케줄 생성이 취소되었습니다.');
    return;
  }
  
  LoggerService.clear();
  try {
    const { year, month } = SheetService.getTargetDate();
    const success = Orchestrator.generateSchedule(year, month);
    if (!success) {
      throw new Error("Scheduler returned a failure status.");
    }
     SpreadsheetApp.getUi().alert('스케줄 생성이 완료되었습니다. "⭐근무표" 시트를 확인하세요.');
  } catch (e) {
    LoggerService.log(`🚨 CRITICAL ERROR: 스케줄 생성 중 심각한 오류가 발생했습니다. ${e.message}\n${e.stack}`);
    ui.alert(`오류 발생: 스케줄 생성을 중단했습니다. "📈로그" 시트를 확인해주세요.`);
  } finally {
    LoggerService.writeToSheet();
  }
}

/**
 * Adds a custom menu to the spreadsheet UI.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('👩‍⚕️ 물리치료실 스케줄러')
    .addItem('➡️ 스케줄 생성 실행', 'runScheduler')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('🧪 테스트 실행')
      .addItem('Stage 1: 데이터 로드 테스트', 'DebugService.runTestStage1')
      .addItem('Stage 2: 프로필 생성 테스트', 'DebugService.runTestStage2')
      .addItem('Stage 3: 목표 계산 테스트', 'DebugService.runTestStage3')
      .addItem('Stage 4: 사전 조건 적용 테스트', 'DebugService.runTestStage4')
      .addItem('Stage 5: 메인 루프 테스트', 'DebugService.runTestStage5')
      .addSeparator()
      .addItem('🧪 모든 테스트 실행 (로그 시트 확인)', 'DebugService.runAllTests')
    )
    .addToUi();
}

