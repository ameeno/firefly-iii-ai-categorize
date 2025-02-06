import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import App from '../src/App.js';

describe('Webhook Tests', () => {
    let app;
    let mockFireflyService;
    let mockAIService;
    let mockJobList;
    let mockQueue;

    beforeEach(() => {
        mockFireflyService = {
            getCategories: jest.fn().mockResolvedValue(new Map([['Food', '1'], ['Transport', '2']])),
            setCategory: jest.fn().mockResolvedValue(true)
        };

        mockAIService = {
            classify: jest.fn().mockResolvedValue({
                category: 'Food',
                prompt: 'test prompt',
                response: 'test response'
            })
        };

        mockJobList = {
            createJob: jest.fn().mockReturnValue({ id: '1', data: {} }),
            setJobInProgress: jest.fn(),
            updateJobData: jest.fn(),
            setJobFinished: jest.fn()
        };

        mockQueue = {
            push: jest.fn().mockImplementation(fn => fn())
        };

        app = new App();
        Object.defineProperty(app, '#firefly', {
            value: mockFireflyService,
            writable: true
        });
        Object.defineProperty(app, '#aiService', {
            value: mockAIService,
            writable: true
        });
        Object.defineProperty(app, '#jobList', {
            value: mockJobList,
            writable: true
        });
        Object.defineProperty(app, '#queue', {
            value: mockQueue,
            writable: true
        });

        // Expose private method for testing
        app.handleWebhook = async (req, res) => {
            return app['#handleWebhook'](req, res);
        };
    });

    it('should process webhook request successfully', async () => {
        const req = {
            body: {
                trigger: 'STORE_TRANSACTION',
                response: 'TRANSACTIONS',
                content: {
                    id: '123',
                    transactions: [{
                        type: 'withdrawal',
                        category_id: null,
                        description: 'Grocery shopping',
                        destination_name: 'Local Market'
                    }]
                }
            }
        };

        const res = {
            send: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        await app.handleWebhook(req, res);

        expect(mockFireflyService.getCategories).toHaveBeenCalled();
        expect(mockAIService.classify).toHaveBeenCalledWith(
            ['Food', 'Transport'],
            'Local Market',
            'Grocery shopping'
        );
        expect(mockFireflyService.setCategory).toHaveBeenCalledWith('123', req.body.content.transactions, '1');
        expect(mockJobList.createJob).toHaveBeenCalled();
        expect(mockJobList.setJobFinished).toHaveBeenCalled();
    });
});
