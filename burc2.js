const { v4: uuidv4 } = require('uuid');
const bursaryModel = require('../models/bursary');
const accountModel = require('../models/Account');
const transactionModel = require('../models/transaction');
const logController = require('./logController');

const category = 'Bursary';

const bursaryController = {
    create: async (req, res) => {
        try {
            const { source, accountId, amount, date, token } = req.body;

            const account = await accountModel.findByPk(accountId);
            if (!account) {
                return res.status(400).json({ Error: 'Account Not Found' });
            }

            const bursary = await bursaryModel.create({
                bursaryId: uuidv4(),
                source,
                amount,
                date,
                accountId,
            });

            const transaction = await transactionModel.create({
                transactionId: uuidv4(),
                accountId,
                transactionRef: bursary.bursaryId,
                transactionMode: 'Bursary',
                transactionType: 'bursary',
                amount,
                date,
                description: '',
                operation: '+',
            });

            // Update Account Balance
            account.balance = parseFloat(account.balance) + parseFloat(amount);
            await account.save();

            // Fix token parsing
            let parsedToken;
            if (typeof token === 'string') {
                try {
                    parsedToken = JSON.parse(token).token;
                } catch (error) {
                    return res.status(400).json({ Error: 'Invalid token format' });
                }
            } else if (typeof token === 'object' && token.token) {
                parsedToken = token.token;
            } else {
                return res.status(400).json({ Error: 'Token is required' });
            }

            // Logging the actions
            await logController.create({
                user_id: parsedToken,
                category: 'Transaction',
                action: 'Add Transaction',
                target: transaction.transactionId,
            });

            await logController.create({
                user_id: parsedToken,
                category,
                action: 'Add Bursary',
                target: bursary.bursaryId,
            });

            return res.status(200).json({ message: 'Operation Successful' });
        } catch (error) {
            console.error('An error occurred: ', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    },

    edit: async (req, res) => {
        try {
            const { bursaryId, source, accountId, amount, date, token } = req.body;

            const bursary = await bursaryModel.findByPk(bursaryId);
            if (!bursary) {
                return res.status(404).json({ Error: 'Bursary not found' });
            }

            const transaction = await transactionModel.findOne({ where: { transactionRef: bursaryId } });
            const account = await accountModel.findByPk(bursary.accountId);

            bursary.source = source || bursary.source;
            bursary.accountId = accountId || bursary.accountId;
            bursary.date = date || bursary.date;

            if (amount) {
                const oldAmount = parseFloat(bursary.amount);
                account.balance = (parseFloat(account.balance) - oldAmount) + parseFloat(amount);
                bursary.amount = amount;
                transaction.amount = amount;
            }

            await bursary.save();
            await transaction.save();
            await account.save();

            let parsedToken;
            if (typeof token === 'string') {
                try {
                    parsedToken = JSON.parse(token).token;
                } catch (error) {
                    return res.status(400).json({ Error: 'Invalid token format' });
                }
            } else if (typeof token === 'object' && token.token) {
                parsedToken = token.token;
            } else {
                return res.status(400).json({ Error: 'Token is required' });
            }

            await logController.create({
                user_id: parsedToken,
                category: 'Bursary',
                action: "Edit Bursary",
                target: bursary.bursaryId
            });

            if (transaction) {
                await logController.create({
                    user_id: parsedToken,
                    category: 'Transaction',
                    action: "Edit Transaction",
                    target: transaction.transactionId
                });
            }

            return res.status(200).json({ message: 'Operation Successful' });
        } catch (error) {
            console.error('An error occurred: ', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    },

    delete: async (req, res) => {
        try {
            const { bursaryId, token } = req.body;

            let parsedToken;
            if (typeof token === 'string') {
                try {
                    parsedToken = JSON.parse(token).token;
                } catch (error) {
                    return res.status(400).json({ Error: 'Invalid token format' });
                }
            } else if (typeof token === 'object' && token.token) {
                parsedToken = token.token;
            } else {
                return res.status(400).json({ Error: 'Token is required' });
            }

            const bursary = await bursaryModel.findByPk(bursaryId);
            if (!bursary) {
                return res.status(404).json({ Error: 'Bursary not found' });
            }

            const transaction = await transactionModel.findOne({
                where: { transactionRef: bursaryId }
            });

            const account = await accountModel.findByPk(bursary.accountId);
            account.balance = parseFloat(account.balance) - parseFloat(bursary.amount);

            await account.save();
            await transaction.destroy();
            await bursary.destroy();

            await logController.create({
                user_id: parsedToken,
                category: 'Transaction',
                action: "Delete Bursary",
                target: transaction.transactionId
            });

            await logController.create({
                user_id: parsedToken,
                category,
                action: "Delete Bursary",
                target: bursaryId
            });

            return res.status(200).json({ message: 'Deleted successfully' });

        } catch (error) {
            console.error('An error occurred: ', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    },

    view: async (req, res) => {
        try {
            const { bursaryId } = req.body;
            const bursary = await bursaryModel.findByPk(bursaryId);
            if (!bursary) {
                return res.status(404).json({ Error: 'Bursary not found' });
            }
            const account = await accountModel.findByPk(bursary.accountId);
            return res.status(200).json({ Bursary: bursary, Account: account });
        } catch (error) {
            console.error('An error occurred: ', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    },

    viewAll: async (req, res) => {
        try {
            const bursaryItems = await bursaryModel.findAll();
            const bursaries = [];

            for (const bursary of bursaryItems) {
                const account = await accountModel.findByPk(bursary.accountId);
                bursaries.push({ Bursary: bursary, Account: account });
            }

            return res.status(200).json(bursaries);
        } catch (error) {
            console.error('An error occurred: ', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    },

    allocate: async (req, res) => {
        try {
            const { bursaryId } = req.body;
            const bursary = await bursaryModel.findByPk(bursaryId);
            if (!bursary) {
                return res.status(400).json({ error: 'Bursary not found' });
            }
        } catch (error) {
            console.error('An error occurred: ', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    }
};

module.exports = bursaryController;
