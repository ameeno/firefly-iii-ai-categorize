import { getConfigVariable, debug } from "./util.js";

export default class FireflyService {
    #BASE_URL;
    #PERSONAL_TOKEN;

    constructor() {
        this.#BASE_URL = getConfigVariable("FIREFLY_URL");
        if (this.#BASE_URL.slice(-1) === "/") {
            this.#BASE_URL = this.#BASE_URL.substring(0, this.#BASE_URL.length - 1);
        }
        this.#PERSONAL_TOKEN = getConfigVariable("FIREFLY_PERSONAL_TOKEN");
        debug("FireflyService initialized with BASE_URL:", this.#BASE_URL);
    }

    async getCategories() {
        debug("FireflyService.getCategories called");
        const response = await fetch(`${this.#BASE_URL}/api/v1/categories`, {
            headers: {
                Authorization: `Bearer ${this.#PERSONAL_TOKEN}`,
                Accept: `application/json`,
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            debug("Error in getCategories, response not ok", response.status, errorText);
            throw new FireflyException(response.status, response, errorText);
        }

        const data = await response.json();
        debug("getCategories response data:", data);

        const categories = new Map();
        data.data.forEach(category => {
            categories.set(category.attributes.name, category.id);
        });
        debug("Parsed categories:", categories);
        return categories;
    }

    async setCategory(transactionId, transactions, categoryId) {
        const tag = getConfigVariable("FIREFLY_TAG", "AI categorized");
        debug("FireflyService.setCategory called for transactionId:", transactionId, "with categoryId:", categoryId);

        const body = {
            apply_rules: true,
            fire_webhooks: true,
            transactions: [],
        };

        transactions.forEach(transaction => {
            let tags = transaction.tags;
            if (!tags) {
                tags = [];
            }
            tags.push(tag);

            body.transactions.push({
                transaction_journal_id: transaction.transaction_journal_id,
                category_id: categoryId,
                tags: tags,
            });
        });

        debug("setCategory request body:", body);

        const response = await fetch(`${this.#BASE_URL}/api/v1/transactions/${transactionId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${this.#PERSONAL_TOKEN}`,
                Accept: `application/json`,
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            debug("Error in setCategory, response not ok", response.status, errorText);
            throw new FireflyException(response.status, response, errorText);
        }

        const jsonData = await response.json();
        debug("setCategory response data:", jsonData);
        console.info("Transaction updated");
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
