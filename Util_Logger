/**
 * @fileoverview A dedicated logging utility for the application.
 * It writes timestamped logs and structured data tables/grids to the '📈로그' sheet
 * for easy debugging and auditing. This version is updated for the new profile structures.
 * @namespace Util_Logger
 */
const Util_Logger = (function() {
  const LOG_SHEET_NAME = CONFIG.SHEET_NAMES.LOG;
  let sheet;

  function _getLogSheet() {
    if (!sheet) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      sheet = ss.getSheetByName(LOG_SHEET_NAME);
      if (!sheet) {
        sheet = ss.insertSheet(LOG_SHEET_NAME);
        sheet.appendRow(['Timestamp', 'Level', 'Message']).setFrozenRows(1);
      }
    }
    return sheet;
  }
  
  function _formatAsTextTable(data) {
    if (!data || data.length === 0) return '';
    const colWidths = data[0].map((_, colIndex) => 
      Math.max(...data.map(row => String(row[colIndex]).length))
    );
    
    const separator = colWidths.map(w => '-'.repeat(w)).join('-|-');
    
    return data.map((row, rowIndex) => {
      const rowString = row.map((cell, colIndex) => 
        String(cell).padEnd(colWidths[colIndex], ' ')
      ).join(' | ');
      if (rowIndex === 0) return `${rowString}\n${separator}`;
      return rowString;
    }).join('\n');
  }

  return {
    clear: function() {
      try {
        const logSheet = _getLogSheet();
        logSheet.clear();
        logSheet.getRange("A1:C1").setValues([['Timestamp', 'Level', 'Message']]).setFontWeight('bold');
        logSheet.setFrozenRows(1);
        SpreadsheetApp.flush();
        this.log('Log cleared.');
      } catch (e) { console.error(`Failed to clear log sheet: ${e.message}`); }
    },
    
    log: function(message) { _getLogSheet().appendRow([new Date(), 'INFO', message]); },
    warn: function(message) { _getLogSheet().appendRow([new Date(), 'WARN', message]); },
    error: function(message) { _getLogSheet().appendRow([new Date(), 'ERROR', message]); },
    
    /**
     * REWRITTEN: Logs the Day Profiles map, now including max staff and on-leave staff.
     */
    dayProfiles: function(title, dayProfilesMap) {
        if (dayProfilesMap.size === 0) { this.log(`${title}:\n(empty)`); return; }
        const headers = ['Day', 'Date', 'Name', 'Category', 'Min Staff', 'Max Staff', 'On Leave'];
        const rows = [headers];
        dayProfilesMap.forEach((profile, dayNumber) => {
            rows.push([
                dayNumber,
                Utilities.formatDate(profile.date, Session.getScriptTimeZone(), 'MM-dd'),
                profile.dayName,
                profile.dayCategory,
                profile.minStaff,
                profile.maxStaff,
                profile.staffOnLeave.join(', ')
            ]);
        });
        this.log(`${title}:\n${_formatAsTextTable(rows)}`);
    },

    /**
     * MAJOR REWRITE: Logs the Staff Profiles map with the new detailed structure,
     * showing the clear separation between required OFFs and approved Leave.
     */
    staffProfiles: function(title, staffProfilesMap) {
        if (staffProfilesMap.size === 0) { this.log(`${title}:\n(empty)`); return; }
        const headers = ['Name', 'Tgt. Hrs', 'Req. OFFs', 'Leave Days', 'Asn. Hrs', 'Asn. OFFs', 'Asn. Leave', 'W/E Shifts', 'OnCall', 'Has Special'];
        const rows = [headers];
        staffProfilesMap.forEach(profile => {
            rows.push([
                profile.name,
                profile.targetHours,
                profile.requiredOffs,
                profile.leaveDays,
                profile.assignedHours,
                profile.assignedOffs,
                profile.assignedLeave,
                profile.weekendShifts,
                profile.onCallShifts,
                profile.hasSpecialOff ? 'Y' : 'N'
            ]);
        });
        this.log(`${title}:\n${_formatAsTextTable(rows)}`);
    },

    grid: function(title, grid, staffList) {
        const headers = ['Name', ...Array.from({length: grid[0].length}, (_, i) => i + 1)];
        const rows = [headers];
        staffList.forEach((name, index) => {
            const rowData = [name, ...grid[index].map(c => c || '----')];
            rows.push(rowData);
        });
        this.log(`${title}:\n${_formatAsTextTable(rows)}`);
    },
  };
})();
