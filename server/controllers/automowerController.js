import { automowerService } from '../services/automowerService';
import { log } from '../vite';
export const automowerController = {
    // Get all mowers from the Automower API
    getAllMowers: async (req, res) => {
        try {
            const response = await automowerService.getMowers();
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in getAllMowers controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Get specific mower details from the Automower API
    getMowerDetails: async (req, res) => {
        try {
            const { mowerId } = req.params;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            const response = await automowerService.getMowerDetails(mowerId);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in getMowerDetails controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Start a mower
    startMower: async (req, res) => {
        try {
            const { mowerId } = req.params;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            const response = await automowerService.startMower(mowerId);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in startMower controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Stop a mower
    stopMower: async (req, res) => {
        try {
            const { mowerId } = req.params;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            const response = await automowerService.stopMower(mowerId);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in stopMower controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Pause a mower
    pauseMower: async (req, res) => {
        try {
            const { mowerId } = req.params;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            const response = await automowerService.pauseMower(mowerId);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in pauseMower controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Send a mower to home base
    sendMowerHome: async (req, res) => {
        try {
            const { mowerId } = req.params;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            const response = await automowerService.sendMowerHome(mowerId);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in sendMowerHome controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Park a mower for a specific duration
    parkMower: async (req, res) => {
        try {
            const { mowerId } = req.params;
            const { duration } = req.body;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            if (!duration || typeof duration !== 'number') {
                return res.status(400).json({ error: 'Valid duration in minutes is required' });
            }
            const response = await automowerService.parkMower(mowerId, duration);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in parkMower controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Resume a mower's schedule
    resumeSchedule: async (req, res) => {
        try {
            const { mowerId } = req.params;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            const response = await automowerService.resumeSchedule(mowerId);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in resumeSchedule controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Get mower settings
    getMowerSettings: async (req, res) => {
        try {
            const { mowerId } = req.params;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            const response = await automowerService.getMowerSettings(mowerId);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in getMowerSettings controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Update mower settings
    updateMowerSettings: async (req, res) => {
        try {
            const { mowerId } = req.params;
            const settings = req.body;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({ error: 'Valid settings object is required' });
            }
            const response = await automowerService.updateMowerSettings(mowerId, settings);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in updateMowerSettings controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Get mower calendar/schedule
    getMowerCalendar: async (req, res) => {
        try {
            const { mowerId } = req.params;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            const response = await automowerService.getMowerCalendar(mowerId);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in getMowerCalendar controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    },
    // Update mower calendar/schedule
    updateMowerCalendar: async (req, res) => {
        try {
            const { mowerId } = req.params;
            const calendar = req.body;
            if (!mowerId) {
                return res.status(400).json({ error: 'Mower ID is required' });
            }
            if (!calendar || typeof calendar !== 'object') {
                return res.status(400).json({ error: 'Valid calendar object is required' });
            }
            const response = await automowerService.updateMowerCalendar(mowerId, calendar);
            if (!response.success) {
                return res.status(500).json({ error: response.message });
            }
            res.json(response.data);
        }
        catch (error) {
            log(`Error in updateMowerCalendar controller: ${error.message}`, 'automower');
            res.status(500).json({ error: error.message });
        }
    }
};
//# sourceMappingURL=automowerController.js.map