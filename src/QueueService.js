import EventEmitter from "events";
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { v4 as uuid } from "uuid";

export default class QueueService {
    #db;
    #eventEmitter = new EventEmitter();
    #retryDelays = [1000, 5000, 15000, 30000, 60000]; // Retry delays in milliseconds

    async initialize() {
        this.#db = await open({
            filename: './data/queue.db',
            driver: sqlite3.Database
        });

        await this.#createTables();
        await this.#retryFailedJobs();
    }

    async #createTables() {
        await this.#db.exec(`
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                type TEXT NOT NULL,
                data TEXT NOT NULL,
                error TEXT,
                retry_count INTEGER DEFAULT 0,
                next_retry DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_status ON jobs(status);
            CREATE INDEX IF NOT EXISTS idx_next_retry ON jobs(next_retry);
        `);
    }

    on(event, listener) {
        this.#eventEmitter.on(event, listener);
    }

    async createJob(type, data) {
        // Only create entry in database if job needs persistence
        const id = uuid();
        const job = {
            id,
            type,
            status: 'processing', // Start as processing since we only store in-progress jobs
            data: JSON.stringify(data),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await this.#db.run(
            `INSERT INTO jobs (id, type, status, data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [job.id, job.type, job.status, job.data, job.created_at, job.updated_at]
        );

        this.#eventEmitter.emit('job created', job);
        return job;
    }

    async markJobComplete(id) {
        // Remove from database since job is complete
        await this.#db.run('DELETE FROM jobs WHERE id = ?', [id]);
        this.#eventEmitter.emit('job completed', {id});
    }

    async markJobFailed(id, error) {
        const job = await this.#db.get('SELECT * FROM jobs WHERE id = ?', [id]);
        const retryCount = (job.retry_count || 0) + 1;
        const delay = this.#retryDelays[Math.min(retryCount - 1, this.#retryDelays.length - 1)];
        const nextRetry = new Date(Date.now() + delay).toISOString();

        if (retryCount <= this.#retryDelays.length) {
            await this.#db.run(
                `UPDATE jobs
                 SET status = 'failed',
                     error = ?,
                     retry_count = ?,
                     next_retry = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [error.message, retryCount, nextRetry, id]
            );
            this.#eventEmitter.emit('job failed', {id, error: error.message, willRetry: true, nextRetry});
        } else {
            // Remove dead jobs from database
            await this.#db.run('DELETE FROM jobs WHERE id = ?', [id]);
            this.#eventEmitter.emit('job dead', {id, error: error.message});
        }
    }

    async #retryFailedJobs() {
        const failedJobs = await this.#db.all(
            `SELECT * FROM jobs
             WHERE status = 'failed'
             AND next_retry <= CURRENT_TIMESTAMP`
        );

        for (const job of failedJobs) {
            job.data = JSON.parse(job.data);
            this.#eventEmitter.emit('job retry', job);
        }

        // Clear retried jobs from database as they'll be handled by in-memory queue
        if (failedJobs.length > 0) {
            await this.#db.run(
                `DELETE FROM jobs
                 WHERE status = 'failed'
                 AND next_retry <= CURRENT_TIMESTAMP`
            );
        }
    }

    async getJobStats() {
        return await this.#db.all(
            `SELECT status, COUNT(*) as count
             FROM jobs
             GROUP BY status`
        );
    }
}
