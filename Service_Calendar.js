/**
 * @fileoverview Contains business logic related to creating and managing the calendar data.
 * This service does not interact directly with the spreadsheet.
 * @namespace Service_Calendar
 */
const Service_Calendar = {
  /**
   * Generates a 2D array of calendar data for a given date range and holiday map.
   * This is a "pure" function, making it easy to test and reuse.
   * @param {Date} startDate The first day of the calendar.
   * @param {Date} endDate The last day of the calendar.
   * @param {Map<string, string>} holidayMap A map of 'YYYY-MM-DD' to holiday names.
   * @returns {Array<Array<any>>} A 2D array representing the calendar rows.
   */
  generateCalendarRows: function(startDate, endDate, holidayMap) {
    const calendarRows = [];
    const KOREAN_DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateString = Utilities.formatDate(currentDate, CONFIG.CALENDAR.TIME_ZONE, 'yyyy-MM-dd');
      const dayOfWeek = currentDate.getDay();
      let category = '';
      let holidayName = '';

      if (holidayMap.has(dateString)) {
        category = '공휴일';
        holidayName = holidayMap.get(dateString);
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        category = '주말';
      } else {
        category = '평일';
      }

      calendarRows.push([
        new Date(currentDate),
        KOREAN_DAYS[dayOfWeek],
        category,
        holidayName
      ]);

      currentDate.setDate(currentDate.getDate() + 1);
    }
    return calendarRows;
  }
};

