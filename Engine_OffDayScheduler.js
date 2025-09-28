/**
 * @fileoverview This engine module places the REMAINING required OFF days on WEEKDAYS.
 * It uses strict, rewritten "look-around" safety checks to guarantee that daily minimum staffing
 * and consecutive OFF day rules are never violated.
 * @namespace Engine_OffDayScheduler
 */
const Engine_OffDayScheduler = {
  /**
   * The main entry point to schedule all required weekday OFF days.
   * @param {object} ctx The main context object, which will be modified in place.
   */
  schedule: function(ctx) {
    const maxConsecutive = ctx.rules.get('max_consecutive_offs');
    
    ctx.staffList.forEach((name, staffIndex) => {
      const profile = ctx.staffProfiles.get(name);
      let offsStillNeeded = profile.requiredOffs - profile.assignedOffs;

      for (let day = 1; day <= ctx.numDays && offsStillNeeded > 0; day++) {
        const dayIndex = day - 1;
        const dayProfile = ctx.dayProfiles.get(day);

        if (dayProfile.dayCategory !== '평일' || ctx.scheduleGrid[staffIndex][dayIndex] !== null) {
          continue;
        }
        
        // --- SAFETY CHECK 1: Minimum Staffing ---
        const staffAvailableIfOff = ctx.staffList.filter((sName, sIndex) => {
          const shift = ctx.scheduleGrid[sIndex][dayIndex];
          const shiftInfo = ctx.shiftDefinitions.get(shift);
          return sIndex !== staffIndex && shift !== 'OFF' && (!shiftInfo || shiftInfo.hours > 0);
        }).length;
        
        if (staffAvailableIfOff < dayProfile.minStaff) {
          continue;
        }

        // --- SAFETY CHECK 2: Consecutive OFFs (Rewritten with "Look-Around") ---
        let consecutiveCount = 1;
        // Look backwards
        for (let i = dayIndex - 1; i >= 0; i--) {
          const shift = ctx.scheduleGrid[staffIndex][i];
          const shiftInfo = ctx.shiftDefinitions.get(shift);
          if (shift === 'OFF' || (shiftInfo && shiftInfo.hours === 0)) {
            consecutiveCount++;
          } else {
            break;
          }
        }
        // Look forwards
        for (let i = dayIndex + 1; i < ctx.numDays; i++) {
          const shift = ctx.scheduleGrid[staffIndex][i];
          const shiftInfo = ctx.shiftDefinitions.get(shift);
          if (shift === 'OFF' || (shiftInfo && shiftInfo.hours === 0)) {
            consecutiveCount++;
          } else {
            break;
          }
        }
        
        if (consecutiveCount > maxConsecutive) {
          continue;
        }
        
        ctx.scheduleGrid[staffIndex][dayIndex] = 'OFF';
        offsStillNeeded--;
      }
    });

    Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx);
  }
};

