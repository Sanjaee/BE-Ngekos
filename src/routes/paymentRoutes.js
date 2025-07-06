const express = require("express");
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// Create a new payment transaction
router.post("/create", authMiddleware, paymentController.createPayment);

// Process payment (simulate payment processing)
router.post("/process", authMiddleware, paymentController.processPayment);

// Get payment history for a partner
router.get(
  "/history/:partnerId",
  authMiddleware,
  paymentController.getPaymentHistory
);

// Get payment by ID
router.get("/:paymentId", authMiddleware, paymentController.getPaymentById);

module.exports = router;
