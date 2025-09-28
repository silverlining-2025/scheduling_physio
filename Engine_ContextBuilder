/**
 * @fileoverview This engine module is responsible for building the initial "state" of the scheduling problem.
 * MAJOR FIX: This version corrects a critical bug where Day Profiles were not being populated with
 * min/optimal staffing levels. This fix ensures all Day Profiles are fully built with the necessary
 * data for the rest of the engine to function.
 * @namespace Engine_ContextBuilder
 */
const Engine_ContextBuilder = {
  buildInitialContext: function(data) {
    const { year, month, staffList, rules, shiftDefinitions, approvedLeave, calendarData } = data;
    const numDays = new Date(year, month, 0).getDate();

    const context = {
      year, month, numDays, staffList, rules, shiftDefinitions, approvedLeave,
      calendarMap: this._buildCalendarMap(calendarData, year, month),
      scheduleGrid: Array.from({ length: staffList.length }, () => Array(numDays).fill(null)),
      dayProfiles: new Map(),
      staffProfiles: new Map(),
      weeks: []
    };

    // This function now correctly builds AND populates the day profiles.
    this._buildWeeksAndDayProfiles(context);
    this._buildStaffProfiles(context);
    return context;
  },

  recalculateTargetsAfterConstraints: function(ctx) {
    Util_Logger.log("Recalculating all targets based on hard constraints (leave, special OFFs)...");
    this._buildStaffProfiles(ctx);
    this.updateStaffProfilesFromGrid(ctx);
  },
  
  _buildCalendarMap: function(calendarData, year, month) {
    const map = new Map();
    calendarData
      .filter(row => row[0] instanceof Date && row[0].getFullYear() === year && row[0].getMonth() === month - 1)
      .forEach(row => {
        map.set(row[0].getDate(), { date: row[0], dayName: row[1], category: row[2] });
      });
    return map;
  },

  /**
   * REWRITTEN to correctly populate Day Profiles with staffing rules from Service_Rules.
   */
  _buildWeeksAndDayProfiles: function(ctx) {
    // 1. Build the Day Profiles with all necessary data
    for (let day = 1; day <= ctx.numDays; day++) {
      const dayInfo = ctx.calendarMap.get(day);
      const staffOnLeave = ctx.approvedLeave.filter(l => l.date.getDate() === day).map(l => l.name);
      
      // This is the critical missing piece. We create a temporary profile to pass to the rules engine.
      const tempDayProfile = {
        date: dayInfo.date,
        dayName: dayInfo.dayName,
        dayCategory: dayInfo.category,
      };

      // Get the rules for this specific day
      const minStaff = Service_Rules.getMinStaffForDay(tempDayProfile, ctx.staffList.length);
      const optimalStaff = Service_Rules.getOptimalStaffForDay(tempDayProfile, ctx.staffList.length);

      // Set the complete, populated profile in the context
      ctx.dayProfiles.set(day, {
        date: dayInfo.date,
        dayName: dayInfo.dayName,
        dayCategory: dayInfo.category,
        staffOnLeave: staffOnLeave,
        minStaff: minStaff,
        optimalStaff: optimalStaff
      });
    }
    
    // 2. Build the Weeks structure now that day profiles are complete
    let weekStart = 1;
    let weekNumber = 1;
    for (let day = 1; day <= ctx.numDays; day++) {
      const date = new Date(ctx.year, ctx.month - 1, day);
      if (day === ctx.numDays || date.getDay() === 6) { // 6 is Saturday
        const weekDays = [];
        for(let d = weekStart; d <= day; d++){
           weekDays.push(ctx.dayProfiles.get(d));
        }
        ctx.weeks.push({ weekNumber: weekNumber, start: weekStart, end: day, days: weekDays });
        weekStart = day + 1;
        weekNumber++;
      }
    }
  },

  _buildStaffProfiles: function(ctx) {
    const getWorkdayValue = (dayProfile) => {
        if (dayProfile.dayCategory === '공휴일' || dayProfile.dayName === '일요일') return 0;
        if (dayProfile.dayName === '토요일') return 0.5;
        return 1; // Weekday
    };

    ctx.staffList.forEach(name => {
      let monthlyTargetHours = 0;
      
      const weeklyStats = ctx.weeks.map(week => {
        let baseWeeklyWorkValue = 0;
        week.days.forEach(dayProfile => {
            baseWeeklyWorkValue += getWorkdayValue(dayProfile);
        });

        let personalLeaveValueInWeek = 0;
        for(let d = week.start; d <= week.end; d++){
          const staffIndex = ctx.staffList.indexOf(name);
          const shiftCode = ctx.scheduleGrid[staffIndex][d-1];
          const shiftInfo = ctx.shiftDefinitions.get(shiftCode);
          if((shiftInfo && shiftInfo.hours === 0) || shiftCode === 'OFF'){
              const dayProfile = ctx.dayProfiles.get(d);
              personalLeaveValueInWeek += getWorkdayValue(dayProfile);
          }
        }
        
        const personalWeeklyWorkValue = Math.max(0, baseWeeklyWorkValue - personalLeaveValueInWeek);
        const weeklyTargetHours = personalWeeklyWorkValue * 8;
        monthlyTargetHours += weeklyTargetHours;
        
        return {
          weekNumber: week.weekNumber,
          targetHours: weeklyTargetHours,
          assignedHours: 0,
          assignedOffs: 0,
          assignedLeave: 0
        };
      });

      ctx.staffProfiles.set(name, {
        name: name,
        monthlyTargetHours: monthlyTargetHours,
        assignedHours: 0,
        assignedOffs: 0,
        weekendShifts: 0,
        onCallShifts: 0,
        hasSpecialOff: false,
        weeklyStats: weeklyStats,
      });
    });
  },

  updateStaffProfilesFromGrid: function(ctx) {
    ctx.staffList.forEach((name, staffIndex) => {
      const profile = ctx.staffProfiles.get(name);
      if(!profile) return;
      
      profile.assignedHours = 0;
      profile.assignedOffs = 0;
      profile.weekendShifts = 0;
      profile.onCallShifts = 0;
      profile.weeklyStats.forEach(ws => {
        ws.assignedHours = 0;
        ws.assignedOffs = 0;
        ws.assignedLeave = 0;
      });

      ctx.scheduleGrid[staffIndex].forEach((shiftCode, dayIndex) => {
        const day = dayIndex + 1;
        const week = ctx.weeks.find(w => day >= w.start && day <= w.end);
        if (!week) return;
        
        const weeklyStat = profile.weeklyStats.find(ws => ws.weekNumber === week.weekNumber);
        if(!weeklyStat) return;

        const shiftInfo = ctx.shiftDefinitions.get(shiftCode);
        
        const isLeave = shiftInfo && shiftInfo.hours === 0 && shiftCode !== 'OFF';
        const isOff = shiftCode === 'OFF';

        if(isLeave) weeklyStat.assignedLeave++;
        if(isOff) weeklyStat.assignedOffs++;

        if (shiftInfo) {
          const hours = shiftInfo.hours;
          profile.assignedHours += hours;
          weeklyStat.assignedHours += hours;
          
          if (shiftInfo.category === '주말근무') profile.weekendShifts++;
          if (shiftInfo.category === '당직') profile.onCallShifts++;
        }
      });
       profile.assignedOffs = profile.weeklyStats.reduce((sum, ws) => sum + ws.assignedOffs, 0);
    });
  },
};

