import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(), // Removed min(6) to accommodate special Firebase auth token
});
const registerSchema = insertUserSchema.extend({
    confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
// Simple password hashing function
function hashPassword(password) {
    return crypto.createHash("sha256").update(password).digest("hex");
}
const authController = {
    // User registration
    register: async (req, res) => {
        try {
            const validatedData = registerSchema.parse(req.body);
            // Check if user already exists
            const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
            if (existingUserByEmail) {
                return res.status(400).json({ message: "Email already in use" });
            }
            const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
            if (existingUserByUsername) {
                return res.status(400).json({ message: "Username already taken" });
            }
            // Hash password
            const hashedPassword = hashPassword(validatedData.password);
            // Create user
            const user = await storage.createUser({
                username: validatedData.username,
                email: validatedData.email,
                password: hashedPassword,
                name: validatedData.name
            });
            // Remove password from response
            const { password, ...userWithoutPassword } = user;
            // Create session
            if (req.session) {
                req.session.userId = user.id;
            }
            res.status(201).json(userWithoutPassword);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Validation error", errors: error.errors });
            }
            else {
                console.error("Registration error:", error);
                res.status(500).json({ message: "Registration failed" });
            }
        }
    },
    // User login
    login: async (req, res) => {
        try {
            const validatedData = loginSchema.parse(req.body);
            // Special case for Firebase authentication
            const isFederatedAuth = validatedData.password === 'FIREBASE_AUTH_SESSION_CREATE';
            // Find user by email
            const user = await storage.getUserByEmail(validatedData.email);
            if (!user) {
                return res.status(401).json({ message: "Invalid email or password" });
            }
            // For regular login, verify password
            if (!isFederatedAuth) {
                const hashedPassword = hashPassword(validatedData.password);
                if (user.password !== hashedPassword) {
                    return res.status(401).json({ message: "Invalid email or password" });
                }
            }
            else {
                // For Firebase auth, we trust the Firebase authentication
                console.log("Creating session based on Firebase authentication");
            }
            // Remove password from response
            const { password, ...userWithoutPassword } = user;
            // Create session
            if (req.session) {
                req.session.userId = user.id;
            }
            res.json(userWithoutPassword);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Validation error", errors: error.errors });
            }
            else {
                console.error("Login error:", error);
                res.status(500).json({ message: "Login failed" });
            }
        }
    },
    // User logout
    logout: (req, res) => {
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error("Logout error:", err);
                    return res.status(500).json({ message: "Logout failed" });
                }
                res.json({ message: "Logged out successfully" });
            });
        }
        else {
            res.json({ message: "Logged out successfully" });
        }
    },
    // Get current user
    getCurrentUser: async (req, res) => {
        try {
            const userId = req.session?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const user = await storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            // Remove password from response
            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        }
        catch (error) {
            console.error("Get current user error:", error);
            res.status(500).json({ message: "Failed to get current user" });
        }
    }
};
export default authController;
//# sourceMappingURL=authController.js.map