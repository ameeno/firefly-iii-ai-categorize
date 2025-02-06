import AIService from "./AIService.js";
import { getConfigVariable } from "./util.js";

export default class DeepSeekService extends AIService {
    #model = "deepseek-chat";
    #apiKey;

    constructor() {
        super();
        this.#apiKey = getConfigVariable("DEEPSEEK_API_KEY");
    }

    async makeAIRequest(prompt, categories) {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.#apiKey}`
            },
            body: JSON.stringify({
                model: this.#model,
                messages: [{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 64
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new DeepSeekException(response.status, data);
        }

        let guess = data.choices[0].message.content;
        guess = guess.replace("\n", "");
        guess = guess.trim();

        if (categories.indexOf(guess) === -1) {
            console.warn(`DeepSeek could not classify the transaction.
            Prompt: ${prompt}
            DeepSeek's guess: ${guess}`);
            return null;
        }

        return {
            response: data.choices[0].message.content,
            category: guess,
            confidence: 0.8
        };
    }

    getProviderName() {
        return "deepseek";
    }

    handleError(error) {
        if (error instanceof DeepSeekException) {
            return error;
        }
        console.error(error.message);
        return new DeepSeekException(null, error.message);
    }
}

class DeepSeekException extends Error {
    code;
    response;

    constructor(statusCode, response) {
        super(`Error while communicating with DeepSeek: ${statusCode} - ${JSON.stringify(response)}`);

        this.code = statusCode;
        this.response = response;
    }
}
