/**
 * @fileoverview Contains generic, reusable helper functions that don't belong to a specific service.
 * @namespace Util_Helpers
 */
const Util_Helpers = {
  /**
   * Transposes a 2D array (matrix). Switches rows and columns.
   * @param {Array<Array<any>>} matrix The matrix to transpose.
   * @returns {Array<Array<any>>} The transposed matrix.
   */
  transpose: function(matrix) {
    if (!matrix || !matrix[0]) return [];
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex] || ""));
  }
};

