import { createServer } from "http";
import { storage } from "./storage";
import mowerController from "./controllers/mowerController";
import weatherController from "./controllers/weatherController";
import { automowerController } from "./controllers/automowerController";
import { authenticateUser } from "./middleware/authMiddleware";
export async function registerRoutes(app) {
    // Auth routes are defined in auth.ts
    // Backward compatibility for Firebase sync route
    app.post("/api/auth/sync", async (req, res) => {
        try {
            const { idToken } = req.body;
            if (!idToken) {
                return res.status(400).json({ message: "ID Token is required" });
            }
            // In a real implementation, you would verify the Firebase ID token
            // For now, we'll just assume it's valid since we're already logged in with Firebase
            // Get email from token claim (simulated)
            const email = req.body.email || "unknown@example.com";
            // Find user by email
            const user = await storage.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            // Create session using passport login
            req.login(user, (err) => {
                if (err) {
                    return res.status(500).json({ message: "Failed to create session" });
                }
                // Remove password from response
                const { password, ...userWithoutPassword } = user;
                res.json(userWithoutPassword);
            });
        }
        catch (error) {
            console.error("Auth sync error:", error);
            res.status(500).json({ message: "Failed to sync authentication" });
        }
    });
    // Weather routes (public access)
    app.get("/api/weather", weatherController.getWeatherData);
    app.get("/api/weather/lawn-conditions", weatherController.getLawnConditions);
    // Mower routes
    app.get("/api/mowers", authenticateUser, mowerController.getMowers);
    app.post("/api/mowers", authenticateUser, mowerController.createMower);
    app.get("/api/mowers/:id", authenticateUser, mowerController.getMower);
    app.put("/api/mowers/:id", authenticateUser, mowerController.updateMower);
    app.delete("/api/mowers/:id", authenticateUser, mowerController.deleteMower);
    // Mower actions
    app.post("/api/mowers/:id/start", authenticateUser, mowerController.startMower);
    app.post("/api/mowers/:id/stop", authenticateUser, mowerController.stopMower);
    app.post("/api/mowers/:id/home", authenticateUser, mowerController.sendMowerHome);
    // Mower notes
    app.get("/api/mowers/:id/notes", authenticateUser, mowerController.getNotes);
    app.post("/api/mowers/:id/notes", authenticateUser, mowerController.addNote);
    app.put("/api/notes/:noteId", authenticateUser, mowerController.updateNote);
    app.delete("/api/notes/:noteId", authenticateUser, mowerController.deleteNote);
    // Mower documents
    app.get("/api/mowers/:id/documents", authenticateUser, mowerController.getDocuments);
    app.post("/api/mowers/:id/documents", authenticateUser, mowerController.uploadDocument);
    app.delete("/api/documents/:documentId", authenticateUser, mowerController.deleteDocument);
    // Mower photos
    app.get("/api/mowers/:id/photos", authenticateUser, mowerController.getPhotos);
    app.post("/api/mowers/:id/photos", authenticateUser, mowerController.uploadPhoto);
    app.delete("/api/photos/:photoId", authenticateUser, mowerController.deletePhoto);
    // Automower API integration
    // Keep the original routes
    app.get("/api/automower/mowers", authenticateUser, automowerController.getAllMowers);
    app.get("/api/automower/mowers/:mowerId", authenticateUser, automowerController.getMowerDetails);
    app.post("/api/automower/mowers/:mowerId/start", authenticateUser, automowerController.startMower);
    app.post("/api/automower/mowers/:mowerId/stop", authenticateUser, automowerController.stopMower);
    app.post("/api/automower/mowers/:mowerId/pause", authenticateUser, automowerController.pauseMower);
    app.post("/api/automower/mowers/:mowerId/park", authenticateUser, automowerController.parkMower);
    app.post("/api/automower/mowers/:mowerId/home", authenticateUser, automowerController.sendMowerHome);
    app.post("/api/automower/mowers/:mowerId/resume", authenticateUser, automowerController.resumeSchedule);
    app.get("/api/automower/mowers/:mowerId/settings", authenticateUser, automowerController.getMowerSettings);
    app.put("/api/automower/mowers/:mowerId/settings", authenticateUser, automowerController.updateMowerSettings);
    app.get("/api/automower/mowers/:mowerId/calendar", authenticateUser, automowerController.getMowerCalendar);
    app.put("/api/automower/mowers/:mowerId/calendar", authenticateUser, automowerController.updateMowerCalendar);
    // Route has been removed and consolidated with /api/automower/mowers endpoint
    const httpServer = createServer(app);
    return httpServer;
}
//# sourceMappingURL=routes.js.map