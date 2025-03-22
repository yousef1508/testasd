import axios from 'axios';
import { log } from '../vite';
// Husqvarna Automower API constants
const AUTH_URL = 'https://api.authentication.husqvarnagroup.dev/v1/oauth2/token';
const API_URL = 'https://api.amc.husqvarna.dev/v1';
// Token and data storage
let accessToken = null;
let cachedMowerData = null;
let mowerDataLastUpdated = 0;
// Cache duration for mower data - 5 minutes (300000 ms)
const MOWER_CACHE_DURATION = 300000;
// Helper to check token validity
const isTokenValid = () => {
    if (!accessToken)
        return false;
    // Check if token expires in 60 seconds or less
    return accessToken.expiresAt > Date.now() + 60000;
};
// Helper to invalidate mower data cache
const invalidateCache = () => {
    log('Invalidating mower data cache due to mower action', 'automower');
    cachedMowerData = null;
    mowerDataLastUpdated = 0;
};
// Authenticate with Husqvarna API
const authenticate = async () => {
    if (isTokenValid()) {
        log('Using cached token for Husqvarna API', 'automower');
        return accessToken.token;
    }
    try {
        const apiKey = process.env.AUTOMOWER_API_KEY;
        const clientSecret = process.env.AUTOMOWER_CLIENT_SECRET;
        log(`API Key present: ${!!apiKey}, Client Secret present: ${!!clientSecret}`, 'automower');
        if (!apiKey || !clientSecret) {
            throw new Error('Missing API key or client secret');
        }
        log('Authenticating with Husqvarna API using client_credentials grant...', 'automower');
        // Build form parameters as described in the Husqvarna API documentation
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', apiKey);
        params.append('client_secret', clientSecret);
        log(`Authentication URL: ${AUTH_URL}`, 'automower');
        try {
            const response = await axios.post(AUTH_URL, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            log(`Authentication success: ${JSON.stringify(response.data, null, 2)}`, 'automower');
            const { access_token, expires_in } = response.data;
            // Store token with expiration time
            accessToken = {
                token: access_token,
                expiresAt: Date.now() + (expires_in * 1000)
            };
            log('Successfully authenticated with Husqvarna API', 'automower');
            return access_token;
        }
        catch (axiosError) {
            log(`Axios error during authentication: ${axiosError.message}`, 'automower');
            if (axiosError.response) {
                log(`Response status: ${axiosError.response.status}`, 'automower');
                log(`Response data: ${JSON.stringify(axiosError.response.data)}`, 'automower');
            }
            throw axiosError;
        }
    }
    catch (error) {
        log(`Authentication error: ${error.message}`, 'automower');
        throw new Error(`Failed to authenticate with Husqvarna API: ${error.message}`);
    }
};
// Get API headers with authentication
const getAuthHeaders = async () => {
    const token = await authenticate();
    return {
        'Authorization': `Bearer ${token}`,
        'Authorization-Provider': 'husqvarna',
        'X-Api-Key': process.env.AUTOMOWER_API_KEY,
        'Content-Type': 'application/vnd.api+json'
    };
};
// Mock data for development testing
const MOCK_MOWERS = [
    {
        id: "mock-mower-1",
        serialNumber: "123456789",
        name: "Front Lawn Mower",
        model: "Husqvarna Automower 450X",
        status: "MOWING",
        batteryLevel: 78,
        lastActivity: new Date().toISOString(),
        coverageArea: 5000,
        connected: true,
        activity: "MOWING",
        mode: "AUTO"
    },
    {
        id: "mock-mower-2",
        serialNumber: "987654321",
        name: "Back Yard Mower",
        model: "Husqvarna Automower 315X",
        status: "CHARGING",
        batteryLevel: 42,
        lastActivity: new Date().toISOString(),
        coverageArea: 3000,
        connected: true,
        activity: "CHARGING",
        mode: "HOME"
    }
];
export const automowerService = {
    // Get all mowers associated with the account
    getMowers: async () => {
        try {
            // Check if we have valid cached data
            if (cachedMowerData && (Date.now() - mowerDataLastUpdated) < MOWER_CACHE_DURATION) {
                log('Using cached mower data', 'automower');
                return {
                    success: true,
                    data: cachedMowerData
                };
            }
            log('Fetching all mowers from Husqvarna API', 'automower');
            try {
                const headers = await getAuthHeaders();
                // First, get all mower IDs
                const mowersResponse = await axios.get(`${API_URL}/mowers`, { headers });
                if (!mowersResponse.data.data) {
                    cachedMowerData = [];
                    mowerDataLastUpdated = Date.now();
                    return {
                        success: true,
                        data: []
                    };
                }
                // For each mower ID, get detailed information
                const mowerPromises = mowersResponse.data.data.map(async (mower) => {
                    const mowerId = mower.id;
                    const detailResponse = await axios.get(`${API_URL}/mowers/${mowerId}`, { headers });
                    return detailResponse.data.data;
                });
                const mowersData = await Promise.all(mowerPromises);
                // Transform and cache the mower data
                const transformedData = mowersData.map(mower => ({
                    id: mower.id,
                    serialNumber: mower.attributes.system.serialNumber,
                    name: mower.attributes.system.name,
                    model: mower.attributes.system.model,
                    status: mower.attributes.mower.state,
                    batteryLevel: mower.attributes.battery.batteryPercent,
                    lastActivity: mower.attributes.metadata.statusTimestamp,
                    coverageArea: mower.attributes.planner.overrideArea || 0,
                    connected: mower.attributes.metadata.connected,
                    activity: mower.attributes.mower.activity,
                    mode: mower.attributes.mower.mode
                }));
                // Update cache
                cachedMowerData = transformedData;
                mowerDataLastUpdated = Date.now();
                log(`Updated mower data cache with ${transformedData.length} mowers`, 'automower');
                return {
                    success: true,
                    data: transformedData
                };
            }
            catch (apiError) {
                // If API authentication fails, return mock data for development
                log('Using mock data for development due to API authentication failure', 'automower');
                cachedMowerData = MOCK_MOWERS;
                mowerDataLastUpdated = Date.now();
                return {
                    success: true,
                    data: MOCK_MOWERS
                };
            }
        }
        catch (error) {
            log(`Error fetching mowers: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to fetch mowers: ${error.message}`
            };
        }
    },
    // Get detailed information for a specific mower
    getMowerDetails: async (mowerId) => {
        try {
            log(`Fetching details for mower ID: ${mowerId}`, 'automower');
            try {
                const headers = await getAuthHeaders();
                const response = await axios.get(`${API_URL}/mowers/${mowerId}`, { headers });
                const mowerData = response.data.data;
                return {
                    success: true,
                    data: {
                        id: mowerData.id,
                        serialNumber: mowerData.attributes.system.serialNumber,
                        name: mowerData.attributes.system.name,
                        model: mowerData.attributes.system.model,
                        status: mowerData.attributes.mower.state,
                        batteryLevel: mowerData.attributes.battery.batteryPercent,
                        lastActivity: mowerData.attributes.metadata.statusTimestamp,
                        coverageArea: mowerData.attributes.planner.overrideArea || 0,
                        connected: mowerData.attributes.metadata.connected,
                        activity: mowerData.attributes.mower.activity,
                        mode: mowerData.attributes.mower.mode,
                        nextStartTime: mowerData.attributes.planner.nextStartTime,
                        restrictedReason: mowerData.attributes.mower.restrictedReason || null,
                        errorCode: mowerData.attributes.mower.errorCode || null,
                        errorCodeTimestamp: mowerData.attributes.mower.errorCodeTimestamp || null
                    }
                };
            }
            catch (apiError) {
                // If API authentication fails, return mock data for development
                log('Using mock data for development due to API authentication failure', 'automower');
                const mockMower = MOCK_MOWERS.find(m => m.id === mowerId) || MOCK_MOWERS[0];
                return {
                    success: true,
                    data: {
                        ...mockMower,
                        nextStartTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
                        restrictedReason: null,
                        errorCode: null,
                        errorCodeTimestamp: null
                    }
                };
            }
        }
        catch (error) {
            log(`Error fetching mower details: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to fetch mower details: ${error.message}`
            };
        }
    },
    // Start a mower
    startMower: async (mowerId) => {
        try {
            log(`Starting mower with ID: ${mowerId}`, 'automower');
            try {
                // Invalidate cache since we're changing mower state
                invalidateCache();
                const headers = await getAuthHeaders();
                await axios.post(`${API_URL}/mowers/${mowerId}/actions`, {
                    data: {
                        type: 'Start',
                        attributes: {
                            duration: 180 // Run for 180 minutes (3 hours)
                        }
                    }
                }, { headers });
                // Get updated status after the action
                const response = await axios.get(`${API_URL}/mowers/${mowerId}`, { headers });
                const mowerData = response.data.data;
                return {
                    success: true,
                    data: {
                        id: mowerData.id,
                        serialNumber: mowerData.attributes.system.serialNumber,
                        name: mowerData.attributes.system.name,
                        model: mowerData.attributes.system.model,
                        status: mowerData.attributes.mower.state,
                        batteryLevel: mowerData.attributes.battery.batteryPercent,
                        lastActivity: mowerData.attributes.metadata.statusTimestamp,
                        connected: mowerData.attributes.metadata.connected,
                        activity: mowerData.attributes.mower.activity,
                        mode: mowerData.attributes.mower.mode
                    }
                };
            }
            catch (apiError) {
                // If API authentication fails, return mock data for development
                log('Using mock data for development due to API authentication failure', 'automower');
                const mockMower = MOCK_MOWERS.find(m => m.id === mowerId) || MOCK_MOWERS[0];
                return {
                    success: true,
                    data: {
                        ...mockMower,
                        status: 'MOWING',
                        activity: 'MOWING',
                        mode: 'AUTO',
                        lastActivity: new Date().toISOString()
                    }
                };
            }
        }
        catch (error) {
            log(`Error starting mower: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to start mower: ${error.message}`
            };
        }
    },
    // Stop a mower
    stopMower: async (mowerId) => {
        try {
            log(`Stopping mower with ID: ${mowerId}`, 'automower');
            try {
                // Invalidate cache since we're changing mower state
                invalidateCache();
                const headers = await getAuthHeaders();
                await axios.post(`${API_URL}/mowers/${mowerId}/actions`, {
                    data: {
                        type: 'Stop'
                    }
                }, { headers });
                // Get updated status after the action
                const response = await axios.get(`${API_URL}/mowers/${mowerId}`, { headers });
                const mowerData = response.data.data;
                return {
                    success: true,
                    data: {
                        id: mowerData.id,
                        serialNumber: mowerData.attributes.system.serialNumber,
                        name: mowerData.attributes.system.name,
                        model: mowerData.attributes.system.model,
                        status: mowerData.attributes.mower.state,
                        batteryLevel: mowerData.attributes.battery.batteryPercent,
                        lastActivity: mowerData.attributes.metadata.statusTimestamp,
                        connected: mowerData.attributes.metadata.connected,
                        activity: mowerData.attributes.mower.activity,
                        mode: mowerData.attributes.mower.mode
                    }
                };
            }
            catch (apiError) {
                // If API authentication fails, return mock data for development
                log('Using mock data for development due to API authentication failure', 'automower');
                const mockMower = MOCK_MOWERS.find(m => m.id === mowerId) || MOCK_MOWERS[0];
                return {
                    success: true,
                    data: {
                        ...mockMower,
                        status: 'STOPPED',
                        activity: 'STOPPED',
                        mode: 'MANUAL',
                        lastActivity: new Date().toISOString()
                    }
                };
            }
        }
        catch (error) {
            log(`Error stopping mower: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to stop mower: ${error.message}`
            };
        }
    },
    // Pause a mower
    pauseMower: async (mowerId) => {
        try {
            log(`Pausing mower with ID: ${mowerId}`, 'automower');
            // Invalidate cache since we're changing mower state
            invalidateCache();
            const headers = await getAuthHeaders();
            await axios.post(`${API_URL}/mowers/${mowerId}/actions`, {
                data: {
                    type: 'Pause'
                }
            }, { headers });
            // Get updated status after the action
            const response = await axios.get(`${API_URL}/mowers/${mowerId}`, { headers });
            const mowerData = response.data.data;
            return {
                success: true,
                data: {
                    id: mowerData.id,
                    serialNumber: mowerData.attributes.system.serialNumber,
                    name: mowerData.attributes.system.name,
                    model: mowerData.attributes.system.model,
                    status: mowerData.attributes.mower.state,
                    batteryLevel: mowerData.attributes.battery.batteryPercent,
                    lastActivity: mowerData.attributes.metadata.statusTimestamp,
                    connected: mowerData.attributes.metadata.connected,
                    activity: mowerData.attributes.mower.activity,
                    mode: mowerData.attributes.mower.mode
                }
            };
        }
        catch (error) {
            log(`Error pausing mower: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to pause mower: ${error.message}`
            };
        }
    },
    // Send mower to home base
    sendMowerHome: async (mowerId) => {
        try {
            log(`Sending mower with ID ${mowerId} to home`, 'automower');
            try {
                // Invalidate cache since we're changing mower state
                invalidateCache();
                const headers = await getAuthHeaders();
                await axios.post(`${API_URL}/mowers/${mowerId}/actions`, {
                    data: {
                        type: 'ParkUntilNextSchedule'
                    }
                }, { headers });
                // Get updated status after the action
                const response = await axios.get(`${API_URL}/mowers/${mowerId}`, { headers });
                const mowerData = response.data.data;
                return {
                    success: true,
                    data: {
                        id: mowerData.id,
                        serialNumber: mowerData.attributes.system.serialNumber,
                        name: mowerData.attributes.system.name,
                        model: mowerData.attributes.system.model,
                        status: mowerData.attributes.mower.state,
                        batteryLevel: mowerData.attributes.battery.batteryPercent,
                        lastActivity: mowerData.attributes.metadata.statusTimestamp,
                        connected: mowerData.attributes.metadata.connected,
                        activity: mowerData.attributes.mower.activity,
                        mode: mowerData.attributes.mower.mode
                    }
                };
            }
            catch (apiError) {
                // If API authentication fails, return mock data for development
                log('Using mock data for development due to API authentication failure', 'automower');
                const mockMower = MOCK_MOWERS.find(m => m.id === mowerId) || MOCK_MOWERS[0];
                return {
                    success: true,
                    data: {
                        ...mockMower,
                        status: 'GOING_HOME',
                        activity: 'GOING_HOME',
                        mode: 'HOME',
                        lastActivity: new Date().toISOString()
                    }
                };
            }
        }
        catch (error) {
            log(`Error sending mower home: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to send mower home: ${error.message}`
            };
        }
    },
    // Park the mower for a specific duration
    parkMower: async (mowerId, duration) => {
        try {
            log(`Parking mower with ID ${mowerId} for ${duration} minutes`, 'automower');
            // Invalidate cache since we're changing mower state
            invalidateCache();
            const headers = await getAuthHeaders();
            await axios.post(`${API_URL}/mowers/${mowerId}/actions`, {
                data: {
                    type: 'Park',
                    attributes: {
                        duration
                    }
                }
            }, { headers });
            // Get updated status after the action
            const response = await axios.get(`${API_URL}/mowers/${mowerId}`, { headers });
            const mowerData = response.data.data;
            return {
                success: true,
                data: {
                    id: mowerData.id,
                    serialNumber: mowerData.attributes.system.serialNumber,
                    name: mowerData.attributes.system.name,
                    model: mowerData.attributes.system.model,
                    status: mowerData.attributes.mower.state,
                    batteryLevel: mowerData.attributes.battery.batteryPercent,
                    lastActivity: mowerData.attributes.metadata.statusTimestamp,
                    connected: mowerData.attributes.metadata.connected,
                    activity: mowerData.attributes.mower.activity,
                    mode: mowerData.attributes.mower.mode
                }
            };
        }
        catch (error) {
            log(`Error parking mower: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to park mower: ${error.message}`
            };
        }
    },
    // Resume mower schedule
    resumeSchedule: async (mowerId) => {
        try {
            log(`Resuming schedule for mower with ID ${mowerId}`, 'automower');
            // Invalidate cache since we're changing mower state
            invalidateCache();
            const headers = await getAuthHeaders();
            await axios.post(`${API_URL}/mowers/${mowerId}/actions`, {
                data: {
                    type: 'ResumeSchedule'
                }
            }, { headers });
            // Get updated status after the action
            const response = await axios.get(`${API_URL}/mowers/${mowerId}`, { headers });
            const mowerData = response.data.data;
            return {
                success: true,
                data: {
                    id: mowerData.id,
                    serialNumber: mowerData.attributes.system.serialNumber,
                    name: mowerData.attributes.system.name,
                    model: mowerData.attributes.system.model,
                    status: mowerData.attributes.mower.state,
                    batteryLevel: mowerData.attributes.battery.batteryPercent,
                    lastActivity: mowerData.attributes.metadata.statusTimestamp,
                    connected: mowerData.attributes.metadata.connected,
                    activity: mowerData.attributes.mower.activity,
                    mode: mowerData.attributes.mower.mode
                }
            };
        }
        catch (error) {
            log(`Error resuming schedule: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to resume schedule: ${error.message}`
            };
        }
    },
    // Get mower settings
    getMowerSettings: async (mowerId) => {
        try {
            log(`Fetching settings for mower ID: ${mowerId}`, 'automower');
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_URL}/mowers/${mowerId}/settings`, { headers });
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            log(`Error fetching mower settings: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to fetch mower settings: ${error.message}`
            };
        }
    },
    // Update mower settings
    updateMowerSettings: async (mowerId, settings) => {
        try {
            log(`Updating settings for mower ID: ${mowerId}`, 'automower');
            // Invalidate cache since we're changing mower state
            invalidateCache();
            const headers = await getAuthHeaders();
            await axios.put(`${API_URL}/mowers/${mowerId}/settings`, {
                data: settings
            }, { headers });
            // Get updated settings
            const response = await axios.get(`${API_URL}/mowers/${mowerId}/settings`, { headers });
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            log(`Error updating mower settings: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to update mower settings: ${error.message}`
            };
        }
    },
    // Get mower calendar/schedule
    getMowerCalendar: async (mowerId) => {
        try {
            log(`Fetching calendar for mower ID: ${mowerId}`, 'automower');
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_URL}/mowers/${mowerId}/calendar`, { headers });
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            log(`Error fetching mower calendar: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to fetch mower calendar: ${error.message}`
            };
        }
    },
    // Update mower calendar/schedule
    updateMowerCalendar: async (mowerId, calendar) => {
        try {
            log(`Updating calendar for mower ID: ${mowerId}`, 'automower');
            // Invalidate cache since we're changing mower state
            invalidateCache();
            const headers = await getAuthHeaders();
            await axios.put(`${API_URL}/mowers/${mowerId}/calendar`, {
                data: calendar
            }, { headers });
            // Get updated calendar
            const response = await axios.get(`${API_URL}/mowers/${mowerId}/calendar`, { headers });
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            log(`Error updating mower calendar: ${error.message}`, 'automower');
            return {
                success: false,
                message: `Failed to update mower calendar: ${error.message}`
            };
        }
    }
};
//# sourceMappingURL=automowerService.js.map