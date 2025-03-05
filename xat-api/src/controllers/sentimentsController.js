const axios = require('axios');
const { logger } = require('../config/logger');

const OLLAMA_API_URL = process.env.CHAT_API_OLLAMA_URL || 'http://localhost:11434/api';
const DEFAULT_OLLAMA_MODEL = process.env.CHAT_API_OLLAMA_MODEL || 'llama3:latest';

/**
 * Realitza l'anàlisi de sentiment d'un text donat mitjançant Ollama
 * @route POST /api/chat/analisi-sentiment
 */
const ferAnalisiSentiment = async (req, res, next) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
            logger.warn('Text no vàlid per a l\'anàlisi de sentiment');
            return res.status(400).json({ message: 'El text és obligatori i ha de ser una cadena' });
        }

        logger.info('Iniciant anàlisi de sentiment', { llargadaText: text.length });

        // Crear el prompt detallat per Ollama
        const instruccio = `Responde solo con un objeto JSON con las siguientes claves, en sentiment pon si la frase es positiva, negativa o neutra, y en score pon si es negativa, numeros negativos (del 0 al -1, dependiendo de la nagatividad) y si es positiva en numeros positivos (del 0 al 1, dependiendo de la positividad), sin explicaciones ni comentarios adicionales. Si no puedes identificar un dato, usa "Desconegut" o "Desconeguda" según corresponda:
        {
            "text": "${text}",
            "sentiment": "Desconegut",
            "score": 0.0,
            "timestamp": "Desconegut"
        }`;

        // Crida a Ollama per obtenir la resposta
        const respostaOllama = await obtenirRespostaOllama(instruccio);

        // Intentem analitzar la resposta com a JSON
        let respostaJson;
        try {
            respostaJson = JSON.parse(respostaOllama);
        } catch (error) {
            logger.error('Error al parsejar la resposta d\'Ollama', { resposta: respostaOllama });
            return res.status(500).json({ message: 'Error al processar la resposta' });
        }

        // Comprovem que la resposta tingui els camps correctes
        if (!respostaJson.text || respostaJson.sentiment === "Desconegut" || !respostaJson.score || respostaJson.timestamp === "Desconegut") {
            logger.warn('Resposta d\'Ollama incompleta o errònia', { respostaJson });
            return res.status(400).json({ 
                message: 'La resposta no té el format esperat o conté dades desconegudes',
                resposta: respostaJson
            });
        }

        // Format de resposta final
        const resultatFinal = {
            sentiment: respostaJson.sentiment,    // sentiment, per exemple: "positiu"
            puntuació: respostaJson.score,        // score traduït com a "puntuació"
            data_hora: new Date().toISOString()   // Afegir la data actual
        };

        logger.info('Anàlisi de sentiment finalitzada', resultatFinal);

        res.json(resultatFinal);
    } catch (error) {
        logger.error('Error en l\'anàlisi de sentiment', { error: error.message });
        next(error);
    }
};

/**
 * Funció per generar una resposta amb Ollama
 * @param {string} instruccio - Text d'entrada per generar la resposta
 * @param {Object} opcions - Opcions de configuració
 * @returns {Promise<string>} Resposta generada
 */
const obtenirRespostaOllama = async (instruccio, opcions = {}) => {
    try {
        const {
            model = DEFAULT_OLLAMA_MODEL,
            stream = false
        } = opcions;

        logger.debug('Iniciant la generació de resposta', { 
            model, 
            stream,
            llargadaInstruccio: instruccio.length 
        });

        const cosPeticio = {
            model,
            prompt: instruccio,
            stream
        };

        const resposta = await axios.post(`${OLLAMA_API_URL}/generate`, cosPeticio, {
            timeout: 30000,
            responseType: stream ? 'stream' : 'json'
        });

        return resposta.data.response.trim();
    } catch (error) {
        logger.error('Error en la generació de la resposta', {
            error: error.message,
            model: opcions.model,
            stream: opcions.stream
        });
        
        return 'Ho sento, no he pogut generar una resposta en aquest moment.';
    }
};

module.exports = { ferAnalisiSentiment };
