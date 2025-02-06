import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import App from '../src/App.js';

describe('Webhook Tests', () => {
    let app;
    let mockFireflyService;
    let mockAIService;

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

        app = new App();
        // Use Object.defineProperty to set private fields
        Object.defineProperty(app, '#firefly', {
            value: mockFireflyService,
            writable: true
        });
        Object.defineProperty(app, '#aiService', {
            value: mockAIService,
            writable: true
        });
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

        // Access the private method using Object.getOwnPropertyDescriptor
        const handleWebhook = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(app), '#handleWebhook').value;
        await handleWebhook.call(app, req, res);

        expect(mockFireflyService.getCategories).toHaveBeenCalled();
        expect(mockAIService.classify).toHaveBeenCalledWith(
            ['Food', 'Transport'],
            'Local Market',
            'Grocery shopping'
        );
        expect(mockFireflyService.setCategory).toHaveBeenCalledWith('123', req.body.content.transactions, '1');
    });
});
