/**
 * @file Util_Date.gs
 * @description Contains utility functions for date manipulation.
 */

const Util_Date = {
  /**
   * Formats a Date object into 'YYYY-MM-DD' string.
   * @param {Date} date The date object.
   * @returns {string} The formatted date string.
   */
  formatDate: function(date) {
    return Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd');
  },

  /**
   * Checks if a given date is a weekend (Saturday or Sunday).
   * @param {Date} date The date object.
   * @returns {boolean} True if the date is a weekend.
   */
  isWeekend: function(date) {
    const day = date.getDay();
    return day === 6 || day === 0; // 6 = Saturday, 0 = Sunday
  }
};

