const Expense = require("../models/Expense");

const getSpendingForecast = async (req, res) => {
    console.log("SPENDING FORECAST CONTROLLER REACHED");
  try {
    // 1. Retrieve expenses from MongoDB
    const expenses = await Expense.find().lean();

    if (expenses.length === 0) {
      return res.status(200).json({
        message: "Add expenses to generate a spending forecast.",
        monthlySpending: {},
        forecast: null,
        aiInsight: null
      });
    }

    // 2. Prepare the last 3 completed calendar months
    const now = new Date();
    const monthlySpending = {};

    for (let i = 3; i >= 1; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const month = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0")
      ].join("-");

      monthlySpending[month] = 0;
    }

    // 3. Calculate spending for each month
    expenses.forEach((expense) => {
      const date = new Date(expense.date);

      if (Number.isNaN(date.getTime())) return;

      const month = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0")
      ].join("-");

      if (Object.hasOwn(monthlySpending, month)) {
        monthlySpending[month] += Number(expense.amount);
      }
    });

    // 4. Calculate the average monthly spending
    const amounts = Object.values(monthlySpending);

    const total = amounts.reduce(
      (sum, amount) => sum + amount,
      0
    );

    const forecast = Number((total / 3).toFixed(2));

    // 5. Ask Ollama to analyze the spending history
    const prompt = `
You are Spendr, a personal expense insights assistant.

Here is the user's actual spending history:
${JSON.stringify(monthlySpending)}

The calculated baseline estimate for next month's spending
is PHP ${forecast.toFixed(2)}.

Explain the spending pattern in simple language.
Give two practical suggestions for managing expenses.
Do not invent numbers or claim the forecast is guaranteed.
Clearly mention if the available history is insufficient
to establish a reliable trend.
`;

    const response = await fetch(
      "http://localhost:11434/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3.2",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          stream: false
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        `Ollama returned HTTP ${response.status}`
      );
    }

    const aiData = await response.json();

    // 6. Return the forecast and AI insight
    res.status(200).json({
      currency: "PHP",
      monthlySpending,
      forecast,
      method: "Average of the last 3 completed calendar months",
      aiInsight: aiData.message.content
    });
  } catch (error) {
    console.error("Spending forecast error:", error.message);

    res.status(500).json({
      message: "Failed to generate spending forecast.",
      error: error.message
    });
  }
};

module.exports = { getSpendingForecast };