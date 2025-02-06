import DatabaseService from "./DatabaseService.js";
import DeepSeekService from "./DeepSeekService.js";
import OpenAiService from "./OpenAiService.js";
import { getConfigVariable } from "./util.js";

export default class AIService {
        #dbService;

    constructor() {
        this.#dbService = new DatabaseService();
        this.#dbService.initialize();
    }

    async classify(categories, destinationName, description) {
        try {
            // First check if we have similar transactions in our database
            const similarTransactions = await this.#dbService.findSimilarTransactions(destinationName, description);

            if (similarTransactions.length > 0 && similarTransactions[0].avg_confidence > 0.8) {
                return {
                    prompt: "Using historical data",
                    response: similarTransactions[0].category,
                    category: similarTransactions[0].category,
                    confidence: similarTransactions[0].avg_confidence,
                    source: "database"
                };
            }

            const prompt = this.generatePrompt(categories, destinationName, description);
            const result = await this.makeAIRequest(prompt, categories);

            if (!result) {
                return null;
            }

            // Save the categorization to our database
            await this.#dbService.saveTransaction(destinationName, description, result.category, result.confidence);

            return {
                prompt,
                ...result,
                source: this.getProviderName()
            };

        } catch (error) {
            this.handleError(error);
        }
    }

    generatePrompt(categories, destinationName, description) {
        return `IMPORTANT: Your response must be EXACTLY one of these categories: ${categories.join(", ")}.

Categorize this bank transaction:
Merchant: "${destinationName}"
Description: "${description}"

Rules:
1. Output ONLY the category name
2. Category must match EXACTLY one from the list
3. No explanations or additional text
4. No punctuation or formatting

Category:`;
    }

    // Abstract methods to be implemented by provider-specific classes
    async makeAIRequest(prompt, categories) {
        throw new Error('makeAIRequest must be implemented by provider-specific class');
    }

    getProviderName() {
        throw new Error('getProviderName must be implemented by provider-specific class');
    }

    handleError(error) {
        throw new Error('handleError must be implemented by provider-specific class');
    }

    static create() {
        const provider = getConfigVariable("AI_PROVIDER", "deepseek").toLowerCase();

        switch (provider) {
            case "openai":
                return new OpenAiService();
            case "deepseek":
                return new DeepSeekService();
            default:
                throw new Error(`Unknown AI provider: ${provider}. Supported providers are: openai, deepseek`);
        }
    }
}
