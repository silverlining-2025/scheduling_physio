/**
 * @file Service_HolidayApi.js
 * @description Fetches South Korean public holiday information from the data.go.kr API.
 */
const Service_HolidayApi = {
  /**
   * Fetches all public holidays for a given year.
   * @param {number} year The year (e.g., 2025).
   * @returns {Array<Object>} An array of holiday objects.
   */
  fetchHolidays: function(year) {
    const serviceKey = PropertiesService.getScriptProperties().getProperty(CONFIG.HOLIDAY_API_SERVICE_KEY_PROPERTY);
    if (!serviceKey) {
        throw new Error("Holiday API service key is not set. Please set it in Project Settings > Script Properties.");
    }
    const url = `${CONFIG.HOLIDAY_API_URL}?ServiceKey=${encodeURIComponent(serviceKey)}&solYear=${year}&_type=json&numOfRows=100`;
    
    try {
      const response = UrlFetchApp.fetch(url, { 'muteHttpExceptions': true });
      const resultCode = response.getResponseCode();
      const content = response.getContentText();

      if (resultCode === 200) {
        const json = JSON.parse(content);
        if (!json.response.body || json.response.body.items === '') {
            Util_Logger.log('WARNING', `No holidays returned from API for year ${year}.`);
            return [];
        }
        // Ensure the result is always an array, even if there's only one holiday.
        const items = json.response.body.items.item;
        return Array.isArray(items) ? items : [items];
      } else {
        throw new Error(`API request failed with status ${resultCode}: ${content}`);
      }
    } catch (e) {
      Util_Logger.log('ERROR', `Failed to fetch holidays from API: ${e.message}`);
      throw new Error(`공휴일 정보를 가져오는 데 실패했습니다. API 키 또는 네트워크 연결을 확인하세요.`);
    }
  }
};

