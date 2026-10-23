const express = require("express");
const router = express.Router();

const {
  getExpenses,
  getExpenseById,
  getExpenseStats,
  createExpense,
  updateExpense,
  deleteExpense
} = require("../controllers/expenseController");

const {
  getSpendingForecast
} = require("../controllers/forecastController");

// Specific routes FIRST
router.get("/stats", getExpenseStats);
router.get("/forecast", getSpendingForecast);

// General ID route AFTER specific routes
router.get("/", getExpenses);
router.get("/:id", getExpenseById);

// CRUD routes
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;