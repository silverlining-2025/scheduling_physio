/**
 * @file Engine_Balancer.js
 * @description Balances the schedule to ensure fairness regarding target work hours.
 */
const Engine_Balancer = {
  /**
   * Runs the balancing algorithm to adjust shifts for fairness.
   * @param {Object} context The global scheduling context.
   */
  run: function (context) {
    Util_Logger.log('DEBUG', 'Running Balancer...');
    let iterations = 0;
    while (iterations < CONFIG.BALANCER_MAX_ITERATIONS) {
      Service_Summary.recalculateStaffProfiles(context);
      const imbalances = Engine_Fairness.findWorkHourImbalances(context);

      if (imbalances.length < 2) {
        Util_Logger.log('INFO', 'No significant imbalances found. Balancer finished early.');
        break; // Exit if no one is over/under worked.
      }
      
      const fixed = this._tryFixImbalance(context, imbalances);
      if (!fixed) {
         Util_Logger.log('INFO', 'Could not find a valid swap to improve balance. Balancer finished.');
         break; // Exit if no valid swap can be found
      }
      
      iterations++;
    }
    if (iterations === CONFIG.BALANCER_MAX_ITERATIONS) {
      Util_Logger.log('WARNING', 'Balancer reached max iterations. Schedule may not be perfectly balanced.');
    }
  },

  /**
   * Attempts to find a single valid shift swap between an over-worked and under-worked staff member.
   * @private
   * @param {Object} context The global scheduling context.
   * @param {Array<Object>} imbalances An array of staff members with their work hour imbalances.
   * @returns {boolean} True if a swap was successfully made, false otherwise.
   */
  _tryFixImbalance: function (context, imbalances) {
    const overStaff = imbalances.find(s => s.isOver);
    const underStaff = imbalances.find(s => !s.isOver);

    if (!overStaff || !underStaff) return false;

    // Iterate through each day to find a potential swap.
    for (let day = 1; day <= context.numDays; day++) {
      const overStaffShift = context.scheduleGrid[overStaff.staffIndex][day - 1];
      const underStaffShift = context.scheduleGrid[underStaff.staffIndex][day - 1];
      const shiftDef = overStaffShift ? context.shiftDefinitions.get(overStaffShift) : null;

      // A valid swap is a weekday shift for an OFF day.
      if (shiftDef && shiftDef.category === CONFIG.SHIFT_CATEGORIES.WEEKDAY && underStaffShift === CONFIG.SPECIAL_SHIFTS.OFF) {
        
        // Tentatively apply the swap.
        context.scheduleGrid[overStaff.staffIndex][day - 1] = CONFIG.SPECIAL_SHIFTS.OFF;
        context.scheduleGrid[underStaff.staffIndex][day - 1] = overStaffShift;

        // Validate the swap for both employees.
        const isOverStaffValid = Service_Validation.isDayValidForStaff(context, day, overStaff.staffIndex);
        const isUnderStaffValid = Service_Validation.isDayValidForStaff(context, day, underStaff.staffIndex);

        if (isOverStaffValid && isUnderStaffValid) {
          Util_Logger.log('DEBUG', `Balancer SWAP: Day ${day}, ${overStaff.staffName} (now OFF) with ${underStaff.staffName} (now ${overStaffShift}).`);
          return true; // Swap is valid and has been applied.
        } else {
          // Revert the swap if it's invalid.
          context.scheduleGrid[overStaff.staffIndex][day - 1] = overStaffShift;
          context.scheduleGrid[underStaff.staffIndex][day - 1] = CONFIG.SPECIAL_SHIFTS.OFF;
        }
      }
    }
    return false; // No valid swap found in the entire month.
  },
};

