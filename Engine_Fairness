/**
 * @fileoverview This is a new, critical engine component. Its sole responsibility is to
 * pre-populate the schedule with fairness-critical shifts (weekends and required OFFs)
 * BEFORE the main scheduler runs. This "correct by construction" approach prevents
 * many common scheduling errors.
 * @namespace Engine_Fairness
 */
const Engine_Fairness = {

  /**
   * The main entry point to apply all fairness rules.
   * @param {object} ctx The main context object, which will be modified in place.
   */
  apply: function(ctx) {
    this._assignRequiredWeekendShifts(ctx);
    this._assignRequiredOffDays(ctx);
    // Update profiles after these critical assignments are made.
    Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx);
  },

  /**
   * Distributes weekend work shifts as evenly as possible among all staff.
   * @param {object} ctx The main context object.
   * @private
   */
  _assignRequiredWeekendShifts: function(ctx) {
    const weekendDays = Array.from(ctx.dayProfiles.values()).filter(p => p.dayCategory === '주말' || p.dayCategory === '공휴일');
    const totalWeekendSlots = weekendDays.reduce((sum, day) => sum + day.minStaff, 0);
    const fairShare = Math.floor(totalWeekendSlots / ctx.staffList.length);
    const remainder = totalWeekendSlots % ctx.staffList.length;

    ctx.staffList.forEach((name, index) => {
        ctx.staffProfiles.get(name).weekendShiftsTarget = fairShare + (index < remainder ? 1 : 0);
    });

    weekendDays.forEach(dayProfile => {
      const day = dayProfile.date.getDate();
      const staffNeeded = dayProfile.minStaff;
      
      const candidates = ctx.staffList
        .map(name => ctx.staffProfiles.get(name))
        .filter(p => {
            const staffIndex = ctx.staffList.indexOf(p.name);
            return ctx.scheduleGrid[staffIndex][day-1] === null && p.weekendShifts < p.weekendShiftsTarget;
        })
        .sort((a,b) => (a.weekendShifts / a.weekendShiftsTarget) - (b.weekendShifts / b.weekendShiftsTarget));
      
      const staffToAssign = candidates.slice(0, staffNeeded);
      staffToAssign.forEach(profile => {
          const staffIndex = ctx.staffList.indexOf(profile.name);
          ctx.scheduleGrid[staffIndex][day-1] = ctx.rules.get('allowed_weekend_shift');
      });
    });
  },

  /**
   * REWRITTEN: Places required weekday OFF days with strict safety checks.
   * It ensures that placing an OFF day does not violate consecutive OFF rules or minimum staffing levels.
   * @param {object} ctx The main context object.
   * @private
   */
  _assignRequiredOffDays: function(ctx) {
    const maxConsecutive = ctx.rules.get('max_consecutive_offs');
    
    ctx.staffList.forEach((name, staffIndex) => {
      const profile = ctx.staffProfiles.get(name);
      let offsStillNeeded = profile.requiredOffs - profile.assignedOffs;

      // Iterate through the days to find safe spots for OFF days.
      for (let day = 1; day <= ctx.numDays && offsStillNeeded > 0; day++) {
        const dayIndex = day - 1;
        const dayProfile = ctx.dayProfiles.get(day);

        // Condition 1: Must be a weekday and the slot must be empty.
        if (dayProfile.dayCategory === '평일' && ctx.scheduleGrid[staffIndex][dayIndex] === null) {
          
          // Condition 2 (SAFETY CHECK): Would placing an OFF here violate max_consecutive_offs?
          let consecutiveBefore = 0;
          for (let i = dayIndex - 1; i >= 0; i--) {
            if (ctx.scheduleGrid[staffIndex][i] === 'OFF') consecutiveBefore++;
            else break;
          }
          let consecutiveAfter = 0;
          for (let i = dayIndex + 1; i < ctx.numDays; i++) {
            if (ctx.scheduleGrid[staffIndex][i] === 'OFF') consecutiveAfter++;
            else break;
          }
          if (consecutiveBefore + 1 + consecutiveAfter > maxConsecutive) {
            continue; // UNSAFE: This would create too long a chain of OFFs. Skip this day.
          }

          // Condition 3 (SAFETY CHECK): Would placing an OFF compromise min staffing for the day?
          const workingStaffOnDay = ctx.staffList.filter((sName, sIndex) => {
              const shift = ctx.shiftDefinitions.get(ctx.scheduleGrid[sIndex][dayIndex]);
              return shift && shift.hours > 0;
          }).length;
          const potentialStaff = ctx.staffList.filter((sName, sIndex) => {
            return sIndex !== staffIndex && ctx.scheduleGrid[sIndex][dayIndex] === null;
          }).length;
          
          if (workingStaffOnDay + potentialStaff < dayProfile.minStaff) {
            continue; // UNSAFE: Not enough other people are available to cover this day. Skip.
          }
          
          // All checks passed. It is safe to place the OFF day.
          ctx.scheduleGrid[staffIndex][dayIndex] = 'OFF';
          offsStillNeeded--;
        }
      }
    });
  }
};

