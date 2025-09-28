/**
 * @file Service_Rules.js
 * @description Provides a clean interface for accessing scheduling rules from the context.
 * Must be initialized with the context object before use.
 */
const Service_Rules = {
  _context: null,

  /**
   * Initializes the service with the global context.
   * @param {Object} context The global scheduling context.
   */
  init: function (context) {
    this._context = context;
  },
  
  /**
   * Retrieves a specific rule value by its key.
   * @param {string} key The key of the rule to retrieve.
   * @returns {any} The value of the rule, or undefined if not found.
   */
  getRule: function (key) {
    if (!this._context) throw new Error("Service_Rules has not been initialized.");
    return this._context.rules.get(key);
  },

  /**
   * Gets the minimum required staff for a given day based on its category.
   * @param {number} day The day of the month.
   * @returns {number} The minimum number of staff.
   */
  getMinStaffForDay: function (day) {
    const dayProfile = this._context.dayProfiles.get(day);
    const key = `min_staff_${dayProfile.category.toLowerCase()}`;
    return Number(this.getRule(key)) || 1; // Default to 1 if not specified
  },

  /**
   * Gets the maximum allowed staff for a given day based on its category.
   * @param {number} day The day of the month.
   * @returns {number} The maximum number of staff.
   */
  getMaxStaffForDay: function (day) {
    const dayProfile = this._context.dayProfiles.get(day);
    const key = `max_staff_${dayProfile.category.toLowerCase()}`;
    return Number(this.getRule(key)) || this._context.staffList.length; // Default to all staff
  },

  /**
   * Calculates the target monthly work hours for a staff member.
   * @param {string} staffName The name of the staff member.
   * @returns {number} The target work hours for the month.
   */
  getMonthlyTargetHours: function(staffName) {
    // This can be expanded based on rules, but a simple calculation is used for now.
    const workdayCount = Array.from(this._context.dayProfiles.values())
      .filter(p => p.category === CONFIG.DAY_CATEGORIES.WEEKDAY).length;
    return workdayCount * 8; 
  }
};

