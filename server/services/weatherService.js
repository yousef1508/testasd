import axios from "axios";
import { format, addHours, addDays } from "date-fns";
import { log } from "../vite";
// Coordinates for Gjersjøen Golf Klubb
const GJERSJOEN_LAT = 59.7707869;
const GJERSJOEN_LON = 10.7797062;
const GJERSJOEN_ALT = 93; // Altitude in meters
const USER_AGENT = 'LawnMower-Hub/1.0 (gjersjoen.golf.klubb@example.com)';
// Function to map YR weather symbol codes to our icon names
const mapWeatherSymbol = (symbolCode) => {
    if (!symbolCode)
        return "cloud-sun";
    if (symbolCode.includes("clearsky"))
        return "sun";
    if (symbolCode.includes("fair"))
        return "sun";
    if (symbolCode.includes("partlycloudy"))
        return "cloud-sun";
    if (symbolCode.includes("cloudy"))
        return "cloud";
    if (symbolCode.includes("lightrainshowers"))
        return "cloud-drizzle";
    if (symbolCode.includes("rainshowers"))
        return "cloud-rain";
    if (symbolCode.includes("heavyrainshowers"))
        return "cloud-downpour";
    if (symbolCode.includes("lightrain"))
        return "cloud-drizzle";
    if (symbolCode.includes("rain"))
        return "cloud-rain";
    if (symbolCode.includes("heavyrain"))
        return "cloud-downpour";
    if (symbolCode.includes("lightsleet"))
        return "cloud-sleet";
    if (symbolCode.includes("sleet"))
        return "cloud-sleet";
    if (symbolCode.includes("heavysleet"))
        return "cloud-sleet";
    if (symbolCode.includes("lightsnow"))
        return "cloud-snow";
    if (symbolCode.includes("snow"))
        return "cloud-snow";
    if (symbolCode.includes("heavysnow"))
        return "cloud-snow";
    if (symbolCode.includes("fog"))
        return "cloud-fog";
    if (symbolCode.includes("thunder"))
        return "cloud-lightning";
    return "cloud-sun";
};
// Function to interpret weather symbol code to condition text
const getConditionText = (symbolCode) => {
    if (!symbolCode)
        return "Partly Cloudy";
    if (symbolCode.includes("clearsky"))
        return "Clear Sky";
    if (symbolCode.includes("fair"))
        return "Fair";
    if (symbolCode.includes("partlycloudy"))
        return "Partly Cloudy";
    if (symbolCode.includes("cloudy"))
        return "Cloudy";
    if (symbolCode.includes("lightrainshowers"))
        return "Light Rain Showers";
    if (symbolCode.includes("rainshowers"))
        return "Rain Showers";
    if (symbolCode.includes("heavyrainshowers"))
        return "Heavy Rain Showers";
    if (symbolCode.includes("lightrain"))
        return "Light Rain";
    if (symbolCode.includes("rain"))
        return "Rain";
    if (symbolCode.includes("heavyrain"))
        return "Heavy Rain";
    if (symbolCode.includes("lightsleet"))
        return "Light Sleet";
    if (symbolCode.includes("sleet"))
        return "Sleet";
    if (symbolCode.includes("heavysleet"))
        return "Heavy Sleet";
    if (symbolCode.includes("lightsnow"))
        return "Light Snow";
    if (symbolCode.includes("snow"))
        return "Snow";
    if (symbolCode.includes("heavysnow"))
        return "Heavy Snow";
    if (symbolCode.includes("fog"))
        return "Fog";
    if (symbolCode.includes("thunder"))
        return "Thunderstorm";
    return "Partly Cloudy";
};
// Calculate feels like temperature using wind chill and heat index
const calculateFeelsLike = (temperature, windSpeed, humidity) => {
    // Wind chill formula valid for temperatures at or below 10°C and wind speeds above 4.8 km/h
    if (temperature <= 10 && windSpeed > 4.8) {
        return 13.12 + 0.6215 * temperature - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * temperature * Math.pow(windSpeed, 0.16);
    }
    // Heat index formula valid for temperatures above 20°C and humidity above 40%
    if (temperature > 20 && humidity > 40) {
        const tempF = (temperature * 9 / 5) + 32; // Convert to Fahrenheit for the formula
        const hi = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity - 0.22475541 * tempF * humidity
            - 0.00683783 * tempF * tempF - 0.05481717 * humidity * humidity
            + 0.00122874 * tempF * tempF * humidity + 0.00085282 * tempF * humidity * humidity
            - 0.00000199 * tempF * tempF * humidity * humidity;
        return (hi - 32) * 5 / 9; // Convert back to Celsius
    }
    // If conditions don't meet criteria for wind chill or heat index, return actual temperature
    return temperature;
};
// Get the UV index based on cloud cover
const estimateUVIndex = (cloudCover, hour) => {
    // Very basic estimation, would be more accurate with actual UV data
    const baseUV = hour >= 10 && hour <= 16 ? 8 : hour >= 8 && hour <= 18 ? 5 : 1;
    const adjustedUV = baseUV * (1 - (cloudCover / 100) * 0.75);
    return Math.round(Math.max(0, adjustedUV));
};
// Parse precipitation data from YR API
const getPrecipitation = (hourData) => {
    if (hourData.data.next_1_hours?.details?.precipitation_amount) {
        return hourData.data.next_1_hours.details.precipitation_amount;
    }
    if (hourData.data.next_6_hours?.details?.precipitation_amount) {
        return hourData.data.next_6_hours.details.precipitation_amount / 6; // Average per hour
    }
    if (hourData.data.next_12_hours?.details?.precipitation_amount) {
        return hourData.data.next_12_hours.details.precipitation_amount / 12; // Average per hour
    }
    return 0;
};
// Get daily total precipitation
const getDailyPrecipitation = (timeseries, startIndex, endIndex) => {
    let totalPrecipitation = 0;
    for (let i = startIndex; i <= endIndex; i++) {
        const hourData = timeseries[i];
        if (hourData?.data.next_1_hours?.details?.precipitation_amount) {
            totalPrecipitation += hourData.data.next_1_hours.details.precipitation_amount;
        }
    }
    return Math.round(totalPrecipitation * 10) / 10; // Round to 1 decimal place
};
// Calculate dew point
const calculateDewPoint = (temperature, humidity) => {
    // Magnus formula
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
};
// Fetch weather alerts from YR API Metalerts service
const fetchWeatherAlerts = async () => {
    try {
        const response = await axios.get('https://api.met.no/weatherapi/metalerts/1.1/filter', {
            params: {
                lat: GJERSJOEN_LAT,
                lon: GJERSJOEN_LON
            },
            headers: {
                'User-Agent': USER_AGENT
            }
        });
        if (!response.data || !response.data.features) {
            return [];
        }
        return response.data.features.map((feature) => {
            const props = feature.properties;
            return {
                type: props.event || 'Weather Alert',
                severity: props.severity || 'Moderate',
                headline: props.headline || 'Weather Alert',
                description: props.description || '',
                start: props.onset || new Date().toISOString(),
                end: props.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };
        });
    }
    catch (error) {
        log('Error fetching weather alerts: ' + error, 'weather');
        return []; // Return empty array if there's an error
    }
};
export const weatherService = {
    getWeatherData: async () => {
        try {
            log("Fetching weather data for Gjersjøen, Akershus, Norway", 'weather');
            // Make an API call to YR Weather API
            const response = await axios.get('https://api.met.no/weatherapi/locationforecast/2.0/complete', {
                params: {
                    lat: GJERSJOEN_LAT,
                    lon: GJERSJOEN_LON,
                    altitude: GJERSJOEN_ALT
                },
                headers: {
                    'User-Agent': USER_AGENT
                },
            });
            // Check if we have valid data
            if (!response.data || !response.data.properties || !response.data.properties.timeseries) {
                throw new Error('Invalid data structure from weather API');
            }
            const timeseries = response.data.properties.timeseries;
            const currentData = timeseries[0];
            const now = new Date();
            const currentHour = now.getHours();
            // Extract current weather conditions
            const instantDetails = currentData.data.instant.details;
            const current = {
                temperature: Math.round(instantDetails.air_temperature),
                condition: getConditionText(currentData.data.next_1_hours?.summary?.symbol_code || ''),
                icon: mapWeatherSymbol(currentData.data.next_1_hours?.summary?.symbol_code || ''),
                feelsLike: Math.round(calculateFeelsLike(instantDetails.air_temperature, instantDetails.wind_speed, instantDetails.relative_humidity)),
                humidity: Math.round(instantDetails.relative_humidity),
                windSpeed: Math.round(instantDetails.wind_speed),
                windDirection: Math.round(instantDetails.wind_from_direction),
                windGust: instantDetails.wind_speed_of_gust ? Math.round(instantDetails.wind_speed_of_gust) : undefined,
                pressure: Math.round(instantDetails.air_pressure_at_sea_level),
                precipitation: getPrecipitation(currentData),
                cloudCover: Math.round(instantDetails.cloud_area_fraction),
                uvIndex: estimateUVIndex(instantDetails.cloud_area_fraction, currentHour),
                dewPoint: Math.round(calculateDewPoint(instantDetails.air_temperature, instantDetails.relative_humidity)),
                visibility: instantDetails.fog_area_fraction < 40 ? 10000 : Math.round(10000 * (1 - instantDetails.fog_area_fraction / 100))
            };
            // Extract hourly forecast (next 24 hours)
            const hourly = [];
            for (let i = 0; i < 24; i++) {
                const hour = i === 0 ? "Now" : format(addHours(now, i), 'HH:mm');
                const hourData = timeseries[i];
                if (hourData) {
                    const details = hourData.data.instant.details;
                    hourly.push({
                        time: hour,
                        temperature: Math.round(details.air_temperature),
                        condition: getConditionText(hourData.data.next_1_hours?.summary?.symbol_code || ''),
                        icon: mapWeatherSymbol(hourData.data.next_1_hours?.summary?.symbol_code || ''),
                        precipitation: getPrecipitation(hourData),
                        windSpeed: Math.round(details.wind_speed),
                        windDirection: Math.round(details.wind_from_direction),
                        humidity: Math.round(details.relative_humidity),
                        pressure: Math.round(details.air_pressure_at_sea_level),
                        cloudCover: Math.round(details.cloud_area_fraction)
                    });
                }
            }
            // Extract daily forecast (7 days)
            const daily = [];
            const dailyIndices = [0, 24, 48, 72, 96, 120, 144]; // Today + 6 days
            const dayNames = [
                "Today",
                "Tomorrow",
                format(addDays(now, 2), 'EEEE'),
                format(addDays(now, 3), 'EEEE'),
                format(addDays(now, 4), 'EEEE'),
                format(addDays(now, 5), 'EEEE'),
                format(addDays(now, 6), 'EEEE')
            ];
            for (let i = 0; i < dailyIndices.length; i++) {
                const dayIndex = dailyIndices[i];
                const dayData = timeseries[dayIndex];
                if (dayData) {
                    // Find min/max temperatures for the day
                    const startIndex = dayIndex;
                    const endIndex = Math.min(startIndex + 24, timeseries.length - 1);
                    let minTemp = Infinity;
                    let maxTemp = -Infinity;
                    let sumWindSpeed = 0;
                    let sumWindDirection = 0;
                    let sumHumidity = 0;
                    let sampleCount = 0;
                    for (let j = startIndex; j <= endIndex && j < timeseries.length; j++) {
                        const data = timeseries[j]?.data.instant.details;
                        if (data) {
                            minTemp = Math.min(minTemp, data.air_temperature);
                            maxTemp = Math.max(maxTemp, data.air_temperature);
                            sumWindSpeed += data.wind_speed;
                            sumWindDirection += data.wind_from_direction;
                            sumHumidity += data.relative_humidity;
                            sampleCount++;
                        }
                    }
                    // Calculate averages
                    const avgWindSpeed = Math.round(sumWindSpeed / sampleCount);
                    const avgWindDirection = Math.round(sumWindDirection / sampleCount);
                    const avgHumidity = Math.round(sumHumidity / sampleCount);
                    // Calculate total precipitation
                    const precipitation = getDailyPrecipitation(timeseries, startIndex, endIndex);
                    daily.push({
                        day: dayNames[i],
                        minTemp: Math.round(minTemp),
                        maxTemp: Math.round(maxTemp),
                        condition: getConditionText(dayData.data.next_12_hours?.summary?.symbol_code ||
                            dayData.data.next_6_hours?.summary?.symbol_code || ''),
                        icon: mapWeatherSymbol(dayData.data.next_12_hours?.summary?.symbol_code ||
                            dayData.data.next_6_hours?.summary?.symbol_code || ''),
                        precipitation: precipitation,
                        windSpeed: avgWindSpeed,
                        windDirection: avgWindDirection,
                        humidity: avgHumidity,
                        // sunrise and sunset could be added if available from another API
                    });
                }
            }
            // Fetch weather alerts
            const alerts = await fetchWeatherAlerts();
            // Format the complete weather data
            return {
                location: "Gjersjøen, Akershus, Norway",
                coordinates: {
                    latitude: GJERSJOEN_LAT,
                    longitude: GJERSJOEN_LON,
                    altitude: GJERSJOEN_ALT
                },
                current,
                hourly,
                daily,
                alerts: alerts.length > 0 ? alerts : undefined
            };
        }
        catch (error) {
            log(`Error fetching weather data: ${error}`, 'weather');
            throw new Error("Failed to fetch weather data");
        }
    },
    // Get detailed hourly forecast for lawn mowing conditions
    getLawnConditions: async () => {
        try {
            const weatherData = await weatherService.getWeatherData();
            // Analyze hourly data to determine good mowing conditions
            const mowingConditions = weatherData.hourly.map(hour => {
                // Ideal conditions: No rain, temperature between 5-30°C, wind speed < 10 m/s
                const isRaining = (hour.precipitation || 0) > 0.1;
                const tempInRange = hour.temperature >= 5 && hour.temperature <= 30;
                const windOK = (hour.windSpeed || 0) < 10;
                const suitable = !isRaining && tempInRange && windOK;
                return {
                    time: hour.time,
                    suitable,
                    temperature: hour.temperature,
                    condition: hour.condition,
                    icon: hour.icon,
                    precipitation: hour.precipitation || 0,
                    windSpeed: hour.windSpeed || 0,
                    reason: isRaining ? "Rain expected" :
                        !tempInRange ? "Temperature out of ideal range" :
                            !windOK ? "Wind too strong" : "Suitable conditions"
                };
            });
            // Find best mowing windows (consecutive suitable hours)
            const mowingWindows = [];
            let currentWindow = [];
            for (const condition of mowingConditions) {
                if (condition.suitable) {
                    currentWindow.push(condition);
                }
                else if (currentWindow.length > 0) {
                    if (currentWindow.length >= 2) { // At least 2 consecutive hours
                        mowingWindows.push({
                            start: currentWindow[0].time,
                            end: currentWindow[currentWindow.length - 1].time,
                            duration: currentWindow.length,
                            conditions: currentWindow
                        });
                    }
                    currentWindow = [];
                }
            }
            // If there's an open window at the end
            if (currentWindow.length >= 2) {
                mowingWindows.push({
                    start: currentWindow[0].time,
                    end: currentWindow[currentWindow.length - 1].time,
                    duration: currentWindow.length,
                    conditions: currentWindow
                });
            }
            return {
                location: weatherData.location,
                currentConditions: weatherData.current,
                hourlyConditions: mowingConditions,
                mowingWindows: mowingWindows,
                recommendation: mowingWindows.length > 0
                    ? `Best mowing time: ${mowingWindows[0].start} to ${mowingWindows[0].end}`
                    : "No suitable mowing windows in the next 24 hours"
            };
        }
        catch (error) {
            log(`Error analyzing lawn conditions: ${error}`, 'weather');
            throw new Error("Failed to analyze lawn conditions");
        }
    }
};
//# sourceMappingURL=weatherService.js.map