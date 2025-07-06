const prisma = require("../utils/prisma");

const rentalController = {
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
        return res
          .status(400)
          .json({
            success: false,
            error: "Rental ID and Partner ID are required",
          });
      }
      // Pastikan rental milik partner yang benar
      const rental = await prisma.rental.findUnique({ where: { rentalId } });
      if (!rental || rental.partnerId !== partnerId) {
        return res
          .status(404)
          .json({
            success: false,
            error: "Rental not found or not owned by this partner",
          });
      }
      await prisma.rental.delete({ where: { rentalId } });
      res.json({ success: true, message: "Rental deleted" });
    } catch (error) {
      console.error("Error deleting rental:", error);
      res
        .status(500)
        .json({
          success: false,
          error: "Internal server error",
          details: error.message,
        });
    }
  },
};

module.exports = rentalController;
