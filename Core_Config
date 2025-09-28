/**
 * @fileoverview This file contains all global constants and configuration settings for the scheduling application.
 * By centralizing these values, we can easily manage and update the script's behavior without changing the core logic.
 * @namespace CONFIG
 */
const CONFIG = {
  // --- Sheet Names ---
  SHEET_NAMES: {
    SCHEDULE: '⭐근무표',
    SETTINGS: '⚙️설정',
    CALENDAR: '📅캘린더',
    REQUESTS: '⛱️휴가신청',
    LOG: '📈로그',
  },
  
  // --- Ranges in ⭐근무표 (Schedule Sheet) ---
  SCHEDULE: {
    YEAR_CELL: 'B1',
    MONTH_CELL: 'C1',
    SCHEDULE_AREA_START_CELL: 'F3', // The first cell where the schedule grid (e.g., D8) begins.
  },

  // --- Ranges in ⚙️설정 (Settings Sheet) ---
  SETTINGS: {
    STAFF_LIST_RANGE: 'A2:A10',
    SHIFT_DEFINITIONS_RANGE: 'E2:H',
    SCHEDULING_RULES_RANGE: 'J2:L',
  },
  
  // --- Column Names in ⛱️휴가신청 (Requests Sheet) ---
  REQUESTS: {
    STATUS_COLUMN_NAME: '상태',
    APPROVED_STATUS_VALUE: '승인',
    NAME_COLUMN_NAME: '이름',
    START_DATE_COLUMN_NAME: '시작일',
    END_DATE_COLUMN_NAME: '종료일',
    TYPE_COLUMN_NAME: '요청 종류',
  },

  // --- Calendar Generation Settings ---
  CALENDAR: {
    HEADERS: ['날짜', '요일', '구분', '휴일명'],
    TIME_ZONE: 'Asia/Seoul',
  },

  // --- Holiday API Settings ---
  HOLIDAY_API: {
    BASE_URL: 'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo',
    API_KEY_PROPERTY: 'HOLIDAY_API_KEY',
  },
};

// Freeze the object to prevent accidental modifications during script execution.
Object.freeze(CONFIG);

