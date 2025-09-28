/**
 * @file Engine_WeekdayScheduler.js
 * @description Fills in the weekday shifts after all other constraints are applied.
 */
const Engine_WeekdayScheduler = {
  /**
   * Assigns default weekday shifts to meet minimum staffing levels.
   * @param {Object} context The global scheduling context.
   */
  run: function (context) {
    const defaultShift = Service_Rules.getRule('default_weekday_shift_code');
    if (!defaultShift) {
        Util_Logger.log('WARNING', 'Default weekday shift not defined. Weekday scheduling may be incomplete.');
        return;
    }

    for (let day = 1; day <= context.numDays; day++) {
      const dayProfile = context.dayProfiles.get(day);
      if (dayProfile.category === CONFIG.DAY_CATEGORIES.WEEKDAY) {
        let assignedCount = Util_Helpers.getAssignedStaffCountForDay(context, day);
        let candidates = Util_Helpers.getAvailableStaffForDay(context, day);
        
        // --- Fairness Principle ---
        // Prioritize staff with fewer total work hours so far.
        candidates = Engine_Fairness.sortCandidatesByCount(context, candidates, 'totalHours');

        for (const staffIndex of candidates) {
          if (assignedCount >= dayProfile.minStaff) break;
          
          context.scheduleGrid[staffIndex][day - 1] = defaultShift;
          assignedCount++;
        }
      }
    }
  },
};

