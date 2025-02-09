import OpenAI from "openai";
import { getConfigVariable, debug } from "./util.js";

export default class OpenAiService {
    #openAi;
    #model = "gpt-4o"; // updated to GPT-4o for better results

    constructor() {
        const apiKey = getConfigVariable("OPENAI_API_KEY");
        this.#model = getConfigVariable("OPENAI_MODEL") || "gpt-4o";

        this.#openAi = new OpenAI({
            apiKey
        });
        debug("OpenAiService initialized with model", this.#model);
    }

    async classify(categories, destinationName, description) {
        try {
            const prompt = this.#generatePrompt(categories, destinationName, description);
            debug("Generated prompt:", prompt);

            const response = await this.#openAi.chat.completions.create({
                model: this.#model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

            let guess = response.choices[0].message.content;
            guess = guess.replace("\n", "").trim();

            if (categories.indexOf(guess) === -1) {
                console.warn(`OpenAI could not classify the transaction. 
                Prompt: ${prompt}
                OpenAI's guess: ${guess}`);
                return null;
            }

            return {
                prompt,
                response: response.choices[0].message.content,
                category: guess
            };

        } catch (error) {
            if (error.status) {
                console.error(error.status);
                console.error(error.body);
                throw new OpenAiException(error.status, error.body);
            } else {
                console.error(error.message);
                throw new OpenAiException(null, null, error.message);
            }
        }
    }

    #generatePrompt(categories, destinationName, description) {
        const staticPrompt = `I want to categorize transactions on my bank account into the following categories: ${categories.join(", ")}.
Please provide a consistent categorization. Just output the name of the category.`;

const dynamicPrompt = `
Transaction details:
- Destination: "${destinationName}"
- Description: "${description}"
`;

        return staticPrompt + dynamicPrompt;
    }
}

class OpenAiException extends Error {
    code;
    body;

    constructor(statusCode, body) {
        super(`Error while communicating with OpenAI: ${statusCode} - ${body}`);
        this.code = statusCode;
        this.body = body;
    }
}
