import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AIService from '../src/AIService.js';

// Mock environment variables
process.env.DEEPSEEK_API_KEY = 'mock-deepseek-key';
process.env.OPENAI_API_KEY = 'mock-openai-key';

const mockGetConfigVariable = jest.fn();
jest.unstable_mockModule('../src/util.js', () => ({
    getConfigVariable: mockGetConfigVariable
}));

const mockOpenAiService = jest.fn().mockImplementation(() => ({
    makeAIRequest: jest.fn(),
    getProviderName: jest.fn().mockReturnValue('openai'),
    handleError: jest.fn()
}));

const mockDeepSeekService = jest.fn().mockImplementation(() => ({
    makeAIRequest: jest.fn(),
    getProviderName: jest.fn().mockReturnValue('deepseek'),
    handleError: jest.fn()
}));

jest.unstable_mockModule('../src/OpenAiService.js', () => ({
    default: mockOpenAiService
}));

jest.unstable_mockModule('../src/DeepSeekService.js', () => ({
    default: mockDeepSeekService
}));

describe('AIService Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset environment variables before each test
        process.env.DEEPSEEK_API_KEY = 'mock-deepseek-key';
        process.env.OPENAI_API_KEY = 'mock-openai-key';
    });

    it('should create OpenAI service when configured', async () => {
        mockGetConfigVariable.mockReturnValue('openai');
        const service = await AIService.create();
        expect(mockOpenAiService).toHaveBeenCalled();
        expect(service.getProviderName()).toBe('openai');
    });

    it('should create DeepSeek service when configured', async () => {
        mockGetConfigVariable.mockReturnValue('deepseek');
        const service = await AIService.create();
        expect(mockDeepSeekService).toHaveBeenCalled();
        expect(service.getProviderName()).toBe('deepseek');
    });

    it('should create DeepSeek service by default', async () => {
        mockGetConfigVariable.mockReturnValue('deepseek');
        const service = await AIService.create();
        expect(mockDeepSeekService).toHaveBeenCalled();
        expect(service.getProviderName()).toBe('deepseek');
    });

    it('should throw error for unknown provider', async () => {
        mockGetConfigVariable.mockReturnValue('unknown');
        await expect(AIService.create()).rejects.toThrow('Unknown AI provider: unknown. Supported providers are: openai, deepseek');
    });
});
