import { v4 as uuid } from "uuid";
import EventEmitter from "events";
import { debug } from "./util.js";

export default class JobList {
    #jobs = new Map();
    #eventEmitter = new EventEmitter();

    constructor() {
        debug("JobList initialized");
    }

    on(event, listener) {
        debug(`Listener added for event: ${event}`);
        this.#eventEmitter.on(event, listener);
    }

    getJobs() {
        debug("getJobs called");
        return this.#jobs;
    }

    createJob(data) {
        const id = uuid();
        const created = new Date();

        const job = {
            id,
            created,
            status: "queued",
            data,
        };

        this.#jobs.set(id, job);
        debug("Job created", job);
        this.#eventEmitter.emit('job created', { job, jobs: Array.from(this.#jobs.values()) });

        return job;
    }

    updateJobData(id, data) {
        const job = this.#jobs.get(id);
        job.data = data;
        debug(`Job data updated for job id: ${id}`, job);
        this.#eventEmitter.emit('job updated', { job, jobs: Array.from(this.#jobs.values()) });
    }

    setJobInProgress(id) {
        const job = this.#jobs.get(id);
        job.status = "in_progress";
        debug(`Job status set to in_progress for job id: ${id}`, job);
        this.#eventEmitter.emit('job updated', { job, jobs: Array.from(this.#jobs.values()) });
    }

    setJobFinished(id) {
        const job = this.#jobs.get(id);
        job.status = "finished";
        debug(`Job status set to finished for job id: ${id}`, job);
        this.#eventEmitter.emit('job updated', { job, jobs: Array.from(this.#jobs.values()) });
    }
}
