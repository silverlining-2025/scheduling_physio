/**
 * @fileoverview This new engine module proactively assigns 'OFF' to staff on weekends and holidays
 * if they are not scheduled to work. This handles the "easy" OFF days first.
 * @namespace Engine_WeekendOffScheduler
 */
const Engine_WeekendOffScheduler = {
  /**
   * The main entry point to schedule all weekend/holiday OFF days.
   * @param {object} ctx The main context object, which will be modified in place.
   */
  schedule: function(ctx) {
    const weekendDays = Array.from(ctx.dayProfiles.values())
      .filter(p => p.dayCategory === '주말' || p.dayCategory === '공휴일');

    if (weekendDays.length === 0) return;
    
    weekendDays.forEach(dayProfile => {
      const dayIndex = dayProfile.date.getDate() - 1;
      
      ctx.staffList.forEach((name, staffIndex) => {
        if (ctx.scheduleGrid[staffIndex][dayIndex] === null) {
          ctx.scheduleGrid[staffIndex][dayIndex] = 'OFF';
        }
      });
    });

    Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx);
  }
};

