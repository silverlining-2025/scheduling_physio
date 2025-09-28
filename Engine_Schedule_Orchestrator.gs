/**
 * @file Engine_Schedule_Orchestrator.gs
 * @description The main orchestrator for the scheduling process.
 */
const Orchestrator = {
  /**
   * Main function to generate the schedule.
   * Orchestrates the entire process from data loading to writing the final schedule.
   * @param {number} year The target year.
   * @param {number} month The target month (1-12).
   * @returns {boolean} True if successful, false otherwise.
   */
  generateSchedule: function(year, month) {
    LoggerService.log(`--- Starting Schedule Generation for ${year}-${month} ---`);
    
    const context = this._initializeContext(year, month);
    LoggerService.log("Step 1: Context Initialized.");

    this._calculateAndSetStaffTargets(context);
    LoggerService.log("Step 2: Staff Targets Calculated.");
    
    this._applyPreConstraints(context);
    LoggerService.log("Step 3: Pre-constraints (Vacations, Golden Weekends) Applied.");

    AssignmentEngine.runMainLoop(context);
    LoggerService.log("Step 4: Main Generation Loop COMPLETED.");
    
    // --- (NEW) Step 5: Assign On-Call Shifts ---
    this._assignOnCallShifts(context);
    LoggerService.log("Step 5: On-Call Shifts Assigned.");
    
    // 6. Write to Sheet
    SheetService.writeSchedule(context);
    LoggerService.log("Step 6: Schedule Written to Sheet.");
    LoggerService.log("--- Schedule Generation Finished Successfully ---");

    return true;
  },

  /**
   * Initializes the main context object.
   * @param {number} year The target year.
   * @param {number} month The target month (1-12).
   * @returns {object} The initialized context.
   * @private
   */
  _initializeContext: function(year, month) {
    const config = SheetService.getConfig();
    const holidays = SheetService.getHolidays(year, month);
    const vacationRequests = SheetService.getVacationRequests();

    const context = {
      year,
      month,
      config,
      holidays,
      vacationRequests,
      schedule: {},
      staff: {}
    };

    // Initialize Rich Staff Profiles
    config.staff.forEach(name => {
      context.staff[name] = {
        name: name,
        targets: { monthlyHours: 0, monthlyOffs: 0 },
        stats: {
          currentHours: 0, currentOffs: 0, weekendWorkDays: 0,
          onCallDays: 0, consecutiveWorkDays: 0, consecutiveOffDays: 0,
          hasGoldenWeekendOff: false, vacationDays: 0
        },
        constraints: {
          maxConsecutiveWork: config.rules.max_consecutive_work_days,
          maxConsecutiveOffs: config.rules.max_consecutive_offs,
          maxConsecutiveOnCall: config.rules.consecutive_oncall_days_max
        }
      };
    });

    // Initialize Rich Day Profiles
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = DateUtils.formatDate(d);
      const dayName = d.toLocaleDateString('ko-KR', { weekday: 'long' });
      const holidayInfo = holidays.find(h => h.date === dateString);
      const dayType = holidayInfo ? holidayInfo.type : (DateUtils.isWeekend(d) ? '주말' : '평일');

      // Determine daily requirements
      const requirements = { minStaff: 0, maxStaff: 0, onCall: false };
      
      if (dayType === '병원휴무일') {
        requirements.minStaff = 0;
        requirements.maxStaff = 0;
        requirements.onCall = false;
      } else if (dayType === '주말' || dayType === '공휴일') {
        requirements.minStaff = config.rules.weekend_holiday_staff_required;
        requirements.maxStaff = config.rules.weekend_holiday_staff_required;
        requirements.onCall = config.rules.oncall_required_weekend;
      } else { // Weekday
        if (dayName === '월요일') {
          requirements.minStaff = config.rules.mon_staff_fixed;
          requirements.maxStaff = config.rules.mon_staff_fixed;
        } else { // Tue-Fri
          requirements.minStaff = config.rules.tue_fri_staff_min;
          requirements.maxStaff = config.rules.tue_fri_staff_max;
        }
        requirements.onCall = config.rules.oncall_required_weekday;
      }

      context.schedule[dateString] = {
        date: new Date(d),
        dateString: dateString,
        dayName: dayName,
        dayType: dayType,
        requirements: requirements,
        stats: { assignedStaff: 0, assignedOnCall: false },
        assignments: {}
      };
    }
    return context;
  },

  /**
   * Calculates and sets the monthly targets for each staff member.
   * @param {object} context The main context object.
   * @param {boolean} [isTest=false] - If true, returns calculation details for logging.
   * @returns {object|void} If isTest, returns details. Otherwise, nothing.
   * @private
   */
  _calculateAndSetStaffTargets: function(context, isTest = false) {
    const { year, month, config, schedule } = context;
    const method = config.rules.off_day_calculation_method;

    let sundays = 0, holidays = 0, halfSaturdays = 0, baseOffDays = 0;

    Object.values(schedule).forEach(day => {
      if (method === 'sundays_holidays_half_saturdays') {
        if (day.dayName === '일요일' || day.dayType === '공휴일' || day.dayType === '병원휴무일') {
            sundays++;
        }
        if (day.dayName === '토요일' && day.dayType !== '공휴일' && day.dayType !== '병원휴무일') {
            halfSaturdays++;
        }
      }
    });
    
    baseOffDays = Math.round(sundays + holidays + (halfSaturdays * 0.5));

    const totalDaysInMonth = Object.keys(schedule).length;

    // Apply targets to each staff member
    Object.values(context.staff).forEach(staff => {
      let vacationDaysThisMonth = 0;
      context.vacationRequests.forEach(req => {
        if (req.name === staff.name) {
          for (let d = new Date(req.start); d <= req.end; d.setDate(d.getDate() + 1)) {
            if (d.getFullYear() === year && d.getMonth() === month - 1) {
              const dateString = DateUtils.formatDate(d);
              if (context.schedule[dateString] && context.schedule[dateString].dayType !== '주말' && context.schedule[dateString].dayType !== '공휴일' && context.schedule[dateString].dayType !== '병원휴무일') {
                 vacationDaysThisMonth++;
              }
            }
          }
        }
      });
      staff.stats.vacationDays = vacationDaysThisMonth;
      staff.targets.monthlyOffs = baseOffDays;
      staff.targets.monthlyHours = (totalDaysInMonth - staff.targets.monthlyOffs - vacationDaysThisMonth) * 8;
    });
    
    if (isTest) {
      return { baseOffDays, calculationDetails: `${sundays} Sundays/Holidays + ${halfSaturdays} Sats * 0.5` };
    }
  },
  
  /**
   * Helper function to check if assigning an OFF day violates minimum staffing.
   * @param {object} context The main context object.
   * @param {string} dateString The date to check ('YYYY-MM-DD').
   * @returns {boolean} True if the assignment is valid, false otherwise.
   */
  _canAssignOffWithoutViolatingRules: function(context, dateString) {
    const day = context.schedule[dateString];
    if (!day) return false;

    const totalStaffCount = Object.keys(context.staff).length;
    let currentlyAssignedOff = 0;
    Object.values(day.assignments).forEach(assignment => {
      if (assignment === 'OFF' || assignment === '휴가') {
        currentlyAssignedOff++;
      }
    });

    const proposedWorkingStaff = totalStaffCount - (currentlyAssignedOff + 1);
    return proposedWorkingStaff >= day.requirements.minStaff;
  },

  /**
   * Applies non-negotiable constraints like vacations and mandatory OFF blocks.
   * @param {object} context The main context object.
   * @param {boolean} [isTest=false] - If true, returns a log object.
   * @returns {object|void} If isTest, returns log object.
   * @private
   */
  _applyPreConstraints: function(context, isTest = false) {
    const { year, month } = context;
    let log = { vacationsApplied: 0, goldenWeekendsApplied: 0, goldenWeekendDetails: [] };

    // 1. Apply Approved Vacations
    context.vacationRequests.forEach(req => {
      for (let d = new Date(req.start); d <= req.end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month - 1) {
          const dateString = DateUtils.formatDate(d);
          if (context.schedule[dateString]) {
            context.schedule[dateString].assignments[req.name] = '휴가';
            log.vacationsApplied++;
          }
        }
      }
    });

    if (isTest) {
      return log;
    }
  },

  /**
   * Iterates through the schedule and assigns on-call shifts where required.
   * This happens *after* the main schedule is generated.
   * @param {object} context The main context object.
   * @param {boolean} [isTest=false] - If true, returns a log object.
   * @returns {object|void} If isTest, returns log object.
   * @private
   */
  _assignOnCallShifts: function(context, isTest = false) {
    const onCallShiftCode = 'OC10';
    const onCallShift = context.config.shifts[onCallShiftCode];
    if (!onCallShift) {
      LoggerService.log("WARNING: On-call shift 'OC10' not found in config. Skipping on-call assignments.");
      return;
    }

    let log = { onCallAssignments: 0, details: [] };

    const sortedDates = Object.keys(context.schedule).sort();

    for (const dateString of sortedDates) {
      const day = context.schedule[dateString];

      if (day.requirements.onCall) {
        // Find eligible candidates: those working a regular shift.
        let candidates = Object.values(context.staff).filter(staff => {
          const assignment = day.assignments[staff.name];
          return assignment && assignment !== 'OFF' && assignment !== '휴가' && assignment !== onCallShiftCode;
        });

        // Filter out candidates who were on-call the previous day
        const prevDay = new Date(day.date);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayString = DateUtils.formatDate(prevDay);
        
        candidates = candidates.filter(staff => {
          if (context.schedule[prevDayString]) {
            return context.schedule[prevDayString].assignments[staff.name] !== onCallShiftCode;
          }
          return true; // No previous day, so no restriction
        });
        
        if (candidates.length === 0) {
          log.details.push(`WARNING for ${dateString}: No eligible candidates found for on-call duty.`);
          continue;
        }

        // Find the best candidate: the one with the fewest on-call days so far.
        candidates.sort((a, b) => a.stats.onCallDays - b.stats.onCallDays);
        const bestCandidate = candidates[0];

        // --- Perform the shift swap ---
        const originalAssignment = day.assignments[bestCandidate.name];
        const originalShift = context.config.shifts[originalAssignment];

        // 1. Revert original shift's stats
        if (originalShift) {
          bestCandidate.stats.currentHours -= originalShift.hours;
        }

        // 2. Apply new on-call shift's stats
        day.assignments[bestCandidate.name] = onCallShiftCode;
        bestCandidate.stats.currentHours += onCallShift.hours;
        bestCandidate.stats.onCallDays++;

        log.onCallAssignments++;
        log.details.push(`Assigned ${onCallShiftCode} to ${bestCandidate.name} on ${dateString} (replaced ${originalAssignment})`);
      }
    }

    if (isTest) {
      return log;
    }
  }
};

