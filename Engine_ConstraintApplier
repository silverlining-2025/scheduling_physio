/**
 * @fileoverview This engine module applies "hard" constraints that are non-negotiable.
 * MAJOR FIX: The logic for applying the special off block is now more robust and correctly
 * checks staffing levels before attempting to place the OFF days.
 * @namespace Engine_ConstraintApplier
 */
const Engine_ConstraintApplier = {
  apply: function(ctx) {
    this._applyApprovedLeave(ctx);
    this._applySpecialOffBlock(ctx);
    Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx); // Sync profiles after changes
  },

  _applyApprovedLeave: function(ctx) {
    ctx.approvedLeave.forEach(leave => {
      const staffIndex = ctx.staffList.indexOf(leave.name);
      if (staffIndex > -1) {
        const dayIndex = leave.date.getDate() - 1;
        ctx.scheduleGrid[staffIndex][dayIndex] = leave.type;
      }
    });
  },

  /**
   * REWRITTEN for correctness.
   */
  _applySpecialOffBlock: function(ctx) {
    if (!Service_Rules.isSpecialOffBlockEnabled()) return;

    const potentialFridays = Array.from(ctx.dayProfiles.values())
      .filter(p => p.date.getDay() === 5 && p.dayCategory === '평일')
      .map(p => p.date.getDate());

    if (potentialFridays.length === 0) return;

    ctx.staffList.forEach(name => {
      const staffIndex = ctx.staffList.indexOf(name);
      
      for (const friday of potentialFridays) {
        const friIndex = friday - 1;
        const satIndex = friIndex + 1;

        // Condition 1: Slots must be available for this person.
        if (satIndex >= ctx.numDays || ctx.scheduleGrid[staffIndex][friIndex] !== null || ctx.scheduleGrid[staffIndex][satIndex] !== null) {
          continue;
        }

        // Condition 2: Placing the OFF on Friday must not violate min staffing for that day.
        const dayProfile = ctx.dayProfiles.get(friday);
        const minStaff = Service_Rules.getMinStaffForDay(dayProfile, ctx.staffList.length);

        // Count how many people *other than the current candidate* are available to work.
        const availableStaffCount = ctx.staffList.filter((sName, sIndex) => {
            if(sIndex === staffIndex) return false; // Exclude the person we're trying to give an OFF to.
            const shift = ctx.scheduleGrid[sIndex][friIndex];
            return shift === null; // Only count people who are not already on leave or assigned OFF.
        }).length;

        if (availableStaffCount < minStaff) {
           continue; // Not enough other people to cover, try next Friday.
        }

        // --- All checks passed, apply the OFF block ---
        ctx.scheduleGrid[staffIndex][friIndex] = 'OFF';
        ctx.scheduleGrid[staffIndex][satIndex] = 'OFF';
        ctx.staffProfiles.get(name).hasSpecialOff = true;
        Util_Logger.log(`Assigned special 금+토 OFF to ${name} on ${friday}일-${friday+1}일.`);
        break; // Success for this person, move to the next.
      }
    });
  }
};

