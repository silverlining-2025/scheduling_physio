/**
 * @fileoverview Handles all application setup, such as creating custom menus and initializing properties.
 * This file contains the single, authoritative onOpen function for the entire project.
 */

/**
 * Creates all custom menus in the spreadsheet UI when the workbook is opened.
 * @param {GoogleAppsScript.Events.AppsScriptEvent} e The onOpen event object from the trigger.
 */
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🏥 Scheduler')
    .addItem('Generate Full Schedule', 'generateDraftSchedule')
    .addSeparator()
    .addSubMenu(ui.createMenu('Admin')
      .addItem('Update 3-Year Calendar', 'updateCalendarFromApi')
      .addItem('Set Holiday API Key', 'setApiKey')
    )
    .addToUi();
    
  // REWRITTEN Debug Menu to match the new logical flow
  ui.createMenu('⚙️ Debug')
    .addItem('Step 1: Build Blueprint & Apply Constraints', 'debugRunStep1')
    .addItem('Step 2: Schedule Weekend Shifts & OFFs', 'debugRunStep2')
    .addItem('Step 3: Fill Weekday Shifts', 'debugRunStep3')
    .addItem('Step 4: Assign On-Call Duties', 'debugRunStep4')
    .addItem('Step 5: Balance & Finalize Schedule', 'debugRunStep5')
    .addSeparator()
    .addItem('Run Validation Check on Current Schedule', 'debugRunValidation')
    .addSeparator()
    .addItem('Clear Schedule Area', 'debugClearScheduleArea')
    .addToUi();
}

/**
 * Prompts the user and securely stores the public data portal API key in Script Properties.
 */
function setApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'API Key Setup',
    'Please paste your data.go.kr API key here:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const apiKey = response.getResponseText().trim();
    if (!apiKey) {
      ui.alert('Setup Canceled', 'API key cannot be empty.', ui.ButtonSet.OK);
      return;
    }
    PropertiesService.getScriptProperties().setProperty(CONFIG.HOLIDAY_API.API_KEY_PROPERTY, apiKey);
    ui.alert('✅ Success', 'API key has been securely stored.', ui.ButtonSet.OK);
  } else {
    ui.alert('Setup Canceled', 'No API key was stored.', ui.ButtonSet.OK);
  }
}

