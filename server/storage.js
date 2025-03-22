import session from "express-session";
import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);
export class MemStorage {
    constructor() {
        this.users = new Map();
        this.mowers = new Map();
        this.notes = new Map();
        this.documents = new Map();
        this.photos = new Map();
        // Initialize the memory session store
        this.sessionStore = new MemoryStore({
            checkPeriod: 86400000 // prune expired entries every 24h
        });
        this.currentUserId = 1;
        this.currentMowerId = 1;
        this.currentNoteId = 1;
        this.currentDocumentId = 1;
        this.currentPhotoId = 1;
        // Add default admin user
        const defaultAdminId = this.currentUserId++;
        this.users.set(defaultAdminId, {
            id: defaultAdminId,
            username: "gjersjoen_admin",
            email: "jeroen.vrijens@gmail.com",
            password: "Gjersjøen2013", // Plain password for testing
            name: "Gjersjøen Admin",
            createdAt: new Date()
        });
        // Add primary admin user
        const primaryAdminId = this.currentUserId++;
        this.users.set(primaryAdminId, {
            id: primaryAdminId,
            username: "gjersjoen_golf_admin",
            email: "gjersjoengolfklubb@gmail.com",
            password: "Gjersjøen2013", // Plain password for testing
            name: "Gjersjøen Golf Klubb Admin",
            createdAt: new Date()
        });
        // Add sample mower for the admin
        const sampleMowerId = this.currentMowerId++;
        const now = new Date();
        this.mowers.set(sampleMowerId, {
            id: sampleMowerId,
            userId: defaultAdminId,
            name: "Fairway Mower 1",
            model: "Automower 450X",
            serialNumber: "AM450X-123456",
            status: "idle",
            batteryLevel: 85,
            lastActivity: new Date(now.getTime() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            coverageArea: 5000, // 5000 sq. meters
            installationDate: "2023-03-20", // String format as per schema
            createdAt: now
        });
    }
    // User methods
    async getUser(id) {
        return this.users.get(id);
    }
    async getUserByUsername(username) {
        return Array.from(this.users.values()).find((user) => user.username === username);
    }
    async getUserByEmail(email) {
        return Array.from(this.users.values()).find((user) => user.email === email);
    }
    async createUser(insertUser) {
        const id = this.currentUserId++;
        const now = new Date();
        const user = {
            ...insertUser,
            id,
            name: insertUser.name || null,
            createdAt: now
        };
        this.users.set(id, user);
        return user;
    }
    // Mower methods
    async getMowers(userId) {
        return Array.from(this.mowers.values()).filter((mower) => mower.userId === userId);
    }
    async getMowerById(id) {
        return this.mowers.get(id);
    }
    async getMowerBySerialNumber(serialNumber) {
        return Array.from(this.mowers.values()).find((mower) => mower.serialNumber === serialNumber);
    }
    async createMower(mower) {
        const id = this.currentMowerId++;
        const now = new Date();
        const newMower = {
            ...mower,
            id,
            createdAt: now,
            status: mower.status || null,
            coverageArea: mower.coverageArea || null,
            installationDate: mower.installationDate || null,
            batteryLevel: 100, // Default value
            lastActivity: new Date().toISOString() // Default to now
        };
        this.mowers.set(id, newMower);
        return newMower;
    }
    async updateMower(id, data) {
        const mower = this.mowers.get(id);
        if (!mower)
            return undefined;
        const updatedMower = { ...mower, ...data };
        this.mowers.set(id, updatedMower);
        return updatedMower;
    }
    async deleteMower(id) {
        return this.mowers.delete(id);
    }
    // Note methods
    async getNotesByMowerId(mowerId) {
        return Array.from(this.notes.values()).filter((note) => note.mowerId === mowerId);
    }
    async getNoteById(id) {
        return this.notes.get(id);
    }
    async createNote(note) {
        const id = this.currentNoteId++;
        const now = new Date();
        const newNote = {
            ...note,
            id,
            createdAt: now,
            imageUrl: note.imageUrl || null,
            imageCaption: note.imageCaption || null
        };
        this.notes.set(id, newNote);
        return newNote;
    }
    async updateNote(id, data) {
        const note = this.notes.get(id);
        if (!note)
            return undefined;
        const updatedNote = { ...note, ...data };
        this.notes.set(id, updatedNote);
        return updatedNote;
    }
    async deleteNote(id) {
        return this.notes.delete(id);
    }
    // Document methods
    async getDocumentsByMowerId(mowerId) {
        return Array.from(this.documents.values()).filter((doc) => doc.mowerId === mowerId);
    }
    async getDocumentById(id) {
        return this.documents.get(id);
    }
    async createDocument(document) {
        const id = this.currentDocumentId++;
        const now = new Date();
        const newDocument = { ...document, id, uploadDate: now };
        this.documents.set(id, newDocument);
        return newDocument;
    }
    async deleteDocument(id) {
        return this.documents.delete(id);
    }
    // Photo methods
    async getPhotosByMowerId(mowerId) {
        return Array.from(this.photos.values()).filter((photo) => photo.mowerId === mowerId);
    }
    async getPhotoById(id) {
        return this.photos.get(id);
    }
    async createPhoto(photo) {
        const id = this.currentPhotoId++;
        const now = new Date();
        const newPhoto = {
            ...photo,
            id,
            uploadDate: now,
            caption: photo.caption || null
        };
        this.photos.set(id, newPhoto);
        return newPhoto;
    }
    async deletePhoto(id) {
        return this.photos.delete(id);
    }
    // Weather data caching
    async getCachedWeatherData() {
        return this.weatherData;
    }
    async setCachedWeatherData(data) {
        this.weatherData = data;
    }
}
export const storage = new MemStorage();
//# sourceMappingURL=storage.js.map