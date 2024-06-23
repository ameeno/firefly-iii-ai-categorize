import { Configuration, OpenAIApi } from "openai";
import { getConfigVariable } from "./util.js";

export default class OpenAiService {
  #openAi;
  #model = "gpt-4o-2024-05-13";

  constructor() {
    const apiKey = getConfigVariable("OPENAI_API_KEY");

    const configuration = new Configuration({
      apiKey,
    });

    this.#openAi = new OpenAIApi(configuration);
  }

  async classify(categories, destinationName, description) {
    try {
      const messages = this.#generateMessages(
        categories,
        destinationName,
        description
      );

      const response = await this.#openAi.createChatCompletion({
        model: this.#model,
        messages,
      });

      let guess = response.data.choices[0].message.content;
      guess = guess.replace("\n", "");
      guess = guess.trim();

      if (categories.indexOf(guess) === -1) {
        console.warn(`OpenAI could not classify the transaction. 
                Prompt: ${messages[1].content}
                OpenAIs guess: ${guess}`);
        return null;
      }

      return {
        prompt: messages[1].content,
        response: response.data.choices[0].message.content,
        category: guess,
      };
    } catch (error) {
      if (error.response) {
        console.error(error.response.status);
        console.error(error.response.data);
        throw new OpenAiException(
          error.status,
          error.response,
          error.response.data
        );
      } else {
        console.error(error.message);
        throw new OpenAiException(null, null, error.message);
      }
    }
  }

  #generateMessages(categories, destinationName, description) {
    const prompt = `Given i want to categorize transactions on my bank account into this categories:
    
    ${categories.join(", ")}

In which category would a transaction from "${destinationName}" with the subject "${description}" fall into?
Just output the name of the category.
Does not have to be a complete sentence.
Ignore any long string of numbers or special characters.
The subject is in Mexican Spanish.`;

    return [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ];
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
