const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/budgets', require('./routes/budgets'));

app.get('/', (req, res) => {
  res.send('Expense Tracker API is running...');
});

// Database Connection (Vercel Serverless optimization)
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb) return cachedDb;
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    cachedDb = conn;
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Don't process.exit(1) on serverless, just throw
    throw error;
  }
};

// Connect to DB immediately for local & serverless cold starts
connectDB();

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
