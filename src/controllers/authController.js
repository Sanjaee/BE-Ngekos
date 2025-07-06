const prisma = require("../utils/prisma");
const jwt = require("jsonwebtoken");

const authController = {
  // Handle NextAuth Google sign-in
  signinGoogle: async (req, res) => {
    try {
      const { googleId, email, name, image } = req.body;

      if (!googleId || !email) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      // Check if user already exists with this Google ID
      let existingUser = await prisma.user.findUnique({
        where: { googleId: googleId },
        select: {
          userId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          createdAt: true,
          updatedAt: true,
          bookings: {
            select: {
              bookingId: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          reviews: {
            select: {
              reviewId: true,
              rating: true,
              comment: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (existingUser) {
        return res.json({
          success: true,
          user: {
            userId: existingUser.userId,
            googleId: existingUser.googleId,
            username: existingUser.username,
            email: existingUser.email,
            phone: existingUser.phone,
            profilePic: existingUser.profilePic,
            createdAt: existingUser.createdAt,
            updatedAt: existingUser.updatedAt,
            bookings: existingUser.bookings,
            reviews: existingUser.reviews,
          },
        });
      }

      // Check if user exists with this email
      existingUser = await prisma.user.findUnique({
        where: { email: email },
        select: {
          userId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          createdAt: true,
          updatedAt: true,
          bookings: {
            select: {
              bookingId: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          reviews: {
            select: {
              reviewId: true,
              rating: true,
              comment: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (existingUser) {
        // Update existing user with Google ID
        const updatedUser = await prisma.user.update({
          where: { userId: existingUser.userId },
          data: {
            googleId: googleId,
            profilePic: image || existingUser.profilePic,
          },
          select: {
            userId: true,
            googleId: true,
            username: true,
            email: true,
            phone: true,
            profilePic: true,
            createdAt: true,
            updatedAt: true,
            bookings: {
              select: {
                bookingId: true,
                status: true,
                totalAmount: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
            reviews: {
              select: {
                reviewId: true,
                rating: true,
                comment: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        });

        return res.json({
          success: true,
          user: {
            userId: updatedUser.userId,
            googleId: updatedUser.googleId,
            username: updatedUser.username,
            email: updatedUser.email,
            phone: updatedUser.phone,
            profilePic: updatedUser.profilePic,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
            bookings: updatedUser.bookings,
            reviews: updatedUser.reviews,
          },
        });
      }

      // Create new user with display name as username
      const cleanUsername = name
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "")
        .slice(0, 20); // Limit to 20 characters

      const newUser = await prisma.user.create({
        data: {
          googleId: googleId,
          username: cleanUsername,
          email: email,
          profilePic: image || null,
        },
        select: {
          userId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          createdAt: true,
          updatedAt: true,
          bookings: {
            select: {
              bookingId: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          reviews: {
            select: {
              reviewId: true,
              rating: true,
              comment: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      res.json({
        success: true,
        user: {
          userId: newUser.userId,
          googleId: newUser.googleId,
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone,
          profilePic: newUser.profilePic,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          bookings: newUser.bookings,
          reviews: newUser.reviews,
        },
      });
    } catch (error) {
      console.error("Error in signin-google:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Create JWT session for NextAuth integration
  createSession: async (req, res) => {
    try {
      const { userId, email } = req.body;

      if (!userId || !email) {
        return res.status(400).json({
          success: false,
          error: "UserId and email required",
        });
      }

      // Verify user exists with complete data
      const user = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          email: true,
          username: true,
          phone: true,
          profilePic: true,
          createdAt: true,
          updatedAt: true,
          bookings: {
            select: {
              bookingId: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          reviews: {
            select: {
              reviewId: true,
              rating: true,
              comment: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (!user || user.email !== email) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.userId,
          email: user.email,
          username: user.username,
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      const responseData = {
        success: true,
        token,
        user: {
          userId: user.userId,
          email: user.email,
          username: user.username,
          phone: user.phone,
          profilePic: user.profilePic,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          bookings: user.bookings,
          reviews: user.reviews,
        },
      };

      res.json(responseData);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },

  // Verify JWT token
  verifyToken: async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Token required",
        });
      }

      // Try JWT verification
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        );

        const user = await prisma.user.findUnique({
          where: { userId: decoded.userId },
          select: {
            userId: true,
            googleId: true,
            username: true,
            email: true,
            phone: true,
            profilePic: true,
            createdAt: true,
            updatedAt: true,
            bookings: {
              select: {
                bookingId: true,
                status: true,
                totalAmount: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
            reviews: {
              select: {
                reviewId: true,
                rating: true,
                comment: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            error: "User not found",
            valid: false,
          });
        }

        return res.json({
          success: true,
          user,
          valid: true,
        });
      } catch (jwtError) {
        // If JWT verification fails, try parsing as user object (fallback)
        try {
          const userData = JSON.parse(token);
          if (userData.userId) {
            const user = await prisma.user.findUnique({
              where: { userId: userData.userId },
              select: {
                userId: true,
                googleId: true,
                username: true,
                email: true,
                phone: true,
                profilePic: true,
                createdAt: true,
                updatedAt: true,
                bookings: {
                  select: {
                    bookingId: true,
                    status: true,
                    totalAmount: true,
                    createdAt: true,
                  },
                  orderBy: { createdAt: "desc" },
                  take: 5,
                },
                reviews: {
                  select: {
                    reviewId: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                  },
                  orderBy: { createdAt: "desc" },
                  take: 5,
                },
              },
            });

            if (user) {
              return res.json({
                success: true,
                user,
                valid: true,
              });
            }
          }
        } catch (parseError) {
          // Both JWT and JSON parsing failed
        }
      }

      res.status(401).json({
        success: false,
        error: "Invalid token",
        valid: false,
      });
    } catch (error) {
      console.error("Error verifying token:", error);
      res.status(401).json({
        success: false,
        error: "Invalid token",
        valid: false,
      });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const user = await prisma.user.findUnique({
        where: { userId: req.user.userId },
        select: {
          userId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          createdAt: true,
          updatedAt: true,
          bookings: {
            select: {
              bookingId: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          reviews: {
            select: {
              reviewId: true,
              rating: true,
              comment: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Error getting profile:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },

  // Get user profile by user ID
  getProfileById: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const user = await prisma.user.findUnique({
        where: { userId: userId },
        select: {
          userId: true,
          username: true,
          profilePic: true,
          createdAt: true,
          updatedAt: true,
          bookings: {
            select: {
              bookingId: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          reviews: {
            select: {
              reviewId: true,
              rating: true,
              comment: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Error getting profile by ID:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const { username, phone, profilePic } = req.body;

      if (username && username !== req.user.username) {
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: "Username already taken",
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { userId: req.user.userId },
        data: {
          ...(username && { username }),
          ...(phone !== undefined && { phone }),
          ...(profilePic && { profilePic }),
        },
        select: {
          userId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          createdAt: true,
          updatedAt: true,
          bookings: {
            select: {
              bookingId: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          reviews: {
            select: {
              reviewId: true,
              rating: true,
              comment: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      res.json({
        success: true,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },

  // Logout
  logout: (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: "Error logging out",
        });
      }
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    });
  },
};

module.exports = authController;
