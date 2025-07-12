const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    success: false,
    error: "Not authenticated",
  });
};

// ===============================
// NEXTAUTH INTEGRATION ROUTES
// ===============================

// Handle NextAuth Google sign-in
router.post("/signin-google", authController.signinGoogle);

// Handle NextAuth Google sign-in for Partners
router.post("/signin-google-partner", authController.signinGooglePartner);

// Partner registration
router.post("/register-partner", authController.registerPartner);

// Create JWT session for NextAuth integration
router.post("/create-session", authController.createSession);

// Verify JWT token
router.post("/verify-token", authController.verifyToken);

// ===============================
// TRADITIONAL PASSPORT ROUTES
// ===============================

// Google OAuth routes (untuk traditional flow)
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.CLIENT_URL + "/login?error=auth_failed",
  }),
  (req, res) => {
    // Successful authentication, redirect to client
    res.redirect(process.env.CLIENT_URL);
  }
);

// ===============================
// SHARED ROUTES
// ===============================

// Auth status and profile routes
router.get("/profile", isAuthenticated, authController.getProfile);
router.get("/profile/:userId", authController.getProfileById);
router.put("/profile", authMiddleware, authController.updateProfile);

// JWT-based profile endpoint for frontend
router.get("/profile-jwt", authMiddleware, authController.getProfile);

// Logout route
router.post("/logout", authController.logout);

// Check auth status
router.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: {
        userId: req.user.userId,
        username: req.user.username,
        email: req.user.email,
        profilePic: req.user.profilePic,
      },
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
    });
  }
});

module.exports = router;
