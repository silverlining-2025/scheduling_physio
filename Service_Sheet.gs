/**
 * @file Service_Sheet.gs
 * @description Handles all direct interactions with the Google Sheet. Acts as a data layer.
 */
const SheetService = {

  /**
   * Reads all configuration data from the '⚙️설정' sheet.
   * @returns {object} A structured object containing staff info, shift types, and rules.
   */
  getConfig: function() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CONFIG);
    const staffData = sheet.getRange('A2:A15').getValues().flat().filter(String);
    const shiftData = sheet.getRange('E2:H15').getValues();
    const rulesData = sheet.getRange('J2:L50').getValues();

    const config = {
      staff: staffData,
      shifts: {},
      rules: {}
    };

    // Parse shift types
    shiftData.forEach(row => {
      if (row[0]) { // If code exists
        config.shifts[row[0]] = {
          code: row[0],
          description: row[1],
          category: row[2],
          hours: parseFloat(row[3]) || 0
        };
      }
    });

    // --- Parse all rules into a key-value object ---
    const allRules = {};
    rulesData.forEach(row => {
        if (row[0]) { // Check if the key exists
            allRules[row[0]] = row[1];
        }
    });
    
    // --- Helper function to find a rule's value from the object ---
    const getRuleValue = (rulesObject, key, defaultValue) => {
        if (rulesObject.hasOwnProperty(key) && rulesObject[key] !== '') {
            return rulesObject[key];
        }
        return defaultValue;
    };
    
    // === Comprehensive Rule Loading ===

    // --- 1. Labor Laws & Regulations ---
    config.rules.max_weekly_hours = parseInt(getRuleValue(allRules, 'max_weekly_hours', '52'), 10);
    config.rules.max_daily_hours = parseInt(getRuleValue(allRules, 'max_daily_hours', '10'), 10);
    config.rules.min_rest_hours_between_shifts = parseInt(getRuleValue(allRules, 'min_rest_hours_between_shifts', '11'), 10);
    config.rules.max_consecutive_work_days = parseInt(getRuleValue(allRules, 'consecutive_work_days_max', '6'), 10);

    // --- 2. Staffing Requirements per Day ---
    config.rules.mon_staff_fixed = parseInt(getRuleValue(allRules, 'mon_staff_fixed', '6'), 10);
    config.rules.tue_fri_staff_min = parseInt(getRuleValue(allRules, 'tue_fri_staff_min', '4'), 10);
    config.rules.tue_fri_staff_max = parseInt(getRuleValue(allRules, 'tue_fri_staff_max', '5'), 10);
    config.rules.weekend_holiday_staff_required = parseInt(getRuleValue(allRules, 'weekend_holiday_staff_required', '2'), 10);
    config.rules.oncall_required_weekday = getRuleValue(allRules, 'oncall_required_weekday', 'FALSE').toString().toUpperCase() === 'TRUE';
    config.rules.oncall_required_weekend = getRuleValue(allRules, 'oncall_required_weekend', 'FALSE').toString().toUpperCase() === 'TRUE';

    // --- 3. Fairness, Targets & Constraints ---
    config.rules.target_monthly_hours_method = getRuleValue(allRules, 'target_monthly_hours_method', 'auto');
    config.rules.target_weekly_hours_max = parseInt(getRuleValue(allRules, 'target_weekly_hours_max', '52'), 10);
    config.rules.target_weekly_hours_method = getRuleValue(allRules, 'target_weekly_hours_method', 'auto');
    config.rules.golden_weekend_enabled = getRuleValue(allRules, 'golden_weekend_enabled', 'TRUE').toString().toUpperCase() === 'TRUE';
    config.rules.golden_weekend_days = getRuleValue(allRules, 'golden_weekend_days', '금요일,토요일');
    config.rules.enforce_paired_weekend_work = getRuleValue(allRules, 'enforce_paired_weekend_work', 'TRUE').toString().toUpperCase() === 'TRUE';
    config.rules.max_consecutive_offs = parseInt(getRuleValue(allRules, 'max_consecutive_offs', '2'), 10);
    config.rules.consecutive_oncall_days_max = parseInt(getRuleValue(allRules, 'consecutive_oncall_days_max', '1'), 10);
    config.rules.consecutive_weekend_work_days_max = parseInt(getRuleValue(allRules, 'consecutive_weekend_work_days_max', '1'), 10);
    config.rules.max_staff_on_golden_weekend_off = parseInt(getRuleValue(allRules, 'max_staff_on_golden_weekend_off', '2'), 10);

    // --- 4. Algorithm Behavior ---
    config.rules.off_day_calculation_method = getRuleValue(allRules, 'off_day_calculation_method', 'sundays_holidays_half_saturdays');

    return config;
  },

  /**
   * Reads and parses approved vacation requests from '⛱️휴가신청'.
   * @returns {Array<object>} An array of vacation request objects.
   */
  getVacationRequests: function() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.VACATION);
    const data = sheet.getRange(2, 1, sheet.getLastRow(), 8).getValues();
    const requests = [];

    data.forEach(row => {
      const status = row[7];
      if (row[2] && status === '승인') { 
        requests.push({
          name: row[2],
          type: row[3],
          start: new Date(row[4]),
          end: new Date(row[5])
        });
      }
    });
    return requests;
  },

  /**
   * Reads holiday data for the target month from '📅캘린더'.
   * @param {number} year The target year.
   * @param {number} month The target month (1-12).
   * @returns {Array<object>} An array of holiday objects {date: 'YYYY-MM-DD', type: '공휴일'}.
   */
  getHolidays: function(year, month) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CALENDAR);
    const data = sheet.getRange('A2:C').getValues();
    const holidays = [];
    
    data.forEach(row => {
      if (!row[0] || !row[2]) return; // Skip if no date or type
      const date = new Date(row[0]);
      const holidayType = row[2];

      const isHoliday = holidayType === '공휴일' || holidayType === '병원휴무일' || holidayType === '대체휴일';

      if (date.getFullYear() === year && date.getMonth() + 1 === month && isHoliday) {
        holidays.push({
          date: Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd'),
          type: holidayType
        });
      }
    });
    return holidays;
  },

  /**
   * Writes the newly generated schedule to the '⭐근무표' sheet.
   * Performs a pre-emptive validation check before writing.
   * @param {object} context The entire context object.
   */
  writeSchedule: function(context) {
    const { schedule, config } = context;
    const staffList = config.staff;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.SCHEDULE);

    const year = new Date(Object.keys(schedule)[0]).getFullYear();
    const month = new Date(Object.keys(schedule)[0]).getMonth() + 1;

    sheet.getRange('B1').setValue(year);
    sheet.getRange('C1').setValue(month);
    
    const clearRange = sheet.getRange(3, 6, sheet.getMaxRows() - 2, staffList.length);
    clearRange.clearContent();

    const validCodes = new Set(Object.keys(config.shifts));
    validCodes.add('OFF');
    validCodes.add('휴가');
    validCodes.add('');

    const dateColumn = sheet.getRange(3, 1, sheet.getLastRow() - 2, 1).getValues().flat();
    const scheduleData = [];
    let validationPassed = true;

    dateColumn.forEach(dateCell => {
        const rowData = [];
        if (dateCell instanceof Date) {
            const dateString = Utilities.formatDate(dateCell, 'Asia/Seoul', 'yyyy-MM-dd');
            if(schedule[dateString]) {
                const dayAssignments = schedule[dateString].assignments;
                staffList.forEach(staffName => {
                    const assignment = dayAssignments[staffName] || '';
                    if (!validCodes.has(assignment)) {
                        LoggerService.log(`🚨 VALIDATION ERROR: Attempting to write invalid code '${assignment}' for staff '${staffName}' on date '${dateString}'.`);
                        validationPassed = false;
                    }
                    rowData.push(assignment);
                });
                scheduleData.push(rowData);
            } else {
                scheduleData.push(new Array(staffList.length).fill(''));
            }
        } else {
            scheduleData.push(new Array(staffList.length).fill(''));
        }
    });

    if (validationPassed && scheduleData.length > 0) {
      sheet.getRange(3, 6, scheduleData.length, staffList.length).setValues(scheduleData);
      LoggerService.log('[SheetService] Successfully wrote schedule to the sheet.');
    } else if (!validationPassed) {
        LoggerService.log('[SheetService] Write operation aborted due to validation errors.');
        throw new Error("Invalid data found. Aborting write to sheet. Check logs for details.");
    }
  },

  /**
   * Writes the detailed execution log to a '📈로그' sheet.
   * @param {Array<string>} logMessages The array of log messages.
   */
  writeLog: function(logMessages) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(SHEETS.LOG);
    if (!logSheet) {
      logSheet = ss.insertSheet(SHEETS.LOG);
    }
    logSheet.clear();
    const messages = Array.isArray(logMessages) ? logMessages : [logMessages];
    const formattedLogs = messages.map(msg => [new Date().toISOString(), msg]);
    logSheet.getRange(1, 1, formattedLogs.length, 2).setValues(formattedLogs);
    // --- (MODIFIED) Force the sheet to update immediately ---
    SpreadsheetApp.flush();
  },
  
  /**
   * Gets the target year and month from the '⭐근무표' sheet.
   * @returns {{year: number, month: number}}
   */
  getTargetDate: function() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SCHEDULE);
    const year = sheet.getRange('B1').getValue();
    const month = sheet.getRange('C1').getValue();
    if (!year || !month || isNaN(year) || isNaN(month)) {
        throw new Error('"⭐근무표" 시트의 B1(년)과 C1(월)에 유효한 숫자를 입력해주세요.');
    }
    return { year: parseInt(year, 10), month: parseInt(month, 10) };
  }
};

