// practica-codi/src/exercici3.js
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { makeOllamaRequest } = require('./ollamaClient'); // Importem el client Ollama

const IMAGES_SUBFOLDER = 'imatges/animals';
const IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif'];
const OLLAMA_MODEL = process.env.CHAT_API_OLLAMA_MODEL_VISION; // Simplificació
const OUTPUT_FILE_PATH = path.resolve(__dirname, '..', '..', 'data', 'exercici3_resposta.json');

// Funció per convertir imatge a Base64 (sense canvis)
async function convertirImagenABase64(rutaImagen) {
    try {
        const datos = await fs.readFile(rutaImagen);
        return Buffer.from(datos).toString('base64');
    } catch (error) {
        console.error(`Error al leer o convertir la imagen ${rutaImagen}:`, error.message);
        return null;
    }
}

// Funció per realitzar la petició a Ollama (ara utilitza el client Ollama)
async function realizarPeticionOllama(base64Imagen, mensaje) {
    try {
        const respuesta = await makeOllamaRequest(OLLAMA_MODEL, mensaje, [base64Imagen]);
        return respuesta;
    } catch (error) {
        console.error('Error en la solicitud a Ollama:', error.message);
        return null;
    }
}

async function guardarResultadoEnArchivo(respuestas) {
    const estructuraRespuesta = { analisis: respuestas };
    try {
        await fs.writeFile(OUTPUT_FILE_PATH, JSON.stringify(estructuraRespuesta, null, 2));
        console.log(`Respuesta guardada en ${OUTPUT_FILE_PATH}`);
    } catch (error) {
        console.error('Error al guardar la respuesta:', error.message);
    }
}

async function ejecutarProceso() {
    try {
        if (!process.env.DATA_PATH || !process.env.CHAT_API_OLLAMA_URL || !OLLAMA_MODEL) {
            throw new Error('Les variables d\'entorn DATA_PATH, CHAT_API_OLLAMA_URL i CHAT_API_OLLAMA_MODEL_VISION han d\'estar definides.');
        }

        const carpetaImagenes = path.resolve(__dirname, '..', '..', 'data', IMAGES_SUBFOLDER);
        try {
            await fs.access(carpetaImagenes);
        } catch {
            throw new Error(`El directori d'imatges no existeix: ${carpetaImagenes}`);
        }

        const directoriosAnimales = await fs.readdir(carpetaImagenes);
        let respuestasFinales = [];

        for (const directorioAnimal of directoriosAnimales) {
            const rutaDirectorio = path.join(carpetaImagenes, directorioAnimal);

            try {
                if (!(await fs.stat(rutaDirectorio)).isDirectory()) {
                    console.log(`Ignorant element no directori: ${rutaDirectorio}`);
                    continue;
                }
            } catch (error) {
                console.error(`Error en comprovar directori: ${rutaDirectorio}`, error.message);
                continue;
            }

            const archivosImagen = await fs.readdir(rutaDirectorio);

            for (const archivoImagen of archivosImagen) {
                const rutaImagen = path.join(rutaDirectorio, archivoImagen);
                if (!IMAGE_TYPES.includes(path.extname(rutaImagen).toLowerCase())) {
                    console.log(`Ignorant arxiu no vàlid: ${rutaImagen}`);
                    continue;
                }

                const cadenaBase64 = await convertirImagenABase64(rutaImagen);
                if (!cadenaBase64) continue;

                console.log(`\nProcessant imatge: ${rutaImagen}`);
                const mensaje = `
                    Respon només amb un objecte JSON amb les següents claus, sense explicacions ni comentaris addicionals. Si no pots identificar una dada, utilitza "Desconegut" o "Desconeguda" segons correspongui:
                    {
                        "nombre_comun": "valor",
                        "nombre_cientifico": "valor",
                        "clasificacion": { "clase": "valor", "orden": "valor", "familia": "valor" },
                        "habitat": { "tipos": ["valor"], "region": ["valor"], "clima": ["valor"] },
                        "dieta": { "tipo": "valor", "alimentos_principales": ["valor"] },
                        "caracteristicas_fisicas": {
                            "tamaño": { "altura_promedio_cm": "valor", "peso_promedio_kg": "valor" },
                            "colores_dominantes": ["valor"],
                            "rasgos_distintivos": ["valor"]
                        },
                        "estado_conservacion": { "clasificacion_IUCN": "valor", "amenazas_principales": ["valor"] }
                    }
                `;

                let respuesta = await realizarPeticionOllama(cadenaBase64, mensaje);
                if (!respuesta) {
                    console.error(`No s'ha rebut resposta per a ${archivoImagen}`);
                    continue;
                }

                console.log(`\nResposta d'Ollama per a ${archivoImagen}:`);
                console.log(respuesta);
                // No cal fer JSON.parse(respuesta) - ja és un objecte JSON

                try {
                    respuesta = JSON.parse(respuesta) //Afegim el parse per que funcioni correctament.
                    const analisis = {
                        imagen: { nombre_archivo: archivoImagen },
                        analisis: {
                            nombre_comun: respuesta.nombre_comun || "Desconocido",
                            nombre_cientifico: respuesta.nombre_cientifico || "Desconocido",
                            clasificacion: {
                                clase: respuesta.clasificacion?.clase || "Desconocida",
                                orden: respuesta.clasificacion?.orden || "Desconocido",
                                familia: respuesta.clasificacion?.familia || "Desconocida",
                            },
                            habitat: {
                                tipos: respuesta.habitat?.tipos || ["Desconocido"],
                                region: respuesta.habitat?.region || ["Desconocida"],
                                clima: respuesta.habitat?.clima || ["Desconocido"],
                            },
                            dieta: {
                                tipo: respuesta.dieta?.tipo || "Desconocido",
                                alimentos_principales: respuesta.dieta?.alimentos_principales || ["Desconocidos"],
                            },
                            caracteristicas_fisicas: {
                                tamaño: {
                                    altura_promedio_cm: respuesta.caracteristicas_fisicas?.tamaño?.altura_promedio_cm || "Desconocida",
                                    peso_promedio_kg: respuesta.caracteristicas_fisicas?.tamaño?.peso_promedio_kg || "Desconocido",
                                },
                                colores_dominantes: respuesta.caracteristicas_fisicas?.colores_dominantes || ["Desconocidos"],
                                rasgos_distintivos: respuesta.caracteristicas_fisicas?.rasgos_distintivos || ["Desconocidos"],
                            },
                            estado_conservacion: {
                                clasificacion_IUCN: respuesta.estado_conservacion?.clasificacion_IUCN || "Desconocida",
                                amenazas_principales: respuesta.estado_conservacion?.amenazas_principales || ["Desconocidas"],
                            }
                        }
                    };
                    respuestasFinales.push(analisis);
                } catch (parseError) {
                        console.error(`Error al parsejar la respuesta JSON de ${archivoImagen}:`, parseError.message);
                        // Considera afegir la imatge actual a 'respuestasFinales' amb un indicador d'error
                        respuestasFinales.push({
                            imagen: { nombre_archivo: archivoImagen, error: "Error al parsejar la respuesta JSON" }
                        });
                }
            }
            //Eliminem el break per a que s'executi amb totes les imatges
            // console.log(`\nFinalitzem després de processar el primer directori.`);
            // break; // Eliminat el break
        }

        await guardarResultadoEnArchivo(respuestasFinales);

    } catch (error) {
        console.error('Error durant l\'execució:', error.message); // Millora: missatge d'error més específic
    }
}

ejecutarProceso();