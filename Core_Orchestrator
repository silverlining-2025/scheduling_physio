/**
 * @fileoverview This service acts as the main orchestrator for the scheduling process.
 * It now initializes the centralized Service_Rules as a critical first step.
 * @namespace Core_Orchestrator
 */
const Core_Orchestrator = {
  create: function(data) {
    // Foundational steps
    const context = Engine_ContextBuilder.buildInitialContext(data);
    Engine_ConstraintApplier.apply(context);
    Engine_ContextBuilder.recalculateTargetsAfterConstraints(context);

    // CRITICAL: Initialize the rulebook for all subsequent engines to use.
    Service_Rules.init(context);

    // Run scheduling engines
    Engine_WeekendScheduler.schedule(context);
    Engine_WeekendOffScheduler.schedule(context);
    Engine_WeekdayScheduler.schedule(context);
    Engine_OnCallScheduler.schedule(context);
    Engine_Balancer.balance(context);

    if (!Service_Validation.validate(context)) {
      throw new Error("The generated schedule failed the final validation checks. Please review the logs for details.");
    }
    return { context };
  },

  // --- Helper function for debug steps to ensure rules are always initialized ---
  _runFoundation: function(data) {
    const context = Engine_ContextBuilder.buildInitialContext(data);
    Engine_ConstraintApplier.apply(context);
    Engine_ContextBuilder.recalculateTargetsAfterConstraints(context);
    Service_Rules.init(context); // Ensure rules are loaded for every debug step
    return context;
  },

  runStep1_ApplyConstraints: function(data) {
    const context = this._runFoundation(data);
    return { context };
  },

  runStep2_ScheduleWeekends: function(data) {
    const context = this._runFoundation(data);
    Engine_WeekendScheduler.schedule(context);
    Engine_WeekendOffScheduler.schedule(context);
    return { context };
  },

  runStep3_FillWeekdays: function(data) {
    const context = this._runFoundation(data);
    Engine_WeekendScheduler.schedule(context);
    Engine_WeekendOffScheduler.schedule(context);
    Engine_WeekdayScheduler.schedule(context);
    return { context };
  },

  runStep4_AssignOnCall: function(data) {
    const context = this._runFoundation(data);
    Engine_WeekendScheduler.schedule(context);
    Engine_WeekendOffScheduler.schedule(context);
    Engine_WeekdayScheduler.schedule(context);
    Engine_OnCallScheduler.schedule(context);
    return { context };
  },

  runStep5_BalanceSchedule: function(data) {
    const context = this._runFoundation(data);
    Engine_WeekendScheduler.schedule(context);
    Engine_WeekendOffScheduler.schedule(context);
    Engine_WeekdayScheduler.schedule(context);
    Engine_OnCallScheduler.schedule(context);
    Engine_Balancer.balance(context);
    return { context };
  },
  
  recreateContextForValidation: function(data) {
      const context = Engine_ContextBuilder.buildInitialContext(data);
      const gridData = Service_Sheet.getScheduleGrid(context.numDays, context.staffList.length);
      context.scheduleGrid = Util_Helpers.transpose(gridData);
      Engine_ContextBuilder.recalculateTargetsAfterConstraints(context);
      Service_Rules.init(context);
      return context;
  }
};

