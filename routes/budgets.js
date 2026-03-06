const express = require('express');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// @route   GET /api/budgets
// @desc    Get user budgets with current spending calculated
router.get('/', async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user._id });

    // For each budget, calculate current spending for this month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const transactions = await Transaction.find({
          user: req.user._id,
          type: 'expense',
          category: budget.category,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const currentSpending = transactions.reduce((sum, t) => sum + t.amount, 0);

        return {
          ...budget._doc,
          currentSpending
        };
      })
    );

    res.json(budgetsWithSpending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/budgets
// @desc    Create a new budget
router.post('/', async (req, res) => {
  try {
    const { category, limit, period } = req.body;

    const existingBudget = await Budget.findOne({ user: req.user._id, category });
    if (existingBudget) {
      return res.status(400).json({ message: 'Budget for this category already exists' });
    }

    const budget = new Budget({
      user: req.user._id,
      category,
      limit,
      period: period || 'monthly'
    });

    const createdBudget = await budget.save();
    res.status(201).json(createdBudget);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/budgets/:id
// @desc    Delete a budget
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (budget.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await budget.deleteOne();
    res.json({ message: 'Budget removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
