/**
 * @fileoverview Contains functions that are executed by automated script triggers.
 * It's best practice to keep these functions lean and have them call other services to do the heavy lifting.
 */

/**
 * Runs automatically via an 'On form submit' trigger for the Leave Request Google Form.
 * It finds the newly submitted row and sets the '상태' (Status) column to '대기' (Pending).
 * @param {GoogleAppsScript.Events.SheetsOnFormSubmit} e The event object passed by the trigger.
 */
function onFormSubmit(e) {
  if (!e || !e.range) {
    Util_Logger.warn("onFormSubmit was run manually without a form submission event. Exiting.");
    return;
  }

  try {
    const sheet = e.range.getSheet();

    if (sheet.getName() !== CONFIG.SHEET_NAMES.REQUESTS) {
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusColumnIndex = headers.indexOf(CONFIG.REQUESTS.STATUS_COLUMN_NAME);

    if (statusColumnIndex === -1) {
      throw new Error(`Column "${CONFIG.REQUESTS.STATUS_COLUMN_NAME}" not found in sheet "${sheet.getName()}".`);
    }

    const newRow = e.range.getRow();
    // Use '대기' (Pending) as the default status for new submissions.
    sheet.getRange(newRow, statusColumnIndex + 1).setValue('대기');

  } catch (err) {
    Util_Logger.error(`Failed to set default status on form submit. Error: ${err.message}`);
  }
}

