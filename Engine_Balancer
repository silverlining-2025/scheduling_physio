/**
 * @fileoverview MASTER REWRITE: This advanced balancing engine now focuses on
 * fixing WEEKLY hour variances. It relentlessly iterates, using a variety of "moves"
 * (swaps, gives, upgrades) to surgically adjust hours. Every single move is validated
 * by the centralized Service_Rules module to ensure the final schedule is 100% correct.
 * @namespace Engine_Balancer
 */
const Engine_Balancer = {
  balance: function(ctx) {
    const MAX_ITERATIONS = 100;
    let iteration = 0;
    let hasChangedInIteration = true;
    Util_Logger.log("--- Starting Week-Aware Balancing Engine ---");

    while (iteration < MAX_ITERATIONS && hasChangedInIteration) {
      iteration++;
      hasChangedInIteration = false;
      Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx);

      // Find the most imbalanced weekly situation across all staff
      const worstVariance = this._findWorstWeeklyVariance(ctx);
      if (Math.abs(worstVariance.variance) < 4) { // If worst variance is <4 hours, we're good
          Util_Logger.log(`✅ Balancing complete in ${iteration} iterations. Weekly variances are within tolerance.`);
          break;
      }
      
      Util_Logger.log(`Balancer Iteration #${iteration}: Targeting week ${worstVariance.week.weekNumber}. Overworked=${worstVariance.over.name}, Underworked=${worstVariance.under.name}`);

      // Attempt moves specifically to fix THIS weekly imbalance
      if (this._tryGiveMove(ctx, worstVariance.over, worstVariance.under, worstVariance.week)) { hasChangedInIteration = true; continue; }
      if (this._trySwapMove(ctx, worstVariance.over, worstVariance.under, worstVariance.week)) { hasChangedInIteration = true; continue; }
      if (this._tryUpgradeDowngradeMove(ctx, worstVariance.over, worstVariance.under, worstVariance.week)) { hasChangedInIteration = true; continue; }
    }
    
    this._finalizeOffs(ctx);
    Util_Logger.log("--- Balancing Finished ---");
    Engine_ContextBuilder.updateStaffProfilesFromGrid(ctx);
  },

  _findWorstWeeklyVariance: function(ctx) {
      let worst = { variance: 0 };
      ctx.weeks.forEach(week => {
          let over = null, under = null, maxVar = 0, minVar = 0;
          ctx.staffProfiles.forEach(p => {
              const ws = p.weeklyStats.find(s => s.weekNumber === week.weekNumber);
              const variance = ws.assignedHours - ws.targetHours;
              if (variance > maxVar) { maxVar = variance; over = p; }
              if (variance < minVar) { minVar = variance; under = p; }
          });
          if (over && under && (maxVar - minVar) > worst.variance) {
              worst = { variance: maxVar - minVar, over, under, week };
          }
      });
      return worst;
  },

  _tryGiveMove: function(ctx, over, under, week) {
    for (let d = week.start - 1; d < week.end; d++) {
      const overShift = ctx.shiftDefinitions.get(ctx.scheduleGrid[ctx.staffList.indexOf(over.name)][d]);
      if (overShift && overShift.hours > 0 && ctx.scheduleGrid[ctx.staffList.indexOf(under.name)][d] === null) {
        const changes = [
          { staffIndex: ctx.staffList.indexOf(over.name), dayIndex: d, newShift: 'OFF' },
          { staffIndex: ctx.staffList.indexOf(under.name), dayIndex: d, newShift: ctx.scheduleGrid[ctx.staffList.indexOf(over.name)][d] }
        ];
        if (Service_Rules.isMoveSafe(ctx, this._getTempGrid(ctx, changes), changes)) {
          Util_Logger.log(` -> [MOVE: GIVE] W${week.weekNumber}/D${d + 1}: Giving ${over.name}'s shift to ${under.name}.`);
          this._applyChanges(ctx, changes);
          return true;
        }
      }
    }
    return false;
  },
  
  _trySwapMove: function(ctx, over, under, week) {
    for (let d = week.start - 1; d < week.end; d++) {
      const overCode = ctx.scheduleGrid[ctx.staffList.indexOf(over.name)][d];
      const underCode = ctx.scheduleGrid[ctx.staffList.indexOf(under.name)][d];
      const overShift = ctx.shiftDefinitions.get(overCode);
      const underShift = ctx.shiftDefinitions.get(underCode);

      if (overShift && underShift && overShift.hours > underShift.hours) {
        const changes = [
          { staffIndex: ctx.staffList.indexOf(over.name), dayIndex: d, newShift: underCode },
          { staffIndex: ctx.staffList.indexOf(under.name), dayIndex: d, newShift: overCode }
        ];
        if (Service_Rules.isMoveSafe(ctx, this._getTempGrid(ctx, changes), changes)) {
          Util_Logger.log(` -> [MOVE: SWAP] W${week.weekNumber}/D${d + 1}: Swapping ${over.name}(${overCode}) with ${under.name}(${underCode}).`);
          this._applyChanges(ctx, changes);
          return true;
        }
      }
    }
    return false;
  },

  _tryUpgradeDowngradeMove: function(ctx, over, under, week) {
    for (let d = week.start - 1; d < week.end; d++) {
      const overCode = ctx.scheduleGrid[ctx.staffList.indexOf(over.name)][d];
      const overShift = ctx.shiftDefinitions.get(overCode);
      if (!overShift || overShift.hours === 0) continue;

      const shorterShift = Array.from(ctx.shiftDefinitions.values())
        .filter(s => s.category === overShift.category && s.hours < overShift.hours)
        .sort((a,b) => b.hours - a.hours)[0];

      if (shorterShift) {
        const changes = [{ staffIndex: ctx.staffList.indexOf(over.name), dayIndex: d, newShift: shorterShift.description }];
        if (Service_Rules.isMoveSafe(ctx, this._getTempGrid(ctx, changes), changes)) {
            Util_Logger.log(` -> [MOVE: DOWNGRADE] W${week.weekNumber}/D${d+1}: Changing ${over.name}'s shift from ${overCode} to ${shorterShift.description}.`);
            this._applyChanges(ctx, changes);
            return true;
        }
      }
    }
    return false;
  },
  
  _finalizeOffs: function(ctx) {
      ctx.scheduleGrid.forEach((staffRow, i) => staffRow.forEach((cell, j) => {
        if (cell === null) ctx.scheduleGrid[i][j] = 'OFF';
      }));
  },

  _getTempGrid: function(ctx, changes) {
    const tempGrid = ctx.scheduleGrid.map(row => [...row]);
    changes.forEach(c => { tempGrid[c.staffIndex][c.dayIndex] = c.newShift; });
    return tempGrid;
  },

  _applyChanges: function(ctx, changes) {
    changes.forEach(c => { ctx.scheduleGrid[c.staffIndex][c.dayIndex] = c.newShift; });
  }
};

