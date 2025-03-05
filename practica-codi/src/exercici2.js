// Requeriments
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Constants
const FOLDER_NAME = 'steamreviews';
const GAMES_CSV = 'games.csv';
const REVIEWS_CSV = 'reviews.csv';
const OUTPUT_JSON = 'exercici2_resposta.json';

// Funció per llegir el CSV de forma asíncrona
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

// Funció per analitzar el sentiment del text
async function getSentiment(text) {
    try {
        console.log('Enviant petició a Ollama...');
        console.log('Model:', process.env.CHAT_API_OLLAMA_MODEL_TEXT);
        
        const response = await fetch(`${process.env.CHAT_API_OLLAMA_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: process.env.CHAT_API_OLLAMA_MODEL_TEXT,
                prompt: `Analyze the sentiment of this text and respond with only one word (positive/negative/neutral): "${text}"`,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('Resposta completa d\'Ollama:', JSON.stringify(data, null, 2));
        
        if (!data || !data.response) {
            throw new Error('La resposta d\'Ollama no té el format esperat');
        }

        return data.response.trim().toLowerCase();
    } catch (error) {
        console.error('Error en la petició a Ollama:', error);
        return 'error';
    }
}

async function execute() {
    try {
        // Obtenim la ruta del directori de dades
        const folderPath = process.env.DATA_PATH;

        // Validem les variables d'entorn necessàries
        if (!folderPath) {
            throw new Error('La variable d\'entorn DATA_PATH no està definida');
        }
        if (!process.env.CHAT_API_OLLAMA_URL) {
            throw new Error('La variable d\'entorn CHAT_API_OLLAMA_URL no està definida');
        }
        if (!process.env.CHAT_API_OLLAMA_MODEL_TEXT) {
            throw new Error('La variable d\'entorn CHAT_API_OLLAMA_MODEL_TEXT no està definida');
        }

        // Construïm les rutes completes als fitxers CSV
        const gamesPath = path.resolve(__dirname, '..', '..', 'data', FOLDER_NAME, GAMES_CSV);
        const reviewsPath = path.resolve(__dirname, '..', '..', 'data', FOLDER_NAME, REVIEWS_CSV);

        // Validem si els fitxers existeixen
        if (!fs.existsSync(gamesPath) || !fs.existsSync(reviewsPath)) {
            throw new Error('Algun dels fitxers CSV no existeix');
        }

        // Llegim els CSVs
        const gamesData = await processCSV(gamesPath);
        const reviewsData = await processCSV(reviewsPath);
        const selectedGames = gamesData.slice(0, 2);  // Seleccionem els dos primers jocs
        const finalResult = { timestamp: new Date().toISOString(), games: [] };

        // Iterem pels dos primers jocs
        for (const game of selectedGames) {
            const gameReviews = reviewsData.filter(review => review.app_id === game.appid).slice(0, 2);
            const sentimentCount = { positive: 0, negative: 0, neutral: 0, error: 0 };

            // Iterem per les primeres 2 reviews del joc
            for (const review of gameReviews) {
                const sentiment = await getSentiment(review.content);
                if (sentimentCount.hasOwnProperty(sentiment)) {
                    sentimentCount[sentiment]++;
                } else {
                    sentimentCount.error++;
                }
            }

            finalResult.games.push({
                appid: game.appid,
                name: game.name,
                statistics: sentimentCount
            });
        }

        // Desa el resultat en un fitxer JSON
        const outputFilePath = path.resolve(__dirname, '..', '..', 'data', OUTPUT_JSON);
        fs.writeFileSync(outputFilePath, JSON.stringify(finalResult, null, 2));
        console.log('Resultat desat a', outputFilePath);
    } catch (error) {
        console.error('Error durant l\'execució:', error);
    }
}

// Executem la funció principal
execute();
