const prisma = require("../utils/prisma");

const paymentController = {
  // Create a new payment transaction
  createPayment: async (req, res) => {
    try {
      const { partnerId, amount, roomsAllowed, method } = req.body;

      if (!partnerId || !amount || !roomsAllowed || !method) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      // Create payment record
      const payment = await prisma.partnerPayment.create({
        data: {
          partnerId: partnerId,
          amount: amount,
          roomsAllowed: roomsAllowed,
          method: method,
          status: "pending",
          transactionId: `TXN_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
        include: {
          partner: {
            select: {
              partnerId: true,
              username: true,
              email: true,
              businessName: true,
            },
          },
        },
      });

      res.json({
        success: true,
        payment: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          roomsAllowed: payment.roomsAllowed,
          method: payment.method,
          status: payment.status,
          transactionId: payment.transactionId,
          validFrom: payment.validFrom,
          validUntil: payment.validUntil,
          partner: payment.partner,
        },
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Process payment (simulate payment processing)
  processPayment: async (req, res) => {
    try {
      const { paymentId } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: "Payment ID required",
        });
      }

      // Get payment details
      const payment = await prisma.partnerPayment.findUnique({
        where: { paymentId: paymentId },
        include: {
          partner: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: "Payment not found",
        });
      }

      if (payment.status === "success") {
        return res.status(400).json({
          success: false,
          error: "Payment already processed",
        });
      }

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update payment status to success
      const updatedPayment = await prisma.partnerPayment.update({
        where: { paymentId: paymentId },
        data: {
          status: "success",
        },
        include: {
          partner: true,
        },
      });

      // Update partner's paid amount and max rooms
      const updatedPartner = await prisma.partner.update({
        where: { partnerId: payment.partnerId },
        data: {
          paidAmount: {
            increment: payment.amount,
          },
          maxRooms: {
            increment: payment.roomsAllowed,
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

      res.json({
        success: true,
        payment: {
          paymentId: updatedPayment.paymentId,
          amount: updatedPayment.amount,
          roomsAllowed: updatedPayment.roomsAllowed,
          method: updatedPayment.method,
          status: updatedPayment.status,
          transactionId: updatedPayment.transactionId,
          validFrom: updatedPayment.validFrom,
          validUntil: updatedPayment.validUntil,
          partner: updatedPayment.partner,
        },
        partner: updatedPartner,
        message: "Payment processed successfully",
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Get payment history for a partner
  getPaymentHistory: async (req, res) => {
    try {
      const { partnerId } = req.params;

      if (!partnerId) {
        return res.status(400).json({
          success: false,
          error: "Partner ID required",
        });
      }

      const payments = await prisma.partnerPayment.findMany({
        where: { partnerId: partnerId },
        orderBy: { createdAt: "desc" },
        select: {
          paymentId: true,
          amount: true,
          roomsAllowed: true,
          method: true,
          status: true,
          transactionId: true,
          validFrom: true,
          validUntil: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        payments: payments,
      });
    } catch (error) {
      console.error("Error getting payment history:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },

  // Get payment by ID
  getPaymentById: async (req, res) => {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: "Payment ID required",
        });
      }

      const payment = await prisma.partnerPayment.findUnique({
        where: { paymentId: paymentId },
        include: {
          partner: {
            select: {
              partnerId: true,
              username: true,
              email: true,
              businessName: true,
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: "Payment not found",
        });
      }

      res.json({
        success: true,
        payment: payment,
      });
    } catch (error) {
      console.error("Error getting payment:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  },
};

module.exports = paymentController;
