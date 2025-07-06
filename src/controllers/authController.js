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
      const { userId, email, userType = "user" } = req.body;

      if (!userId || !email) {
        return res.status(400).json({
          success: false,
          error: "UserId and email required",
        });
      }

      if (userType === "partner") {
        // Handle partner session
        const partner = await prisma.partner.findUnique({
          where: { partnerId: userId },
          select: {
            partnerId: true,
            email: true,
            username: true,
            phone: true,
            profilePic: true,
            businessName: true,
            isVerified: true,
            subscriptionStatus: true,
            paidAmount: true,
            maxRooms: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!partner || partner.email !== email) {
          return res.status(404).json({
            success: false,
            error: "Partner not found",
          });
        }

        // Generate JWT token for partner
        const token = jwt.sign(
          {
            partnerId: partner.partnerId,
            email: partner.email,
            username: partner.username,
            userType: "partner",
          },
          process.env.JWT_SECRET || "your-secret-key",
          { expiresIn: "7d" }
        );

        const responseData = {
          success: true,
          token,
          partner: {
            partnerId: partner.partnerId,
            email: partner.email,
            username: partner.username,
            phone: partner.phone,
            profilePic: partner.profilePic,
            businessName: partner.businessName,
            isVerified: partner.isVerified,
            subscriptionStatus: partner.subscriptionStatus,
            paidAmount: partner.paidAmount,
            maxRooms: partner.maxRooms,
            createdAt: partner.createdAt,
            updatedAt: partner.updatedAt,
          },
        };

        return res.json(responseData);
      } else {
        // Handle user session (existing logic)
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

        // Generate JWT token for user
        const token = jwt.sign(
          {
            userId: user.userId,
            email: user.email,
            username: user.username,
            userType: "user",
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

        return res.json(responseData);
      }
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

        if (decoded.userType === "partner") {
          // Handle partner token verification
          const partner = await prisma.partner.findUnique({
            where: { partnerId: decoded.partnerId },
            select: {
              partnerId: true,
              googleId: true,
              username: true,
              email: true,
              phone: true,
              profilePic: true,
              businessName: true,
              isVerified: true,
              subscriptionStatus: true,
              paidAmount: true,
              maxRooms: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          if (!partner) {
            return res.status(404).json({
              success: false,
              error: "Partner not found",
              valid: false,
            });
          }

          return res.json({
            success: true,
            partner,
            valid: true,
          });
        } else {
          // Handle user token verification (existing logic)
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
        }
      } catch (jwtError) {
        // If JWT verification fails, try parsing as user/partner object (fallback)
        try {
          const userData = JSON.parse(token);
          if (userData.partnerId) {
            // Handle partner fallback
            const partner = await prisma.partner.findUnique({
              where: { partnerId: userData.partnerId },
              select: {
                partnerId: true,
                googleId: true,
                username: true,
                email: true,
                phone: true,
                profilePic: true,
                businessName: true,
                isVerified: true,
                subscriptionStatus: true,
                paidAmount: true,
                maxRooms: true,
                createdAt: true,
                updatedAt: true,
              },
            });

            if (!partner) {
              return res.status(404).json({
                success: false,
                error: "Partner not found",
                valid: false,
              });
            }

            return res.json({
              success: true,
              partner,
              valid: true,
            });
          } else if (userData.userId) {
            // Handle user fallback (existing logic)
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

  // Handle NextAuth Google sign-in for Partners
  signinGooglePartner: async (req, res) => {
    try {
      const { googleId, email, name, image } = req.body;

      if (!googleId || !email) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      // Check if partner already exists with this Google ID
      let existingPartner = await prisma.partner.findUnique({
        where: { googleId: googleId },
        select: {
          partnerId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          businessName: true,
          isVerified: true,
          subscriptionStatus: true,
          paidAmount: true,
          maxRooms: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (existingPartner) {
        return res.json({
          success: true,
          partner: {
            partnerId: existingPartner.partnerId,
            googleId: existingPartner.googleId,
            username: existingPartner.username,
            email: existingPartner.email,
            phone: existingPartner.phone,
            profilePic: existingPartner.profilePic,
            businessName: existingPartner.businessName,
            isVerified: existingPartner.isVerified,
            subscriptionStatus: existingPartner.subscriptionStatus,
            paidAmount: existingPartner.paidAmount,
            maxRooms: existingPartner.maxRooms,
            createdAt: existingPartner.createdAt,
            updatedAt: existingPartner.updatedAt,
          },
        });
      }

      // Check if partner exists with this email
      existingPartner = await prisma.partner.findUnique({
        where: { email: email },
        select: {
          partnerId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          businessName: true,
          isVerified: true,
          subscriptionStatus: true,
          paidAmount: true,
          maxRooms: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (existingPartner) {
        // Update existing partner with Google ID
        const updatedPartner = await prisma.partner.update({
          where: { partnerId: existingPartner.partnerId },
          data: {
            googleId: googleId,
            profilePic: image || existingPartner.profilePic,
          },
          select: {
            partnerId: true,
            googleId: true,
            username: true,
            email: true,
            phone: true,
            profilePic: true,
            businessName: true,
            isVerified: true,
            subscriptionStatus: true,
            paidAmount: true,
            maxRooms: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return res.json({
          success: true,
          partner: {
            partnerId: updatedPartner.partnerId,
            googleId: updatedPartner.googleId,
            username: updatedPartner.username,
            email: updatedPartner.email,
            phone: updatedPartner.phone,
            profilePic: updatedPartner.profilePic,
            businessName: updatedPartner.businessName,
            isVerified: updatedPartner.isVerified,
            subscriptionStatus: updatedPartner.subscriptionStatus,
            paidAmount: updatedPartner.paidAmount,
            maxRooms: updatedPartner.maxRooms,
            createdAt: updatedPartner.createdAt,
            updatedAt: updatedPartner.updatedAt,
          },
        });
      }

      // Create new partner with display name as username
      const cleanUsername = name
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "")
        .slice(0, 20); // Limit to 20 characters

      const newPartner = await prisma.partner.create({
        data: {
          googleId: googleId,
          username: cleanUsername,
          email: email,
          profilePic: image || null,
          phone: "", // Will be filled in registration form
          subscriptionStatus: "active", // Set to active as requested
        },
        select: {
          partnerId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          businessName: true,
          isVerified: true,
          subscriptionStatus: true,
          paidAmount: true,
          maxRooms: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        partner: {
          partnerId: newPartner.partnerId,
          googleId: newPartner.googleId,
          username: newPartner.username,
          email: newPartner.email,
          phone: newPartner.phone,
          profilePic: newPartner.profilePic,
          businessName: newPartner.businessName,
          isVerified: newPartner.isVerified,
          subscriptionStatus: newPartner.subscriptionStatus,
          paidAmount: newPartner.paidAmount,
          maxRooms: newPartner.maxRooms,
          createdAt: newPartner.createdAt,
          updatedAt: newPartner.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error in signin-google-partner:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Partner registration (update partner profile after Google sign-in)
  registerPartner: async (req, res) => {
    try {
      const { partnerId, username, phone, businessName } = req.body;

      if (!partnerId || !username || !phone) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      // Check if username is already taken
      const existingPartner = await prisma.partner.findFirst({
        where: {
          username: username,
          partnerId: { not: partnerId },
        },
      });

      if (existingPartner) {
        return res.status(400).json({
          success: false,
          error: "Username already taken",
        });
      }

      // Update partner profile
      const updatedPartner = await prisma.partner.update({
        where: { partnerId: partnerId },
        data: {
          username: username,
          phone: phone,
          businessName: businessName || null,
        },
        select: {
          partnerId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          businessName: true,
          isVerified: true,
          subscriptionStatus: true,
          paidAmount: true,
          maxRooms: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        partner: {
          partnerId: updatedPartner.partnerId,
          googleId: updatedPartner.googleId,
          username: updatedPartner.username,
          email: updatedPartner.email,
          phone: updatedPartner.phone,
          profilePic: updatedPartner.profilePic,
          businessName: updatedPartner.businessName,
          isVerified: updatedPartner.isVerified,
          subscriptionStatus: updatedPartner.subscriptionStatus,
          paidAmount: updatedPartner.paidAmount,
          maxRooms: updatedPartner.maxRooms,
          createdAt: updatedPartner.createdAt,
          updatedAt: updatedPartner.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error in register-partner:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Update partner payment (simulate payment processing)
  updatePartnerPayment: async (req, res) => {
    try {
      const { partnerId, amount, roomsAllowed } = req.body;

      if (!partnerId || !amount || !roomsAllowed) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      // Update partner payment and room limits
      const updatedPartner = await prisma.partner.update({
        where: { partnerId: partnerId },
        data: {
          paidAmount: {
            increment: amount,
          },
          maxRooms: {
            increment: roomsAllowed,
          },
          subscriptionStatus: "active",
        },
        select: {
          partnerId: true,
          googleId: true,
          username: true,
          email: true,
          phone: true,
          profilePic: true,
          businessName: true,
          isVerified: true,
          subscriptionStatus: true,
          paidAmount: true,
          maxRooms: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Create payment record
      await prisma.partnerPayment.create({
        data: {
          partnerId: partnerId,
          amount: amount,
          roomsAllowed: roomsAllowed,
          method: "simulated_payment",
          status: "success",
          transactionId: `TXN_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      res.json({
        success: true,
        partner: {
          partnerId: updatedPartner.partnerId,
          googleId: updatedPartner.googleId,
          username: updatedPartner.username,
          email: updatedPartner.email,
          phone: updatedPartner.phone,
          profilePic: updatedPartner.profilePic,
          businessName: updatedPartner.businessName,
          isVerified: updatedPartner.isVerified,
          subscriptionStatus: updatedPartner.subscriptionStatus,
          paidAmount: updatedPartner.paidAmount,
          maxRooms: updatedPartner.maxRooms,
          createdAt: updatedPartner.createdAt,
          updatedAt: updatedPartner.updatedAt,
        },
        message: "Payment processed successfully",
      });
    } catch (error) {
      console.error("Error in update-partner-payment:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },
};

module.exports = authController;
