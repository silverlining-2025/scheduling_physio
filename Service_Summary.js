/**
 * @fileoverview This service calculates all statistical summaries for a generated schedule.
 * MAJOR FIX: This rewritten version now correctly includes weekly target hours in the weekly summary,
 * combines OFF and Leave counts, and formats headers as requested.
 * @namespace Service_Summary
 */
const Service_Summary = {
  calculateAll: function(ctx) {
    Util_Logger.log("Calculating all summary statistics...");
    const daily = this._calculateDailySummary(ctx);
    const weekly = this._calculateWeeklySummary(ctx);
    const monthly = this._calculateMonthlySummary(ctx);
    return { daily, weekly, monthly };
  },

  _calculateDailySummary: function(ctx) {
    const summary = [];
    for (let day = 1; day <= ctx.numDays; day++) {
      let workingStaff = 0;
      let hasOnCall = false;
      ctx.staffList.forEach((name, i) => {
        const shiftCode = ctx.scheduleGrid[i][day-1];
        const shiftInfo = ctx.shiftDefinitions.get(shiftCode);
        if (shiftInfo && shiftInfo.hours > 0) {
          workingStaff++;
          if (shiftInfo.category === '당직') hasOnCall = true;
        }
      });
      summary.push([workingStaff, hasOnCall ? '✅' : '']);
    }
    return summary;
  },
  
  /**
   * REWRITTEN: Generates a pivot-style summary including target hours, assigned hours, and combined OFF/Leave.
   */
  _calculateWeeklySummary: function(ctx) {
    const headers = ['항목 (Category)', ...ctx.weeks.map((week, i) => {
      const start = Utilities.formatDate(new Date(ctx.year, ctx.month - 1, week.start), Session.getScriptTimeZone(), 'M/d');
      const end = Utilities.formatDate(new Date(ctx.year, ctx.month - 1, week.end), Session.getScriptTimeZone(), 'M/d');
      return `Week ${i + 1} (${start}-${end})`;
    })];

    const data = [];
    ctx.staffList.forEach(name => {
        const profile = ctx.staffProfiles.get(name);
        const targetRow = [`${name} (목표시간)`];
        const assignedRow = [`${name} (근무시간)`];
        const offLeaveRow = [`${name} (OFF/휴가)`];

        profile.weeklyStats.forEach(ws => {
            targetRow.push(ws.targetHours);
            assignedRow.push(ws.assignedHours);
            offLeaveRow.push(ws.assignedOffs + ws.assignedLeave);
        });
        data.push(targetRow, assignedRow, offLeaveRow);
    });
    
    return {
      title: '주간 근무 현황 요약 (Weekly Status Summary)',
      headers: headers,
      data: data
    };
  },

  /**
   * REWRITTEN: Monthly summary now correctly references monthly target hours.
   */
  _calculateMonthlySummary: function(ctx) {
    const headers = [
      '이름 (Name)', '월 목표시간', '월 배정시간', '시간 차이', 
      '총 OFF', '주말 근무', '당직 근무', "'금+토' 휴무"
    ];
    const data = ctx.staffList.map(name => {
      const profile = ctx.staffProfiles.get(name);
      return [
        name,
        profile.monthlyTargetHours,
        profile.assignedHours,
        profile.assignedHours - profile.monthlyTargetHours,
        profile.assignedOffs,
        profile.weekendShifts,
        profile.onCallShifts,
        profile.hasSpecialOff ? '✅' : '❌'
      ];
    });
    return { title: '월간 근무 현황 (Monthly Status Summary)', headers, data };
  }
};

