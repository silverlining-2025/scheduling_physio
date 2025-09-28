/**
 * @file Engine_OnCallScheduler.js
 * @description Schedules on-call shifts according to defined rules.
 */
const Engine_OnCallScheduler = {
  /**
   * Assigns on-call shifts for the entire month.
   * @param {Object} context The global scheduling context.
   */
  run: function (context) {
    const onCallShift = Service_Rules.getRule('on_call_shift_code');
    if (!onCallShift) {
      Util_Logger.log('INFO', 'On-call shift code not defined. Skipping on-call scheduling.');
      return;
    }

    Service_Summary.recalculateStaffProfiles(context);

    for (let day = 1; day <= context.numDays; day++) {
      if (this._needsOnCall(context, day)) {
        let candidates = Util_Helpers.getAvailableStaffForDay(context, day);
        
        // --- Fairness Principle ---
        candidates = Engine_Fairness.sortCandidatesByCount(context, candidates, 'onCallCount');

        if (candidates.length > 0) {
          const assignedStaffIndex = candidates[0];
          context.scheduleGrid[assignedStaffIndex][day - 1] = onCallShift;
          // Immediately update summaries for accurate counts on the next day.
          Service_Summary.recalculateStaffProfiles(context);
        } else {
          Util_Logger.log('WARNING', `No available staff for on-call duty on day ${day}.`);
        }
      }
    }
  },

  /**
   * Determines if a given day requires an on-call shift.
   * @private
   * @param {Object} context The global scheduling context.
   * @param {number} day The day of the month.
   * @returns {boolean} True if an on-call shift is needed.
   */
  _needsOnCall: function (context, day) {
    const dayProfile = context.dayProfiles.get(day);
    // On-call is needed on weekends and holidays, as per typical requirements.
    return dayProfile.category === CONFIG.DAY_CATEGORIES.WEEKEND || dayProfile.category === CONFIG.DAY_CATEGORIES.HOLIDAY;
  },
};

