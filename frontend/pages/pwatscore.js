import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';
import { CAT_INFO } from '../lib/categorias';

export default function Pwatscore() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [imagenId, setImagenId] = useState('');
  const [imagen, setImagen] = useState(null);
  const [maskFile, setMaskFile] = useState(null);
  const [segmentacionId, setSegmentacionId] = useState(null);
  const [maskUrl, setMaskUrl] = useState(null);
  const [pwatscore, setPwatscore] = useState(null);
  const [error, setError] = useState('');
  const [maskOpacity, setMaskOpacity] = useState(0.5);
  const [showCanvas, setShowCanvas] = useState(false);
  const [loadingMask, setLoadingMask] = useState(false);
  const [loadingPwatscore, setLoadingPwatscore] = useState(false);
  const [existingSegId, setExistingSegId] = useState(null);
  const [existingMaskUrl, setExistingMaskUrl] = useState(null);
  const [newMaskPreview, setNewMaskPreview] = useState(null);
  const [chooseMask, setChooseMask] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const [profesional, setProfesional] = useState(null);


  const canvasRef = useRef(null);
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawing, setDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(10);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      router.replace('/');
    } else {
      setToken(stored);
    }
  }, [router]);

  useEffect(() => {
    if (router.isReady && router.query.id) {
      setImagenId(router.query.id);
    }
  }, [router.isReady, router.query.id]);

  const handleBuscar = async (overrideId) => {
    setError('');
    setImagen(null);
    setMaskUrl(null);
    setShowCanvas(false);
    setSegmentacionId(null);
    setExistingSegId(null);
    setExistingMaskUrl(null);
    setChooseMask(false);
    setNewMaskPreview(null);

    setPwatscore(null);
    setProfesional(null);
    try {
      const res = await apiFetch('/imagenes/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: overrideId || imagenId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setImagen(json);
      // obtener profesional del ultimo control del paciente
      try {
        const profRes = await apiFetch(`/pacientes/${json.paciente_id}/profesional`);
        if (profRes.ok) {
          const profesional = await profRes.json();
          setProfesional({
            nombre: profesional.user?.nombre,
            correo: profesional.user?.correo,
            especialidad: profesional.especialidad
          });
        }
      } catch (_) { /* ignore */ }
      // obtener segmentacion existente si la hay
      const segRes = await apiFetch('/segmentaciones');
      const segs = await segRes.json();
      const seg = segs.find(s => s.imagen_id === json.id);
      if (seg) {
        setSegmentacionId(seg.id);
        setExistingSegId(seg.id);
        const url = `${BACKEND_URL}/segmentaciones/${json.id}/mask`;
        setMaskUrl(url);
        setExistingMaskUrl(url);
        setShowCanvas(true);
      }

      // obtener pwatscore existente si lo hay
      const scoreRes = await apiFetch('/pwatscore');
      const scores = await scoreRes.json();
      const score = scores.find(s => s.imagen_id === json.id);
      if (score) {
        setPwatscore({
          id: score.id,
          cat1: score.cat1,
          cat2: score.cat2,
          cat3: score.cat3,
          cat4: score.cat4,
          cat5: score.cat5,
          cat6: score.cat6,
          cat7: score.cat7,
          cat8: score.cat8
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (router.isReady && router.query.id) {
      handleBuscar(router.query.id);
    }
  }, [router.isReady, router.query.id]);

  const handleManual = async () => {
    if (!imagen || !maskFile) return;
    setError('');
    setLoadingMask(true);
    try {
      const segRes = await apiFetch('/segmentaciones');
      const segs = await segRes.json();
      const seg = segs.find(s => s.imagen_id === imagen.id);
      if (seg) {
        setExistingSegId(seg.id);
        setExistingMaskUrl(`${BACKEND_URL}/segmentaciones/${imagen.id}/mask`);
        setNewMaskPreview(URL.createObjectURL(maskFile));
        setChooseMask(true);
        setShowCanvas(false);
        setLoadingMask(false);
        return;
      }

      const formData = new FormData();
      formData.append('id', imagen.id);
      formData.append('imagen', maskFile);
      const res = await apiFetch('/segmentaciones/manual', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setSegmentacionId(json.segmentacionId);
      const url = `${BACKEND_URL}/segmentaciones/${imagen.id}/mask`;
      setMaskUrl(url);
      setExistingSegId(json.segmentacionId);
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
    setExistingSegId(null);
    setExistingMaskUrl(null);
    setNewMaskPreview(null);
    setChooseMask(false);

    setShowCanvas(true);
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 256);
    }
  };

const handleAutomatico = async () => {
  if (!imagen) return;
  setLoadingMask(true);
  try {
    const res = await apiFetch('/segmentaciones/automatico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: imagen.id })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error');
    setSegmentacionId(json.segmentacionId);
    const url = `${BACKEND_URL}/segmentaciones/${imagen.id}/mask`;
    setMaskUrl(url);
    setExistingSegId(json.segmentacionId);
    setExistingMaskUrl(url);
    setShowCanvas(true);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoadingMask(false);
  }
};

  const usarMascaraExistente = () => {
    if (!existingSegId || !existingMaskUrl) return;
    setSegmentacionId(existingSegId);
    setMaskUrl(existingMaskUrl);
    setShowCanvas(true);
    setChooseMask(false);
  };

  const usarMascaraNueva = async () => {
    if (!existingSegId || !maskFile) return;
    setLoadingMask(true);
    const formData = new FormData();
    formData.append('id', existingSegId);
    formData.append('imagen', maskFile);
    try {
      const res = await apiFetch('/segmentaciones/editar', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      const url = `${BACKEND_URL}/segmentaciones/${imagen.id}/mask?${Date.now()}`;
      setMaskUrl(url);
      setExistingMaskUrl(url);
      setSegmentacionId(existingSegId);
      setShowCanvas(true);
      setChooseMask(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMask(false);
    }
  };



  const startDraw = (e) => {
    setDrawing(true);
    draw(e);
  };
  const endDraw = () => setDrawing(false);
  const draw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = drawColor;
    ctx.fillRect(x, y, brushSize, brushSize);
  };

  useEffect(() => {
    if (!showCanvas || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (maskUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = maskUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 256, 256);
      };
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 256);
    }
  }, [maskUrl, showCanvas]);

  const handleGuardarMascara = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('imagen', new File([blob], 'mask.jpg', { type: 'image/jpg' }));
      try {
        let res, json, id;
        if (segmentacionId) {
          formData.append('id', segmentacionId);
          res = await apiFetch('/segmentaciones/editar', { method: 'POST', body: formData });
          json = await res.json();
          id = segmentacionId;
        } else {
          if (!imagen) return;
          formData.append('id', imagen.id);
          res = await apiFetch('/segmentaciones/manual', { method: 'POST', body: formData });
          json = await res.json();
          id = json.segmentacionId;
          setSegmentacionId(id);
          setExistingSegId(id);
        }
        if (!res.ok) throw new Error(json.message || 'Error');
        alert('Máscara guardada');
        const url = `${BACKEND_URL}/segmentaciones/${imagen.id}/mask?${Date.now()}`;
        setMaskUrl(url);
        setExistingMaskUrl(url);

        setShowCanvas(true);
      } catch (err) {
        setError(err.message);
      }
    }, 'image/jpeg');
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
        body: JSON.stringify({ id: imagen.id })
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

  const handleUpdate = async () => {
    if (!pwatscore) return;
    try {
      const res = await apiFetch('/pwatscore', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pwatscore)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      alert('Categorías actualizadas');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWheelZoom = (e) => {
    if (!imagen) return;
    e.preventDefault();
    e.stopPropagation();
    const { scrollX, scrollY } = window;
    setScrollPos({ x: scrollX, y: scrollY });
    setZoom(z => {
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const next = Math.min(3, Math.max(1, parseFloat((z + delta).toFixed(2))));
      return next;
    });
    // scroll restoration handled in effect
  };

  useEffect(() => {
    window.scrollTo(scrollPos.x, scrollPos.y);
  }, [zoom]);

  if (!token) return null;

  return (
    <div className="container">
      <h1>Calcular PWATScore</h1>
      <div>
        <input type="text" placeholder="ID de imagen" value={imagenId} onChange={e => setImagenId(e.target.value)} />
        <button onClick={handleBuscar}>Buscar</button>
      </div>
      {imagen && (
        <div className="mt-1">
          {profesional && (
            <p>Último control por: {profesional.nombre} ({profesional.especialidad})</p>
          )}
          <div
            style={{position:'relative', display:'inline-block', width:`${256*zoom}px`, height:`${256*zoom}px`}}
            onWheel={handleWheelZoom}
          >
            <img
              src={`${BACKEND_URL}/imagenes/${imagen.id}/archivo`}
              alt="imagen"
              width={256 * zoom}
              height={256 * zoom}
            />
            {showCanvas && (
              <canvas
                ref={canvasRef}
                style={{position:'absolute', top:0, left:0, cursor:'crosshair', opacity: maskOpacity, width:`${256*zoom}px`, height:`${256*zoom}px`}}

                onMouseDown={startDraw}
                onMouseUp={endDraw}
                onMouseMove={draw}
                onMouseLeave={endDraw}
              />
            )}
          </div>

          <div className="mt-1">
            <input
              type="file"
              onChange={e => {
                setMaskFile(e.target.files[0]);
                setNewMaskPreview(e.target.files[0] ? URL.createObjectURL(e.target.files[0]) : null);
              }}
            />

            <button onClick={handleManual}>Subir máscara</button>
            <button onClick={handleAutomatico}>Generar automática</button>
            <button onClick={handleNuevo}>Dibujar máscara</button>
            {loadingMask && <div className="spinner" style={{marginLeft:'0.5rem'}}></div>}
          </div>
          <div className="mt-1">
            <label>Zoom:</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={e => {
                setScrollPos({ x: window.scrollX, y: window.scrollY });
                setZoom(parseFloat(e.target.value));
              }}
            />
            <span style={{marginLeft:'0.5rem'}}>{zoom.toFixed(1)}x</span>
          </div>
          {chooseMask && (
            <div className="mt-1">
              <p>Ya existe una máscara. Elija cuál conservar:</p>
              <div style={{display:'flex', gap:'1rem'}}>
                <div>
                  <p>Existente</p>
                  <img src={existingMaskUrl} alt="existente" width={128} height={128} />
                  <button onClick={usarMascaraExistente}>Usar esta</button>
                </div>
                <div>
                  <p>Nueva</p>
                  {newMaskPreview && (
                    <img src={newMaskPreview} alt="nueva" width={128} height={128} />
                  )}
                  <button onClick={usarMascaraNueva}>Usar esta</button>
                </div>
              </div>
            </div>
          )}
          {showCanvas && (
            <div className="mt-1">

              <label>Color: </label>
              <select value={drawColor} onChange={e => setDrawColor(e.target.value)}>
                <option value="#ffffff">Blanco</option>
                <option value="#000000">Negro</option>
              </select>
              <label style={{marginLeft:'1rem'}}>Opacidad:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={maskOpacity}
                onChange={e => setMaskOpacity(parseFloat(e.target.value))}
              />
              <label style={{marginLeft:'1rem'}}>Tamaño:</label>
              <input
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={e => setBrushSize(parseInt(e.target.value))}
              />
              <span style={{marginLeft:'0.5rem'}}>{brushSize}</span>
              <button onClick={handleGuardarMascara} style={{marginLeft:'1rem'}}>Guardar máscara</button>
              <button onClick={handlePwatscore} style={{marginLeft:'0.5rem'}}>Calcular PWATScore</button>
              {loadingPwatscore && <div className="spinner" style={{marginLeft:'0.5rem'}}></div>}
            </div>
          )}

        </div>
      )}
      {error && <p style={{color:'red'}}>{error}</p>}
      {pwatscore && (
        <div>
          <h2>Categorías</h2>
          {[1,2,3,4,5,6,7,8].map(n => (
            <div key={n}>
              <label title={CAT_INFO[n]}>{`Categoria ${n}: `}</label>
              <input
                type="number"
                min="0"
                max="4"
                value={pwatscore[`cat${n}`]}
                onChange={e => {
                  const val = Math.min(4, Math.max(0, parseInt(e.target.value, 10) || 0));
                  setPwatscore({ ...pwatscore, [`cat${n}`]: val });
                }}
              />

            </div>
          ))}
          <button onClick={handleUpdate}>Guardar</button>
        </div>
      )}
    </div>
  );
}
