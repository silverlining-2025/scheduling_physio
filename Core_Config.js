/**
 * @file Core_Config.js
 * @description Centralized configuration settings for the scheduling application.
 * This file contains all essential settings, making the application easy to manage and update.
 * All modules should refer to this file for constants instead of using hardcoded values.
 */
const CONFIG = {
  // 1. Spreadsheet and Sheet Configuration
  SHEET_NAMES: {
    SETTINGS: '⚙️설정',
    SCHEDULE: '⭐근무표',
    LEAVE_REQUESTS: '⛱️휴가신청',
    LOG: '📈로그',
    MY_SCHEDULE: '👤내 근무 확인',
    CALENDAR: '📅캘린더', // Corrected typo from '캘린der'
  },

  // 2. Cell Range Definitions
  RANGES: {
    SETTINGS_STAFF_LIST: 'A2:C',
    SETTINGS_SHIFT_DEFINITIONS: 'E2:H',
    SETTINGS_SCHEDULING_RULES: 'J2:L',
    SCHEDULE_YEAR_MONTH: 'B1:C1',
    SCHEDULE_GRID_START_CELL: 'F3',
    CALENDAR_DATA_RANGE: 'A2:D',
  },

  // 3. Status and Keyword Definitions
  LEAVE_STATUS: {
    APPROVED: '승인',
    PENDING: '대기',
    REJECTED: '반려',
  },
  SHIFT_CATEGORIES: {
    ON_CALL: '당직',
    WEEKEND: '주말근무',
    WEEKDAY: '일반근무',
  },
  DAY_CATEGORIES: {
    WEEKEND: '주말',
    HOLIDAY: '공휴일',
    WEEKDAY: '평일',
  },
  SPECIAL_SHIFTS: {
    OFF: 'OFF',
  },

  // 4. Algorithm and Engine Settings
  BALANCER_MAX_ITERATIONS: 10000, // Safety break for the balancing loop.

  // 5. User Interface Messages
  UI_MESSAGES: {
    GENERATION_SUCCESS: '✅ 스케줄 초안이 성공적으로 생성되었습니다.',
    GENERATION_START: '⏳ 스케줄 초안 생성을 시작합니다...',
    VALIDATION_ERROR: '⚠️ 규칙 위반! "📈로그" 시트에서 자세한 내용을 확인하세요.',
    MISSING_SETTINGS_ERROR: (sheetName) => `"${sheetName}" 시트가 없습니다. 확인 후 다시 시도해주세요.`,
    GENERIC_ERROR: '알 수 없는 오류가 발생했습니다. "📈로그" 시트를 확인해주세요.',
    SETUP_SIDEBAR_TITLE: '초기 설정',
    CALENDAR_UPDATE_SUCCESS: '📅 캘린더가 성공적으로 업데이트되었습니다.',
    CALENDAR_UPDATE_START: '📅 공휴일 정보를 업데이트합니다...',
    DEBUG_SUCCESS: (testName) => `✅ ${testName} 테스트를 성공적으로 완료했습니다.`,
    DEBUG_ERROR: (testName, error) => `❌ ${testName} 테스트 중 오류 발생: ${error.message}`,
  },
  
  // 6. API Configuration
  HOLIDAY_API_URL: 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo',
  HOLIDAY_API_SERVICE_KEY_PROPERTY: 'HOLIDAY_API_KEY', 
};

