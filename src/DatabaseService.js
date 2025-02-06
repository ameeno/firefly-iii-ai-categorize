import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

export default class DatabaseService {
    #db;

    async initialize() {
        this.#db = await open({
            filename: './data/transactions.db',
            driver: sqlite3.Database
        });

        await this.#createTables();
    }

    async #createTables() {
        await this.#db.exec(`
            CREATE TABLE IF NOT EXISTS transaction_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                destination_name TEXT,
                description TEXT,
                category TEXT,
                confidence REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_destination ON transaction_categories(destination_name);
            CREATE INDEX IF NOT EXISTS idx_description ON transaction_categories(description);
        `);
    }

    async findSimilarTransactions(destinationName, description) {
        return await this.#db.all(
            `SELECT category, COUNT(*) as count, AVG(confidence) as avg_confidence
             FROM transaction_categories
             WHERE destination_name = ? OR description LIKE ?
             GROUP BY category
             ORDER BY count DESC, avg_confidence DESC
             LIMIT 1`,
            [destinationName, `%${description}%`]
        );
    }

    async saveTransaction(destinationName, description, category, confidence) {
        await this.#db.run(
            `INSERT INTO transaction_categories (destination_name, description, category, confidence)
             VALUES (?, ?, ?, ?)`,
            [destinationName, description, category, confidence]
        );
    }

    async getStats() {
        const stats = {
            total: 0,
            categories: {},
            accuracy: 0
        };

        const results = await this.#db.all(
            `SELECT category, COUNT(*) as count, AVG(confidence) as avg_confidence
             FROM transaction_categories
             GROUP BY category`
        );

        results.forEach(row => {
            stats.total += row.count;
            stats.categories[row.category] = {
                count: row.count,
                confidence: row.avg_confidence
            };
        });

        return stats;
    }
}
