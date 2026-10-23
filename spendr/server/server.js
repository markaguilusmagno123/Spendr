
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const expenseRoutes = require("./routes/expenseRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Welcome to Spendr API",
        tagline: "Take control of your money with Spendr",
        status: "Server is running"
    });
});

// AI routes
app.use("/api/ai", aiRoutes);

// Existing expense routes
app.use("/api/expenses", expenseRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "API route not found"
    });
});

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Spendr API running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};

startServer();
