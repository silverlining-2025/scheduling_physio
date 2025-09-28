/**
 * @file Service_Calendar.js
 * @description Manages the 'Calendar' sheet, including updating it from an API.
 */
const Service_Calendar = {
  /**
   * Updates the calendar sheet with holidays for a given year.
   * @param {number} year The year to fetch holidays for.
   */
  updateCalendarWithHolidays: function(year) {
    const sheet = Service_Sheet._getSheetByName(CONFIG.SHEET_NAMES.CALENDAR);
    const holidays = Service_HolidayApi.fetchHolidays(year);

    // Create a full year's calendar grid.
    const calendarGrid = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
        const dayOfWeek = Utilities.formatDate(d, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'EEEE');
        const holiday = holidays.find(h => h.locdate.toString() === dateStr.replace(/-/g, ''));
        
        let category = CONFIG.DAY_CATEGORIES.WEEKDAY;
        if (d.getDay() === 0 || d.getDay() === 6) { // Sunday or Saturday
            category = CONFIG.DAY_CATEGORIES.WEEKEND;
        }
        if (holiday) {
            category = CONFIG.DAY_CATEGORIES.HOLIDAY;
        }
        
        calendarGrid.push([dateStr, dayOfWeek, category, holiday ? holiday.dateName : '']);
    }

    // Clear existing data and write the new calendar.
    if(sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).clearContent();
    }
    sheet.getRange(2, 1, calendarGrid.length, 4).setValues(calendarGrid);

    Util_Logger.log('INFO', `Calendar sheet updated for year ${year}.`);
  }
};

