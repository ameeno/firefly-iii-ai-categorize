import { Configuration, OpenAIApi } from "openai";
import AIService from "./AIService.js";
import { getConfigVariable } from "./util.js";

export default class OpenAiService extends AIService {
    #openAi;
    #model;

    constructor() {
        super();
        const apiKey = getConfigVariable("OPENAI_API_KEY")
        const baseURL = getConfigVariable("OPENAI_BASE_URL", undefined);
        this.#model = getConfigVariable("OPENAI_MODEL", "gpt-3.5-turbo-instruct");

        const configuration = new Configuration({
            apiKey,
            basePath: baseURL
        });

        this.#openAi = new OpenAIApi(configuration);
    }

    async makeAIRequest(prompt, categories) {
        const response = await this.#openAi.createCompletion({
            model: this.#model,
            prompt,
            temperature: 0.3,
            max_tokens: 50
        });

        let guess = response.data.choices[0].text;
        guess = guess.replace("\n", "");
        guess = guess.trim();

        if (categories.indexOf(guess) === -1) {
            console.warn(`OpenAI could not classify the transaction.
            Prompt: ${prompt}
            OpenAIs guess: ${guess}`)
            return null;
        }

        const confidence = response.data.choices[0].finish_reason === "stop" ? 0.9 : 0.7;

        return {
            response: response.data.choices[0].text,
            category: guess,
            confidence
        };
    }

    getProviderName() {
        return "openai";
    }

    handleError(error) {
        if (error.response) {
            console.error(error.response.status);
            console.error(error.response.data);
            throw new OpenAiException(error.status, error.response, error.response.data);
        } else {
            console.error(error.message);
            throw new OpenAiException(null, null, error.message);
        }
    }
}

class OpenAiException extends Error {
    code;
    response;
    body;

    constructor(statusCode, response, body) {
        super(`Error while communicating with OpenAI: ${statusCode} - ${body}`);

        this.code = statusCode;
        this.response = response;
        this.body = body;
    }
}
