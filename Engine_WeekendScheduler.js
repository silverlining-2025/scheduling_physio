/**
 * @file Engine_WeekendScheduler.js
 * @description Schedules staff for weekend shifts based on defined rules.
 */
const Engine_WeekendScheduler = {
  /**
   * Runs the weekend scheduling logic for the entire month.
   * @param {Object} context The global scheduling context.
   */
  run: function (context) {
    const enforcePairedWork = Service_Rules.getRule('enforce_paired_weekend_work') === true;

    context.weeks.forEach(week => {
      const weekendDays = week.days.filter(d => context.dayProfiles.get(d).category === CONFIG.DAY_CATEGORIES.WEEKEND);
      
      if (weekendDays.length === 2 && enforcePairedWork) {
        this._schedulePairedWeekend(context, weekendDays[0], weekendDays[1]);
      } else {
        // Handle single weekend days (e.g., at month start/end) or if pairing is disabled.
        weekendDays.forEach(day => this._scheduleSingleDay(context, day));
      }
    });
  },

  /**
   * Schedules a paired Saturday/Sunday, ensuring one day on, one day off.
   * @private
   * @param {Object} context The global scheduling context.
   * @param {number} sat The day number for Saturday.
   * @param {number} sun The day number for Sunday.
   */
  _schedulePairedWeekend: function (context, sat, sun) {
    const satMin = Service_Rules.getMinStaffForDay(sat);
    const sunMin = Service_Rules.getMinStaffForDay(sun);
    const shiftCode = Service_Rules.getRule('weekend_shift_code');
    
    // Find staff available for BOTH days.
    let candidates = Util_Helpers.getAvailableStaffForDay(context, sat)
      .filter(staffIndex => Util_Helpers.isStaffAvailableOnDay(context, sun, staffIndex));
    
    // --- Fairness Principle ---
    candidates = Engine_Fairness.sortCandidatesByCount(context, candidates, 'weekendWorkCount');

    let satCount = 0;
    let sunCount = 0;

    for (const staffIndex of candidates) {
      // Prioritize Saturday staffing, then Sunday.
      if (satCount < satMin) {
        context.scheduleGrid[staffIndex][sat - 1] = shiftCode;
        context.scheduleGrid[staffIndex][sun - 1] = CONFIG.SPECIAL_SHIFTS.OFF;
        satCount++;
      } else if (sunCount < sunMin) {
        context.scheduleGrid[staffIndex][sun - 1] = shiftCode;
        context.scheduleGrid[staffIndex][sat - 1] = CONFIG.SPECIAL_SHIFTS.OFF;
        sunCount++;
      }
    }

    if (satCount < satMin || sunCount < sunMin) {
        Util_Logger.log('WARNING', `Could not meet minimum staffing for weekend ${sat}-${sun}. Required: ${satMin}(Sat), ${sunMin}(Sun). Assigned: ${satCount}, ${sunCount}`);
    }
  },

  /**
   * Schedules a single weekend day.
   * @private
   * @param {Object} context The global scheduling context.
   * @param {number} day The day number to schedule.
   */
  _scheduleSingleDay: function(context, day) {
    const minStaff = Service_Rules.getMinStaffForDay(day);
    const shiftCode = Service_Rules.getRule('weekend_shift_code');
    let assignedCount = Util_Helpers.getAssignedStaffCountForDay(context, day);
    let candidates = Util_Helpers.getAvailableStaffForDay(context, day);
    
    candidates = Engine_Fairness.sortCandidatesByCount(context, candidates, 'weekendWorkCount');

    for (const staffIndex of candidates) {
      if (assignedCount >= minStaff) break;
      context.scheduleGrid[staffIndex][day - 1] = shiftCode;
      assignedCount++;
    }
  }
};

