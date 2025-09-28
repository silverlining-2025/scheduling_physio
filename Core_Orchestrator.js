/**
 * @file Core_Orchestrator.js
 * @description Orchestrates the step-by-step process of schedule generation.
 */
const Core_Orchestrator = {
  /**
   * Executes the entire scheduling pipeline in the correct order.
   * Throws errors that are caught by the calling function in Core_Main.
   */
  run: function() {
    Util_Logger.clear();
    Util_Logger.log('INFO', '========== New Schedule Generation Run ==========');

    // Step 1: Fetch all raw data from the spreadsheet.
    const initialData = Service_Sheet.fetchAllInitialData();
    Util_Logger.log('INFO', 'Step 1/7: Successfully fetched all data from sheets.');

    // Step 2: Build the initial context object.
    const context = Engine_ContextBuilder.buildInitialContext(initialData);
    Util_Logger.log('INFO', 'Step 2/7: Initial context built.');
    Util_Debug.logContextState('After Context Build', context);

    // Step 3: Apply hard constraints (leave, special OFFs).
    Engine_ConstraintApplier.run(context);
    Util_Logger.log('INFO', 'Step 3/7: Applied hard constraints (leave, guaranteed OFFs).');

    // Step 4: Run the scheduling engines in a specific order.
    Engine_OnCallScheduler.run(context);
    Engine_WeekendScheduler.run(context);
    Engine_WeekdayScheduler.run(context);
    Engine_OffDayScheduler.run(context); // Explicitly fill remaining slots with OFF.
    Util_Logger.log('INFO', 'Step 4/7: Core scheduling engines have completed.');
    Util_Debug.logContextState('After Scheduling Engines', context);

    // Step 5: Balance the schedule for fairness.
    Engine_Balancer.run(context);
    Util_Logger.log('INFO', 'Step 5/7: Schedule balancing complete.');

    // Step 6: Validate the final schedule against all rules.
    Service_Validation.runFullValidation(context);
    Util_Logger.log('INFO', 'Step 6/7: Final schedule passed all validation checks.');
    
    // Step 7: Write the results back to the sheet.
    Service_Summary.calculateAndWriteSummary(context);
    Service_Sheet.writeScheduleToSheet(context);
    Util_Logger.log('INFO', 'Step 7/7: Successfully wrote schedule and summary to the spreadsheet.');
  }
};

