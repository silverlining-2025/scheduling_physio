/**
 * @file Service_Debug.gs
 * @description Contains functions for defining and running tests for the scheduler.
 */

const DebugService = {

  // --- PRIVATE HELPER FOR RICH LOGGING ---

  /**
   * Logs a detailed dump of the current assignment state.
   * @param {object} context The main context object.
   * @param {string} stageName The name of the stage just completed.
   * @private
   */
  _logScheduleState: function(context, stageName) {
    LoggerService.log(`--- [DEBUG DUMP] Schedule state after ${stageName} ---`);
    const staffNames = context.config.staff;
    const sortedDates = Object.keys(context.schedule).sort();

    for (const dateString of sortedDates) {
      const day = context.schedule[dateString];
      const assignments = day.assignments;
      
      const hasAssignments = Object.keys(assignments).length > 0;
      if (hasAssignments) {
        const logParts = staffNames.map(name => {
          const assignment = assignments[name];
          // --- (MODIFIED) Display undefined/null as empty, not '---' ---
          const displayValue = (assignment === undefined || assignment === null) ? '' : assignment;
          return `${name}:'${displayValue}'`;
        });
        LoggerService.log(`  [${dateString}] ${logParts.join(' | ')}`);
      }
    }
    LoggerService.log(`--- End of dump for ${stageName} ---`);
  },

  // --- PRIVATE TEST DEFINITIONS ---
  
  /** [STAGE 1] Tests the data ingestion services with rich logging. */
  test_SheetService_readAllData: function() {
    try {
      LoggerService.log('--- Running Stage 1 Test: Data Ingestion ---');
      const config = SheetService.getConfig();
      const { year, month } = SheetService.getTargetDate();
      const holidays = SheetService.getHolidays(year, month);
      const vacations = SheetService.getVacationRequests();

      if (!config || !config.staff || config.staff.length === 0) throw new Error("Config or staff list failed to load.");
      LoggerService.log(`[CONFIG] Loaded ${config.staff.length} staff members: ${config.staff.join(', ')}`);
      LoggerService.log(`[CONFIG] Loaded ${Object.keys(config.shifts).length} shift types.`);
      LoggerService.log(`[CONFIG] Loaded ${Object.keys(config.rules).length} rules.`);

      if (!holidays) throw new Error("Holidays failed to load.");
      const holidayDates = holidays.map(h => h.date);
      LoggerService.log(`[HOLIDAYS] Found ${holidayDates.length} holidays for ${year}-${month}: ${holidayDates.length > 0 ? holidayDates.join(', ') : 'None'}`);

      if (!vacations) throw new Error("Vacations failed to load.");
      LoggerService.log(`[VACATIONS] Found ${vacations.length} approved vacation requests.`);
      
      LoggerService.log("✅ Stage 1 Test PASSED");
      return true;

    } catch (e) {
      LoggerService.log(`❌ Stage 1 Test FAILED: ${e.message}\n${e.stack}`);
      return false;
    }
  },

  /** [STAGE 2] Tests the context and profile initialization with rich logging. */
  test_initializeContext: function() {
    try {
      LoggerService.log("\n--- Running Stage 2 Test: Context Initialization ---");
      const { year, month } = SheetService.getTargetDate();
      const context = Orchestrator._initializeContext(year, month);
      
      if (!context || Object.keys(context.staff).length === 0) throw new Error("Context or staff profiles failed to initialize.");
      
      LoggerService.log(`[CONTEXT] Initialized context for ${year}-${month}.`);
      LoggerService.log(`[CONTEXT] Created ${Object.keys(context.schedule).length} daily profiles and ${Object.keys(context.staff).length} staff profiles.`);
      
      const aDay = context.schedule[Object.keys(context.schedule)[10]]; // Check a sample day
      LoggerService.log(`[VERIFY] Sample Day (${aDay.dateString}, ${aDay.dayName}, ${aDay.dayType}): Requires min ${aDay.requirements.minStaff} staff.`);

      const aStaff = context.staff[Object.keys(context.staff)[0]]; // Check a sample staff
      LoggerService.log(`[VERIFY] Sample Staff (${aStaff.name}): Max consecutive work is ${aStaff.constraints.maxConsecutiveWork} days.`);

      this._logScheduleState(context, 'Stage 2');
      SheetService.writeSchedule(context);
      LoggerService.log('[VISUAL] The schedule sheet has been updated to show the initial empty grid.');

      LoggerService.log("✅ Stage 2 Test PASSED");
      return true;

    } catch (e) {
      LoggerService.log(`❌ Stage 2 Test FAILED: ${e.message}\n${e.stack}`);
      return false;
    }
  },

  /** [STAGE 3] Tests the dynamic calculation of staff targets with rich logging. */
  test_calculateAndSetStaffTargets: function() {
    try {
        LoggerService.log("\n--- Running Stage 3 Test: Target Calculation ---");
        const { year, month } = SheetService.getTargetDate();
        const context = Orchestrator._initializeContext(year, month);
        const { baseOffDays, calculationDetails } = Orchestrator._calculateAndSetStaffTargets(context, true);

        LoggerService.log(`[TARGETS] Base OFF day calculation: ${calculationDetails} -> Rounded to ${baseOffDays}`);
        
        Object.values(context.staff).forEach(staff => {
            if (!staff || staff.targets.monthlyOffs <= 0 || staff.targets.monthlyHours <= 0) {
                throw new Error(`Invalid targets calculated for ${staff.name}.`);
            }
             LoggerService.log(`  - ${staff.name}: ${staff.stats.vacationDays} vacation days -> Targets: ${staff.targets.monthlyOffs} OFFs, ${staff.targets.monthlyHours} hours.`);
        });
        LoggerService.log(`[TARGETS] Successfully calculated individual targets for all staff.`);
        
        LoggerService.log("✅ Stage 3 Test PASSED");
        return true;
    } catch (e) {
        LoggerService.log(`❌ Stage 3 Test FAILED: ${e.message}\n${e.stack}`);
        return false;
    }
  },

  /** [STAGE 4] Tests the application of pre-constraints with rich logging. */
  test_applyPreConstraints: function() {
     try {
      LoggerService.log("\n--- Running Stage 4 Test: Pre-Constraint Application ---");
      const { year, month } = SheetService.getTargetDate();
      const context = Orchestrator._initializeContext(year, month);
      Orchestrator._calculateAndSetStaffTargets(context);
      
      const log = Orchestrator._applyPreConstraints(context, true);
      
      LoggerService.log(`[PRE-CONSTRAINTS] Applied ${log.vacationsApplied} vacation day(s).`);
      if (log.goldenWeekendsApplied > 0) {
        LoggerService.log(`[PRE-CONSTRAINTS] Applied ${log.goldenWeekendsApplied} 'Golden Weekend' OFFs.`);
        log.goldenWeekendDetails.forEach(detail => LoggerService.log(`    - ${detail}`));
      } else {
         LoggerService.log(`[PRE-CONSTRAINTS] Could not assign any '금+토' OFF blocks (or the feature is disabled).`);
      }
      
      this._logScheduleState(context, 'Stage 4');
      SheetService.writeSchedule(context);
      LoggerService.log('[VISUAL] The schedule sheet has been updated to show the state after applying pre-constraints.');

      LoggerService.log("✅ Stage 4 Test PASSED");
      return true;
    } catch (e) {
      LoggerService.log(`❌ Stage 4 Test FAILED: ${e.message}\n${e.stack}`);
      return false;
    }
  },

  /** [STAGE 5] Tests the main generation loop. */
  test_mainGenerationLoop: function() {
    try {
      LoggerService.log("\n--- Running Stage 5 Test: Main Generation Loop ---");
      const { year, month } = SheetService.getTargetDate();
      const context = Orchestrator._initializeContext(year, month);
      Orchestrator._calculateAndSetStaffTargets(context);
      Orchestrator._applyPreConstraints(context);
      
      AssignmentEngine.runMainLoop(context);

      const staffCount = Object.keys(context.staff).length;
      for (const dateString in context.schedule) {
        if (Object.keys(context.schedule[dateString].assignments).length !== staffCount) {
          throw new Error(`Assignments for day ${dateString} (${Object.keys(context.schedule[dateString].assignments).length}) do not match total staff count (${staffCount}).`);
        }
      }
      LoggerService.log(`[VERIFY] All staff have an assignment for all days. Check PASSED.`);

      const sampleStaff = Object.values(context.staff)[0];
      if (sampleStaff.stats.currentHours <= 0 && sampleStaff.stats.currentOffs <= 0) {
        throw new Error(`Sample staff '${sampleStaff.name}' has no accumulated hours or OFFs.`);
      }
       LoggerService.log(`[VERIFY] Sample staff's final stats: ${sampleStaff.stats.currentHours} hours, ${sampleStaff.stats.currentOffs} OFFs. Check PASSED.`);

      this._logScheduleState(context, 'Stage 5');
      SheetService.writeSchedule(context);
      LoggerService.log('[VISUAL] The schedule sheet has been updated to show the final generated schedule.');

      LoggerService.log("✅ Stage 5 Test PASSED");
      return true;

    } catch (e) {
      LoggerService.log(`❌ Stage 5 Test FAILED: ${e.message}\n${e.stack}`);
      return false;
    }
  },

  /** [STAGE 6] Tests the on-call shift assignment logic. */
  test_assignOnCallShifts: function() {
    try {
      LoggerService.log("\n--- Running Stage 6 Test: On-Call Shift Assignment ---");
      const { year, month } = SheetService.getTargetDate();
      const context = Orchestrator._initializeContext(year, month);
      Orchestrator._calculateAndSetStaffTargets(context);
      Orchestrator._applyPreConstraints(context);
      AssignmentEngine.runMainLoop(context);
      
      const log = Orchestrator._assignOnCallShifts(context, true);

      LoggerService.log(`[ON-CALL] Assigned ${log.onCallAssignments} on-call shifts.`);
      log.details.slice(0, 10).forEach(detail => LoggerService.log(`  - ${detail}`)); // Log first 10 for brevity

      // Verification
      const firstOnCallDay = Object.values(context.schedule).find(d => d.requirements.onCall);
      if (firstOnCallDay) {
          const assignments = Object.values(firstOnCallDay.assignments);
          if (!assignments.includes('OC10')) {
              throw new Error(`On-call shift was required on ${firstOnCallDay.dateString} but was not assigned.`);
          }
           LoggerService.log(`[VERIFY] On-call shift correctly assigned on a required day (${firstOnCallDay.dateString}). Check PASSED.`);
      } else {
          LoggerService.log(`[VERIFY] No on-call shifts were required this month.`);
      }

      this._logScheduleState(context, 'Stage 6');
      SheetService.writeSchedule(context);
      LoggerService.log('[VISUAL] The schedule sheet has been updated to show the final schedule with on-call shifts.');

      LoggerService.log("✅ Stage 6 Test PASSED");
      return true;

    } catch (e) {
      LoggerService.log(`❌ Stage 6 Test FAILED: ${e.message}\n${e.stack}`);
      return false;
    }
  },

  // --- PUBLIC TEST RUNNERS ---
  _runSingleTest: function(testName, testFunction) {
    try {
      const result = testFunction.call(this);
      return result === true;
    } catch (e) {
      LoggerService.log(`🚨 TEST RUNNER ERROR for ${testName}: ${e.message}\n${e.stack}`);
      return false;
    }
  },
  
  runTestStage1: function() { this._runTest('Stage 1', this.test_SheetService_readAllData); },
  runTestStage2: function() { this._runTest('Stage 2', this.test_initializeContext); },
  runTestStage3: function() { this._runTest('Stage 3', this.test_calculateAndSetStaffTargets); },
  runTestStage4: function() { this._runTest('Stage 4', this.test_applyPreConstraints); },
  runTestStage5: function() { this._runTest('Stage 5', this.test_mainGenerationLoop); },
  runTestStage6: function() { this._runTest('Stage 6', this.test_assignOnCallShifts); },

  _runTest: function(stageName, testFunc) {
      const ui = SpreadsheetApp.getUi();
      ui.alert(`${stageName} 테스트를 시작합니다. 완료 후 로그 시트를 확인하세요.`);
      LoggerService.clear();
      try {
        this._runSingleTest(stageName, testFunc);
      } finally {
        LoggerService.writeToSheet();
      }
  },

  runAllTests: function() {
    const ui = SpreadsheetApp.getUi();
    ui.alert('[알림] 모든 테스트를 시작합니다. 완료 시 알림이 표시됩니다.');
    
    LoggerService.clear();
    let allPassed = true;
    
    try {
      const tests = [
        { name: 'Stage 1', func: this.test_SheetService_readAllData },
        { name: 'Stage 2', func: this.test_initializeContext },
        { name: 'Stage 3', func: this.test_calculateAndSetStaffTargets },
        { name: 'Stage 4', func: this.test_applyPreConstraints },
        { name: 'Stage 5', func: this.test_mainGenerationLoop },
        { name: 'Stage 6', func: this.test_assignOnCallShifts }
      ];
      
      allPassed = tests.map(test => this._runSingleTest(test.name, test.func)).every(res => res === true);

    } finally {
      LoggerService.writeToSheet();
      if (allPassed) {
        ui.alert('[성공] 모든 테스트를 통과했습니다!');
      } else {
        ui.alert(`[실패] 일부 테스트를 실패했습니다. "📈로그" 시트에서 상세 내용을 확인하세요.`);
      }
    }
  }
};


