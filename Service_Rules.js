/**
 * @fileoverview MASTER REWRITE: This service is now the single source of truth for ALL scheduling rules.
 * It is initialized once at the start of the process and provides a clean, consistent interface
 * for all other engine modules to query rule values. No other file should access the raw
 * rules map from the context.
 * @namespace Service_Rules
 */
const Service_Rules = (function() {
  let _rules = {};

  /**
   * Initializes the service by loading and processing all rules from the context.
   * This MUST be called once at the beginning of any scheduling process.
   * @param {object} ctx The main context object containing the rules map.
   */
  function init(ctx) {
    const rawRules = ctx.rules;
    _rules = {
      // Hard Constraints
      maxWeeklyHours: rawRules.get('max_weekly_hours') || 52,
      maxConsecutiveWork: rawRules.get('consecutive_work_days_max') || 6,
      maxConsecutiveOffs: rawRules.get('max_consecutive_offs') || 2,
      
      // Staffing Rules
      minStaffWeekend: rawRules.get('weekend_holiday_staff_required') || 0,
      minStaffMonday: rawRules.get('monday_staff_required') || 'ALL',
      minStaffWeekday: rawRules.get('tue_fri_staff_min') || 0,
      
      // Optimal Targets (can be exceeded)
      optimalStaffMonday: rawRules.get('monday_staff_required') || 'ALL',
      optimalStaffWeekday: rawRules.get('tue_fri_staff_max') || 0,

      // Shift Definitions
      allowedWeekdayShifts: rawRules.get('allowed_weekday_shifts') || ['D8'],
      allowedWeekendShift: rawRules.get('allowed_weekend_shift') || 'W6',

      // On-Call Logic
      onCallRules: {
        '6_primary': rawRules.get('oncall_6_staff_primary'),
        '6_secondary': rawRules.get('oncall_6_staff_secondary'),
        '5_primary': rawRules.get('oncall_5_staff_primary'),
        '5_secondary': rawRules.get('oncall_5_staff_secondary'),
        '4_primary': rawRules.get('oncall_4_staff_primary'),
        '4_secondary': rawRules.get('oncall_4_staff_secondary'),
        '3_primary': rawRules.get('oncall_3_staff_primary'),
        '3_secondary': rawRules.get('oncall_3_staff_secondary'),
      },

      // Special Rules
      specialOffBlockEnabled: rawRules.get('special_off_block_enabled') === true,
    };
    Util_Logger.log("Service_Rules initialized with all configuration values.");
  }

  // --- Public Getter Functions ---

  function getMinStaffForDay(dayProfile, totalStaff) {
    if (dayProfile.dayCategory === '주말' || dayProfile.dayCategory === '공휴일') {
      return _rules.minStaffWeekend;
    }
    if (dayProfile.dayName === '월요일') {
      return _rules.minStaffMonday === 'ALL' ? totalStaff - dayProfile.staffOnLeave.length : _rules.minStaffMonday;
    }
    return _rules.minStaffWeekday;
  }

  function getOptimalStaffForDay(dayProfile, totalStaff) {
    if (dayProfile.dayCategory === '주말' || dayProfile.dayCategory === '공휴일') {
      return _rules.minStaffWeekend; // For weekends, optimal is the same as min
    }
    if (dayProfile.dayName === '월요일') {
      return _rules.optimalStaffMonday === 'ALL' ? totalStaff - dayProfile.staffOnLeave.length : _rules.optimalStaffMonday;
    }
    return _rules.optimalStaffWeekday;
  }

  function getOnCallRequirements(staffCount) {
    const key = String(staffCount);
    return {
      primaryCode: _rules.onCallRules[`${key}_primary`],
      secondaryCode: _rules.onCallRules[`${key}_secondary`],
    };
  }

  function isSpecialOffBlockEnabled() { return _rules.specialOffBlockEnabled; }
  function getMaxWeeklyHours() { return _rules.maxWeeklyHours; }
  function getAllowedWeekdayShifts() { return _rules.allowedWeekdayShifts; }
  function getAllowedWeekendShift() { return _rules.allowedWeekendShift; }
  
  /**
   * Centralized safety check. Simulates a move and validates it against all critical rules.
   * @param {object} ctx The current context.
   * @param {Array<Array<string>>} tempGrid A temporary grid with the proposed changes.
   * @returns {boolean} True if the move is safe, false otherwise.
   */
  function isMoveSafe(ctx, tempGrid) {
    // Check 1: Daily Staffing Levels (Min ONLY)
    for (const [day, dayProfile] of ctx.dayProfiles.entries()) {
      const minStaff = getMinStaffForDay(dayProfile, ctx.staffList.length);
      let workingStaff = 0;
      for (let i = 0; i < ctx.staffList.length; i++) {
        const shiftInfo = ctx.shiftDefinitions.get(tempGrid[i][day - 1]);
        if (shiftInfo && shiftInfo.hours > 0) workingStaff++;
      }
      if (workingStaff < minStaff) return false;
    }

    // Check 2: All Staff-Specific Rules (Weekly hours, consecutive days)
    for(let i = 0; i < ctx.staffList.length; i++){
        // Weekly Hour Limit Check
        for(const week of ctx.weeks){
            let weeklyHours = 0;
            for(let d = week.start; d <= week.end; d++){
                const shiftInfo = ctx.shiftDefinitions.get(tempGrid[i][d-1]);
                if(shiftInfo) weeklyHours += shiftInfo.hours;
            }
            if(weeklyHours > _rules.maxWeeklyHours) return false;
        }

        // Consecutive Days Check
        let consecutiveWork = 0;
        let consecutiveOff = 0;
        for(let d = 0; d < ctx.numDays; d++){
            const shiftInfo = ctx.shiftDefinitions.get(tempGrid[i][d]);
            if(shiftInfo && shiftInfo.hours > 0){
                consecutiveWork++;
                consecutiveOff = 0;
            } else {
                consecutiveOff++;
                consecutiveWork = 0;
            }
            if(consecutiveWork > _rules.maxConsecutiveWork) return false;
            if(consecutiveOff > _rules.maxConsecutiveOffs) return false;
        }
    }
    
    return true; // If all checks pass, the move is safe.
  }

  // --- Public Interface ---
  return {
    init,
    getMinStaffForDay,
    getOptimalStaffForDay,
    getOnCallRequirements,
    getMaxWeeklyHours,
    getAllowedWeekdayShifts,
    getAllowedWeekendShift,
    isSpecialOffBlockEnabled,
    isMoveSafe
  };
})();

