/**
 * @fileoverview Assigns on-call shifts by replacing existing weekday shifts.
 * It now queries all rules from the centralized Service_Rules.
 * @namespace Engine_OnCallScheduler
 */
const Engine_OnCallScheduler = {
  schedule: function(ctx) {
    Util_Logger.log("--- Assigning On-Call Shifts based on dynamic daily staff count ---");
    for (let day = 1; day <= ctx.numDays; day++) {
      const dayProfile = ctx.dayProfiles.get(day);
      if (dayProfile.dayCategory !== '평일') continue;

      const staffWorkingOnDay = ctx.staffList.filter((_, i) => {
        const shiftInfo = ctx.shiftDefinitions.get(ctx.scheduleGrid[i][day - 1]);
        return shiftInfo && shiftInfo.hours > 0;
      }).length;

      const { primaryCode, secondaryCode } = Service_Rules.getOnCallRequirements(staffWorkingOnDay);
      
      if (!primaryCode && !secondaryCode) continue;
      Util_Logger.log(`Day ${day}: ${staffWorkingOnDay} staff working. Applying rules: Primary -> ${primaryCode || 'N/A'}, Secondary -> ${secondaryCode || 'N/A'}`);

      const candidates = ctx.staffList
        .map(name => ctx.staffProfiles.get(name))
        .filter(p => {
          const shiftCode = ctx.scheduleGrid[ctx.staffList.indexOf(p.name)][day - 1];
          const shiftInfo = ctx.shiftDefinitions.get(shiftCode);
          return shiftInfo && shiftInfo.category === '일반근무'; // Must be a standard work shift
        })
        .sort((a, b) => a.onCallShifts - b.onCallShifts); // Prioritize staff with fewer on-call shifts

      let assignedThisDay = new Set();
      
      // Assign Primary
      if (primaryCode) {
        const primaryStaff = candidates.find(c => !assignedThisDay.has(c.name));
        if (primaryStaff) {
          ctx.scheduleGrid[ctx.staffList.indexOf(primaryStaff.name)][day - 1] = primaryCode;
          assignedThisDay.add(primaryStaff.name);
        }
      }
      
      // Assign Secondary
      if (secondaryCode) {
        const secondaryStaff = candidates.find(c => !assignedThisDay.has(c.name));
        if (secondaryStaff) {
          ctx.scheduleGrid[ctx.staffList.indexOf(secondaryStaff.name)][day - 1] = secondaryCode;
          assignedThisDay.add(secondaryStaff.name);
        }
      }
    }
    Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx);
  },
};

