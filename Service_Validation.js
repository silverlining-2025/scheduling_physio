/**
 * @file Service_Validation.js
 * @description Validates the generated schedule against all configured rules.
 */
const Service_Validation = {
  /**
   * Runs all validation checks on the completed schedule.
   * @param {Object} context The global scheduling context.
   * @throws {ValidationError} If any rule is violated.
   */
  runFullValidation: function (context) {
    const errors = [];
    
    // Per-day checks
    for (let day = 1; day <= context.numDays; day++) {
        errors.push(...this._validateStaffingLevels(context, day));
    }

    // Per-staff checks
    context.staffList.forEach((staff, staffIndex) => {
      errors.push(...this._validateMaxConsecutiveWorkDays(context, staffIndex));
      errors.push(...this._validateGuaranteedOffBlock(context, staffIndex));
      errors.push(...this._validateMinRestHours(context, staffIndex));
    });

    // Per-week, per-staff checks
    context.weeks.forEach(week => {
      context.staffList.forEach((staff, staffIndex) => {
        errors.push(...this._validateMaxWeeklyHours(context, week, staffIndex));
      });
    });

    if (errors.length > 0) {
      const err = new Error('Schedule validation failed:\n' + errors.join('\n'));
      err.name = 'ValidationError';
      throw err;
    }
  },

  /**
   * Checks if a tentative shift assignment for a single staff member on a single day is valid.
   * Used by the balancer to check potential swaps.
   * @param {Object} context The global scheduling context.
   * @param {number} day The day being checked.
   * @param {number} staffIndex The index of the staff member.
   * @returns {boolean} True if the day's assignment is valid for this staff member.
   */
  isDayValidForStaff: function(context, day, staffIndex) {
     const consecutiveError = this._validateMaxConsecutiveWorkDays(context, staffIndex, day);
     const restHoursError = this._validateMinRestHours(context, staffIndex, day);
     return consecutiveError.length === 0 && restHoursError.length === 0;
  },

  _validateStaffingLevels: function (context, day) {
    const errors = [], profile = context.dayProfiles.get(day), count = Util_Helpers.getAssignedStaffCountForDay(context, day);
    if (count < profile.minStaff) errors.push(`Day ${day}: Staffing below minimum (${count}/${profile.minStaff})`);
    if (count > profile.maxStaff) errors.push(`Day ${day}: Staffing above maximum (${count}/${profile.maxStaff})`);
    return errors;
  },
  
  _validateMaxConsecutiveWorkDays: function(context, staffIndex, specificDay = null) {
    const errors = [], max = Number(Service_Rules.getRule('consecutive_work_days_max'));
    let count = 0;
    for (let i = 0; i < context.numDays; i++) {
      const shift = context.scheduleGrid[staffIndex][i];
      const isWorkDay = shift && shift !== CONFIG.SPECIAL_SHIFTS.OFF && !context.approvedLeave.some(l=>l.reason === shift);
      count = isWorkDay ? count + 1 : 0;
      if (count > max && (!specificDay || specificDay === i+1)) {
        errors.push(`${context.staffList[staffIndex].name}: Exceeded max consecutive work days ending on day ${i + 1}.`);
      }
    }
    return errors;
  },
  
  _validateMaxWeeklyHours: function(context, week, staffIndex) {
    const errors = [], max = Number(Service_Rules.getRule('max_weekly_hours'));
    let weeklyHours = 0;
    week.days.forEach(day => {
      const shiftDef = context.shiftDefinitions.get(context.scheduleGrid[staffIndex][day - 1]);
      if (shiftDef) weeklyHours += shiftDef.hours;
    });
    if (weeklyHours > max) {
      errors.push(`${context.staffList[staffIndex].name}: Exceeded max weekly hours for week ${week.weekNumber} (${weeklyHours}/${max})`);
    }
    return errors;
  },

  _validateGuaranteedOffBlock: function(context, staffIndex) {
    if (Service_Rules.getRule('special_off_block_enabled') !== true) return [];
    const errors = [], days = Service_Rules.getRule('special_off_block_days').split(',');
    for (let day = 1; day < context.numDays; day++) {
      if (context.dayProfiles.get(day).dayName === days[0] && context.scheduleGrid[staffIndex][day-1] === 'OFF' && context.scheduleGrid[staffIndex][day] === 'OFF') {
        return []; // Found the block, validation passes for this staff.
      }
    }
    errors.push(`${context.staffList[staffIndex].name}: Missing guaranteed '${days.join('+')}' OFF block.`);
    return errors;
  },

  _validateMinRestHours: function(context, staffIndex, specificDay = null) {
    const errors = [], minRest = Number(Service_Rules.getRule('min_rest_hours_between_shifts'));
    for (let i = 0; i < context.numDays - 1; i++) {
        const shift1 = context.shiftDefinitions.get(context.scheduleGrid[staffIndex][i]);
        const shift2 = context.shiftDefinitions.get(context.scheduleGrid[staffIndex][i+1]);

        if (shift1 && shift2) {
            // This is a simplified check assuming shifts end at 18:00 and start at 09:00.
            // A more robust implementation would store start/end times in shift definitions.
            const restHours = 24 - shift1.hours + 9; // Simplified assumption
            if (restHours < minRest && (!specificDay || specificDay === i+2)) {
                errors.push(`${context.staffList[staffIndex].name}: Insufficient rest between day ${i+1} and ${i+2}.`);
            }
        }
    }
    return errors;
  }
};

