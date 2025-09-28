/**
 * @fileoverview Service for fetching and processing holiday data from the public API.
 * This service is responsible for all external HTTP requests to the holiday data portal.
 * @namespace Service_HolidayApi
 */
const Service_HolidayApi = (function() {
  
  /**
   * Fetches holiday data from the API for a single year.
   * @private
   * @param {number} year The year to fetch.
   * @returns {Array<{name: string, date: string}>} An array of holiday objects.
   * @throws {Error} If API key is not set or the request fails.
   */
  function _fetchHolidaysForYear(year) {
    const API_KEY = PropertiesService.getScriptProperties().getProperty(CONFIG.HOLIDAY_API.API_KEY_PROPERTY);
    if (!API_KEY) {
      throw new Error('API key is not set. Please run the "Set Holiday API Key" menu item.');
    }
    const url = `${CONFIG.HOLIDAY_API.BASE_URL}?solYear=${year}&ServiceKey=${encodeURIComponent(API_KEY)}&_type=xml&numOfRows=100`;

    const response = UrlFetchApp.fetch(url, { 'muteHttpExceptions': true });
    const responseCode = response.getResponseCode();
    const xmlContent = response.getContentText();

    if (responseCode !== 200) {
      throw new Error(`API request failed for year ${year} with status ${responseCode}. Response: ${xmlContent}`);
    }

    const document = XmlService.parse(xmlContent);
    const root = document.getRootElement();
    const items = root.getChild('body')?.getChild('items')?.getChildren('item');

    if (!items) return [];

    return items.map(item => ({
      name: item.getChildText('dateName'),
      date: item.getChildText('locdate') // YYYYMMDD format
    }));
  }

  return {
    /**
     * Fetches holidays for a specified number of consecutive years and returns them as a Map.
     * @param {number} startYear The first year to fetch holidays for.
     * @param {number} numberOfYears The total number of years to fetch (e.g., 3).
     * @returns {Map<string, string>} A Map where the key is 'YYYY-MM-DD' and the value is the holiday name.
     */
    fetchHolidays: function(startYear, numberOfYears = 3) {
      const holidayMap = new Map();
      Util_Logger.log(`Starting holiday fetch for ${numberOfYears} years from ${startYear}...`);

      for (let i = 0; i < numberOfYears; i++) {
        const year = startYear + i;
        try {
          const holidaysForYear = _fetchHolidaysForYear(year);
          holidaysForYear.forEach(holiday => {
            if (holiday.date && holiday.date.length === 8) {
              const y = holiday.date.substring(0, 4);
              const m = holiday.date.substring(4, 6);
              const d = holiday.date.substring(6, 8);
              holidayMap.set(`${y}-${m}-${d}`, holiday.name);
            }
          });
          Util_Logger.log(`Successfully fetched ${holidaysForYear.length} holidays for ${year}.`);
        } catch (e) {
          Util_Logger.error(`Could not fetch holidays for year ${year}. Error: ${e.message}`);
        }
      }
      return holidayMap;
    }
  };
})();

