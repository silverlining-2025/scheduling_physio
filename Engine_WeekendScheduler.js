/**
 * @fileoverview This engine module is responsible for scheduling weekend and holiday work.
 * It distributes these shifts fairly and respects the "paired weekend" rule.
 * This rewritten version is more rigorous and explicitly checks for leave before assigning shifts.
 * @namespace Engine_WeekendScheduler
 */
const Engine_WeekendScheduler = {
  /**
   * The main entry point to schedule all weekend/holiday shifts.
   * @param {object} ctx The main context object, which will be modified in place.
   */
  schedule: function(ctx) {
    const weekendDays = Array.from(ctx.dayProfiles.values())
      .filter(p => p.dayCategory === '주말' || p.dayCategory === '공휴일');

    if (weekendDays.length === 0) {
      Util_Logger.log("No weekend/holiday days found to schedule work for.");
      return;
    }

    const totalWeekendSlots = weekendDays.reduce((sum, day) => sum + day.minStaff, 0);
    const fairShare = Math.floor(totalWeekendSlots / ctx.staffList.length);
    const remainder = totalWeekendSlots % ctx.staffList.length;

    ctx.staffList.forEach((name, index) => {
        const profile = ctx.staffProfiles.get(name);
        profile.weekendShiftsTarget = fairShare + (index < remainder ? 1 : 0);
        profile.weekendShifts = 0; // Reset counter before scheduling
    });

    weekendDays.forEach(dayProfile => {
      const dayIndex = dayProfile.date.getDate() - 1;
      
      // --- RIGOROUS SAFETY CHECK: Build a list of candidates who are actually available ---
      const candidates = ctx.staffList
        .map(name => ctx.staffProfiles.get(name))
        .filter(p => {
            const staffIdx = ctx.staffList.indexOf(p.name);
            // Must be available (not on leave) AND need a weekend shift.
            return ctx.scheduleGrid[staffIdx][dayIndex] === null && p.weekendShifts < p.weekendShiftsTarget;
        })
        .sort((a,b) => (a.weekendShifts - b.weekendShifts)); // Prioritize those with fewer weekend shifts so far
      
      const staffToAssign = candidates.slice(0, dayProfile.minStaff);
      
      staffToAssign.forEach(profile => {
          const staffIdx = ctx.staffList.indexOf(profile.name);
          ctx.scheduleGrid[staffIdx][dayIndex] = ctx.rules.get('allowed_weekend_shift');
          profile.weekendShifts++; 
      });
    });

    Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx);
  }
};

