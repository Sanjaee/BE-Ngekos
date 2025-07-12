const prisma = require("../utils/prisma");

const rentalController = {
  // Get all rentals (public endpoint)
  getAllRentals: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        minPrice,
        maxPrice,
        facilities,
        lat,
        lng,
        radius = 10, // radius in km
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      let where = {
        isActive: true,
        isAvailable: true,
      };

      // Search by name or address
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
        ];
      }

      // Price filter
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }

      // Facilities filter
      if (facilities) {
        const facilityArray = facilities.split(",");
        where.facilities = {
          hasSome: facilityArray,
        };
      }

      // Location filter (if lat/lng provided)
      if (lat && lng) {
        const latFloat = parseFloat(lat);
        const lngFloat = parseFloat(lng);
        const radiusFloat = parseFloat(radius);

        // Calculate bounding box (approximate)
        const latDelta = radiusFloat / 111; // 1 degree lat ≈ 111 km
        const lngDelta =
          radiusFloat / (111 * Math.cos((latFloat * Math.PI) / 180));

        where.lat = {
          gte: latFloat - latDelta,
          lte: latFloat + latDelta,
        };
        where.lng = {
          gte: lngFloat - lngDelta,
          lte: lngFloat + lngDelta,
        };
      }

      const [rentals, total] = await Promise.all([
        prisma.rental.findMany({
          where,
          include: {
            partner: {
              select: {
                businessName: true,
                username: true,
              },
            },
            _count: {
              select: {
                reviews: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.rental.count({ where }),
      ]);

      // Calculate average rating for each rental
      const rentalsWithRating = await Promise.all(
        rentals.map(async (rental) => {
          const reviews = await prisma.review.findMany({
            where: { rentalId: rental.rentalId },
            select: { rating: true },
          });

          const avgRating =
            reviews.length > 0
              ? reviews.reduce((sum, review) => sum + review.rating, 0) /
                reviews.length
              : 0;

          return {
            ...rental,
            rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            reviewCount: rental._count.reviews,
          };
        })
      );

      res.json({
        success: true,
        rentals: rentalsWithRating,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error getting all rentals:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Get rental by ID (public endpoint)
  getRentalById: async (req, res) => {
    try {
      const { rentalId } = req.params;

      if (!rentalId) {
        return res.status(400).json({
          success: false,
          error: "Rental ID is required",
        });
      }

      const rental = await prisma.rental.findUnique({
        where: { rentalId },
        include: {
          partner: {
            select: {
              businessName: true,
              username: true,
              phone: true,
              email: true,
            },
          },
          reviews: {
            include: {
              user: {
                select: {
                  username: true,
                  profilePic: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              reviews: true,
              bookings: true,
            },
          },
        },
      });

      if (!rental) {
        return res.status(404).json({
          success: false,
          error: "Rental not found",
        });
      }

      // Calculate average rating
      const avgRating =
        rental.reviews.length > 0
          ? rental.reviews.reduce((sum, review) => sum + review.rating, 0) /
            rental.reviews.length
          : 0;

      const rentalWithRating = {
        ...rental,
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        reviewCount: rental._count.reviews,
      };

      res.json({
        success: true,
        rental: rentalWithRating,
      });
    } catch (error) {
      console.error("Error getting rental by ID:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Create new rental
  createRental: async (req, res) => {
    try {
      const {
        partnerId,
        name,
        description,
        address,
        lat,
        lng,
        price,
        originalPrice,
        roomCount,
        facilities,
        images,
        mainImage,
      } = req.body;

      if (
        !partnerId ||
        !name ||
        !address ||
        !lat ||
        !lng ||
        !price ||
        !roomCount
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Missing required fields" });
      }

      const rental = await prisma.rental.create({
        data: {
          partnerId,
          name,
          description,
          address,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          roomCount: parseInt(roomCount),
          facilities: facilities || [],
          images: images || [],
          mainImage: mainImage || null,
        },
      });

      res.json({ success: true, rental });
    } catch (error) {
      console.error("Error creating rental:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Get all rentals by partnerId
  getRentalsByPartner: async (req, res) => {
    try {
      const { partnerId } = req.params;
      if (!partnerId) {
        return res
          .status(400)
          .json({ success: false, error: "Partner ID is required" });
      }
      const rentals = await prisma.rental.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, rentals });
    } catch (error) {
      console.error("Error getting rentals by partner:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Delete rental by rentalId and partnerId
  deleteRental: async (req, res) => {
    try {
      const { rentalId, partnerId } = req.params;
      if (!rentalId || !partnerId) {
        return res.status(400).json({
          success: false,
          error: "Rental ID and Partner ID are required",
        });
      }
      // Pastikan rental milik partner yang benar
      const rental = await prisma.rental.findUnique({ where: { rentalId } });
      if (!rental || rental.partnerId !== partnerId) {
        return res.status(404).json({
          success: false,
          error: "Rental not found or not owned by this partner",
        });
      }
      await prisma.rental.delete({ where: { rentalId } });
      res.json({ success: true, message: "Rental deleted" });
    } catch (error) {
      console.error("Error deleting rental:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },
};

module.exports = rentalController;
