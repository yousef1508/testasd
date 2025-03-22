import { z } from "zod";
import { storage } from "../storage";
import { insertNoteSchema, insertDocumentSchema, insertPhotoSchema } from "@shared/schema";
import { automowerService } from "../services/automowerService";
// Helper function to safely get mower by ID
async function getMowerByIdSafely(mowerId, userId) {
    if (typeof mowerId !== 'number') {
        return { error: "Invalid mower ID", status: 400 };
    }
    const mower = await storage.getMowerById(mowerId);
    if (!mower) {
        return { error: "Mower not found", status: 404 };
    }
    if (userId !== undefined && mower.userId !== userId) {
        return { error: "Forbidden", status: 403 };
    }
    return { mower };
}
// Helper function to handle errors from getMowerByIdSafely
function handleSafetyError(res, result) {
    // Always ensure status is a valid number
    const statusCode = typeof result.status === 'number' ? result.status : 400;
    return res.status(statusCode).json({ message: result.error });
}
// Create a new insertMowerSchema with userId omitted as it will be taken from the session
const createMowerSchema = z.object({
    name: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    coverageArea: z.number().nullable().optional(),
    installationDate: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    batteryLevel: z.number().nullable().optional(),
    lastActivity: z.string().nullable().optional(),
});
const mowerController = {
    // Get all mowers for the current user
    getMowers: async (req, res) => {
        try {
            const userId = req.session?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const mowers = await storage.getMowers(userId);
            res.json(mowers);
        }
        catch (error) {
            console.error("Get mowers error:", error);
            res.status(500).json({ message: "Failed to get mowers" });
        }
    },
    // Get a single mower by ID
    getMower: async (req, res) => {
        try {
            const userId = req.session?.userId;
            const mowerId = parseInt(req.params.id);
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            const mower = await storage.getMowerById(mowerId);
            if (!mower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            if (mower.userId !== userId) {
                return res.status(403).json({ message: "Forbidden" });
            }
            res.json(mower);
        }
        catch (error) {
            console.error("Get mower error:", error);
            res.status(500).json({ message: "Failed to get mower" });
        }
    },
    // Create a new mower
    createMower: async (req, res) => {
        try {
            const userId = req.session?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const validatedData = createMowerSchema.parse(req.body);
            // Check if a mower with this serial number already exists (if provided)
            if (validatedData.serialNumber) {
                const existingMower = await storage.getMowerBySerialNumber(validatedData.serialNumber);
                if (existingMower) {
                    return res.status(400).json({ message: "A mower with this serial number already exists" });
                }
            }
            // Create the mower
            const mower = await storage.createMower({
                ...validatedData,
                userId
            });
            res.status(201).json(mower);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Validation error", errors: error.errors });
            }
            else {
                console.error("Create mower error:", error);
                res.status(500).json({ message: "Failed to create mower" });
            }
        }
    },
    // Update a mower
    updateMower: async (req, res) => {
        try {
            const userId = req.session?.userId;
            const mowerId = parseInt(req.params.id);
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            const mower = await storage.getMowerById(mowerId);
            if (!mower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            if (mower.userId !== userId) {
                return res.status(403).json({ message: "Forbidden" });
            }
            // Validate input data
            const validatedData = createMowerSchema.partial().parse(req.body);
            // Update the mower
            const updatedMower = await storage.updateMower(mowerId, validatedData);
            res.json(updatedMower);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Validation error", errors: error.errors });
            }
            else {
                console.error("Update mower error:", error);
                res.status(500).json({ message: "Failed to update mower" });
            }
        }
    },
    // Delete a mower
    deleteMower: async (req, res) => {
        try {
            const userId = req.session?.userId;
            const mowerId = parseInt(req.params.id);
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            const mower = await storage.getMowerById(mowerId);
            if (!mower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            if (mower.userId !== userId) {
                return res.status(403).json({ message: "Forbidden" });
            }
            // Delete the mower
            await storage.deleteMower(mowerId);
            res.json({ message: "Mower deleted successfully" });
        }
        catch (error) {
            console.error("Delete mower error:", error);
            res.status(500).json({ message: "Failed to delete mower" });
        }
    },
    // Start a mower
    startMower: async (req, res) => {
        try {
            const userId = req.session?.userId;
            const mowerId = parseInt(req.params.id);
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            const mower = await storage.getMowerById(mowerId);
            if (!mower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            if (mower.userId !== userId) {
                return res.status(403).json({ message: "Forbidden" });
            }
            if (!mower.serialNumber) {
                return res.status(400).json({ message: "Mower has no serial number" });
            }
            // Call automower service
            const result = await automowerService.startMower(mower.serialNumber);
            if (result.success) {
                // Update mower status
                const updatedMower = await storage.updateMower(mowerId, {
                    status: "active",
                    lastActivity: `Started at ${new Date().toISOString()}`
                });
                res.json(updatedMower);
            }
            else {
                res.status(500).json({ message: result.message });
            }
        }
        catch (error) {
            console.error("Start mower error:", error);
            res.status(500).json({ message: "Failed to start mower" });
        }
    },
    // Stop a mower
    stopMower: async (req, res) => {
        try {
            const userId = req.session?.userId;
            const mowerId = parseInt(req.params.id);
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            const mower = await storage.getMowerById(mowerId);
            if (!mower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            if (mower.userId !== userId) {
                return res.status(403).json({ message: "Forbidden" });
            }
            if (!mower.serialNumber) {
                return res.status(400).json({ message: "Mower has no serial number" });
            }
            // Call automower service
            const result = await automowerService.stopMower(mower.serialNumber);
            if (result.success) {
                // Update mower status
                const updatedMower = await storage.updateMower(mowerId, {
                    status: "inactive",
                    lastActivity: `Stopped at ${new Date().toISOString()}`
                });
                res.json(updatedMower);
            }
            else {
                res.status(500).json({ message: result.message });
            }
        }
        catch (error) {
            console.error("Stop mower error:", error);
            res.status(500).json({ message: "Failed to stop mower" });
        }
    },
    // Send mower to home
    sendMowerHome: async (req, res) => {
        try {
            const userId = req.session?.userId;
            const mowerId = parseInt(req.params.id);
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            const mower = await storage.getMowerById(mowerId);
            if (!mower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            if (mower.userId !== userId) {
                return res.status(403).json({ message: "Forbidden" });
            }
            if (!mower.serialNumber) {
                return res.status(400).json({ message: "Mower has no serial number" });
            }
            // Call automower service
            const result = await automowerService.sendMowerHome(mower.serialNumber);
            if (result.success) {
                // Update mower status
                const updatedMower = await storage.updateMower(mowerId, {
                    status: "returning",
                    lastActivity: `Returning home at ${new Date().toISOString()}`
                });
                res.json(updatedMower);
            }
            else {
                res.status(500).json({ message: result.message });
            }
        }
        catch (error) {
            console.error("Send mower home error:", error);
            res.status(500).json({ message: "Failed to send mower home" });
        }
    },
    // Get notes for a mower
    getNotes: async (req, res) => {
        try {
            const mowerId = parseInt(req.params.id);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            // If not using API key, check for user session
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // For session auth, verify mower belongs to user (skip for API key)
                const mower = await storage.getMowerById(mowerId);
                if (!mower) {
                    return res.status(404).json({ message: "Mower not found" });
                }
                if (mower.userId !== userId) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            const notes = await storage.getNotesByMowerId(mowerId);
            res.json(notes);
        }
        catch (error) {
            console.error("Get notes error:", error);
            res.status(500).json({ message: "Failed to get notes" });
        }
    },
    // Add a note to a mower
    addNote: async (req, res) => {
        try {
            const mowerId = parseInt(req.params.id);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            // If not using API key, check for user session
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // For session auth, verify mower belongs to user (skip for API key)
                const mower = await storage.getMowerById(mowerId);
                if (!mower) {
                    return res.status(404).json({ message: "Mower not found" });
                }
                if (mower.userId !== userId) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            // For API key auth, use default user ID 1 (admin) if mower doesn't exist
            let existingMower = await storage.getMowerById(mowerId);
            if (!existingMower && hasApiKey) {
                // Create a placeholder mower record for API-connected mowers
                existingMower = await storage.createMower({
                    name: `AutoMower ${mowerId}`,
                    model: "API-Connected Mower",
                    serialNumber: mowerId.toString(),
                    status: "unknown",
                    batteryLevel: 0,
                    lastActivity: new Date().toISOString(),
                    userId: 1, // Default admin user
                    installationDate: new Date().toISOString(),
                    coverageArea: 0
                });
                console.log(`Created placeholder mower for API-connected mower ${mowerId}`);
            }
            else if (!existingMower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            // Validate input data
            const validatedData = insertNoteSchema.parse({
                ...req.body,
                mowerId
            });
            // Create the note
            const note = await storage.createNote(validatedData);
            res.status(201).json(note);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Validation error", errors: error.errors });
            }
            else {
                console.error("Add note error:", error);
                res.status(500).json({ message: "Failed to add note" });
            }
        }
    },
    // Update a note
    updateNote: async (req, res) => {
        try {
            const noteId = parseInt(req.params.noteId);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            if (isNaN(noteId)) {
                return res.status(400).json({ message: "Invalid note ID" });
            }
            // Get the note
            const note = await storage.getNoteById(noteId);
            if (!note) {
                return res.status(404).json({ message: "Note not found" });
            }
            // For API auth, skip ownership check
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // Get the mower to verify ownership using our helper
                if (typeof note.mowerId !== 'number') {
                    return res.status(400).json({ message: "Note has no valid mower ID" });
                }
                const result = await getMowerByIdSafely(note.mowerId, userId);
                if ('error' in result) {
                    return res.status(result.status).json({ message: result.error });
                }
            }
            // Validate input data
            const validatedData = insertNoteSchema.partial().parse({
                ...req.body,
                mowerId: note.mowerId
            });
            // Update the note
            const updatedNote = await storage.updateNote(noteId, validatedData);
            res.json(updatedNote);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Validation error", errors: error.errors });
            }
            else {
                console.error("Update note error:", error);
                res.status(500).json({ message: "Failed to update note" });
            }
        }
    },
    // Delete a note
    deleteNote: async (req, res) => {
        try {
            const noteId = parseInt(req.params.noteId);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            if (isNaN(noteId)) {
                return res.status(400).json({ message: "Invalid note ID" });
            }
            // Get the note
            const note = await storage.getNoteById(noteId);
            if (!note) {
                return res.status(404).json({ message: "Note not found" });
            }
            // For API auth, skip ownership check
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // Get the mower to verify ownership
                if (typeof note.mowerId !== 'number') {
                    return res.status(400).json({ message: "Note has no valid mower ID" });
                }
                const result = await getMowerByIdSafely(note.mowerId, userId);
                if ('error' in result) {
                    return res.status(result.status).json({ message: result.error });
                }
            }
            // Delete the note
            await storage.deleteNote(noteId);
            res.json({ message: "Note deleted successfully" });
        }
        catch (error) {
            console.error("Delete note error:", error);
            res.status(500).json({ message: "Failed to delete note" });
        }
    },
    // Get documents for a mower
    getDocuments: async (req, res) => {
        try {
            const mowerId = parseInt(req.params.id);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            // If not using API key, check for user session
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // For session auth, verify mower belongs to user (skip for API key)
                const mower = await storage.getMowerById(mowerId);
                if (!mower) {
                    return res.status(404).json({ message: "Mower not found" });
                }
                if (mower.userId !== userId) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            // For API key auth, if mower doesn't exist yet, return empty array
            // This is fine since no documents would exist for a new mower
            const mower = await storage.getMowerById(mowerId);
            if (!mower && hasApiKey) {
                return res.json([]);
            }
            else if (!mower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            const documents = await storage.getDocumentsByMowerId(mowerId);
            res.json(documents);
        }
        catch (error) {
            console.error("Get documents error:", error);
            res.status(500).json({ message: "Failed to get documents" });
        }
    },
    // Upload a document for a mower
    uploadDocument: async (req, res) => {
        try {
            const mowerId = parseInt(req.params.id);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            // If not using API key, check for user session
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // For session auth, verify mower belongs to user (skip for API key)
                const mower = await storage.getMowerById(mowerId);
                if (!mower) {
                    return res.status(404).json({ message: "Mower not found" });
                }
                if (mower.userId !== userId) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            // For API key auth, use default user ID 1 (admin) if mower doesn't exist
            let existingMower = await storage.getMowerById(mowerId);
            if (!existingMower && hasApiKey) {
                // Create a placeholder mower record for API-connected mowers
                existingMower = await storage.createMower({
                    name: `AutoMower ${mowerId}`,
                    model: "API-Connected Mower",
                    serialNumber: mowerId.toString(),
                    status: "unknown",
                    batteryLevel: 0,
                    lastActivity: new Date().toISOString(),
                    userId: 1, // Default admin user
                    installationDate: new Date().toISOString(),
                    coverageArea: 0
                });
                console.log(`Created placeholder mower for API-connected mower ${mowerId}`);
            }
            else if (!existingMower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            // Multer middleware would typically handle file upload
            // Here we just validate the metadata
            const validatedData = insertDocumentSchema.parse({
                ...req.body,
                mowerId
            });
            // Create the document
            const document = await storage.createDocument(validatedData);
            res.status(201).json(document);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Validation error", errors: error.errors });
            }
            else {
                console.error("Upload document error:", error);
                res.status(500).json({ message: "Failed to upload document" });
            }
        }
    },
    // Delete a document
    deleteDocument: async (req, res) => {
        try {
            const documentId = parseInt(req.params.documentId);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            if (isNaN(documentId)) {
                return res.status(400).json({ message: "Invalid document ID" });
            }
            // Get the document
            const document = await storage.getDocumentById(documentId);
            if (!document) {
                return res.status(404).json({ message: "Document not found" });
            }
            // For API auth, skip ownership check
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // Get the mower to verify ownership
                if (typeof document.mowerId !== 'number') {
                    return res.status(400).json({ message: "Document has no valid mower ID" });
                }
                const result = await getMowerByIdSafely(document.mowerId, userId);
                if ('error' in result) {
                    return res.status(result.status).json({ message: result.error });
                }
            }
            // Delete the document
            await storage.deleteDocument(documentId);
            res.json({ message: "Document deleted successfully" });
        }
        catch (error) {
            console.error("Delete document error:", error);
            res.status(500).json({ message: "Failed to delete document" });
        }
    },
    // Get photos for a mower
    getPhotos: async (req, res) => {
        try {
            const mowerId = parseInt(req.params.id);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            // If not using API key, check for user session
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // For session auth, verify mower belongs to user (skip for API key)
                const mower = await storage.getMowerById(mowerId);
                if (!mower) {
                    return res.status(404).json({ message: "Mower not found" });
                }
                if (mower.userId !== userId) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            // For API key auth, if mower doesn't exist yet, return empty array
            // This is fine since no photos would exist for a new mower
            const mower = await storage.getMowerById(mowerId);
            if (!mower && hasApiKey) {
                return res.json([]);
            }
            else if (!mower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            const photos = await storage.getPhotosByMowerId(mowerId);
            res.json(photos);
        }
        catch (error) {
            console.error("Get photos error:", error);
            res.status(500).json({ message: "Failed to get photos" });
        }
    },
    // Upload a photo for a mower
    uploadPhoto: async (req, res) => {
        try {
            const mowerId = parseInt(req.params.id);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            // If not using API key, check for user session
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // For session auth, verify mower belongs to user (skip for API key)
                const mower = await storage.getMowerById(mowerId);
                if (!mower) {
                    return res.status(404).json({ message: "Mower not found" });
                }
                if (mower.userId !== userId) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            }
            if (isNaN(mowerId)) {
                return res.status(400).json({ message: "Invalid mower ID" });
            }
            // For API key auth, use default user ID 1 (admin) if mower doesn't exist
            let existingMower = await storage.getMowerById(mowerId);
            if (!existingMower && hasApiKey) {
                // Create a placeholder mower record for API-connected mowers
                existingMower = await storage.createMower({
                    name: `AutoMower ${mowerId}`,
                    model: "API-Connected Mower",
                    serialNumber: mowerId.toString(),
                    status: "unknown",
                    batteryLevel: 0,
                    lastActivity: new Date().toISOString(),
                    userId: 1, // Default admin user
                    installationDate: new Date().toISOString(),
                    coverageArea: 0
                });
                console.log(`Created placeholder mower for API-connected mower ${mowerId}`);
            }
            else if (!existingMower) {
                return res.status(404).json({ message: "Mower not found" });
            }
            // Multer middleware would typically handle file upload
            // Here we just validate the metadata
            const validatedData = insertPhotoSchema.parse({
                ...req.body,
                mowerId
            });
            // Create the photo
            const photo = await storage.createPhoto(validatedData);
            res.status(201).json(photo);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Validation error", errors: error.errors });
            }
            else {
                console.error("Upload photo error:", error);
                res.status(500).json({ message: "Failed to upload photo" });
            }
        }
    },
    // Delete a photo
    deletePhoto: async (req, res) => {
        try {
            const photoId = parseInt(req.params.photoId);
            // Check for API key authentication - this is set by our middleware if API key is present
            const hasApiKey = req.headers['x-api-key'] || req.headers['authorization']?.startsWith('Bearer ');
            if (isNaN(photoId)) {
                return res.status(400).json({ message: "Invalid photo ID" });
            }
            // Get the photo
            const photo = await storage.getPhotoById(photoId);
            if (!photo) {
                return res.status(404).json({ message: "Photo not found" });
            }
            // For API auth, skip ownership check
            if (!hasApiKey) {
                const userId = req.session?.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                // Get the mower to verify ownership
                if (typeof photo.mowerId !== 'number') {
                    return res.status(400).json({ message: "Photo has no valid mower ID" });
                }
                const result = await getMowerByIdSafely(photo.mowerId, userId);
                if ('error' in result) {
                    return res.status(result.status).json({ message: result.error });
                }
            }
            // Delete the photo
            await storage.deletePhoto(photoId);
            res.json({ message: "Photo deleted successfully" });
        }
        catch (error) {
            console.error("Delete photo error:", error);
            res.status(500).json({ message: "Failed to delete photo" });
        }
    }
};
export default mowerController;
//# sourceMappingURL=mowerController.js.map