/**
 * @file Engine_Fairness.js
 * @description Encapsulates logic related to ensuring fairness in the schedule.
 */
const Engine_Fairness = {
  /**
   * Sorts a list of staff indices based on a specific summary count, ascending.
   * Includes a tie-breaking mechanism using total work hours for more robust fairness.
   * @param {Object} context The global scheduling context.
   * @param {Array<number>} candidateIndices The list of staff indices to sort.
   * @param {string} summaryKey The key from the staff profile summary to sort by (e.g., 'onCallCount').
   * @param {string} [tieBreakerKey='totalHours'] An optional secondary key for tie-breaking.
   * @returns {Array<number>} The sorted list of staff indices.
   */
  sortCandidatesByCount: function(context, candidateIndices, summaryKey, tieBreakerKey = 'totalHours') {
    return candidateIndices.sort((a, b) => {
      const profileA = context.staffProfiles.get(context.staffList[a].name);
      const profileB = context.staffProfiles.get(context.staffList[b].name);
      
      const countA = (profileA && profileA.summary[summaryKey]) || 0;
      const countB = (profileB && profileB.summary[summaryKey]) || 0;

      // If the primary counts are different, sort by them.
      if (countA !== countB) {
        return countA - countB;
      }

      // --- Tie-breaker ---
      // If primary counts are equal, sort by the tie-breaker key (usually total hours).
      const tieBreakerA = (profileA && profileA.summary[tieBreakerKey]) || 0;
      const tieBreakerB = (profileB && profileB.summary[tieBreakerKey]) || 0;
      return tieBreakerA - tieBreakerB;
    });
  },

  /**
   * Finds staff members whose total work hours deviate significantly from their target.
   * @param {Object} context The global scheduling context.
   * @returns {Array<Object>} A sorted array of staff members with their work hour imbalances.
   */
  findWorkHourImbalances: function (context) {
    const imbalances = [];
    context.staffProfiles.forEach((profile, staffName) => {
      const diff = profile.summary.totalHours - profile.summary.targetHours;
      // Define imbalance as a deviation of more than 1 hour.
      if (Math.abs(diff) > 1) {
        imbalances.push({
          staffName,
          staffIndex: context.staffList.findIndex(s => s.name === staffName),
          isOver: diff > 0,
          diff: diff,
        });
      }
    });
    // Sort by the largest deviation first to prioritize fixing the biggest issues.
    return imbalances.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  },
};

