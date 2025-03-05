// practica-codi/src/ollamaClient.js (Nou fitxer)
const fetch = require('node-fetch'); // Assegura't que node-fetch està instal·lat: npm install node-fetch
require('dotenv').config();

async function makeOllamaRequest(model, prompt, images = []) {
    const url = process.env.CHAT_API_OLLAMA_URL + '/generate';

    const body = {
        model: model,
        prompt: prompt,
        images: images,
        stream: false,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.response) {
            throw new Error('Ollama response format error');
        }

        return data.response.trim();

    } catch (error) {
        console.error('Error in Ollama request:', error);
        throw error; // Re-throw per a ser gestionat pel caller
    }
}

module.exports = { makeOllamaRequest };