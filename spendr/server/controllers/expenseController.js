const mongoose = require("mongoose");
const Expense = require("../models/Expense");

// GET: Retrieve all expenses and support searching/filtering
const getExpenses = async (req, res) => {
  try {
    const { search, category, startDate, endDate } = req.query;

    const filter = {};

    // Search by title or description
    if (search && search.trim()) {
      const keyword = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } }
      ];
    }

    // Filter by category
    if (category && category.trim()) {
      filter.category = category.trim();
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`);

        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
          Number.isNaN(start.getTime()) ||
          start.toISOString().slice(0, 10) !== startDate
        ) {
          return res.status(400).json({
            message: "Invalid start date. Use YYYY-MM-DD."
          });
        }

        filter.date.$gte = start;
      }

      if (endDate) {
        const end = new Date(`${endDate}T00:00:00.000Z`);

        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
          Number.isNaN(end.getTime()) ||
          end.toISOString().slice(0, 10) !== endDate
        ) {
          return res.status(400).json({
            message: "Invalid end date. Use YYYY-MM-DD."
          });
        }

        // Include the entire end date
        end.setUTCDate(end.getUTCDate() + 1);
        filter.date.$lt = end;
      }

      if (
        startDate &&
        endDate &&
        startDate > endDate
      ) {
        return res.status(400).json({
          message: "Start date cannot be after end date."
        });
      }
    }

    const expenses = await Expense.find(filter).sort({
      date: -1,
      createdAt: -1
    });

    res.status(200).json({
      count: expenses.length,
      expenses
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve expenses",
      error: error.message
    });
  }
};

// GET: Retrieve one expense by MongoDB ID
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("GET EXPENSE BY ID:", req.originalUrl, id);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID"
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve expense",
      error: error.message
    });
  }
};

// GET: Retrieve dashboard statistics
const getExpenseStats = async (req, res) => {
  try {
    const now = new Date();

    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );

    const [total, monthlyExpenses, categories] = await Promise.all([
      Expense.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalCount: { $sum: 1 }
          }
        }
      ]),

      Expense.aggregate([
        {
          $match: {
            date: {
              $gte: monthStart,
              $lt: nextMonthStart
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalCount: { $sum: 1 }
          }
        }
      ]),

      Expense.aggregate([
        {
          $group: {
            _id: "$category",
            totalAmount: { $sum: "$amount" },
            totalCount: { $sum: 1 }
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ])
    ]);

    res.status(200).json({
      totalExpenses: total[0]?.totalAmount || 0,
      totalCount: total[0]?.totalCount || 0,
      monthlyExpenses: monthlyExpenses[0]?.totalAmount || 0,
      monthlyCount: monthlyExpenses[0]?.totalCount || 0,
      categories
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve expense statistics",
      error: error.message
    });
  }
};

// POST: Create a new expense
const createExpense = async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;

    if (
      !title?.trim() ||
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !category?.trim() ||
      !date
    ) {
      return res.status(400).json({
        message: "Title, amount, category, and date are required."
      });
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        message: "Amount must be a valid number greater than zero."
      });
    }

    const expense = await Expense.create({
      title,
      amount: parsedAmount,
      category,
      date,
      description
    });

    res.status(201).json({
      message: "Expense created successfully",
      expense
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to create expense",
      error: error.message
    });
  }
};

// PUT: Update an existing expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid expense ID"
      });
    }

    const allowedFields = [
      "title",
      "amount",
      "category",
      "date",
      "description"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update."
      });
    }

    if (
      "title" in updates &&
      (typeof updates.title !== "string" || !updates.title.trim())
    ) {
      return res.status(400).json({
        message: "Title cannot be empty."
      });
    }

    if (
      "category" in updates &&
      (typeof updates.category !== "string" ||
        !updates.category.trim())
    ) {
      return res.status(400).json({
        message: "Category cannot be empty."
      });
    }

    if (
      "description" in updates &&
      typeof updates.description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be text."
      });
    }

    if ("amount" in updates) {
      const parsedAmount = Number(updates.amount);

      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          message: "Amount must be greater than zero."
        });
      }

      updates.amount = parsedAmount;
    }

    if ("date" in updates) {
      const parsedDate = new Date(updates.date);

      if (
        !updates.date ||
        Number.isNaN(parsedDate.getTime())
      ) {
        return res.status(400).json({
          message: "A valid date is required."
        });
      }

      updates.date = parsedDate;
    }

    const expense = await Expense.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json({
      message: "Expense updated successfully",
      expense
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update expense",
      error: error.message
    });
  }
};

// DELETE: Remove an expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
    console.log("INVALID ID HANDLER REACHED:", req.method, req.originalUrl);

    return res.status(400).json({
        message: "Invalid expense ID"
    });
}

    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json({
      message: "Expense deleted successfully",
      expense
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete expense",
      error: error.message
    });
  }
};

module.exports = {
  getExpenses,
  getExpenseById,
  getExpenseStats,
  createExpense,
  updateExpense,
  deleteExpense
};