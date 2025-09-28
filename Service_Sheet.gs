/**
 * @file Service_Sheet.gs
 * @description Handles all direct interactions with the Google Sheet. Acts as a data layer.
 */
const SheetService = {

  /**
   * Reads all configuration data from the '⚙️설정' sheet.
   * This version is more robust and dynamically finds header columns.
   * @returns {object} A structured object containing staff info, shift types, and rules.
   */
  getConfig: function() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CONFIG);
    const dataRange = sheet.getDataRange().getValues();
    
    const headers = {
      staff: { text: '이름', row: -1, col: -1 },
      shiftCode: { text: '근무 코드 (Code)', row: -1, col: -1 },
      ruleKey: { text: '규칙 키 (Rule Key)', row: -1, col: -1 }
    };

    // Find headers dynamically by searching the first 10 rows
    for (let i = 0; i < Math.min(dataRange.length, 10); i++) {
      for (let j = 0; j < dataRange[i].length; j++) {
        const cellValue = String(dataRange[i][j]).trim();
        if (cellValue === headers.staff.text && headers.staff.row === -1) {
          headers.staff.row = i;
          headers.staff.col = j;
        }
        if (cellValue === headers.shiftCode.text && headers.shiftCode.row === -1) {
          headers.shiftCode.row = i;
          headers.shiftCode.col = j;
        }
        if (cellValue === headers.ruleKey.text && headers.ruleKey.row === -1) {
          headers.ruleKey.row = i;
          headers.ruleKey.col = j;
        }
      }
    }
    
    const config = { staff: [], shifts: {}, rules: {}, specialShiftCodes: {} };

    // Parse Staff
    if (headers.staff.row !== -1) {
      for (let i = headers.staff.row + 1; i < dataRange.length; i++) {
        const name = dataRange[i][headers.staff.col];
        if (name && String(name).trim() !== '') {
          config.staff.push(name);
        } else {
          // Stop if we hit an empty cell in the name column
          if (i > headers.staff.row) break;
        }
      }
    }

    // Parse Shifts
    if (headers.shiftCode.row !== -1) {
      const codeCol = headers.shiftCode.col;
      for (let i = headers.shiftCode.row + 1; i < dataRange.length; i++) {
        const code = dataRange[i][codeCol];
        if (code && String(code).trim() !== '') {
          const shiftInfo = {
            code: code,
            description: dataRange[i][codeCol + 1],
            category: dataRange[i][codeCol + 2],
            hours: parseFloat(dataRange[i][codeCol + 3]) || 0
          };
          config.shifts[code] = shiftInfo;

          if (shiftInfo.category === 'OFF') config.specialShiftCodes.off = code;
          if (shiftInfo.category === '당직') config.specialShiftCodes.onCall = code;
        } else {
          if (i > headers.shiftCode.row) break;
        }
      }
    }

    // Parse Rules
    if (headers.ruleKey.row !== -1) {
      const keyCol = headers.ruleKey.col;
      for (let i = headers.ruleKey.row + 1; i < dataRange.length; i++) {
        const key = dataRange[i][keyCol];
        if (key && String(key).trim() !== '') {
          config.rules[key] = dataRange[i][keyCol + 1];
        } else {
           if (i > headers.ruleKey.row) break;
        }
      }
    }

    if (!config.rules.hasOwnProperty('golden_weekend_days') || !config.rules.golden_weekend_days) {
      LoggerService.log("[CONFIG WARNING] 'golden_weekend_days' rule not found or is empty in settings. Defaulting to '금요일,토요일'.");
      config.rules.golden_weekend_days = '금요일,토요일';
    }

    for (const key in config.rules) {
      const value = config.rules[key];
      if (!isNaN(parseFloat(value)) && isFinite(value)) {
        config.rules[key] = parseFloat(value);
      } else if (String(value).toUpperCase() === 'TRUE') {
        config.rules[key] = true;
      } else if (String(value).toUpperCase() === 'FALSE') {
        config.rules[key] = false;
      }
    }

    return config;
  },
  
  /**
   * Reads and parses approved vacation requests, correcting for timezone issues.
   * @param {number} year The target year.
   * @param {number} month The target month (1-12).
   * @returns {Array<object>} An array of vacation request objects.
   */
  getVacationRequests: function(year, month) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.VACATION);
    const data = sheet.getDataRange().getValues();
    const requests = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[7];
      const name = row[2];
      if (!name || status !== '승인') continue;

      try {
        const type = row[3];
        // Correctly parse dates to avoid timezone shift
        const startCell = new Date(row[4]);
        const start = new Date(startCell.getFullYear(), startCell.getMonth(), startCell.getDate());

        const endCell = new Date(row[5]);
        const end = new Date(endCell.getFullYear(), endCell.getMonth(), endCell.getDate());

        const overlaps = (start.getFullYear() < year || (start.getFullYear() === year && start.getMonth() + 1 <= month)) &&
                         (end.getFullYear() > year || (end.getFullYear() === year && end.getMonth() + 1 >= month));

        if (overlaps) {
          requests.push({ name, type, start, end });
        }
      } catch(e) {
        LoggerService.log(`[WARNING] Could not parse date for row ${i+1} in Vacation sheet. Skipping.`);
      }
    }
    return requests;
  },
  
  /**
   * Reads raw data from the vacation sheet for debugging purposes.
   * @returns {Array<Array<any>>} The raw data.
   */
  getRawVacationData: function() {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.VACATION);
      const data = sheet.getDataRange().getValues();
      data.shift(); // Remove header row
      return data;
  },

  /**
   * Reads holiday data for the target month from '📅캘린더'.
   * @param {number} year The target year.
   * @param {number} month The target month (1-12).
   * @returns {Array<object>} An array of holiday objects.
   */
  getHolidays: function(year, month) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CALENDAR);
    const data = sheet.getDataRange().getValues();
    const holidays = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[2]) continue;
      const date = new Date(row[0]);
      const holidayType = row[2];
      const isHoliday = holidayType === '공휴일' || holidayType === '병원휴무일' || holidayType === '대체휴일';

      if (date.getFullYear() === year && date.getMonth() + 1 === month && isHoliday) {
        holidays.push({
          date: Util_Date.formatDate(date),
          type: holidayType
        });
      }
    }
    return holidays;
  },

  /**
   * Writes the newly generated schedule to the '⭐근무표' sheet.
   * @param {object} context The entire context object.
   */
  writeSchedule: function(context) {
    const { schedule, config } = context;
    const staffList = config.staff;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SCHEDULE);
    
    sheet.getRange('B1').setValue(context.year);
    sheet.getRange('C1').setValue(context.month);
    
    if(staffList.length > 0) {
        const clearRange = sheet.getRange(3, 6, sheet.getMaxRows() - 2, staffList.length);
        clearRange.clearContent();
    }

    const dateColumn = sheet.getRange(3, 1, sheet.getLastRow() - 2, 1).getValues().flat();
    const scheduleData = [];

    dateColumn.forEach(dateCell => {
        let rowData = [];
        if (dateCell instanceof Date && dateCell.getFullYear() === context.year && dateCell.getMonth() + 1 === context.month) {
            const dateString = Util_Date.formatDate(dateCell);
            if(schedule[dateString] && staffList.length > 0) {
                const dayAssignments = schedule[dateString].assignments;
                staffList.forEach(staffName => {
                    const assignment = dayAssignments[staffName] || '';
                    rowData.push(assignment);
                });
            }
        }
        if(rowData.length === 0 && staffList.length > 0) {
            rowData = new Array(staffList.length).fill('');
        }
        scheduleData.push(rowData);
    });

    if (scheduleData.length > 0 && staffList.length > 0) {
      sheet.getRange(3, 6, scheduleData.length, staffList.length).setValues(scheduleData);
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
        throw new Error(`"⭐근무표" 시트의 B1(년)과 C1(월)에 유효한 숫자를 입력해주세요.`);
    }
    return { year: parseInt(year, 10), month: parseInt(month, 10) };
  }
};

