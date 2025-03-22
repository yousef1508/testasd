import { log } from "../vite";
// Direct API key authentication for Automower endpoints
export function authenticateAutomowerApi(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    // Check if this is a direct API key access - allow ANY API key for development purposes
    // This mimics a successful authentication for testing purposes without requiring login
    if (apiKey) {
        log(`API key authentication successful for route: ${req.originalUrl}`, "auth");
        return next();
    }
    // Check if this is a bearer token access 
    if (authHeader && authHeader.startsWith('Bearer ')) {
        log(`Bearer token authentication used for route: ${req.originalUrl}`, "auth");
        return next();
    }
    // Fall back to passport session authentication
    if (req.isAuthenticated()) {
        log(`User ${req.user?.id} authenticated for route: ${req.originalUrl}`, "auth");
        return next();
    }
    log(`Authentication failed for route: ${req.originalUrl}`, "auth");
    return res.status(401).json({
        message: "Authentication required",
        error: "You must be logged in to access this resource"
    });
}
// Regular user authentication middleware
export function authenticateUser(req, res, next) {
    // Check if API key or token is provided
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    // Check if the route is for Automower API, regular mower API, or document/photo/note related endpoints
    const isApiAccessiblePath = req.originalUrl.includes('/api/automower/') ||
        req.originalUrl.includes('/api/mowers/') ||
        req.originalUrl.includes('/api/documents/') ||
        req.originalUrl.includes('/api/notes/') ||
        req.originalUrl.includes('/api/photos/');
    if (isApiAccessiblePath) {
        // Check if this is a direct API key access
        if (apiKey) {
            log(`API key authentication successful for route: ${req.originalUrl}`, "auth");
            return next();
        }
        // Check if this is a bearer token access 
        if (authHeader && authHeader.startsWith('Bearer ')) {
            log(`Bearer token authentication used for route: ${req.originalUrl}`, "auth");
            return next();
        }
    }
    // Fall back to passport session authentication
    if (!req.isAuthenticated()) {
        log(`Authentication failed for route: ${req.originalUrl}`, "auth");
        return res.status(401).json({
            message: "Authentication required",
            error: "You must be logged in to access this resource"
        });
    }
    log(`User ${req.user?.id} authenticated for route: ${req.originalUrl}`, "auth");
    next();
}
//# sourceMappingURL=authMiddleware.js.map