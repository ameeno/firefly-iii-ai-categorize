import express from "express";
import rateLimit from "express-rate-limit";
import * as http from "http";
import Queue from "queue";
import { Server } from "socket.io";
import AIService from "./AIService.js";
import FireflyService from "./FireflyService.js";
import JobList from "./JobList.js";
import { getConfigVariable } from "./util.js";

export default class App {
    #PORT;
    #ENABLE_UI;

    #firefly;
    #aiService;

    #server;
    #io;
    #express;

    #queue;
    #jobList;


    constructor() {
        this.#PORT = getConfigVariable("PORT", '3000');
        this.#ENABLE_UI = getConfigVariable("ENABLE_UI", 'false') === 'true';
    }

    async run() {
        this.#firefly = new FireflyService();
        this.#aiService = AIService.create();

        this.#queue = new Queue({
            timeout: 30 * 1000,
            concurrency: 1,
            autostart: true
        });

        this.#queue.addEventListener('start', job => console.log('Job started', job))
        this.#queue.addEventListener('success', event => console.log('Job success', event.job))
        this.#queue.addEventListener('error', event => console.error('Job error', event.job, event.err, event))
        this.#queue.addEventListener('timeout', event => console.log('Job timeout', event.job))

        this.#express = express();
        this.#server = http.createServer(this.#express)
        this.#io = new Server(this.#server)

        this.#jobList = new JobList();
        this.#jobList.on('job created', data => this.#io.emit('job created', data));
        this.#jobList.on('job updated', data => this.#io.emit('job updated', data));

        // Rate limiting middleware
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        });

        this.#express.use(express.json());
        this.#express.use('/webhook', limiter);

        // Health check endpoint for container monitoring
        this.#express.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        if (this.#ENABLE_UI) {
            this.#express.use('/', express.static('public'))
        }

        this.#express.post('/webhook', this.#onWebhook.bind(this))

        this.#server.listen(this.#PORT, async () => {
            console.log(`Application running on port ${this.#PORT}`);
        });

        this.#io.on('connection', socket => {
            console.log('connected');
            socket.emit('jobs', Array.from(this.#jobList.getJobs().values()));
        })
    }

    #onWebhook(req, res) {
        try {
            console.info("Webhook triggered");
            this.#handleWebhook(req, res);
            res.send("Queued");
        } catch (e) {
            console.error(e)
            res.status(400).send(e.message);
        }
    }

    async #handleWebhook(req, res) {
        try {
            if (req.body?.trigger !== "STORE_TRANSACTION") {
                throw new WebhookException("trigger is not STORE_TRANSACTION. Request will not be processed");
            }

            if (req.body?.response !== "TRANSACTIONS") {
                throw new WebhookException("trigger is not TRANSACTION. Request will not be processed");
            }

            if (!req.body?.content?.id) {
                throw new WebhookException("Missing content.id");
            }

            if (!req.body?.content?.transactions?.length) {
                throw new WebhookException("No transactions are available in content.transactions");
            }

            const transaction = req.body.content.transactions[0];

            if (transaction.type !== "withdrawal") {
                throw new WebhookException("content.transactions[0].type has to be 'withdrawal'. Transaction will be ignored.");
            }

            if (transaction.category_id !== null) {
                throw new WebhookException("content.transactions[0].category_id is already set. Transaction will be ignored.");
            }

            if (!transaction.description) {
                throw new WebhookException("Missing content.transactions[0].description");
            }

            if (!transaction.destination_name) {
                throw new WebhookException("Missing content.transactions[0].destination_name");
            }

            const job = this.#jobList.createJob({
                destinationName: transaction.destination_name,
                description: transaction.description
            });

            this.#queue.push(async () => {
                try {
                    this.#jobList.setJobInProgress(job.id);

                    const categories = await this.#firefly.getCategories();
                    const {category, prompt, response} = await this.#aiService.classify(
                        Array.from(categories.keys()),
                        transaction.destination_name,
                        transaction.description
                    );

                    const newData = Object.assign({}, job.data);
                    newData.category = category;
                    newData.prompt = prompt;
                    newData.response = response;

                    this.#jobList.updateJobData(job.id, newData);

                    if (category && categories.has(category)) {
                        await this.#firefly.setCategory(
                            req.body.content.id,
                            req.body.content.transactions,
                            categories.get(category)
                        );
                    }

                    this.#jobList.setJobFinished(job.id);
                } catch (error) {
                    console.error('Job processing error:', error);
                    this.#jobList.setJobFinished(job.id, error);
                    throw error;
                }
            });

            res.status(200).send('Webhook queued successfully');
        } catch (error) {
            if (error instanceof WebhookException) {
                res.status(400).send(error.message);
            } else {
                console.error('Webhook processing error:', error);
                res.status(500).send('Internal server error');
            }
        }
    }
    }

class WebhookException extends Error {

    constructor(message) {
        super(message);
    }
}
