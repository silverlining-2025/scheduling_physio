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
    
    // 1. Initialize Context
    const context = this._initializeContext(year, month);
    LoggerService.log("Step 1: Context Initialized.");

    // 2. Calculate Targets
    this._calculateAndSetStaffTargets(context);
    LoggerService.log("Step 2: Staff Targets Calculated.");
    
    // 3. Apply Pre-Constraints (Vacations, Golden Weekends)
    this._applyPreConstraints(context);
    LoggerService.log("Step 3: Pre-constraints (Vacations, etc.) Applied.");

    // 4. Main Generation Loop (Delegated to Assignment Engine)
    AssignmentEngine.runMainLoop(context);
    LoggerService.log("Step 4: Main Generation Loop COMPLETED.");
    
    // 5. Post-Processing & Validation (Future Implementation)
    // LoggerService.log("Step 5: Starting Post-Processing and Validation...");
    
    // 6. Write to Sheet
    SheetService.writeSchedule(context.schedule, context.config.staff);
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
      
      // --- (MODIFIED) Logic for Shutdown Holidays ---
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

    // --- (MODIFIED) Simpler, more robust Golden Weekend assignment ---
    if (context.config.rules.golden_weekend_enabled) {
      const days = context.config.rules.golden_weekend_days.split(',');
      const firstDayOfWeek = days[0];
      const secondDayOfWeek = days[1];

      // Find all possible slots and initialize their assignment counters
      const availableSlots = [];
      for (const dateString in context.schedule) {
        const day = context.schedule[dateString];
        if (day.dayName === firstDayOfWeek) {
          const nextDay = new Date(day.date);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayString = DateUtils.formatDate(nextDay);
          if (context.schedule[nextDayString] && context.schedule[nextDayString].dayName === secondDayOfWeek) {
            availableSlots.push({ day1: dateString, day2: nextDayString, assignedCount: 0 });
          }
        }
      }

      // Single Pass: Iterate through each staff member and find them a valid slot
      Object.values(context.staff).forEach(staff => {
        if (staff.stats.hasGoldenWeekendOff) return; // Already assigned

        for (const slot of availableSlots) {
          // --- NEW CHECK ---
          const isSlotFull = slot.assignedCount >= context.config.rules.max_staff_on_golden_weekend_off;

          const isSlotValidForStaff = !context.schedule[slot.day1].assignments[staff.name] &&
                                      !context.schedule[slot.day2].assignments[staff.name] &&
                                      this._canAssignOffWithoutViolatingRules(context, slot.day1) &&
                                      this._canAssignOffWithoutViolatingRules(context, slot.day2);
          
          if (!isSlotFull && isSlotValidForStaff) {
            // Assign the OFF block
            context.schedule[slot.day1].assignments[staff.name] = 'OFF';
            context.schedule[slot.day2].assignments[staff.name] = 'OFF';
            staff.stats.hasGoldenWeekendOff = true;
            slot.assignedCount++; // Increment the counter for this slot
            
            // Log the assignment
            log.goldenWeekendsApplied++;
            log.goldenWeekendDetails.push(`Assigned to ${staff.name} on ${slot.day1} & ${slot.day2}`);
            
            // Move to the next staff member
            return;
          }
        }
        // If the loop finishes and no slot was found for this staff member
        log.goldenWeekendDetails.push(`WARNING: Could not find a valid Golden Weekend slot for ${staff.name}.`);
      });
    }

    if (isTest) {
      return log;
    }
  }
};

