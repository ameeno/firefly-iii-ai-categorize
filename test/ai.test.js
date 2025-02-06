import { describe, expect, it, jest } from '@jest/globals';
import AIService from '../src/AIService.js';
import DeepSeekService from '../src/DeepSeekService.js';
import OpenAiService from '../src/OpenAiService.js';

jest.mock('../src/util.js', () => ({
    getConfigVariable: jest.fn()
}));

jest.mock('../src/OpenAiService.js');
jest.mock('../src/DeepSeekService.js');

describe('AIService Tests', () => {
    const { getConfigVariable } = require('../src/util.js');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create OpenAI service when configured', () => {
        getConfigVariable.mockReturnValue('openai');
        const service = AIService.create();
        expect(service).toBeInstanceOf(OpenAiService);
    });

    it('should create DeepSeek service when configured', () => {
        getConfigVariable.mockReturnValue('deepseek');
        const service = AIService.create();
        expect(service).toBeInstanceOf(DeepSeekService);
    });

    it('should create DeepSeek service by default', () => {
        getConfigVariable.mockReturnValue('deepseek');
        const service = AIService.create();
        expect(service).toBeInstanceOf(DeepSeekService);
    });

    it('should throw error for unknown provider', () => {
        getConfigVariable.mockReturnValue('unknown');
        expect(() => AIService.create()).toThrow('Unknown AI provider');
    });
});
