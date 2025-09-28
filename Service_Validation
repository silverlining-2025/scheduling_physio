/**
 * @fileoverview A dedicated service for all post-generation schedule validation.
 * It provides stage-aware debugging and a final, comprehensive check.
 * @namespace Service_Validation
 */
const Service_Validation = (function() {

  // --- PRIVATE HELPER FUNCTIONS ---

  function _checkStaffingLevels(ctx) {
    let isValid = true;
    for (let day = 1; day <= ctx.numDays; day++) {
        const profile = ctx.dayProfiles.get(day);
        const workingStaff = ctx.staffList.filter((name, i) => {
            const shift = ctx.shiftDefinitions.get(ctx.scheduleGrid[i][day-1]);
            return shift && shift.hours > 0;
        });
        if (workingStaff.length < profile.minStaff) {
            isValid = false;
            Util_Logger.error(`❌ [Validation FAIL] Staffing: On ${day}일, Expected at least ${profile.minStaff}, found ${workingStaff.length}.`);
        }
    }
    if (isValid) Util_Logger.log("✅ [Validation PASS] Daily Staffing Levels");
    return isValid;
  }

  function _checkSpecialOffs(ctx) {
    if (ctx.rules.get('special_off_block_enabled') !== true) return true;
    let isValid = true;
    const staffWithout = ctx.staffList.filter(name => !ctx.staffProfiles.get(name).hasSpecialOff);
    if (staffWithout.length > 0) {
      isValid = false;
      Util_Logger.error(`❌ [Validation FAIL] Fairness: Guaranteed '금+토' OFF was not assigned to: ${staffWithout.join(', ')}.`);
    }
    if (isValid) Util_Logger.log("✅ [Validation PASS] Guaranteed '금+토' OFF Assignment");
    return isValid;
  }

  function _checkTotalOffs(ctx) {
    let isValid = true;
    ctx.staffList.forEach(name => {
      const profile = ctx.staffProfiles.get(name);
      if (profile.assignedOffs < profile.requiredOffs) {
        isValid = false;
        Util_Logger.error(`❌ [Validation FAIL] Fairness: ${name} has too few OFF days. Expected: ${profile.requiredOffs}, Found: ${profile.assignedOffs}`);
      }
    });
    if (isValid) Util_Logger.log("✅ [Validation PASS] Total OFF Day Counts");
    return isValid;
  }

  function _checkConsecutiveOffs(ctx) {
    let isValid = true;
    const maxConsecutive = ctx.rules.get('max_consecutive_offs');
    ctx.staffList.forEach((name, staffIndex) => {
        let currentConsecutive = 0;
        for (let day = 0; day < ctx.numDays; day++) {
            const shift = ctx.scheduleGrid[staffIndex][day];
            const shiftInfo = ctx.shiftDefinitions.get(shift);
            if(shift === 'OFF' || (shiftInfo && shiftInfo.hours === 0)) {
                currentConsecutive++;
            } else {
                currentConsecutive = 0;
            }
            if (currentConsecutive > maxConsecutive) {
                isValid = false;
                Util_Logger.error(`❌ [Validation FAIL] Consecutive Rule: ${name} has more than ${maxConsecutive} consecutive OFFs ending on day ${day + 1}.`);
                break;
            }
        }
    });
    if (isValid) Util_Logger.log("✅ [Validation PASS] Max Consecutive OFFs Rule");
    return isValid;
  }

  function _checkWeekendFairness(ctx) {
      let isValid = true;
      const weekendShifts = ctx.staffList.map(name => ctx.staffProfiles.get(name).weekendShifts);
      const min = Math.min(...weekendShifts);
      const max = Math.max(...weekendShifts);
      if (max - min > 2) {
          isValid = false;
          Util_Logger.error(`❌ [Validation FAIL] Fairness: Weekend shifts are not balanced. Min: ${min}, Max: ${max}.`);
      }
      if (isValid) Util_Logger.log("✅ [Validation PASS] Weekend Shift Balancing");
      return isValid;
  }

  function _checkHourBalancing(ctx) {
      let isValid = true;
       ctx.staffList.forEach(name => {
          const profile = ctx.staffProfiles.get(name);
          if (Math.abs(profile.assignedHours - profile.targetHours) > 8) {
              isValid = false;
              Util_Logger.error(`❌ [Validation FAIL] Balancing: ${name} hour target missed. Expected: ~${profile.targetHours}, Found: ${profile.assignedHours}.`);
          }
       });
      if (isValid) Util_Logger.log("✅ [Validation PASS] Final Hour Balancing");
      return isValid;
  }

  /**
   * NEW: A critical check to ensure no one exceeds the legal maximum weekly work hours.
   */
  function _checkWeeklyHourLimits(ctx) {
    let isValid = true;
    const maxWeeklyHours = ctx.rules.get('max_weekly_hours');
    if (!maxWeeklyHours) return true; // Skip if rule not set

    ctx.staffList.forEach(name => {
      const profile = ctx.staffProfiles.get(name);
      profile.weeklyStats.forEach(week => {
        if (week.assignedHours > maxWeeklyHours) {
          isValid = false;
          Util_Logger.error(`❌ [Validation FAIL] Legal: ${name} exceeds max weekly hours (${maxWeeklyHours}) in week ${week.weekNumber}. Found: ${week.assignedHours}.`);
        }
      });
    });
    if (isValid) Util_Logger.log("✅ [Validation PASS] Maximum Weekly Hours Limit");
    return isValid;
  }
  
  // --- PUBLIC INTERFACE ---
  return {
    validate: function(ctx) {
      Util_Logger.log("--- Running Full Schedule Validation ---");
      const isValid = 
        _checkStaffingLevels(ctx) &&
        _checkWeeklyHourLimits(ctx) && // Added new critical check
        _checkSpecialOffs(ctx) &&
        _checkTotalOffs(ctx) &&
        _checkConsecutiveOffs(ctx) &&
        _checkWeekendFairness(ctx) &&
        _checkHourBalancing(ctx);
      
      if (isValid) Util_Logger.log("✅✅✅ --- Overall Validation PASSED --- ✅✅✅");
      else Util_Logger.error("🔥🔥🔥 --- Overall Validation FAILED --- 🔥🔥🔥");
      return isValid;
    },
    
    validateAfterStep1: (ctx) => (ctx.dayProfiles && ctx.staffProfiles),
    validateAfterStep2: (ctx) => _checkSpecialOffs(ctx),
    validateAfterStep3: (ctx) => _checkWeekendFairness(ctx),
    validateAfterStep4: (ctx) => _checkConsecutiveOffs(ctx), // Check after weekend OFFs
    validateAfterStep5: (ctx) => _checkTotalOffs(ctx) && _checkConsecutiveOffs(ctx) && _checkStaffingLevels(ctx)
  };
})();
