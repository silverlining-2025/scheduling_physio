/**
 * @file Engine_ContextBuilder.js
 * @description Builds the main 'context' object that holds all state for a scheduling run.
 */
const Engine_ContextBuilder = {
  /**
   * Constructs the initial context object from raw data.
   * @param {Object} data The raw data fetched from Service_Sheet.
   * @returns {Object} The fully initialized context object.
   */
  buildInitialContext: function (data) {
    const { year, month, staffList, rules, shiftDefinitions, approvedLeave, calendarData } = data;
    const numDays = new Date(year, month, 0).getDate();

    const context = {
      year, month, numDays, staffList, rules, shiftDefinitions, approvedLeave,
      calendarMap: this._buildCalendarMap(calendarData, year, month),
      scheduleGrid: Array.from({ length: staffList.length }, () => Array(numDays).fill(null)),
      dayProfiles: new Map(),
      staffProfiles: new Map(),
      weeks: [],
    };

    // CRITICAL: Initialize the rules service early so other builders can use it.
    Service_Rules.init(context);
    
    // REFACTORED: Use a two-pass approach to avoid circular dependency.
    this._buildWeeksAndDayProfiles(context);
    
    this._buildStaffProfiles(context);

    return context;
  },

  /**
   * Creates a Map for quick lookup of calendar information by day number.
   * @private
   * @param {Array<Array<any>>} calendarData The raw calendar data from the sheet.
   * @param {number} year The target year.
   * @param {number} month The target month.
   * @returns {Map<number, Object>} A map where key is the day number and value is calendar info.
   */
  _buildCalendarMap: function (calendarData, year, month) {
    const map = new Map();
    calendarData.forEach(row => {
      const date = new Date(row[0]);
      if (date.getFullYear() === year && date.getMonth() + 1 === month) {
        map.set(date.getDate(), { 
          dayName: row[1], 
          category: row[2] || CONFIG.DAY_CATEGORIES.WEEKDAY, 
          holidayName: row[3] || '' 
        });
      }
    });
    return map;
  },

  /**
   * Populates the dayProfiles and weeks properties of the context.
   * This is now a two-pass process to prevent circular dependencies.
   * @private
   * @param {Object} context The context object being built.
   */
  _buildWeeksAndDayProfiles: function (context) {
    // --- PASS 1: Create basic day profiles and week structure ---
    const weeks = [];
    let currentWeek = { weekNumber: 1, days: [] };
    
    for (let day = 1; day <= context.numDays; day++) {
      const date = new Date(context.year, context.month - 1, day);
      const calendarInfo = context.calendarMap.get(day) || { 
          dayName: Utilities.formatDate(date, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'EEEE'), 
          category: (date.getDay() === 0 || date.getDay() === 6) ? CONFIG.DAY_CATEGORIES.WEEKEND : CONFIG.DAY_CATEGORIES.WEEKDAY
      };
      
      context.dayProfiles.set(day, {
        date: date,
        dayName: calendarInfo.dayName,
        category: calendarInfo.category,
      });
      
      currentWeek.days.push(day);
      if (date.getDay() === 0 || day === context.numDays) { // Sunday is the end of the week in GAS
        weeks.push(currentWeek);
        currentWeek = { weekNumber: weeks.length + 1, days: [] };
      }
    }
    context.weeks = weeks;

    // --- PASS 2: Enrich day profiles with rule-based data ---
    // This can now be done safely because all basic day profiles exist.
    for (let day = 1; day <= context.numDays; day++) {
      const profile = context.dayProfiles.get(day);
      profile.minStaff = Service_Rules.getMinStaffForDay(day);
      profile.maxStaff = Service_Rules.getMaxStaffForDay(day);
    }
  },

  /**
   * Initializes a profile object for each staff member.
   * @private
   * @param {Object} context The context object being built.
   */
  _buildStaffProfiles: function (context) {
    context.staffList.forEach(staff => {
      context.staffProfiles.set(staff.name, {
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        summary: { /* Populated later by Service_Summary */ },
      });
    });
  },
};

