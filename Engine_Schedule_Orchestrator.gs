/**
 * @file Engine_Schedule_Orchestrator.gs
 * @description The main orchestrator for the scheduling process.
 */
const Orchestrator = {
  /**
   * Main function to generate the schedule.
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
    LoggerService.log("Step 3: Pre-constraints Applied.");

    AssignmentEngine.runMainLoop(context);
    LoggerService.log("Step 4: Main Generation Loop Completed.");
    
    this._assignOnCallShifts(context);
    LoggerService.log("Step 5: On-Call Shifts Assigned.");
    
    this._performFinalBalancing(context);
    LoggerService.log("Step 6: Final Hour Balancing Completed.");

    SheetService.writeSchedule(context);
    LoggerService.log("Step 7: Schedule Written to Sheet.");
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
    const vacationRequests = SheetService.getVacationRequests(year, month);

    const context = { year, month, config, holidays, vacationRequests, schedule: {}, staff: {} };

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
          maxConsecutiveOffs: config.rules.max_consecutive_offs
        }
      };
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = Util_Date.formatDate(d);
      const dayName = d.toLocaleDateString('ko-KR', { weekday: 'long' });
      const holidayInfo = holidays.find(h => h.date === dateString);
      const dayType = holidayInfo ? holidayInfo.type : (Util_Date.isWeekend(d) ? '주말' : '평일');

      const requirements = { minStaff: 0, maxStaff: 0, onCall: false };
      
      if (dayType === '병원휴무일') {
        requirements.minStaff = 0;
        requirements.maxStaff = 0;
      } else if (dayType === '주말' || dayType === '공휴일') {
        requirements.minStaff = config.rules.weekend_holiday_staff_required;
        requirements.maxStaff = config.rules.weekend_holiday_staff_required;
        requirements.onCall = config.rules.oncall_required_weekend;
      } else { // Weekday
        requirements.minStaff = (dayName === '월요일') ? config.rules.mon_staff_fixed : config.rules.tue_fri_staff_min;
        requirements.maxStaff = (dayName === '월요일') ? config.rules.mon_staff_fixed : config.rules.tue_fri_staff_max;
        requirements.onCall = config.rules.oncall_required_weekday;
      }

      context.schedule[dateString] = {
        date: new Date(d), dateString, dayName, dayType, requirements,
        stats: { assignedStaff: 0, assignedOnCall: false }, assignments: {}
      };
    }
    return context;
  },

  /**
   * Calculates and sets the monthly targets for each staff member.
   * @param {object} context The main context object.
   * @param {boolean} [isTest=false] - If true, returns calculation details for logging.
   * @private
   */
  _calculateAndSetStaffTargets: function(context, isTest = false) {
    const { year, month, schedule } = context;
    let sundaysAndHolidays = 0, halfSaturdays = 0;

    Object.values(schedule).forEach(day => {
      if (day.dayName === '일요일' || day.dayType === '공휴일' || day.dayType === '병원휴무일') {
        sundaysAndHolidays++;
      }
      if (day.dayName === '토요일' && day.dayType !== '공휴일' && day.dayType !== '병원휴무일') {
        halfSaturdays++;
      }
    });
    
    const baseOffDays = Math.round(sundaysAndHolidays + (halfSaturdays * 0.5));
    const totalDaysInMonth = Object.keys(schedule).length;

    Object.values(context.staff).forEach(staff => {
      let vacationDaysThisMonth = 0;
      context.vacationRequests.forEach(req => {
        if (req.name === staff.name) {
          for (let d = new Date(req.start); d <= req.end; d.setDate(d.getDate() + 1)) {
            if (d.getFullYear() === year && d.getMonth() === month - 1) {
              const dateString = Util_Date.formatDate(d);
              if (context.schedule[dateString] && context.schedule[dateString].dayType === '평일') {
                vacationDaysThisMonth++;
              }
            }
          }
        }
      });
      staff.stats.vacationDays = vacationDaysThisMonth;
      staff.targets.monthlyOffs = baseOffDays;
      staff.targets.monthlyHours = (totalDaysInMonth - baseOffDays - vacationDaysThisMonth) * 8;
    });
    
    if (isTest) {
      return { baseOffDays, calculationDetails: `${sundaysAndHolidays} Sundays/Holidays + ${halfSaturdays} Sats * 0.5` };
    }
  },
  
  /**
   * Helper function to check if assigning an OFF day violates minimum staffing.
   * @param {object} context The main context object.
   * @param {string} dateString The date to check.
   * @returns {boolean} True if the assignment is valid.
   * @private
   */
  _canAssignOffWithoutViolatingRules: function(context, dateString) {
    const day = context.schedule[dateString];
    if (!day) return false;

    const totalStaffCount = Object.keys(context.staff).length;
    const offOrVacationCount = Object.values(day.assignments).filter(a => a === context.config.specialShiftCodes.off || context.config.shifts[a]?.category === '휴가').length;

    const proposedWorkingStaff = totalStaffCount - (offOrVacationCount + 1);
    return proposedWorkingStaff >= day.requirements.minStaff;
  },

  /**
   * Scans the schedule and groups consecutive weekend/holiday days into blocks.
   * @param {object} context The main context object.
   * @returns {Array<Array<string>>} An array of blocks, where each block is an array of date strings.
   * @private
   */
  _identifyHolidayBlocks: function(context) {
    const blocks = [];
    const sortedDates = Object.keys(context.schedule).sort();
    let currentBlock = [];

    for (const dateString of sortedDates) {
      const day = context.schedule[dateString];
      const isHolidayOrWeekend = (day.dayType === '주말' || day.dayType === '공휴일') && day.requirements.minStaff > 0;

      if (isHolidayOrWeekend) {
        currentBlock.push(dateString);
      } else {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
      }
    }
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }
    return blocks;
  },

  /**
   * Applies non-negotiable constraints: shutdowns, vacations, golden weekends, and holiday block work.
   * @param {object} context The main context object.
   * @param {boolean} [isTest=false] - If true, returns a log object.
   * @private
   */
  _applyPreConstraints: function(context, isTest = false) {
    const log = { shutdowns: 0, vacations: 0, goldenWeekends: 0, weekendWork: 0, details: [] };
    const { year, month, config } = context;
    const [gwDay1, gwDay2] = config.rules.golden_weekend_days.split(',');

    // Step 1: Hospital Shutdown Days & Approved Vacations
    Object.values(context.schedule).forEach(day => {
      if (day.dayType === '병원휴무일') {
        Object.values(context.staff).forEach(staff => {
          if (!day.assignments[staff.name]) {
            day.assignments[staff.name] = config.specialShiftCodes.off;
            log.shutdowns++;
          }
        });
        log.details.push(`[SHUTDOWN] Applied 'OFF' to all staff on ${day.dateString}`);
      }
    });

    context.vacationRequests.forEach(req => {
      for (let d = new Date(req.start); d <= req.end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month - 1) {
          const dateString = Util_Date.formatDate(d);
          if (context.schedule[dateString] && !context.schedule[dateString].assignments[req.name]) {
            context.schedule[dateString].assignments[req.name] = req.type;
            log.vacations++;
            log.details.push(`[VACATION] Applied '${req.type}' for ${req.name} on ${dateString}`);
          }
        }
      }
    });
    
    // Step 2: Holiday Block WORK Scheduling (Assigns WORK only, leaves OFFs empty)
    const holidayBlocks = this._identifyHolidayBlocks(context);
    const weekendShift = Object.values(config.shifts).find(s => s.category === '주말근무');
    if (!weekendShift) {
        log.details.push("[ERROR] No shift for '주말근무' category. Skipping holiday assignments.");
    } else {
        log.details.push(`\n[HOLIDAY BLOCKS] Identified ${holidayBlocks.length} blocks to schedule fairly.`);
        holidayBlocks.forEach((block, index) => {
            log.details.push(`[BLOCK ${index + 1}] Assigning WORK for block: ${block.join(', ')}`);
            for (const dateString of block) {
                const day = context.schedule[dateString];
                const staffNeeded = day.requirements.minStaff;
                let staffAssignedThisDay = Object.values(day.assignments).filter(a => a === weekendShift.code).length;
                if (staffAssignedThisDay >= staffNeeded) continue;
                
                let staffPool = Object.values(context.staff).filter(staff => !day.assignments[staff.name]);
                staffPool.sort((a, b) => {
                    const aWorkedInBlock = block.some(d => context.schedule[d].assignments[a.name] === weekendShift.code);
                    const bWorkedInBlock = block.some(d => context.schedule[d].assignments[b.name] === weekendShift.code);
                    if (aWorkedInBlock && !bWorkedInBlock) return 1;
                    if (!aWorkedInBlock && bWorkedInBlock) return -1;
                    return a.stats.weekendWorkDays - b.stats.weekendWorkDays;
                });
                
                const staffToAssignCount = staffNeeded - staffAssignedThisDay;
                for (let i = 0; i < staffToAssignCount && i < staffPool.length; i++) {
                    const staff = staffPool[i];
                    day.assignments[staff.name] = weekendShift.code;
                    staff.stats.weekendWorkDays++;
                    log.weekendWork++;
                    log.details.push(`  - WORK: Assigned ${staff.name} on ${dateString}`);
                }
            }
        });
    }

    // Step 3: Check for vacation-based Golden Weekends
    Object.values(context.staff).forEach(staff => {
        if (staff.stats.hasGoldenWeekendOff) return;
        for (const dateString in context.schedule) {
            const day = context.schedule[dateString];
            if (day.dayName === gwDay1) {
                const nextDayString = Util_Date.formatDate(new Date(new Date(dateString).getTime() + 86400000));
                const nextDay = context.schedule[nextDayString];
                if (nextDay && nextDay.dayName === gwDay2) {
                    const assignment1 = day.assignments[staff.name];
                    const assignment2 = nextDay.assignments[staff.name];
                    const isVacationOnDay1 = config.shifts[assignment1]?.category === '휴가';
                    if (isVacationOnDay1 && !assignment2) {
                        nextDay.assignments[staff.name] = config.specialShiftCodes.off;
                        staff.stats.hasGoldenWeekendOff = true;
                        log.details.push(`[GOLDEN] ${staff.name} credited a Golden Weekend due to vacation on ${dateString}.`);
                        break;
                    }
                }
            }
        }
    });

    // Step 4: Assign remaining mandatory Golden Weekends
    if (config.rules.golden_weekend_enabled) {
      Object.values(context.staff).forEach(staff => {
        if (staff.stats.hasGoldenWeekendOff) return;
        for (const dateString in context.schedule) {
          const day = context.schedule[dateString];
          if (day.dayName === gwDay1) {
            const nextDayString = Util_Date.formatDate(new Date(new Date(dateString).getTime() + 86400000));
            const nextDay = context.schedule[nextDayString];
            if (nextDay && nextDay.dayName === gwDay2) {
              if (!day.assignments[staff.name] && !nextDay.assignments[staff.name] && this._canAssignOffWithoutViolatingRules(context, dateString) && this._canAssignOffWithoutViolatingRules(context, nextDayString)) {
                day.assignments[staff.name] = config.specialShiftCodes.off;
                nextDay.assignments[staff.name] = config.specialShiftCodes.off;
                staff.stats.hasGoldenWeekendOff = true;
                log.goldenWeekends++;
                log.details.push(`[GOLDEN] Assigned mandatory Golden Weekend to ${staff.name} on ${dateString} & ${nextDayString}`);
                break;
              }
            }
          }
        }
      });
    }

    // After pre-constraints, any remaining empty weekend slots are left for the main assignment engine.

    if (isTest) return log;
  },


  /**
   * Assigns on-call shifts where required.
   * @param {object} context The main context object.
   * @param {boolean} [isTest=false] - If true, returns a log object.
   * @private
   */
  _assignOnCallShifts: function(context, isTest = false) {
    const { onCall: onCallShiftCode } = context.config.specialShiftCodes;
    const onCallShift = context.config.shifts[onCallShiftCode];
    let log = { onCallAssignments: 0, details: [] };
    
    if (!onCallShiftCode) {
        if(isTest) log.details.push("[WARNING] No on-call shift defined.");
        return log;
    }

    const sortedDates = Object.keys(context.schedule).sort();
    for (const dateString of sortedDates) {
      const day = context.schedule[dateString];
      if (!day.requirements.onCall) continue;

      let candidates = Object.values(context.staff).filter(staff => {
        const assignment = day.assignments[staff.name];
        return assignment && assignment !== context.config.specialShiftCodes.off && context.config.shifts[assignment]?.category !== '휴가' && assignment !== onCallShiftCode;
      });

      const prevDayString = Util_Date.formatDate(new Date(new Date(dateString).getTime() - 86400000));
      candidates = candidates.filter(staff => !(context.schedule[prevDayString] && context.schedule[prevDayString].assignments[staff.name] === onCallShiftCode));
      
      if (candidates.length === 0) {
        log.details.push(`WARNING for ${dateString}: No eligible candidates for on-call.`);
        continue;
      }

      candidates.sort((a, b) => a.stats.onCallDays - b.stats.onCallDays);
      const bestCandidate = candidates[0];
      const originalAssignment = day.assignments[bestCandidate.name];
      const originalShift = context.config.shifts[originalAssignment];

      if (originalShift) bestCandidate.stats.currentHours -= originalShift.hours;
      day.assignments[bestCandidate.name] = onCallShiftCode;
      bestCandidate.stats.currentHours += onCallShift.hours;
      bestCandidate.stats.onCallDays++;
      log.onCallAssignments++;
      log.details.push(`Assigned ${onCallShiftCode} to ${bestCandidate.name} on ${dateString} (replaced ${originalAssignment})`);
    }

    if (isTest) return log;
  },

  /**
   * Balances work hours among staff.
   * @param {object} context The main context object.
   * @param {boolean} [isTest=false] - If true, returns a log object.
   * @private
   */
  _performFinalBalancing: function(context, isTest = false) {
    const MAX_ITERATIONS = 30;
    let swapsMade = 0;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        let staffList = Object.values(context.staff).map(s => ({ ...s, deviation: s.stats.currentHours - s.targets.monthlyHours }));
        const overworked = staffList.filter(s => s.deviation > 1).sort((a, b) => b.deviation - a.deviation);
        const underworked = staffList.filter(s => s.deviation < -1).sort((a, b) => a.deviation - b.deviation);
        if (overworked.length === 0 || underworked.length === 0) break;
        const staffA = overworked[0];
        const staffB = underworked[0];
        let hasSwapped = false;
        for (const dateString of Object.keys(context.schedule)) {
            const shiftA_code = context.schedule[dateString].assignments[staffA.name];
            const shiftB_code = context.schedule[dateString].assignments[staffB.name];
            const shiftA = context.config.shifts[shiftA_code];
            const shiftB = context.config.shifts[shiftB_code];
            if (shiftA && shiftB && shiftA.hours > shiftB.hours && shiftA.category === shiftB.category) {
                const hourDiff = shiftA.hours - shiftB.hours;
                if (Math.abs(staffA.deviation - hourDiff) < Math.abs(staffA.deviation) && Math.abs(staffB.deviation + hourDiff) < Math.abs(staffB.deviation)) {
                    context.schedule[dateString].assignments[staffA.name] = shiftB_code;
                    context.schedule[dateString].assignments[staffB.name] = shiftA_code;
                    context.staff[staffA.name].stats.currentHours -= hourDiff;
                    context.staff[staffB.name].stats.currentHours += hourDiff;
                    swapsMade++;
                    hasSwapped = true;
                    if(isTest) LoggerService.log(`[BALANCE] Swapped ${staffA.name} (${shiftA_code}) with ${staffB.name} (${shiftB_code}) on ${dateString}.`);
                    break;
                }
            }
        }
        if (!hasSwapped) break;
    }
    if (isTest) return { swapsMade };
  }
};

