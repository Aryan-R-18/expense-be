const express = require('express');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// @route   GET /api/analytics/summary
// @desc    Get total balance, income, expenses, and savings
router.get('/summary', async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id });

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalBalance = totalIncome - totalExpenses;
    const savings = totalIncome - totalExpenses;

    res.json({
      totalBalance,
      totalIncome,
      totalExpenses,
      savings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/analytics/charts
// @desc    Get aggregated data for charts (pie, bar)
router.get('/charts', async (req, res) => {
  try {
    const { month, year } = req.query; // basic optional filtering
    let matchQuery = { user: req.user._id };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      matchQuery.date = { $gte: startDate, $lte: endDate };
    }

    // Pie chart: Expense by category
    const expenseByCategory = await Transaction.aggregate([
      { $match: { ...matchQuery, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);

    // Bar chart: Income vs Expense grouped by month (last 6 months e.g. for area/bar)
    // Simplified: group by month-year
    const monthlyData = await Transaction.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          income: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          },
          expense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    res.json({
      pie: expenseByCategory.map(item => ({ name: item._id, value: item.total })),
      monthly: monthlyData.map(item => ({ name: item._id, income: item.income, expense: item.expense }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/analytics/insights
// @desc    Get rule-based text insights
router.get('/insights', async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id });
    
    // Calculate insights (rule-based)
    const insights = [];

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const foodTransactions = transactions.filter(t => t.type === 'expense' && t.category.toLowerCase() === 'food');
    const foodExpenses = foodTransactions.reduce((acc, t) => acc + t.amount, 0);

    if (totalExpenses > 0 && foodExpenses > 0) {
      const foodPercent = Math.round((foodExpenses / totalExpenses) * 100);
      insights.push(`You spend ${foodPercent}% of your expenses on food.`);
    }

    const savings = totalIncome - totalExpenses;
    if (savings > 0) {
      insights.push(`You saved ₹${savings} overall.`);
    }

    if (totalExpenses > totalIncome) {
      insights.push(`Warning: Your overall expenses (₹${totalExpenses}) exceed your income (₹${totalIncome}).`);
    }

    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
