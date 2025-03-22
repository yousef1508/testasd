import { storage } from "../storage";
import { weatherService } from "../services/weatherService";
import { log } from "../vite";
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
let lastFetchTime = null;
let lastLawnConditionsTime = null;
let cachedLawnConditions = null;
const weatherController = {
    getWeatherData: async (req, res) => {
        try {
            const currentTime = Date.now();
            const shouldFetchNew = !lastFetchTime || (currentTime - lastFetchTime > CACHE_EXPIRY_MS);
            // Use cached data if available and not expired
            if (!shouldFetchNew) {
                const cachedData = await storage.getCachedWeatherData();
                if (cachedData) {
                    return res.json(cachedData);
                }
            }
            // Fetch new data from weather service
            const weatherData = await weatherService.getWeatherData();
            // Cache the data
            await storage.setCachedWeatherData(weatherData);
            lastFetchTime = currentTime;
            res.json(weatherData);
        }
        catch (error) {
            log(`Get weather data error: ${error}`, 'weather');
            res.status(500).json({
                message: "Failed to get weather data",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    },
    getLawnConditions: async (req, res) => {
        try {
            const currentTime = Date.now();
            const shouldFetchNew = !lastLawnConditionsTime || (currentTime - lastLawnConditionsTime > CACHE_EXPIRY_MS);
            // Use cached data if available and not expired
            if (!shouldFetchNew && cachedLawnConditions) {
                return res.json(cachedLawnConditions);
            }
            // Fetch new lawn condition data
            const lawnConditions = await weatherService.getLawnConditions();
            // Cache the data
            cachedLawnConditions = lawnConditions;
            lastLawnConditionsTime = currentTime;
            res.json(lawnConditions);
        }
        catch (error) {
            log(`Get lawn conditions error: ${error}`, 'weather');
            res.status(500).json({
                message: "Failed to get lawn mowing conditions",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }
};
export default weatherController;
//# sourceMappingURL=weatherController.js.map