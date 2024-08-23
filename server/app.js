const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Route to get transactions, optionally filtered by month
app.get('/api/transactions', (req, res) => {
    const { month } = req.query;

    // Read the dataset from the file
    fs.readFile(path.join(__dirname, 'data', 'transactions.json'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading dataset:', err);
            return res.status(500).json({ error: 'Failed to read dataset' });
        }

        let transactions = JSON.parse(data);

        // Filter transactions by month if provided
        if (month) {
            transactions = transactions.filter(transaction => {
                const transactionMonth = new Date(transaction.dateOfSale).toLocaleString('default', { month: 'long' });
                return transactionMonth === month;
            });
        }

        const statistics = {
            totalSaleAmount: transactions.reduce((total, transaction) => total + transaction.price, 0),
            totalSoldItems: transactions.filter(transaction => transaction.sold).length,
            totalNotSoldItems: transactions.filter(transaction => !transaction.sold).length,
            categoryWiseData: [
                { _id: 'Electronics', count: transactions.filter(transaction => transaction.category === 'Electronics').length },
                { _id: 'Clothing', count: transactions.filter(transaction => transaction.category === 'Clothing').length }
            ],
            priceRangeData: [
                { range: '0-100', count: transactions.filter(transaction => transaction.price <= 100).length },
                { range: '100-200', count: transactions.filter(transaction => transaction.price > 100 && transaction.price <= 200).length }
            ]
        };

        res.json({ transactions, statistics });
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
