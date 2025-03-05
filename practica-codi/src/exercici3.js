// Importaciones
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Constantes desde variables de entorno
const IMAGES_SUBFOLDER = 'imatges/animals';
const IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif'];
const OLLAMA_URL = process.env.CHAT_API_OLLAMA_URL;
const OLLAMA_MODEL = process.env.CHAT_API_OLLAMA_MODEL_VISION;
const OUTPUT_FILE_PATH = path.resolve(__dirname, '..', '..', 'data', 'exercici3_resposta.json'); // Ruta del archivo de salida

// Función para leer un archivo y convertirlo a Base64
async function convertirImagenABase64(rutaImagen) {
    try {
        const datos = await fs.readFile(rutaImagen);
        return Buffer.from(datos).toString('base64');
    } catch (error) {
        console.error(`Error al leer o convertir la imagen ${rutaImagen}:`, error.message);
        return null;
    }
}

// Función para realizar la petición a Ollama con detalles del error
async function realizarPeticionOllama(base64Imagen, mensaje) {
    const cuerpoPeticion = {
        model: OLLAMA_MODEL,
        prompt: mensaje,
        images: [base64Imagen],
        stream: false
    };

    try {
        console.log('Enviando solicitud a Ollama...');
        
        let respuesta = await fetch(`${OLLAMA_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cuerpoPeticion)
        });

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status} ${respuesta.statusText}`);
        }

        const datos = await respuesta.json();

        // Verificar si la respuesta es válida
        if (!datos || !datos.response) {
            throw new Error('La respuesta de Ollama no tiene el formato esperado');
        }

        return datos.response;
    } catch (error) {
        console.error('Error detallado en la solicitud a Ollama:', error);
        return null;
    }
}

// Función para guardar la respuesta en un archivo JSON
async function guardarResultadoEnArchivo(respuestas) {
    const estructuraRespuesta = {
        analisis: respuestas
    };

    try {
        // Escribimos la respuesta en el archivo
        await fs.writeFile(OUTPUT_FILE_PATH, JSON.stringify(estructuraRespuesta, null, 2));
        console.log(`Respuesta guardada en ${OUTPUT_FILE_PATH}`);
    } catch (error) {
        console.error('Error al guardar la respuesta:', error.message);
    }
}

// Función principal
async function ejecutarProceso() {
    try {
        if (!process.env.DATA_PATH) {
            throw new Error('La variable de entorno DATA_PATH no está definida.');
        }
        if (!OLLAMA_URL) {
            throw new Error('La variable de entorno CHAT_API_OLLAMA_URL no está definida.');
        }
        if (!OLLAMA_MODEL) {
            throw new Error('La variable de entorno CHAT_API_OLLAMA_MODEL no está definida.');
        }

        const carpetaImagenes = path.resolve(__dirname, '..', '..', 'data', IMAGES_SUBFOLDER);
        try {
            await fs.access(carpetaImagenes);
        } catch (error) {
            throw new Error(`El directorio de imágenes no existe: ${carpetaImagenes}`);
        }

        const directoriosAnimales = await fs.readdir(carpetaImagenes);
        let respuestasFinales = []; // Guardar todas las respuestas

        for (const directorioAnimal of directoriosAnimales) {
            const rutaDirectorio = path.join(carpetaImagenes, directorioAnimal);

            try {
                const estadisticas = await fs.stat(rutaDirectorio);
                if (!estadisticas.isDirectory()) {
                    console.log(`Ignorando elemento no directorio: ${rutaDirectorio}`);
                    continue;
                }
            } catch (error) {
                console.error(`Error al obtener información del directorio: ${rutaDirectorio}`, error.message);
                continue;
            }

            const archivosImagen = await fs.readdir(rutaDirectorio);

            for (const archivoImagen of archivosImagen) {
                const rutaImagen = path.join(rutaDirectorio, archivoImagen);
                const extension = path.extname(rutaImagen).toLowerCase();
                
                if (!IMAGE_TYPES.includes(extension)) {
                    console.log(`Ignorando archivo no válido: ${rutaImagen}`);
                    continue;
                }

                const cadenaBase64 = await convertirImagenABase64(rutaImagen);

                if (cadenaBase64) {
                    console.log(`\nProcesando imagen: ${rutaImagen}`);
                    console.log(`Tamaño de la imagen en Base64: ${cadenaBase64.length} caracteres`);
                    
                    // Actualizamos el mensaje para solicitar más detalles sobre el animal
                    const mensaje = `
                        Responde solo con un objeto JSON con las siguientes claves, sin explicaciones ni comentarios adicionales. Si no puedes identificar un dato, usa "Desconocido" o "Desconocida" según corresponda:
                        {
                            "nombre_comun": "valor",
                            "nombre_cientifico": "valor",
                            "clasificacion": {
                                "clase": "valor",
                                "orden": "valor",
                                "familia": "valor"
                            },
                            "habitat": {
                                "tipos": ["valor"],
                                "region": ["valor"],
                                "clima": ["valor"]
                            },
                            "dieta": {
                                "tipo": "valor",
                                "alimentos_principales": ["valor"]
                            },
                            "caracteristicas_fisicas": {
                                "tamaño": {
                                    "altura_promedio_cm": "valor",
                                    "peso_promedio_kg": "valor"
                                },
                                "colores_dominantes": ["valor"],
                                "rasgos_distintivos": ["valor"]
                            },
                            "estado_conservacion": {
                                "clasificacion_IUCN": "valor",
                                "amenazas_principales": ["valor"]
                            }
                        }
                    `;
                    
                    
                    let respuesta = await realizarPeticionOllama(cadenaBase64, mensaje);

                    if (respuesta) {
                        console.log(`\nRespuesta de Ollama para ${archivoImagen}:`);
                        console.log(respuesta);
                        respuesta = JSON.parse(respuesta);

                        // Crear la estructura de la respuesta para este archivo de imagen
                        const analisis = {
                            imagen: {
                                nombre_archivo: archivoImagen,
                            },
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

                        // Agregamos el análisis de esta imagen
                        respuestasFinales.push(analisis);
                    } else {
                        console.error(`\nNo se recibió una respuesta válida para ${archivoImagen}`);
                    }
                    console.log('------------------------');
                }
            }
            console.log(`\nFinalizamos después de procesar el primer directorio.`);
            break; // Detenemos la ejecución después de procesar el primer directorio
        }

        // Después de procesar todas las imágenes, guardamos las respuestas en el archivo
        await guardarResultadoEnArchivo(respuestasFinales);

    } catch (error) {
        console.error('Error durante la ejecución:', error.message);
    }
}

// Ejecutamos la función principal
ejecutarProceso();
