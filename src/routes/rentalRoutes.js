const express = require("express");
const rentalController = require("../controllers/rentalController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// Public routes (no auth required)
// Get all rentals
router.get("/all", rentalController.getAllRentals);

// Get rental by ID
router.get("/:rentalId", rentalController.getRentalById);

// Protected routes (auth required)
// Create new rental
router.post("/create", authMiddleware, rentalController.createRental);

// Get all rentals by partnerId
router.get(
  "/partner/:partnerId",
  authMiddleware,
  rentalController.getRentalsByPartner
);

// Delete rental by rentalId and partnerId
router.delete(
  "/:rentalId/partner/:partnerId",
  authMiddleware,
  rentalController.deleteRental
);

module.exports = router;
