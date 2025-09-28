/**
 * @file Core_Setup.js
 * @description Handles initial setup and configuration UI for the application.
 */

/**
 * Shows a sidebar UI for application setup.
 * This can be expanded with more features like API key input, etc.
 */
function showSetupSidebar() {
  const html = HtmlService.createHtmlOutput('<p>향후 앱 설정을 위한 페이지입니다. API 키 등을 이곳에서 설정할 수 있습니다.</p>')
    .setWidth(300)
    .setTitle(CONFIG.UI_MESSAGES.SETUP_SIDEBAR_TITLE);
  SpreadsheetApp.getUi().showSidebar(html);
}

