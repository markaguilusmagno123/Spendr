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

// GET routes
router.get("/stats", getExpenseStats);
router.get("/", getExpenses);
router.get("/:id", getExpenseById);

// Other CRUD routes
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;