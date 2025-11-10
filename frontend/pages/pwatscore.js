import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import { CAT_INFO, PWAT_HELP } from '../lib/categorias';
import Layout from '../components/Layout';
import LogoutButton from '../components/LogoutButton';
import { EstadoSelector } from '../components/EstadoBadge';
import { useLanguage } from '../lib/LanguageContext';

export default function Pwatscore() {
    const router = useRouter();
    const { t } = useLanguage();
    const [token, setToken] = useState(null);
    const [imagenId, setImagenId] = useState('');
    const [imagen, setImagen] = useState(null);

    // Debug: Verificar el valor de BACKEND_URL
    useEffect(() => {
        console.log('🔍 BACKEND_URL:', BACKEND_URL);
        console.log(
            '🔍 process.env.NEXT_PUBLIC_API_URL:',
            process.env.NEXT_PUBLIC_API_URL
        );
    }, []);
    const [maskFile, setMaskFile] = useState(null);
    const [segmentacionId, setSegmentacionId] = useState(null);
    const [maskUrl, setMaskUrl] = useState(null);
    const [contourUrl, setContourUrl] = useState(null);
    const [segmentacionUrl, setSegmentacionUrl] = useState(null);
    const [pwatscore, setPwatscore] = useState(null);
    const [error, setError] = useState('');
    const [showContour, setShowContour] = useState(true);
    const [contourColor, setContourColor] = useState('#00ff00');
    const [contourThickness, setContourThickness] = useState(2);
    const [editOpacity, setEditOpacity] = useState(0.6);
    const [showCanvas, setShowCanvas] = useState(false);
    const [loadingMask, setLoadingMask] = useState(false);
    const [loadingPwatscore, setLoadingPwatscore] = useState(false);
    const [existingSegId, setExistingSegId] = useState(null);
    const [existingMaskUrl, setExistingMaskUrl] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
    const [profesional, setProfesional] = useState(null);
    const [ladoImagen, setLadoImagen] = useState(null); // null, false (izq), true (der)
    const [actualizandoLado, setActualizandoLado] = useState(false);
    const [paciente, setPaciente] = useState(null);
    const [estadoPaciente, setEstadoPaciente] = useState(null);
    const [imagenDimensions, setImagenDimensions] = useState({
        width: 256,
        height: 256,
    });

    const canvasRef = useRef(null);
    const contourCanvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(10);
    const [contourPath, setContourPath] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem('token');
        if (!stored) {
            router.replace('/');
        } else {
            setToken(stored);
        }
    }, [router]);

    useEffect(() => {
        if (router.isReady && router.query.id) setImagenId(router.query.id);
    }, [router.isReady, router.query.id]);

    const handleBuscar = async (overrideId) => {
        setError('');
        setImagen(null);
        setMaskUrl(null);
        setContourUrl(null);
        setSegmentacionUrl(null);
        setShowCanvas(false);
        setSegmentacionId(null);
        setExistingSegId(null);
        setExistingMaskUrl(null);
        setPwatscore(null);
        setProfesional(null);
        setLadoImagen(null); // Resetear lado
        setPaciente(null); // Resetear paciente
        setEstadoPaciente(null); // Resetear estado paciente
        try {
            const res = await apiFetch('/imagenes/buscar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: overrideId || imagenId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Error');
            setImagen(json);
            setLadoImagen(json.lado); // Guardar el lado de la imagen

            // Obtener datos del paciente
            try {
                const pacRes = await apiFetch(`/pacientes/${json.paciente_id}`);
                if (pacRes.ok) {
                    const pacienteData = await pacRes.json();
                    setPaciente(pacienteData);
                    setEstadoPaciente(pacienteData.estado);
                }
            } catch (_) {}

            try {
                const profRes = await apiFetch(
                    `/pacientes/${json.paciente_id}/profesional`
                );
                if (profRes.ok) {
                    const profesional = await profRes.json();
                    setProfesional({
                        nombre: profesional.user?.nombre,
                        correo: profesional.user?.correo,
                        especialidad: profesional.especialidad,
                    });
                }
            } catch (_) {}
            const segRes = await apiFetch('/segmentaciones');
            const segs = await segRes.json();
            const seg = segs.find((s) => s.imagen_id === json.id);
            if (seg) {
                setSegmentacionId(seg.id);
                setExistingSegId(seg.id);

                // Obtener URLs completas (contorno + segmentación)
                try {
                    const completeRes = await apiFetch(
                        `/segmentaciones/${json.id}/completa`
                    );
                    if (completeRes.ok) {
                        const segData = await completeRes.json();
                        setMaskUrl(
                            segData.mascara_url ||
                                `${BACKEND_URL}/segmentaciones/${json.id}/mask`
                        );
                        setContourUrl(
                            segData.contorno_url ||
                                `${BACKEND_URL}/segmentaciones/${json.id}/contorno`
                        );
                        setSegmentacionUrl(segData.mascara_url);
                    }
                } catch (_) {
                    // Fallback si el endpoint nuevo no está disponible
                    const maskUrl = `${BACKEND_URL}/segmentaciones/${json.id}/mask`;
                    setMaskUrl(maskUrl);
                    setExistingMaskUrl(maskUrl);
                }
                setShowCanvas(true);
            }
            const scoreRes = await apiFetch('/pwatscore');
            const scores = await scoreRes.json();
            const score = scores.find((s) => s.imagen_id === json.id);
            if (score)
                setPwatscore({
                    id: score.id,
                    cat1: score.cat1,
                    cat2: score.cat2,
                    cat3: score.cat3,
                    cat4: score.cat4,
                    cat5: score.cat5,
                    cat6: score.cat6,
                    cat7: score.cat7,
                    cat8: score.cat8,
                });
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        if (router.isReady && router.query.id) handleBuscar(router.query.id);
    }, [router.isReady, router.query.id]);

    // Cargar dimensiones reales de la imagen
    useEffect(() => {
        if (!imagen) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = `${BACKEND_URL}/imagenes/${imagen.id}/archivo`;
        img.onload = () => {
            setImagenDimensions({
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
            console.log(
                `📐 Dimensiones originales de la imagen: ${img.naturalWidth}x${img.naturalHeight}`
            );
        };
        img.onerror = () => {
            console.error('❌ Error cargando imagen para obtener dimensiones');
            // Fallback a 256x256 si hay error
            setImagenDimensions({ width: 256, height: 256 });
        };
    }, [imagen]);

    const handleManual = async () => {
        if (!imagen || !maskFile) return;
        setError('');
        setLoadingMask(true);
        try {
            const segRes = await apiFetch('/segmentaciones');
            const segs = await segRes.json();
            const seg = segs.find((s) => s.imagen_id === imagen.id);

            const formData = new FormData();
            formData.append('contorno', maskFile);
            formData.append('segmentacion', maskFile);

            let res, json;

            if (seg) {
                // Ya existe una segmentación, sobreescribir
                formData.append('id', seg.imagen_id);
                res = await apiFetch('/segmentaciones/editar', {
                    method: 'POST',
                    body: formData,
                });
                json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error');
                setSegmentacionId(seg.id);
                setExistingSegId(seg.id);
            } else {
                // No existe, crear nueva
                formData.append('id', imagen.id);
                res = await apiFetch('/segmentaciones/manual', {
                    method: 'POST',
                    body: formData,
                });
                json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error');
                setSegmentacionId(json.segmentacionId);
                setExistingSegId(json.segmentacionId);
            }

            const url = `${BACKEND_URL}/segmentaciones/${
                imagen.id
            }/mask?${Date.now()}`;
            const contourUrlNew = `${BACKEND_URL}/segmentaciones/${
                imagen.id
            }/contorno?${Date.now()}`;
            setMaskUrl(url);
            setContourUrl(contourUrlNew);
            setSegmentacionUrl(url);
            setExistingMaskUrl(url);
            setShowCanvas(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingMask(false);
        }
    };

    const handleNuevo = () => {
        setSegmentacionId(null);
        setMaskUrl(null);
        setContourUrl(null);
        setSegmentacionUrl(null);
        setExistingSegId(null);
        setExistingMaskUrl(null);
        setShowCanvas(true);
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = imagenDimensions.width;
            canvas.height = imagenDimensions.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, imagenDimensions.width, imagenDimensions.height);
        }
    };

    const handleAutomatico = async () => {
        if (!imagen) return;
        setError('');
        setLoadingMask(true);
        try {
            // Verificar si ya existe una segmentación
            const segRes = await apiFetch('/segmentaciones');
            const segs = await segRes.json();
            const existingSeg = segs.find((s) => s.imagen_id === imagen.id);

            let res;

            if (existingSeg) {
                // Ya existe, necesitamos eliminarla primero o simplemente sobrescribir
                // Por ahora, llamaremos a /automatico que creará nueva si no existe
                // Si existe, el backend debería manejar la actualización
                res = await apiFetch('/segmentaciones/automatico', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imagen_id: imagen.id }),
                });
            } else {
                // No existe, crear nueva
                res = await apiFetch('/segmentaciones/automatico', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imagen_id: imagen.id }),
                });
            }

            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Error al generar');

            const newSegId = json.segmentacionId || json.id;
            setSegmentacionId(newSegId);

            const timestamp = Date.now();
            const url = `${BACKEND_URL}/segmentaciones/${imagen.id}/mask?${timestamp}`;
            const contourUrlNew = `${BACKEND_URL}/segmentaciones/${imagen.id}/contorno?${timestamp}`;

            setMaskUrl(url);
            setContourUrl(contourUrlNew);
            setSegmentacionUrl(url);
            setExistingSegId(newSegId);
            setExistingMaskUrl(url);
            setShowCanvas(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingMask(false);
        }
    };

    const startDraw = (e) => {
        setDrawing(true);
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        setContourPath([{ x, y }]);
    };

    const endDraw = () => {
        if (drawing && contourPath.length > 2) {
            finalizarContornoAutomatico();
        }
        setDrawing(false);
    };

    const draw = (e) => {
        if (!drawing) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const ctx = canvas.getContext('2d');

        // Dibujar línea del contorno
        const newPath = [...contourPath, { x, y }];
        setContourPath(newPath);

        if (contourPath.length > 0) {
            ctx.strokeStyle = '#ffffff'; // Siempre blanco
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(
                contourPath[contourPath.length - 1].x,
                contourPath[contourPath.length - 1].y
            );
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const finalizarContornoAutomatico = () => {
        if (contourPath.length < 3) {
            setContourPath([]);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Redibujar la imagen base
        if (maskUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = maskUrl;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(
                    img,
                    0,
                    0,
                    imagenDimensions.width,
                    imagenDimensions.height
                );

                // Ahora dibujar solo el contorno (SIN RELLENAR)
                dibujarContornoSinRelleno(ctx);
            };
        } else {
            // Si no hay máscara base, solo dibujar el contorno
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, imagenDimensions.width, imagenDimensions.height);
            dibujarContornoSinRelleno(ctx);
        }
    };

    const dibujarContornoSinRelleno = (ctx) => {
        if (contourPath.length < 3) return;

        // Crear el path cerrado (solo el contorno, sin rellenar)
        ctx.strokeStyle = '#ffffff'; // Siempre blanco
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(contourPath[0].x, contourPath[0].y);

        for (let i = 1; i < contourPath.length; i++) {
            ctx.lineTo(contourPath[i].x, contourPath[i].y);
        }

        ctx.closePath();
        ctx.stroke();

        // Limpiar el path
        setContourPath([]);
    };

    const cancelarContorno = () => {
        setContourPath([]);
        // Redibujar el canvas
        if (canvasRef.current && maskUrl) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = maskUrl;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(
                    img,
                    0,
                    0,
                    imagenDimensions.width,
                    imagenDimensions.height
                );
            };
        }
    };

    const detectarYDibujarContornos = (maskImg) => {
        if (!contourCanvasRef.current) return;

        const tempCanvas = document.createElement('canvas');
        const { width, height } = imagenDimensions;
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(maskImg, 0, 0, width, height);

        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Crear una matriz binaria
        const binary = new Array(height)
            .fill(0)
            .map(() => new Array(width).fill(0));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                binary[y][x] = gray > 128 ? 1 : 0;
            }
        }

        // Detectar bordes
        const contourCanvas = contourCanvasRef.current;
        const ctx = contourCanvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = contourColor;
        ctx.lineWidth = contourThickness;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (binary[y][x] === 1) {
                    // Verificar si es un borde
                    const isBorder =
                        binary[y - 1][x] === 0 ||
                        binary[y + 1][x] === 0 ||
                        binary[y][x - 1] === 0 ||
                        binary[y][x + 1] === 0;

                    if (isBorder) {
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
    };

    useEffect(() => {
        if (!showCanvas || !maskUrl || !contourCanvasRef.current) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = maskUrl;
        img.onload = () => {
            if (showContour) {
                detectarYDibujarContornos(img);
            }
        };
    }, [maskUrl, showCanvas, showContour, contourColor, contourThickness]);

    useEffect(() => {
        if (!showCanvas || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = imagenDimensions.width;
        canvas.height = imagenDimensions.height;
        const ctx = canvas.getContext('2d');
        if (maskUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = maskUrl;
            img.onload = () => {
                ctx.drawImage(
                    img,
                    0,
                    0,
                    imagenDimensions.width,
                    imagenDimensions.height
                );
            };
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, imagenDimensions.width, imagenDimensions.height);
        }
    }, [maskUrl, showCanvas, imagenDimensions]);

    const handleGuardarMascara = async () => {
        if (!canvasRef.current || !imagen) return;

        try {
            setError('');

            const canvas = canvasRef.current;

            // 1. Generar imagen del contorno (lo que hay en el canvas actualmente)
            // El canvas ya contiene el contorno dibujado
            const contornoBlob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            });

            if (!contornoBlob) {
                setError('Error creando la imagen del contorno');
                return;
            }

            console.log('📐 Contorno blob creado:', contornoBlob.size, 'bytes');

            // 2. Generar imagen de segmentación (contorno rellenado)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');

            // Copiar el contorno del canvas original
            ctx.drawImage(canvas, 0, 0);

            // Obtener datos de la imagen para detectar el contorno y rellenarlo
            const imageData = ctx.getImageData(
                0,
                0,
                tempCanvas.width,
                tempCanvas.height
            );
            const data = imageData.data;

            // Crear matriz binaria del contorno
            const binary = new Array(tempCanvas.height)
                .fill(0)
                .map(() => new Array(tempCanvas.width).fill(0));
            for (let y = 0; y < tempCanvas.height; y++) {
                for (let x = 0; x < tempCanvas.width; x++) {
                    const idx = (y * tempCanvas.width + x) * 4;
                    const gray =
                        (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    binary[y][x] = gray > 128 ? 1 : 0; // 1 = blanco (parte del contorno/herida)
                }
            }

            // Llenar la región cerrada por el contorno (flood fill mejorado)
            // Estrategia: Rellenar DESDE LOS BORDES hacia adentro (el fondo)
            // Lo que quede sin rellenar es la región dentro del contorno
            const floodFillFromEdges = () => {
                const queue = [];
                const visited = new Set();

                // Agregar todos los píxeles del borde a la cola
                // Borde superior e inferior
                for (let x = 0; x < tempCanvas.width; x++) {
                    if (binary[0][x] === 0) queue.push([x, 0]);
                    if (binary[tempCanvas.height - 1][x] === 0)
                        queue.push([x, tempCanvas.height - 1]);
                }
                // Borde izquierdo y derecho
                for (let y = 0; y < tempCanvas.height; y++) {
                    if (binary[y][0] === 0) queue.push([0, y]);
                    if (binary[y][tempCanvas.width - 1] === 0)
                        queue.push([tempCanvas.width - 1, y]);
                }

                // Flood fill desde los bordes
                while (queue.length > 0) {
                    const [x, y] = queue.shift();
                    const key = `${x},${y}`;

                    if (visited.has(key)) continue;
                    if (
                        x < 0 ||
                        x >= tempCanvas.width ||
                        y < 0 ||
                        y >= tempCanvas.height
                    )
                        continue;
                    if (binary[y][x] === 1) continue; // Detener en el contorno

                    visited.add(key);
                    binary[y][x] = 2; // Marcar como FONDO (exterior)

                    // Agregar vecinos (4 direcciones)
                    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
                }
            };

            // Ejecutar flood fill desde los bordes
            floodFillFromEdges();

            // Crear imagen de segmentación:
            // - binary[y][x] === 1 → Contorno (blanco)
            // - binary[y][x] === 0 → Interior del contorno (blanco)
            // - binary[y][x] === 2 → Exterior/fondo (negro)
            const segmentationData = ctx.createImageData(
                tempCanvas.width,
                tempCanvas.height
            );
            const segData = segmentationData.data;

            for (let y = 0; y < tempCanvas.height; y++) {
                for (let x = 0; x < tempCanvas.width; x++) {
                    const idx = (y * tempCanvas.width + x) * 4;
                    // Si es contorno (1) o interior (0) → blanco
                    // Si es exterior (2) → negro
                    const color = binary[y][x] === 2 ? 0 : 255;
                    segData[idx] = color;
                    segData[idx + 1] = color;
                    segData[idx + 2] = color;
                    segData[idx + 3] = 255;
                }
            }

            ctx.putImageData(segmentationData, 0, 0);

            // Convertir la segmentación rellenada a blob
            const segmentacionBlob = await new Promise((resolve) => {
                tempCanvas.toBlob(resolve, 'image/jpeg', 0.95);
            });

            if (!segmentacionBlob) {
                setError('Error creando la imagen de segmentación');
                return;
            }

            console.log(
                '✅ Segmentación blob creado:',
                segmentacionBlob.size,
                'bytes'
            );

            // 3. Preparar FormData con ambas imágenes
            const formData = new FormData();
            formData.append(
                'contorno',
                new File([contornoBlob], 'contorno.jpg', { type: 'image/jpeg' })
            );
            formData.append(
                'segmentacion',
                new File([segmentacionBlob], 'segmentacion.jpg', {
                    type: 'image/jpeg',
                })
            );

            console.log('📦 FormData preparado con:');
            console.log('  - contorno.jpg:', contornoBlob.size, 'bytes');
            console.log(
                '  - segmentacion.jpg:',
                segmentacionBlob.size,
                'bytes'
            );

            // 4. Verificar si ya existe una segmentación para esta imagen
            const segRes = await apiFetch('/segmentaciones');
            const segs = await segRes.json();
            const existingSeg = segs.find((s) => s.imagen_id === imagen.id);

            // 5. Enviar al backend (sobreescribir si existe, crear si no)
            let res, json, savedSegId;
            if (existingSeg) {
                // Ya existe, sobreescribir
                formData.append('id', imagen.id);
                res = await apiFetch('/segmentaciones/editar', {
                    method: 'POST',
                    body: formData,
                });
                json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error');
                savedSegId = existingSeg.id;
                setSegmentacionId(existingSeg.id);
                setExistingSegId(existingSeg.id);
            } else {
                // No existe, crear nueva
                formData.append('id', imagen.id);
                res = await apiFetch('/segmentaciones/manual', {
                    method: 'POST',
                    body: formData,
                });
                json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Error');
                savedSegId = json.segmentacionId;
                setSegmentacionId(savedSegId);
                setExistingSegId(savedSegId);
            }

            alert('Máscara guardada correctamente (contorno + segmentación)');

            const timestamp = Date.now();
            const url = `${BACKEND_URL}/segmentaciones/${imagen.id}/mask?${timestamp}`;
            const contourUrlNew = `${BACKEND_URL}/segmentaciones/${imagen.id}/contorno?${timestamp}`;

            console.log('✅ Guardado exitoso:');
            console.log('  - Contorno URL:', contourUrlNew);
            console.log('  - Segmentación URL:', url);
            console.log('  - Segmentación ID:', savedSegId);

            // Actualizar las URLs para mostrar las imágenes guardadas
            setContourUrl(contourUrlNew);
            setSegmentacionUrl(url);
            setMaskUrl(url);
            setExistingMaskUrl(url);
            setShowCanvas(true);

            // Forzar recarga de las imágenes después de un pequeño delay
            setTimeout(() => {
                console.log('🔄 Recargando imágenes...');
                setContourUrl(
                    `${BACKEND_URL}/segmentaciones/${
                        imagen.id
                    }/contorno?${Date.now()}`
                );
                setSegmentacionUrl(
                    `${BACKEND_URL}/segmentaciones/${
                        imagen.id
                    }/mask?${Date.now()}`
                );
            }, 500);
        } catch (err) {
            setError(err.message);
            console.error('Error en handleGuardarMascara:', err);
        }
    };

    const handlePwatscore = async () => {
        if (!imagen) return;
        setPwatscore(null);
        setError('');
        setLoadingPwatscore(true);
        try {
            const res = await apiFetch('/pwatscore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: imagen.id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Error');
            setPwatscore({ id: json.pwatscoreId, ...json.categorias });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingPwatscore(false);
        }
    };

    const handleActualizarLado = async (nuevoLado) => {
        if (!imagen || ladoImagen === nuevoLado) return;

        setActualizandoLado(true);
        setError('');

        try {
            const res = await apiFetch('/imagenes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: imagen.id,
                    lado: nuevoLado,
                }),
            });

            const json = await res.json();

            if (!res.ok)
                throw new Error(json.message || t.pwat.errorUpdatingSide);

            setLadoImagen(nuevoLado);
            const ladoTexto = nuevoLado ? t.pwat.right : t.pwat.left;
            alert(`${t.pwat.sideUpdatedTo}: ${ladoTexto}`);
        } catch (err) {
            setError(err.message);
            alert(`${t.pwat.errorUpdatingSide}: ${err.message}`);
        } finally {
            setActualizandoLado(false);
        }
    };

    const handleActualizarEstadoPaciente = async (nuevoEstado) => {
        if (!paciente || estadoPaciente === nuevoEstado) return;

        setError('');

        try {
            const res = await apiFetch('/pacientes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: paciente.id,
                    estado: nuevoEstado,
                }),
            });

            const json = await res.json();

            if (!res.ok)
                throw new Error(json.message || t.pwat.errorUpdatingState);

            setEstadoPaciente(nuevoEstado);
            const estadoLabel = t.patientStates[nuevoEstado];
            alert(`${t.pwat.stateUpdatedTo}: ${estadoLabel}`);
        } catch (err) {
            setError(err.message);
            alert(`${t.pwat.errorUpdatingState}: ${err.message}`);
        }
    };

    return (
        <Layout
            subtitle={t.pwat.title}
            actions={
                <>
                    <button
                        onClick={() => router.push('/profesional')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            transition: 'background-color 0.2s',
                            marginRight: '8px',
                        }}
                        onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = '#2563eb')
                        }
                        onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = '#3b82f6')
                        }
                    >
                        ← {t.pwat.backToPanel}
                    </button>
                    <LogoutButton />
                </>
            }
        >
            <div className='card'>
                <div className='section-title'>{t.pwat.searchImage}</div>
                <div>
                    <input
                        type='text'
                        placeholder={t.pwat.imageId}
                        value={imagenId}
                        onChange={(e) => setImagenId(e.target.value)}
                    />
                    <button onClick={() => handleBuscar()}>
                        {t.common.search}
                    </button>
                </div>
            </div>

            {imagen && (
                <div className='card mt-1'>
                    <div className='section-title'>
                        {t.pwat.imageNumber}
                        {imagen.id}
                    </div>
                    {profesional && (
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                            {t.pwat.attendedBy} {profesional.nombre} ·{' '}
                            {profesional.especialidad} · {profesional.correo}
                        </div>
                    )}

                    {/* Información del paciente y selector de estado */}
                    {paciente && (
                        <div
                            style={{
                                marginTop: '12px',
                                padding: '12px',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #bfdbfe',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '12px',
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            color: '#1e40af',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        {t.pwat.patientLabel}:{' '}
                                        {paciente.user?.nombre ||
                                            paciente.nombre}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: '#6b7280',
                                        }}
                                    >
                                        {t.pwat.rut}:{' '}
                                        {paciente.user?.rut || paciente.user_id}
                                    </div>
                                </div>
                                <EstadoSelector
                                    estadoActual={estadoPaciente}
                                    onChange={handleActualizarEstadoPaciente}
                                />
                            </div>
                        </div>
                    )}

                    {/* Selector de lado de la imagen */}
                    <div
                        style={{
                            marginTop: '16px',
                            padding: '12px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px',
                            }}
                        >
                            <div>
                                <label
                                    style={{
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        color: '#374151',
                                        marginRight: '8px',
                                    }}
                                >
                                    🦶 Pie del lado:
                                </label>
                                <span
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        backgroundColor:
                                            ladoImagen === null
                                                ? '#fef3c7'
                                                : ladoImagen
                                                ? '#dbeafe'
                                                : '#d1fae5',
                                        color:
                                            ladoImagen === null
                                                ? '#f59e0b'
                                                : ladoImagen
                                                ? '#3b82f6'
                                                : '#10b981',
                                        border: `1px solid ${
                                            ladoImagen === null
                                                ? '#f59e0b20'
                                                : ladoImagen
                                                ? '#3b82f620'
                                                : '#10b98120'
                                        }`,
                                    }}
                                >
                                    {ladoImagen === null
                                        ? '⚠️ No asignado'
                                        : ladoImagen
                                        ? '➡️ Derecho'
                                        : '⬅️ Izquierdo'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleActualizarLado(false)}
                                    disabled={
                                        actualizandoLado || ladoImagen === false
                                    }
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '8px',
                                        border:
                                            ladoImagen === false
                                                ? '2px solid #10b981'
                                                : '1px solid #e5e7eb',
                                        backgroundColor:
                                            ladoImagen === false
                                                ? '#d1fae5'
                                                : 'white',
                                        color:
                                            ladoImagen === false
                                                ? '#10b981'
                                                : '#6b7280',
                                        fontWeight:
                                            ladoImagen === false
                                                ? '600'
                                                : '400',
                                        fontSize: '13px',
                                        cursor:
                                            actualizandoLado ||
                                            ladoImagen === false
                                                ? 'not-allowed'
                                                : 'pointer',
                                        opacity:
                                            actualizandoLado ||
                                            ladoImagen === false
                                                ? 0.5
                                                : 1,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    ⬅️ Izquierdo
                                </button>
                                <button
                                    onClick={() => handleActualizarLado(true)}
                                    disabled={
                                        actualizandoLado || ladoImagen === true
                                    }
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '8px',
                                        border:
                                            ladoImagen === true
                                                ? '2px solid #3b82f6'
                                                : '1px solid #e5e7eb',
                                        backgroundColor:
                                            ladoImagen === true
                                                ? '#dbeafe'
                                                : 'white',
                                        color:
                                            ladoImagen === true
                                                ? '#3b82f6'
                                                : '#6b7280',
                                        fontWeight:
                                            ladoImagen === true ? '600' : '400',
                                        fontSize: '13px',
                                        cursor:
                                            actualizandoLado ||
                                            ladoImagen === true
                                                ? 'not-allowed'
                                                : 'pointer',
                                        opacity:
                                            actualizandoLado ||
                                            ladoImagen === true
                                                ? 0.5
                                                : 1,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    ➡️ Derecho
                                </button>
                                {actualizandoLado && (
                                    <div
                                        className='spinner'
                                        style={{ marginLeft: '8px' }}
                                    ></div>
                                )}
                            </div>
                        </div>
                        <div
                            style={{
                                fontSize: '11px',
                                color: '#6b7280',
                                marginTop: '8px',
                                fontStyle: 'italic',
                            }}
                        >
                            {ladoImagen === null &&
                                '⚠️ Esta imagen no tiene lado asignado. Seleccione uno para completar los datos.'}
                        </div>
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            width: imagenDimensions.width * zoom,
                            height: imagenDimensions.height * zoom,
                            marginTop: 12,
                        }}
                    >
                        <img
                            src={`${BACKEND_URL}/imagenes/${imagen.id}/archivo`}
                            alt='imagen'
                            width={imagenDimensions.width * zoom}
                            height={imagenDimensions.height * zoom}
                        />
                        {showCanvas && showContour && (
                            <canvas
                                ref={contourCanvasRef}
                                width={imagenDimensions.width}
                                height={imagenDimensions.height}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: `${imagenDimensions.width * zoom}px`,
                                    height: `${
                                        imagenDimensions.height * zoom
                                    }px`,
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                        {showCanvas && (
                            <canvas
                                ref={canvasRef}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    cursor: 'crosshair',
                                    opacity: editOpacity,
                                    width: `${imagenDimensions.width * zoom}px`,
                                    height: `${
                                        imagenDimensions.height * zoom
                                    }px`,
                                }}
                                onMouseDown={startDraw}
                                onMouseUp={endDraw}
                                onMouseMove={draw}
                                onMouseLeave={endDraw}
                            />
                        )}
                    </div>

                    {/* Visualización del contorno y segmentación guardados */}
                    {showCanvas && (contourUrl || segmentacionUrl) && (
                        <div
                            style={{
                                marginTop: '20px',
                                padding: '12px',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                            }}
                        >
                            <h4
                                style={{
                                    marginTop: 0,
                                    marginBottom: '12px',
                                    color: '#111827',
                                }}
                            >
                                📊 Segmentación Guardada
                            </h4>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns:
                                        'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '12px',
                                }}
                            >
                                {contourUrl && (
                                    <div
                                        style={{
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px',
                                            padding: '8px',
                                            backgroundColor: 'white',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: '0 0 8px 0',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#374151',
                                            }}
                                        >
                                            🎨 Contorno
                                        </p>
                                        <img
                                            src={contourUrl}
                                            alt='Contorno'
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                borderRadius: '4px',
                                                border: '1px solid #e5e7eb',
                                            }}
                                            onError={(e) => {
                                                console.error(
                                                    'Error cargando contorno:',
                                                    contourUrl
                                                );
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                                {segmentacionUrl && (
                                    <div
                                        style={{
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px',
                                            padding: '8px',
                                            backgroundColor: 'white',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: '0 0 8px 0',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#374151',
                                            }}
                                        >
                                            ✅ Segmentación Rellenada
                                        </p>
                                        <img
                                            src={segmentacionUrl}
                                            alt='Segmentación'
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                borderRadius: '4px',
                                                border: '1px solid #e5e7eb',
                                            }}
                                            onError={(e) => {
                                                console.error(
                                                    'Error cargando segmentación:',
                                                    segmentacionUrl
                                                );
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className='mt-1'>
                        <input
                            type='file'
                            onChange={(e) => {
                                setMaskFile(e.target.files[0]);
                            }}
                        />
                        <button onClick={handleManual}>Subir mascara</button>
                        <button onClick={handleAutomatico}>
                            Generar automatica
                        </button>
                        <button onClick={handleNuevo}>Dibujar mascara</button>
                        {loadingMask && (
                            <div
                                className='spinner'
                                style={{ marginLeft: '0.5rem' }}
                            ></div>
                        )}
                    </div>

                    <div className='mt-1'>
                        <label>Zoom:</label>
                        <input
                            type='range'
                            min='1'
                            max='3'
                            step='0.1'
                            value={zoom}
                            onChange={(e) => {
                                setScrollPos({
                                    x: window.scrollX,
                                    y: window.scrollY,
                                });
                                setZoom(parseFloat(e.target.value));
                            }}
                        />
                        <span style={{ marginLeft: '0.5rem' }}>
                            {zoom.toFixed(1)}x
                        </span>
                    </div>

                    {showCanvas && (
                        <div className='mt-1'>
                            <div style={{ marginBottom: '12px' }}>
                                <label>
                                    <input
                                        type='checkbox'
                                        checked={showContour}
                                        onChange={(e) =>
                                            setShowContour(e.target.checked)
                                        }
                                        style={{ marginRight: '8px' }}
                                    />
                                    Mostrar contorno de la máscara
                                </label>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label>Opacidad del área de edición: </label>
                                <input
                                    type='range'
                                    min='0'
                                    max='1'
                                    step='0.1'
                                    value={editOpacity}
                                    onChange={(e) =>
                                        setEditOpacity(
                                            parseFloat(e.target.value)
                                        )
                                    }
                                />
                                <span style={{ marginLeft: '0.5rem' }}>
                                    {Math.round(editOpacity * 100)}%
                                </span>
                                <span
                                    style={{
                                        marginLeft: '1rem',
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    (ajusta para ver mejor tus trazos)
                                </span>
                            </div>

                            <div
                                style={{
                                    marginBottom: '12px',
                                    padding: '8px 12px',
                                    backgroundColor: '#e0f2fe',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    border: '1px solid #7dd3fc',
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: '600',
                                        color: '#0369a1',
                                    }}
                                >
                                    💡 Dibuja el contorno de la herida con trazo
                                    blanco. Al guardar, se rellenará
                                    automáticamente para generar la segmentación
                                    completa.
                                </span>
                            </div>

                            <button
                                onClick={handleGuardarMascara}
                                style={{ marginLeft: '0' }}
                            >
                                Guardar mascara
                            </button>
                            <button
                                onClick={handlePwatscore}
                                style={{ marginLeft: '0.5rem' }}
                            >
                                Calcular PWATScore
                            </button>
                            {loadingPwatscore && (
                                <div
                                    className='spinner'
                                    style={{ marginLeft: '0.5rem' }}
                                ></div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {pwatscore && (
                <div className='card mt-1'>
                    <div className='section-title'>Categorías</div>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                        const help = PWAT_HELP[n];
                        const tooltip = help
                            ? `${help.title}\n${
                                  help.desc
                              }\n\nEscala (0-4):\n${help.scale.join('\n')}`
                            : CAT_INFO[n];
                        return (
                            <div
                                key={n}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 8,
                                }}
                            >
                                <label
                                    title={tooltip}
                                    style={{
                                        minWidth: 260,
                                        cursor: 'help',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {`Categoría ${n}: ${CAT_INFO[n]}`}
                                    <span
                                        aria-label='Ayuda'
                                        title={tooltip}
                                        style={{
                                            display: 'inline-block',
                                            marginLeft: 6,
                                            width: 18,
                                            height: 18,
                                            lineHeight: '18px',
                                            textAlign: 'center',
                                            borderRadius: '50%',
                                            background: '#e5e7eb',
                                            color: '#374151',
                                            fontWeight: 700,
                                            fontSize: 12,
                                        }}
                                    >
                                        ?
                                    </span>
                                </label>
                                <input
                                    type='number'
                                    min='0'
                                    max='4'
                                    value={pwatscore[`cat${n}`]}
                                    onChange={(e) => {
                                        const val = Math.min(
                                            4,
                                            Math.max(
                                                0,
                                                parseInt(e.target.value, 10) ||
                                                    0
                                            )
                                        );
                                        setPwatscore({
                                            ...pwatscore,
                                            [`cat${n}`]: val,
                                        });
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </Layout>
    );
}
