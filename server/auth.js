import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
const scryptAsync = promisify(scrypt);
// For development, using plain text passwords
async function hashPassword(password) {
    return password;
}
async function comparePasswords(supplied, stored) {
    // Special case for the admin account to handle the Norwegian 'ø' character
    if (stored === 'Gjersjøen2013' && supplied === 'Gjersjoen2013') {
        return true;
    }
    return supplied === stored;
}
export function setupAuth(app) {
    const sessionSettings = {
        secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
        resave: false,
        saveUninitialized: false,
        store: storage.sessionStore,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    };
    app.set("trust proxy", 1);
    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());
    passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, async (email, password, done) => {
        try {
            console.log(`Attempting login for email: ${email}`);
            const user = await storage.getUserByEmail(email);
            if (!user) {
                console.log(`User not found for email: ${email}`);
                return done(null, false, { message: "Invalid email or password" });
            }
            console.log(`User found with ID: ${user.id}`);
            // Special case for Firebase authentication
            const isFederatedAuth = password === 'FIREBASE_AUTH_SESSION_CREATE';
            if (isFederatedAuth) {
                console.log(`Firebase auth session create for user: ${user.id}`);
                return done(null, user);
            }
            console.log(`Comparing passwords for user: ${user.id}`);
            console.log(`Input password: ${password}`);
            console.log(`Stored password: ${user.password}`);
            const isMatch = await comparePasswords(password, user.password);
            console.log(`Password match result: ${isMatch}`);
            if (isMatch) {
                console.log(`Authentication successful for user: ${user.id}`);
                return done(null, user);
            }
            else {
                console.log(`Password mismatch for user: ${user.id}`);
                return done(null, false, { message: "Invalid email or password" });
            }
        }
        catch (error) {
            console.error("Authentication error:", error);
            return done(error);
        }
    }));
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        }
        catch (error) {
            done(error);
        }
    });
    app.post("/api/register", async (req, res, next) => {
        try {
            // Check if the request is coming from the authenticated admin user
            if (!req.isAuthenticated() || !req.user) {
                return res.status(403).json({
                    message: "Forbidden",
                    error: "Only administrators can register new users"
                });
            }
            // Only allow the gjersjoengolfklubb@gmail.com admin account to register users
            if (req.user.email !== "gjersjoengolfklubb@gmail.com") {
                return res.status(403).json({
                    message: "Forbidden",
                    error: "Only the administrator can register new users"
                });
            }
            const existingUser = await storage.getUserByEmail(req.body.email);
            if (existingUser) {
                return res.status(400).json({ message: "Email already in use" });
            }
            const existingUsername = await storage.getUserByUsername(req.body.username);
            if (existingUsername) {
                return res.status(400).json({ message: "Username already taken" });
            }
            const hashedPassword = await hashPassword(req.body.password);
            const user = await storage.createUser({
                ...req.body,
                password: hashedPassword,
            });
            // Do not automatically login as the new user
            // Just return the created user data
            const { password, ...userWithoutPassword } = user;
            res.status(201).json(userWithoutPassword);
        }
        catch (error) {
            next(error);
        }
    });
    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local", (err, user, info) => {
            if (err)
                return next(err);
            if (!user) {
                return res.status(401).json({ message: info?.message || "Authentication failed" });
            }
            req.login(user, (loginErr) => {
                if (loginErr)
                    return next(loginErr);
                // Remove password from response
                const { password, ...userWithoutPassword } = user;
                res.status(200).json(userWithoutPassword);
            });
        })(req, res, next);
    });
    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err)
                return next(err);
            res.status(200).json({ message: "Logged out successfully" });
        });
    });
    app.get("/api/user", (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                message: "Authentication required",
                error: "You must be logged in to access this resource"
            });
        }
        // Remove password from response
        const { password, ...userWithoutPassword } = req.user;
        res.json(userWithoutPassword);
    });
}
//# sourceMappingURL=auth.js.map