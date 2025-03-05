// src/__tests__/ollamaClient.test.js (Nou fitxer)
const { makeOllamaRequest } = require('../ollamaClient');
require('dotenv').config();
const {fetch} = require('whatwg-fetch'); // Importem whatwg-fetch
global.fetch = fetch; // Definim fetch globalment

describe('makeOllamaRequest', () => {
    it('should throw an error for non-200 status codes', async () => {
        const mockFetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: () => Promise.resolve({}), // Resposta buida per consistència
            })
        );
        global.fetch = mockFetch;

        await expect(makeOllamaRequest('test-model', 'test-prompt')).rejects.toThrow('HTTP error! status: 500');
    });

    it('should throw an error for invalid Ollama response format', async () => {
        const mockFetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}), // Sense la propietat 'response'
            })
        );
        global.fetch = mockFetch;
        await expect(makeOllamaRequest('test-model', 'test-prompt')).rejects.toThrow('Ollama response format error');
    });


    it('should return the trimmed response on success', async () => {
        const mockResponse = { response: '  success  ' };
        const mockFetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockResponse),
            })
        );
        global.fetch = mockFetch;

        const result = await makeOllamaRequest('test-model', 'test-prompt');
        expect(result).toBe('success'); // Comprova que retorna la resposta sense espais extra
    });
});