const Expense = require("../models/Expense");
const { askOllama } = require("../services/ollamaService");

const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Please enter a question."
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        message: "Your question must be 1000 characters or fewer."
      });
    }

    // Retrieve expenses from MongoDB
    const expenses = await Expense.find()
      .select("title amount category date description")
      .lean();

    // Summarize the data before sending it to AI
    const categoryTotals = {};

    for (const expense of expenses) {
      const category = expense.category || "Other";
      categoryTotals[category] =
        (categoryTotals[category] || 0) +
        Number(expense.amount || 0);
    }

    const totalSpending = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const prompt = `
User's question:
${message.trim()}

Spendr expense summary:
- Number of expense records: ${expenses.length}
- Total recorded spending: PHP ${totalSpending.toFixed(2)}
- Spending by category: ${JSON.stringify(categoryTotals)}
- Individual expense records: ${JSON.stringify(expenses)}

Answer the user's question using the available data.
Use PHP for amounts.
If the records do not contain enough information, say so.
Give practical suggestions when appropriate.
Do not invent financial figures.
`;

    const answer = await askOllama(prompt);

    return res.status(200).json({
      answer,
      summary: {
        expenseCount: expenses.length,
        totalSpending,
        categoryTotals
      }
    });
  } catch (error) {
    console.error("AI chat error:", error.message);

    return res.status(500).json({
      message: "Unable to generate an AI response. Check that Ollama is running and the model is available."
    });
  }
};

module.exports = { chatWithAI };