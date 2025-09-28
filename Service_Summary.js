/**
 * @file Service_Summary.js
 * @description Calculates and manages summary statistics for the schedule.
 */
const Service_Summary = {
  /**
   * Main function to calculate all summaries and write them to the sheet.
   * @param {Object} context The global scheduling context.
   */
  calculateAndWriteSummary: function (context) {
    this.recalculateStaffProfiles(context);
    Util_Logger.log('INFO', 'Summary statistics recalculated.');
    // Future enhancement: Add logic here to write these summaries to a specific range in the sheet.
  },

  /**
   * Recalculates the summary statistics for every staff member based on the current schedule grid.
   * This function should be called whenever the schedule grid is modified.
   * @param {Object} context The global scheduling context.
   */
  recalculateStaffProfiles: function (context) {
    context.staffProfiles.forEach((profile, staffName) => {
      const staffIndex = context.staffList.findIndex(s => s.name === staffName);
      let totalHours = 0, workDays = 0, offDays = 0, onCallCount = 0, weekendWorkCount = 0;
      
      context.scheduleGrid[staffIndex].forEach(shiftCode => {
        if (shiftCode) {
          const shiftDef = context.shiftDefinitions.get(shiftCode);
          if (shiftDef) {
            totalHours += shiftDef.hours;
            workDays++;
            if (shiftDef.category === CONFIG.SHIFT_CATEGORIES.ON_CALL) onCallCount++;
            if (shiftDef.category === CONFIG.SHIFT_CATEGORIES.WEEKEND) weekendWorkCount++;
          } else if (shiftCode === CONFIG.SPECIAL_SHIFTS.OFF) {
            offDays++;
          }
        } else {
            offDays++; // A null value also counts as an OFF day.
        }
      });

      profile.summary = { 
        totalHours, 
        workDays, 
        offDays, 
        onCallCount, 
        weekendWorkCount, 
        targetHours: Service_Rules.getMonthlyTargetHours(staffName) 
      };
    });
  },
};

