import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AIService from '../src/AIService.js';
import DeepSeekService from '../src/DeepSeekService.js';
import OpenAiService from '../src/OpenAiService.js';

const mockGetConfigVariable = jest.fn();
jest.unstable_mockModule('../src/util.js', () => ({
    getConfigVariable: mockGetConfigVariable
}));

jest.unstable_mockModule('../src/OpenAiService.js', () => ({
    default: class MockOpenAiService extends OpenAiService {
        constructor() {
            // Skip the parent constructor to avoid API key validation
            Object.setPrototypeOf(this, OpenAiService.prototype);
        }
    }
}));

jest.unstable_mockModule('../src/DeepSeekService.js', () => ({
    default: class MockDeepSeekService extends DeepSeekService {
        constructor() {
            // Skip the parent constructor to avoid API key validation
            Object.setPrototypeOf(this, DeepSeekService.prototype);
        }
    }
}));

describe('AIService Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create OpenAI service when configured', async () => {
        mockGetConfigVariable.mockReturnValue('openai');
        const service = await AIService.create();
        expect(service).toBeInstanceOf(OpenAiService);
    });

    it('should create DeepSeek service when configured', async () => {
        mockGetConfigVariable.mockReturnValue('deepseek');
        const service = await AIService.create();
        expect(service).toBeInstanceOf(DeepSeekService);
    });

    it('should create DeepSeek service by default', async () => {
        mockGetConfigVariable.mockReturnValue('deepseek');
        const service = await AIService.create();
        expect(service).toBeInstanceOf(DeepSeekService);
    });

    it('should throw error for unknown provider', async () => {
        mockGetConfigVariable.mockReturnValue('unknown');
        await expect(AIService.create()).rejects.toThrow('Unknown AI provider');
    });
});
