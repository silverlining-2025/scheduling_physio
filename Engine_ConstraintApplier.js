/**
 * @file Engine_ConstraintApplier.js
 * @description Applies pre-defined hard constraints (like leave) to the schedule before generation.
 */
const Engine_ConstraintApplier = {
  /**
   * Runs all constraint application steps.
   * @param {Object} context The global scheduling context.
   */
  run: function (context) {
    this._applyApprovedLeave(context);
    if (Service_Rules.getRule('special_off_block_enabled') === true) {
      this._assignGuaranteedOffBlocks(context);
    }
  },

  /**
   * Marks approved leave on the schedule grid.
   * @private
   * @param {Object} context The global scheduling context.
   */
  _applyApprovedLeave: function (context) {
    context.approvedLeave.forEach(leave => {
      const staffIndex = context.staffList.findIndex(s => s.name === leave.name);
      if (staffIndex !== -1) {
        for (let day = leave.startDay; day <= leave.endDay; day++) {
          if (day >= 1 && day <= context.numDays) {
            context.scheduleGrid[staffIndex][day - 1] = leave.reason;
          }
        }
      }
    });
  },

  /**
   * Assigns the guaranteed "Fri+Sat" OFF block to each staff member.
   * @private
   * @param {Object} context The global scheduling context.
   */
  _assignGuaranteedOffBlocks: function (context) {
    const offBlockDays = Service_Rules.getRule('special_off_block_days').split(',');
    
    context.staffList.forEach((staff, staffIndex) => {
      const possibleFridays = this._findPossibleOffBlockStarts(context, staffIndex, offBlockDays[0]);
      
      if (possibleFridays.length > 0) {
        // Simple strategy: assign the first available block.
        // A more complex strategy could involve balancing these blocks throughout the month.
        const assignedDay = possibleFridays[0];
        context.scheduleGrid[staffIndex][assignedDay - 1] = CONFIG.SPECIAL_SHIFTS.OFF;
        context.scheduleGrid[staffIndex][assignedDay] = CONFIG.SPECIAL_SHIFTS.OFF;
        Util_Logger.log('DEBUG', `Assigned guaranteed '${offBlockDays.join('+')}' OFF to ${staff.name} on days ${assignedDay}-${assignedDay + 1}.`);
      } else {
        Util_Logger.log('WARNING', `Could not find a valid '${offBlockDays.join('+')}' OFF block for ${staff.name}. This might be due to pre-existing leave requests.`);
      }
    });
  },

  /**
   * Finds all possible start days for a guaranteed OFF block for a specific staff member.
   * @private
   * @param {Object} context The global scheduling context.
   * @param {number} staffIndex The index of the staff member.
   * @param {string} startDayName The name of the day the block should start on (e.g., "금요일").
   * @returns {Array<number>} A list of day numbers that are valid start dates.
   */
  _findPossibleOffBlockStarts: function (context, staffIndex, startDayName) {
    const possibleDays = [];
    for (let day = 1; day < context.numDays; day++) {
      if (context.dayProfiles.get(day).dayName === startDayName) {
        // Check if both the start day and the next day are currently empty.
        if (context.scheduleGrid[staffIndex][day - 1] === null && context.scheduleGrid[staffIndex][day] === null) {
          possibleDays.push(day);
        }
      }
    }
    return possibleDays;
  }
};

