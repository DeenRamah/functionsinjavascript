const { v4: uuidv4 } = require('uuid');
const bursaryModel = require('../models/bursary');
const accountModel = require('../models/Account');
const transactionModel = require('../models/transaction');
const logController = require('./logController');
const category = 'Bursary';

const bursaryController = {
    create: async (req, res) => {
        try {
            if (!req.body) {
                return res.status(400).json({ Error: 'Invalid request, no data received' });
            }

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
                accountId
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
                operation: '+'
            });

            account.balance = parseFloat(account.balance) + parseFloat(amount);
            await account.save();

            let userToken;
            try {
                userToken = JSON.parse(token)?.token;
            } catch (err) {
                return res.status(400).json({ Error: 'Invalid Token Format' });
            }

            await logController.create({
                user_id: userToken,
                category: 'Transaction',
                action: 'Add Transaction',
                target: transaction.transactionId
            });

            await logController.create({
                user_id: userToken,
                category,
                action: 'Add Bursary',
                target: bursary.bursaryId
            });

            return res.status(200).json({ message: 'Operation Successful' });

        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    },

    edit: async (req, res) => {
        try {
            if (!req.body) {
                return res.status(400).json({ Error: 'Invalid request, no data received' });
            }

            const { bursaryId, source, accountId, amount, date, token } = req.body;

            const bursary = await bursaryModel.findByPk(bursaryId);
            if (!bursary) {
                return res.status(404).json({ Error: 'Bursary Not Found' });
            }

            const transaction = await transactionModel.findOne({ where: { transactionRef: bursaryId } });
            const account = await accountModel.findByPk(bursary.accountId);

            if (!account) {
                return res.status(400).json({ Error: 'Account Not Found' });
            }

            bursary.source = source || bursary.source;
            bursary.accountId = accountId || bursary.accountId;
            bursary.date = date || bursary.date;

            if (amount) {
                const accountBalance = parseFloat(account.balance);
                const oldAmount = parseFloat(bursary.amount);
                account.balance = (accountBalance - oldAmount) + parseFloat(amount);
                bursary.amount = amount;
                if (transaction) transaction.amount = amount;
            }

            await bursary.save();
            if (transaction) await transaction.save();
            await account.save();

            let userToken;
            try {
                userToken = JSON.parse(token)?.token;
            } catch (err) {
                return res.status(400).json({ Error: 'Invalid Token Format' });
            }

            await logController.create({
                user_id: userToken,
                category: 'Bursary',
                action: 'Edit Bursary',
                target: bursary.bursaryId
            });

            if (transaction) {
                await logController.create({
                    user_id: userToken,
                    category: 'Transaction',
                    action: 'Edit Transaction',
                    target: transaction.transactionId
                });
            }

            return res.status(200).json({ message: 'Operation Successful' });

        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    },

    delete: async (req, res) => {
        try {
            if (!req.body) {
                return res.status(400).json({ Error: 'Invalid request, no data received' });
            }

            const { bursaryId, token } = req.body;

            let userToken;
            try {
                userToken = JSON.parse(token)?.token;
            } catch (err) {
                return res.status(400).json({ Error: 'Invalid Token Format' });
            }

            const bursary = await bursaryModel.findByPk(bursaryId);
            if (!bursary) {
                return res.status(404).json({ Error: 'Bursary Not Found' });
            }

            const transaction = await transactionModel.findOne({
                where: { transactionRef: bursaryId }
            });

            const account = await accountModel.findByPk(bursary.accountId);
            if (account) {
                account.balance = parseFloat(account.balance) - parseFloat(bursary.amount);
                await account.save();
            }

            if (transaction) await transaction.destroy();
            await bursary.destroy();

            await logController.create({
                user_id: userToken,
                category: 'Transaction',
                action: 'Delete Transaction',
                target: transaction ? transaction.transactionId : 'N/A'
            });

            await logController.create({
                user_id: userToken,
                category,
                action: 'Delete Bursary',
                target: bursaryId
            });

            return res.status(200).json({ message: 'Deleted Successfully' });

        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    },

    view: async (req, res) => {
        try {
            const { bursaryId } = req.body;
            const bursary = await bursaryModel.findByPk(bursaryId);
            if (!bursary) return res.status(404).json({ Error: 'Bursary Not Found' });

            const account = await accountModel.findByPk(bursary.accountId);

            return res.status(200).json({ Bursary: bursary, Account: account });

        } catch (error) {
            console.error('An error occurred:', error);
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
            console.error('An error occurred:', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    },

    allocate: async (req, res) => {
        try {
            const { bursaryId, beneficiaries, date } = req.body;

            const bursary = await bursaryModel.findByPk(bursaryId);
            if (!bursary) {
                return res.status(400).json({ error: 'Bursary Not Found' });
            }

            // Allocation logic here...

            return res.status(200).json({ message: 'Bursary Allocated Successfully' });

        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({ Error: 'Internal Server Error' });
        }
    }
};

module.exports = bursaryController;
