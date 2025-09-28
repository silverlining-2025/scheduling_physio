/**
 * @fileoverview MASTER REWRITE: This engine fairly assigns weekday shifts based on need.
 * It now correctly finds available staff and prioritizes them based on their weekly hour deficit,
 * ensuring fair distribution of shifts.
 * @namespace Engine_WeekdayScheduler
 */
const Engine_WeekdayScheduler = {
  schedule: function(ctx) {
    Util_Logger.log("--- Starting Needs-Based Weekday Scheduler (Rewritten) ---");
    
    const weekdayIndices = Array.from(ctx.dayProfiles.keys())
      .filter(day => ctx.dayProfiles.get(day).dayCategory === '평일')
      .map(day => day - 1);

    // This loop ensures we keep adding staff until we can't anymore (respecting optimal numbers).
    // It's more robust than a simple two-pass system.
    let shiftsAdded;
    do {
      shiftsAdded = 0;
      weekdayIndices.forEach(dayIndex => {
        const dayProfile = ctx.dayProfiles.get(dayIndex + 1);
        const optimalStaff = Service_Rules.getOptimalStaffForDay(dayProfile, ctx.staffList.length);
        const staffCurrentlyWorking = ctx.staffList.filter((_, i) => {
          const shiftInfo = ctx.shiftDefinitions.get(ctx.scheduleGrid[i][dayIndex]);
          return shiftInfo && shiftInfo.hours > 0;
        }).length;
        
        if (staffCurrentlyWorking < optimalStaff) {
          const candidate = this._findBestCandidateForDay(ctx, dayIndex);
          if (candidate) {
            const staffIndex = ctx.staffList.indexOf(candidate.name);
            const weeklyStat = this._getWeekStatForDay(ctx, candidate, dayIndex);
            const bestShift = this._findBestFitShift(weeklyStat, ctx.shiftDefinitions);
            
            ctx.scheduleGrid[staffIndex][dayIndex] = bestShift;
            shiftsAdded++;
            // Immediately update context for next iteration
            Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx);
          }
        }
      });
    } while (shiftsAdded > 0);


    Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx);
    Util_Logger.log("--- Weekday Scheduler Finished ---");
  },

  _findBestCandidateForDay: function(ctx, dayIndex) {
    const candidates = ctx.staffList
      .map(name => ctx.staffProfiles.get(name))
      .filter(p => {
        // Candidate must have a `null` slot for this day (i.e., not on leave, not assigned work/off)
        const staffIndex = ctx.staffList.indexOf(p.name);
        return ctx.scheduleGrid[staffIndex][dayIndex] === null;
      })
      .sort((a, b) => { // Prioritize staff with the greatest need for hours
          const aWeekStat = this._getWeekStatForDay(ctx, a, dayIndex);
          const bWeekStat = this._getWeekStatForDay(ctx, b, dayIndex);
          const aRatio = aWeekStat.targetHours > 0 ? aWeekStat.assignedHours / aWeekStat.targetHours : 1;
          const bRatio = bWeekStat.targetHours > 0 ? bWeekStat.assignedHours / bWeekStat.targetHours : 1;
          return aRatio - bRatio;
      });
      
    return candidates.length > 0 ? candidates[0] : null;
  },

  _findBestFitShift: function(weeklyStat, shiftDefinitions) {
      const availableShifts = Service_Rules.getAllowedWeekdayShifts();
      const hoursNeeded = weeklyStat.targetHours - weeklyStat.assignedHours;
      if (hoursNeeded <= 0) return availableShifts[0]; 

      let bestShift = availableShifts[0];
      let smallestDiff = Infinity;

      for(const shiftCode of availableShifts) {
          const shiftInfo = shiftDefinitions.get(shiftCode);
          if (shiftInfo) {
              const diff = Math.abs(hoursNeeded - shiftInfo.hours);
              if (diff < smallestDiff) {
                  smallestDiff = diff;
                  bestShift = shiftCode;
              }
          }
      }
      return bestShift;
  },

  _getWeekStatForDay: function(ctx, profile, dayIndex){
      const week = ctx.weeks.find(w => (dayIndex + 1) >= w.start && (dayIndex + 1) <= w.end);
      return profile.weeklyStats.find(ws => ws.weekNumber === week.weekNumber);
  }
};

