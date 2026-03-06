const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  category: {
    type: String,
    required: true,
  },
  limit: {
    type: Number,
    required: true,
  },
  currentSpending: {
    type: Number,
    default: 0,
  },
  period: {
    type: String,
    default: 'monthly',
  }
}, { timestamps: true });

module.exports = mongoose.model('Budget', budgetSchema);
