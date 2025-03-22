import express from 'express';
import path from 'path';
import fs from 'fs';
import { registerRoutes } from './routes';
// Initialize Express app
const app = express();
// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from the client build directory
app.use(express.static(path.join(__dirname, '../client')));
// Catch-all route to serve the client app
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../client/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        console.error('Error: index.html not found at', indexPath);
        res.status(500).send('Server configuration error: index.html not found');
    }
});
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
// Start the server with proper async handling
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        // Register API routes
        const server = await registerRoutes(app);
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
        // Handle shutdown
        process.on('SIGINT', () => {
            console.log('Gracefully shutting down...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=production.js.map