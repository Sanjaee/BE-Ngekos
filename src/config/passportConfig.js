// config/passport.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const prisma = require("../utils/prisma");
const { v4: uuidv4 } = require("uuid");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let existingUser = await prisma.user.findUnique({
          where: { googleId: profile.id },
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
          return done(null, existingUser);
        }

        // Check if user exists with this email
        existingUser = await prisma.user.findUnique({
          where: { email: profile.emails[0].value },
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
              googleId: profile.id,
              profilePic: profile.photos[0]?.value || existingUser.profilePic,
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
          return done(null, updatedUser);
        }

        // Create new user with clean username
        const baseUsername = profile.displayName
          ? profile.displayName
              .replace(/[^a-zA-Z0-9\s]/g, "")
              .replace(/\s+/g, "")
              .slice(0, 20) // Limit to 20 characters
          : profile.emails[0].value
              .split("@")[0]
              .replace(/[^a-zA-Z0-9]/g, "")
              .slice(0, 20);

        const newUser = await prisma.user.create({
          data: {
            googleId: profile.id,
            username: baseUsername,
            email: profile.emails[0].value,
            profilePic: profile.photos[0]?.value || null,
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

        return done(null, newUser);
      } catch (error) {
        console.error("Error in Google Strategy:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.userId);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: userId },
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
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
