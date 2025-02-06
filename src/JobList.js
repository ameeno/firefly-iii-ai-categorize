import EventEmitter from "events";
import { v4 as uuid } from "uuid";

export default class JobList {
    #jobs = new Map();
    #eventEmitter = new EventEmitter();

    constructor() {
    }

    on(event, listener) {
        this.#eventEmitter.on(event, listener);
    }

    getJobs() {
        return this.#jobs;
    }

    createJob(data) {
        const id = uuid()
        const created = new Date();

        const job = {
            id,
            created,
            status: "queued",
            data,
            error: null
        }

        this.#jobs.set(id, job);
        this.#eventEmitter.emit('job created', {job, jobs: Array.from(this.#jobs.values())})

        return job;
    }

    updateJobData(id, data) {
        const job = this.#jobs.get(id);
        if (!job) return null;
        job.data = data;
        this.#eventEmitter.emit('job updated', {job, jobs: Array.from(this.#jobs.values())});
        return job;
    }

    setJobInProgress(id) {
        const job = this.#jobs.get(id);
        if (!job) return null;
        job.status = "in_progress";
        this.#eventEmitter.emit('job updated', {job, jobs: Array.from(this.#jobs.values())});
        return job;
    }

    setJobFinished(id) {
        const job = this.#jobs.get(id);
        if (!job) return null;
        job.status = "finished";
        this.#eventEmitter.emit('job updated', {job, jobs: Array.from(this.#jobs.values())});
        this.#jobs.delete(id); // Remove finished job from memory
        this.#eventEmitter.emit('job finished', {job});
        return job;
    }

    setJobFailed(id, error) {
        const job = this.#jobs.get(id);
        if (!job) return null;
        job.status = "failed";
        job.error = {
            message: error.message || String(error),
            timestamp: new Date().toISOString(),
            code: error.code || 'UNKNOWN_ERROR',
            stack: error.stack
        };
        this.#eventEmitter.emit('job updated', {job, jobs: Array.from(this.#jobs.values())});
        this.#jobs.delete(id); // Remove failed job from memory
        this.#eventEmitter.emit('job failed', {job});
        return job;
    }

    removeJob(id) {
        const job = this.#jobs.get(id);
        if (!job) return null;
        this.#jobs.delete(id);
        this.#eventEmitter.emit('job removed', {job, jobs: Array.from(this.#jobs.values())});
        return job;
    }
}
