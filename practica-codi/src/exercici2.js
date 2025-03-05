// practica-codi/src/exercici2.js
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { makeOllamaRequest } = require('./ollamaClient'); // Importem el client Ollama

const FOLDER_NAME = 'steamreviews';
const GAMES_CSV = 'games.csv';
const REVIEWS_CSV = 'reviews.csv';
const OUTPUT_JSON = 'exercici2_resposta.json';

// Funció per llegir el CSV (utilitzant Promises per consistència, però sense canvis substancials)
async function processCSV(filePath) {
    const data = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => data.push(row))
            .on('end', () => resolve(data))
            .on('error', reject);
    });
}

// Funció per analitzar el sentiment (ara utilitza el client Ollama)
async function getSentiment(text) {
    try {
        const prompt = `Analyze the sentiment of this text and respond with only one word (positive/negative/neutral): "${text}"`;
        const response = await makeOllamaRequest(process.env.CHAT_API_OLLAMA_MODEL_TEXT, prompt);
        return response.toLowerCase();
    } catch (error) {
        console.error('Error getting sentiment:', error.message);
        return 'error'; // Gestionem l'error retornant 'error'
    }
}

async function execute() {
    try {
        const folderPath = process.env.DATA_PATH;

        if (!folderPath || !process.env.CHAT_API_OLLAMA_URL || !process.env.CHAT_API_OLLAMA_MODEL_TEXT) {
            throw new Error('Les variables d\'entorn DATA_PATH, CHAT_API_OLLAMA_URL i CHAT_API_OLLAMA_MODEL_TEXT han d\'estar definides.');
        }

        const gamesPath = path.resolve(__dirname, '..', '..', 'data', FOLDER_NAME, GAMES_CSV);
        const reviewsPath = path.resolve(__dirname, '..', '..', 'data', FOLDER_NAME, REVIEWS_CSV);

        if (!fs.existsSync(gamesPath) || !fs.existsSync(reviewsPath)) {
            throw new Error('Algun dels fitxers CSV no existeix.');
        }

        const gamesData = await processCSV(gamesPath);
        const reviewsData = await processCSV(reviewsPath);
        const selectedGames = gamesData.slice(0, 2);
        const finalResult = { timestamp: new Date().toISOString(), games: [] };

        for (const game of selectedGames) {
            const gameReviews = reviewsData.filter(review => review.app_id === game.appid).slice(0, 2);
            const sentimentCount = { positive: 0, negative: 0, neutral: 0, error: 0 };

            for (const review of gameReviews) {
                const sentiment = await getSentiment(review.content);
                sentimentCount[sentiment] = (sentimentCount[sentiment] || 0) + 1; // Simplificació
            }

            finalResult.games.push({
                appid: game.appid,
                name: game.name,
                statistics: sentimentCount
            });
        }

        const outputFilePath = path.resolve(__dirname, '..', '..', 'data', OUTPUT_JSON);
        fs.writeFileSync(outputFilePath, JSON.stringify(finalResult, null, 2));
        console.log('Resultat desat a', outputFilePath);
    } catch (error) {
        console.error('Error durant l\'execució:', error.message); // Millora: missatge d'error més específic
    }
}

execute();