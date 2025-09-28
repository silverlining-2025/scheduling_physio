/**
 * @file Util_Helpers.js
 * @description Contains generic, stateless helper functions used by multiple modules.
 */
const Util_Helpers = {
  /**
   * Counts the number of staff assigned to a working shift on a given day.
   * @param {Object} context The global scheduling context.
   * @param {number} day The day of the month.
   * @returns {number} The number of assigned staff.
   */
  getAssignedStaffCountForDay: function (context, day) {
    let count = 0;
    for (let i = 0; i < context.staffList.length; i++) {
      const shiftCode = context.scheduleGrid[i][day - 1];
      // A working shift is anything that is not null, not 'OFF', and not a leave code.
      // This is a simplification; a more robust check might query shift definitions.
      if (shiftCode && shiftCode !== CONFIG.SPECIAL_SHIFTS.OFF && !context.shiftDefinitions.get(shiftCode)?.hours === 0) {
        count++;
      }
    }
    return count;
  },

  /**
   * Gets a list of staff indices who are available (slot is null) on a given day.
   * @param {Object} context The global scheduling context.
   * @param {number} day The day of the month.
   * @returns {Array<number>} An array of available staff indices.
   */
  getAvailableStaffForDay: function (context, day) {
    const available = [];
    for (let i = 0; i < context.staffList.length; i++) {
      if (this.isStaffAvailableOnDay(context, day, i)) {
        available.push(i);
      }
    }
    return available;
  },

  /**
   * Checks if a specific staff member is available on a specific day.
   * @param {Object} context The global scheduling context.
   * @param {number} day The day of the month.
   * @param {number} staffIndex The index of the staff member.
   * @returns {boolean} True if the staff member's schedule slot is empty (null).
   */
  isStaffAvailableOnDay: function (context, day, staffIndex) {
    return context.scheduleGrid[staffIndex][day - 1] === null;
  },
};

