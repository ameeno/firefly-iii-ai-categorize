import { getConfigVariable } from "./util.js";

export default class FireflyService {
    #BASE_URL;
    #PERSONAL_TOKEN;

    constructor() {
        this.#BASE_URL = getConfigVariable("FIREFLY_URL")
        if (this.#BASE_URL.slice(-1) === "/") {
            this.#BASE_URL = this.#BASE_URL.substring(0, this.#BASE_URL.length - 1)
        }

        this.#PERSONAL_TOKEN = getConfigVariable("FIREFLY_PERSONAL_TOKEN")
    }

    async getCategories() {
        const response = await fetch(`${this.#BASE_URL}/api/v1/categories`, {
            headers: {
                Authorization: `Bearer ${this.#PERSONAL_TOKEN}`,
            }
        });

        if (!response.ok) {
            throw new FireflyException(response.status, response, await response.text())
        }

        const data = await response.json();

        const categories = new Map();
        data.data.forEach(category => {
            categories.set(category.attributes.name, category.id);
        });

        return categories;
    }

    async setCategory(transactionId, transactions, categoryId) {
        const tag = getConfigVariable("FIREFLY_TAG", "AI categorized");
        const maxRetries = 3;
        const batchSize = 50; // Process transactions in batches of 50

        const body = {
            apply_rules: true,
            fire_webhooks: true,
            transactions: [],
        };

        // Process transactions in batches
        for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);
            body.transactions = [];

            batch.forEach(transaction => {
                let tags = Array.isArray(transaction.tags) ? [...transaction.tags] : [];
                if (!tags.includes(tag)) {
                    tags.push(tag);
                }

                body.transactions.push({
                    transaction_journal_id: transaction.transaction_journal_id,
                    category_id: categoryId,
                    tags: tags,
                });
            });

            let retries = 0;
            while (retries < maxRetries) {
                try {
                    const response = await fetch(`${this.#BASE_URL}/api/v1/transactions/${transactionId}`, {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${this.#PERSONAL_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(body)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`Failed to update batch (${i + 1}-${i + batch.length}): ${errorText}`);
                        throw new FireflyException(response.status, response, errorText);
                    }

                    await response.json();
                    console.info(`Successfully updated batch ${i + 1}-${i + batch.length} of ${transactions.length} transactions`);
                    break;
                } catch (error) {
                    retries++;
                    if (retries === maxRetries) {
                        console.error(`Failed to update batch after ${maxRetries} retries:`, error);
                        throw error;
                    }
                    console.warn(`Retry ${retries}/${maxRetries} for batch ${i + 1}-${i + batch.length}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
                }
            }
        }

        console.info("All transactions updated successfully")
    }
}

class FireflyException extends Error {
    code;
    response;
    body;

    constructor(statusCode, response, body) {
        super(`Error while communicating with Firefly III: ${statusCode} - ${body}`);

        this.code = statusCode;
        this.response = response;
        this.body = body;
    }
}
