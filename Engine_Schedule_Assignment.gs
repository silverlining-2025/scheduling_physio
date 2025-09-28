/**
 * @file Engine_Schedule_Assignment.gs
 * @description Handles the detailed logic of assigning shifts and OFFs.
 */
const AssignmentEngine = {

  /**
   * The main loop that iterates through each day and assigns shifts/offs.
   * @param {object} context The main context object.
   */
  runMainLoop: function(context) {
    const dateStrings = Object.keys(context.schedule).sort();
    
    for (const dateString of dateStrings) {
      this._determineAssignmentsForDay(context, dateString);
    }
  },

  /**
   * Determines and makes assignments for a single day.
   * @param {object} context The main context object.
   * @param {string} dateString The date to process.
   * @private
   */
  _determineAssignmentsForDay: function(context, dateString) {
    const day = context.schedule[dateString];
    const unassignedStaff = Object.values(context.staff).filter(s => !day.assignments[s.name]);

    if (unassignedStaff.length === 0) return;

    // --- Scoring Pass: Decide who gets an OFF day ---
    const offCandidates = [];
    for (const staff of unassignedStaff) {
      const score = this._calculateOffPriorityScore(context, staff, dateString);
      if (score > 0) {
        offCandidates.push({ staff, score });
      }
    }
    offCandidates.sort((a, b) => b.score - a.score);

    // --- Assignment Pass ---
    // First, give OFFs to highest priority candidates if rules allow
    for (const candidate of offCandidates) {
      if (Orchestrator._canAssignOffWithoutViolatingRules(context, dateString)) {
        this._makeAssignment(context, dateString, candidate.staff.name, 'OFF');
      }
    }

    // Assign work shifts to the rest using the best-fit logic
    const remainingStaff = Object.values(context.staff).filter(s => !day.assignments[s.name]);
    for (const staff of remainingStaff) {
       const bestShiftCode = this._getBestFitWorkShift(context, staff, day.dayType);
       this._makeAssignment(context, dateString, staff.name, bestShiftCode);
    }
  },
  
  /**
   * Calculates the most appropriate work shift for a staff member based on their remaining hours.
   * @param {object} context The main context object.
   * @param {object} staff The staff profile.
   * @param {string} dayType The type of day ('평일', '주말', '공휴일').
   * @returns {string} The code for the best-fit shift (e.g., 'D8', 'D6').
   * @private
   */
  _getBestFitWorkShift: function(context, staff, dayType) {
    const hoursNeeded = staff.targets.monthlyHours - staff.stats.currentHours;

    // Determine the correct shift category based on the day type
    const category = (dayType === '평일') ? '일반근무' : '주말근무';
    
    // Get all valid shifts for that category from the config, sorted longest to shortest
    const availableShifts = Object.values(context.config.shifts)
      .filter(s => s.category === category && s.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    // If for some reason no shifts are defined for this category, log an error.
    if (availableShifts.length === 0) {
      LoggerService.log(`🚨 CRITICAL ERROR: No shifts found for category '${category}'. Please check '⚙️설정' sheet.`);
      return ''; // Return an empty string which will fail validation cleanly.
    }
    
    // If staff has already met or exceeded their hours, assign the shortest possible shift.
    if (hoursNeeded <= 0) {
        return availableShifts[availableShifts.length - 1].code;
    }

    // Find the longest shift that is less than or equal to the hours they still need.
    let bestFit = availableShifts.find(s => s.hours <= hoursNeeded);
    
    // If all available shifts are longer than what they need (e.g., need 3h, shortest is 4h),
    // then just assign the shortest one available to minimize overtime.
    if (!bestFit) {
        bestFit = availableShifts[availableShifts.length - 1];
    }
    
    return bestFit.code;
  },

  /**
   * Calculates a score indicating a staff's priority for an OFF day.
   * @param {object} context The context object.
   * @param {object} staff The staff profile.
   * @param {string} dateString The date of the potential OFF.
   * @returns {number} The priority score. Higher is more urgent.
   * @private
   */
  _calculateOffPriorityScore: function(context, staff, dateString) {
    if (staff.stats.consecutiveOffDays >= staff.constraints.maxConsecutiveOffs) return 0;

    let score = 0;
    // High priority if they are about to violate max consecutive work days
    if (staff.stats.consecutiveWorkDays >= staff.constraints.maxConsecutiveWork - 1) {
      score += 1000;
    }
    // Add points for each OFF day they still need to meet their target
    const offDayDeficit = staff.targets.monthlyOffs - staff.stats.currentOffs;
    if (offDayDeficit > 0) {
      score += offDayDeficit * 10;
    }
    // Add minor points for each day they've worked in a row
    score += staff.stats.consecutiveWorkDays;

    return score;
  },

  /**
   * Finalizes an assignment and updates all relevant stats.
   * @param {object} context The main context object.
   * @param {string} dateString The date of the assignment.
   * @param {string} staffName The name of the staff member.
   * @param {string} assignmentCode The shift code ('D8', 'OFF', etc.).
   * @private
   */
  _makeAssignment: function(context, dateString, staffName, assignmentCode) {
    const day = context.schedule[dateString];
    const staff = context.staff[staffName];
    const shift = context.config.shifts[assignmentCode];

    day.assignments[staffName] = assignmentCode;

    // Update stats based on the assignment type
    if (assignmentCode === 'OFF') {
      staff.stats.currentOffs++;
      staff.stats.consecutiveOffDays++;
      staff.stats.consecutiveWorkDays = 0; // Reset work streak
    } else if (shift) { // It's a work shift defined in the config
      staff.stats.currentHours += shift.hours;
      staff.stats.consecutiveWorkDays++;
      staff.stats.consecutiveOffDays = 0; // Reset OFF streak
      if (day.dayType === '주말' || day.dayType === '공휴일') {
        staff.stats.weekendWorkDays++;
      }
    }
  }
};

