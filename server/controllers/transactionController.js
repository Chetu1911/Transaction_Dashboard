const axios = require('axios');
const Transaction = require('../models/transactionModel');

// Initialize Database
const initializeDatabase = async (req, res) => {
    try {
        const { data } = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        await Transaction.insertMany(data);
        res.status(200).send('Database initialized');
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// List Transactions
const listTransactions = async (req, res) => {
    const { month, page = 1, perPage = 10, search = '' } = req.query;
    const regex = new RegExp(search, 'i');
    const query = { dateOfSale: new RegExp(`-${month}-`, 'i') };
    const transactions = await Transaction.find({
        ...query,
        $or: [{ title: regex }, { description: regex }, { price: regex }]
    }).limit(perPage).skip((page - 1) * perPage);
    res.status(200).json(transactions);
};

// Get Statistics
const getStatistics = async (req, res) => {
    const { month } = req.query;
    const query = { dateOfSale: new RegExp(`-${month}-`, 'i') };
    const soldItems = await Transaction.countDocuments({ ...query, sold: true });
    const notSoldItems = await Transaction.countDocuments({ ...query, sold: false });
    const totalAmount = await Transaction.aggregate([
        { $match: { ...query, sold: true } },
        { $group: { _id: null, total: { $sum: "$price" } } }
    ]);
    res.status(200).json({
        totalSaleAmount: totalAmount[0]?.total || 0,
        totalSoldItems: soldItems,
        totalNotSoldItems: notSoldItems,
    });
};

// Bar Chart Data
const getBarChart = async (req, res) => {
    const { month } = req.query;
    const ranges = [
        { min: 0, max: 100 }, { min: 101, max: 200 }, /*... other ranges ...*/ { min: 901, max: Infinity }
    ];
    const query = { dateOfSale: new RegExp(`-${month}-`, 'i') };
    const data = await Promise.all(ranges.map(async range => {
        const count = await Transaction.countDocuments({ ...query, price: { $gte: range.min, $lt: range.max } });
        return { range: `${range.min}-${range.max}`, count };
    }));
    res.status(200).json(data);
};

// Pie Chart Data
const getPieChart = async (req, res) => {
    const { month } = req.query;
    const query = { dateOfSale: new RegExp(`-${month}-`, 'i') };
    const data = await Transaction.aggregate([
        { $match: query },
        { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    res.status(200).json(data);
};

// Combined Data
const getCombinedData = async (req, res) => {
    const [transactions, statistics, barChart, pieChart] = await Promise.all([
        listTransactions(req, res),
        getStatistics(req, res),
        getBarChart(req, res),
        getPieChart(req, res)
    ]);
    res.status(200).json({ transactions, statistics, barChart, pieChart });
};

module.exports = {
    initializeDatabase,
    listTransactions,
    getStatistics,
    getBarChart,
    getPieChart,
    getCombinedData
};
