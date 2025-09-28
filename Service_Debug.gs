/**
 * @file Service_Debug.gs
 * @description Contains functions for defining and running tests for the scheduler.
 */

const DebugService = {

  /**
   * Logs a detailed dump of the current assignment state.
   * @param {object} context The main context object.
   * @param {string} stageName The name of the stage just completed.
   * @private
   */
  _logScheduleState: function(context, stageName) {
    LoggerService.log(`\n--- [DEBUG DUMP] Schedule state after ${stageName} ---`);
    const staffNames = context.config.staff;
    const sortedDates = Object.keys(context.schedule).sort();

    for (const dateString of sortedDates) {
      const day = context.schedule[dateString];
      const assignments = day.assignments;
      
      const hasAssignments = Object.keys(assignments).length > 0;
      if (hasAssignments) {
        const logParts = staffNames.map(name => {
          const assignment = assignments[name] || '';
          return `${name}:'${assignment}'`;
        });
        LoggerService.log(`  [${dateString}] ${logParts.join(' | ')}`);
      }
    }
    LoggerService.log(`--- End of dump for ${stageName} ---\n`);
  },

  // --- PRIVATE TEST DEFINITIONS ---
  
  /** [STAGE 1] Tests the data ingestion services with rich logging. */
  test_SheetService_readAllData: function() {
    try {
      LoggerService.log('--- Running Stage 1 Test: Data Ingestion ---');
      const config = SheetService.getConfig();
      const { year, month } = SheetService.getTargetDate();
      const holidays = SheetService.getHolidays(year, month);

      LoggerService.log(`\n[CONFIG] Loaded ${config.staff.length} staff: [${config.staff.join(', ')}]`);
      LoggerService.log(`[CONFIG] Loaded ${Object.keys(config.shifts).length} shift types.`);
      LoggerService.log(`[CONFIG] Loaded special shift codes: OFF='${config.specialShiftCodes.off}', ON-CALL='${config.specialShiftCodes.onCall}'`);
      LoggerService.log(`[CONFIG] Loaded ${Object.keys(config.rules).length} rules.`);

      LoggerService.log(`\n[HOLIDAYS] Found ${holidays.length} holidays for ${year}-${month}.`);
      holidays.forEach(h => LoggerService.log(`  - ${h.date}: ${h.type}`));
      
      const rawVacationData = SheetService.getRawVacationData();
      LoggerService.log(`\n[VACATIONS] Reading raw data from '${SHEETS.VACATION}' sheet... Found ${rawVacationData.length} rows.`);
      rawVacationData.forEach((row, i) => LoggerService.log(`  - Row ${i+2}: ${JSON.stringify(row)}`));
      
      const vacations = SheetService.getVacationRequests(year, month);
      LoggerService.log(`\n[VACATIONS] Filtered to ${vacations.length} approved vacation requests relevant for ${year}-${month}.`);
      vacations.forEach(v => LoggerService.log(`  - ${v.name}: ${v.type} from ${Util_Date.formatDate(v.start)} to ${Util_Date.formatDate(v.end)}`));

      LoggerService.log("\n✅ Stage 1: 데이터 로드 Test PASSED");
      return true;

    } catch (e) {
      LoggerService.log(`\n❌ Stage 1 Test FAILED: ${e.message}\n${e.stack}`);
      return false;
    }
  },

  /** [STAGE 2] Tests the context and profile initialization. */
  test_initializeContext: function() {
    try {
      LoggerService.log("\n--- Running Stage 2 Test: Context Initialization ---");
      const { year, month } = SheetService.getTargetDate();
      const context = Orchestrator._initializeContext(year, month);
      
      if (!context || Object.keys(context.staff).length === 0) throw new Error("Context or staff profiles failed to initialize.");
      
      LoggerService.log(`[CONTEXT] Initialized for ${year}-${month}. Created ${Object.keys(context.schedule).length} daily profiles and ${Object.keys(context.staff).length} staff profiles.`);
      
      const aDay = context.schedule[Object.keys(context.schedule)[10]];
      LoggerService.log(`[VERIFY] Sample Day (${aDay.dateString}, ${aDay.dayType}): Requires min ${aDay.requirements.minStaff} staff.`);

      const aStaff = context.staff[Object.keys(context.staff)[0]];
      LoggerService.log(`[VERIFY] Sample Staff (${aStaff.name}): Max consecutive work is ${aStaff.constraints.maxConsecutiveWork} days.`);

      this._logScheduleState(context, 'Stage 2');
      LoggerService.log("[VISUAL] Schedule sheet will be updated to show the initial empty grid.");

      LoggerService.log("\n✅ Stage 2: 프로필 생성 Test PASSED");
      return true;

    } catch (e) {
      LoggerService.log(`\n❌ Stage 2 Test FAILED: ${e.message}\n${e.stack}`);
      return false;
    }
  },

  /** [STAGE 3] Tests the calculation of staff targets. */
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
            LoggerService.log(`  - ${staff.name}: ${staff.stats.vacationDays} vacation workdays -> Targets: ${staff.targets.monthlyOffs} OFFs, ${staff.targets.monthlyHours} hours.`);
        });
        
        LoggerService.log("\n✅ Stage 3: 목표 계산 Test PASSED");
        return true;
    } catch (e) {
        LoggerService.log(`\n❌ Stage 3 Test FAILED: ${e.message}\n${e.stack}`);
        return false;
    }
  },

  /** [STAGE 4] Tests the application of pre-constraints. */
  test_applyPreConstraints: function() {
    try {
      LoggerService.log("\n--- Running Stage 4 Test: Pre-Constraint Application ---");
      const { year, month } = SheetService.getTargetDate();
      const context = Orchestrator._initializeContext(year, month);
      Orchestrator._calculateAndSetStaffTargets(context);
      
      const log = Orchestrator._applyPreConstraints(context, true);
      
      LoggerService.log(`[PRE-CONSTRAINTS] Log of actions taken:`);
      log.details.forEach(detail => LoggerService.log(`  ${detail}`));
      
      this._logScheduleState(context, 'Stage 4');
      SheetService.writeSchedule(context);
      LoggerService.log("[VISUAL] Schedule sheet updated to show pre-constraints.");

      LoggerService.log("\n✅ Stage 4: 사전 조건 적용 Test PASSED");
      return true;
    } catch (e) {
      LoggerService.log(`\n❌ Stage 4 Test FAILED: ${e.message}\n${e.stack}`);
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
          throw new Error(`Assignments for ${dateString} (${Object.keys(context.schedule[dateString].assignments).length}) != staff count (${staffCount}).`);
        }
      }
      LoggerService.log(`[VERIFY] All staff have an assignment for all days.`);

      this._logScheduleState(context, 'Stage 5');
      SheetService.writeSchedule(context);
      LoggerService.log('[VISUAL] Schedule sheet updated to show main generated schedule.');

      LoggerService.log("\n✅ Stage 5: 메인 루프 Test PASSED");
      return true;
    } catch (e) {
      LoggerService.log(`\n❌ Stage 5 Test FAILED: ${e.message}\n${e.stack}`);
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
      log.details.forEach(detail => LoggerService.log(`  - ${detail}`));

      this._logScheduleState(context, 'Stage 6');
      SheetService.writeSchedule(context);
      LoggerService.log('[VISUAL] Schedule sheet updated with on-call shifts.');

      LoggerService.log("\n✅ Stage 6: 당직 배정 Test PASSED");
      return true;
    } catch (e) {
      LoggerService.log(`\n❌ Stage 6 Test FAILED: ${e.message}\n${e.stack}`);
      return false;
    }
  },
  
  /** [STAGE 7] Tests the final balancing post-processing step. */
  test_finalBalancing: function() {
    try {
      LoggerService.log("\n--- Running Stage 7 Test: Final Hour Balancing ---");
      const { year, month } = SheetService.getTargetDate();
      const context = Orchestrator._initializeContext(year, month);
      Orchestrator._calculateAndSetStaffTargets(context);
      Orchestrator._applyPreConstraints(context);
      AssignmentEngine.runMainLoop(context);
      Orchestrator._assignOnCallShifts(context);

      LoggerService.log("[BALANCE] Staff hour deviation before balancing:");
      Object.values(context.staff).forEach(s => {
          const deviation = s.stats.currentHours - s.targets.monthlyHours;
          LoggerService.log(`  - ${s.name}: ${s.stats.currentHours}/${s.targets.monthlyHours} hours (Deviation: ${deviation.toFixed(1)})`);
      });

      const log = Orchestrator._performFinalBalancing(context, true);
      
      LoggerService.log(`\n[BALANCE] Made a total of ${log.swapsMade} swaps.`);
      LoggerService.log("\n[BALANCE] Staff hour deviation after balancing:");
       Object.values(context.staff).forEach(s => {
          const deviation = s.stats.currentHours - s.targets.monthlyHours;
          LoggerService.log(`  - ${s.name}: ${s.stats.currentHours}/${s.targets.monthlyHours} hours (Deviation: ${deviation.toFixed(1)})`);
      });
      
      this._logScheduleState(context, 'Stage 7');
      SheetService.writeSchedule(context);
      LoggerService.log('[VISUAL] Schedule sheet updated with final balanced schedule.');

      LoggerService.log("\n✅ Stage 7: 최종 균형 조정 Test PASSED");
      return true;

    } catch (e) {
      LoggerService.log(`\n❌ Stage 7 Test FAILED: ${e.message}\n${e.stack}`);
      return false;
    }
  },
  
  // --- NEW TEST DATA GENERATOR ---

  /**
   * Generates a challenging, randomized set of sample vacation requests.
   * @private
   */
  _generateSampleVacations: function() {
    try {
      const { year, month } = SheetService.getTargetDate();
      const staffList = SheetService.getConfig().staff;
      if (!staffList || staffList.length < 4) {
        throw new Error("Cannot generate sample data. At least 4 staff members are required in '⚙️설정'.");
      }

      LoggerService.log(`--- Generating Randomized Sample Vacation Data for ${year}-${month} ---`);

      const sampleRequests = [];
      const daysInMonth = new Date(year, month, 0).getDate();
      const vacationTypes = ['연차', '연차', '연차', '병가', '월차'];
      const reasons = ['개인 용무', '가족 행사', '병원 진료', '은행 업무', '휴식', '자녀 학교 행사'];
      const statuses = ['승인', '승인', '승인', '승인', '대기'];

      // Helper to get a random item from an array
      const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

      // 1. Generate a base set of random vacations
      const numRequests = Math.floor(Math.random() * (staffList.length / 2)) + staffList.length;
      for (let i = 0; i < numRequests; i++) {
        const startDate = new Date(year, month - 1, Math.floor(Math.random() * daysInMonth) + 1);
        const duration = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 3) + 2; // Bias towards shorter leaves
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + duration - 1);

        // Ensure end date doesn't spill into the next month for simplicity
        if (endDate.getMonth() + 1 !== month) {
            endDate.setDate(daysInMonth);
        }

        sampleRequests.push({
          name: getRandom(staffList),
          type: getRandom(vacationTypes),
          start: startDate,
          end: endDate,
          reason: getRandom(reasons),
          status: getRandom(statuses)
        });
      }

      // 2. Ensure specific corner cases are included
      // - A vacation on a Friday to test Golden Weekend logic
      const lastDay = new Date(year, month, 0);
      let lastFriday = lastDay;
      while (lastFriday.getDay() !== 5) {
        lastFriday.setDate(lastFriday.getDate() - 1);
      }
      sampleRequests.push({
          name: staffList[0],
          type: '연차',
          start: lastFriday,
          end: lastFriday,
          reason: 'GW 테스트',
          status: '승인'
      });

      // - Overlapping vacations on a specific day
      const midMonthDay = new Date(year, month - 1, 15);
      sampleRequests.push({ name: staffList[1], type: '연차', start: midMonthDay, end: midMonthDay, reason: '중복 테스트 1', status: '승인' });
      sampleRequests.push({ name: staffList[2], type: '병가', start: midMonthDay, end: midMonthDay, reason: '중복 테스트 2', status: '승인' });
      
      // - A long vacation spanning a weekend
       const longVacationStart = new Date(year, month - 1, 8);
       const longVacationEnd = new Date(year, month - 1, 14);
       sampleRequests.push({ name: staffList[3], type: '연차', start: longVacationStart, end: longVacationEnd, reason: '장기 휴가', status: '승인' });


      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.VACATION);
      sheet.getRange('A2:H').clearContent();
      
      const outputData = sampleRequests.map(req => {
        return [ new Date(), '', req.name, req.type, req.start, req.end, req.reason, req.status ];
      });

      sheet.getRange(2, 1, outputData.length, outputData[0].length).setValues(outputData);
      LoggerService.log(`Successfully wrote ${outputData.length} randomized sample requests to '${SHEETS.VACATION}'.`);
      return true;

    } catch (e) {
      LoggerService.log(`❌ Sample Data Generation FAILED: ${e.message}\n${e.stack}`);
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
  
  runTestStage1: function() { this._runTest('Stage 1: 데이터 로드', this.test_SheetService_readAllData); },
  runTestStage2: function() { this._runTest('Stage 2: 프로필 생성', this.test_initializeContext); },
  runTestStage3: function() { this._runTest('Stage 3: 목표 계산', this.test_calculateAndSetStaffTargets); },
  runTestStage4: function() { this._runTest('Stage 4: 사전 조건 적용', this.test_applyPreConstraints); },
  runTestStage5: function() { this._runTest('Stage 5: 메인 루프', this.test_mainGenerationLoop); },
  runTestStage6: function() { this._runTest('Stage 6: 당직 배정', this.test_assignOnCallShifts); },
  runTestStage7: function() { this._runTest('Stage 7: 최종 균형 조정', this.test_finalBalancing); },

  runGenerateSampleVacations: function() { this._runTest('샘플 휴가 데이터 생성', this._generateSampleVacations, true); },

  _runTest: function(stageName, testFunc, isUtil = false) {
      const ui = SpreadsheetApp.getUi();
      ui.alert(`${stageName} 작업을 시작합니다. 완료 후 로그 시트를 확인하세요.`);
      LoggerService.clear();
      try {
        this._runSingleTest(stageName, testFunc);
      } finally {
        LoggerService.writeToSheet();
        if (!isUtil) {
            SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SCHEDULE).activate();
        } else {
            SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.VACATION).activate();
        }
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
        { name: 'Stage 6', func: this.test_assignOnCallShifts },
        { name: 'Stage 7', func: this.test_finalBalancing }
      ];
      
      allPassed = tests.map(test => this._runSingleTest(test.name, test.func)).every(res => res === true);

    } finally {
      LoggerService.writeToSheet();
      if (allPassed) {
        ui.alert('[성공] 모든 테스트를 통과했습니다!');
      } else {
        ui.alert(`[실패] 일부 테스트를 실패했습니다. "📈로그" 시트에서 상세 내용을 확인하세요.`);
      }
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SCHEDULE).activate();
    }
  }
};

