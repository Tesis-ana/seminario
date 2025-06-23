import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, BACKEND_URL } from '../lib/api';

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


  const canvasRef = useRef(null);
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      router.replace('/');
    } else {
      setToken(stored);
    }
  }, [router]);

  const handleBuscar = async () => {
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
    try {
      const res = await apiFetch('/imagenes/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: imagenId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setImagen(json);
      // obtener segmentacion existente si la hay
      const segRes = await apiFetch('/segmentaciones');
      const segs = await segRes.json();
      const seg = segs.find(s => s.imagen_id === json.id);
      if (seg) {
        setSegmentacionId(seg.id);
        setExistingSegId(seg.id);
        const url = `${BACKEND_URL}/segmentaciones/${seg.id}/mask`;
        setMaskUrl(url);
        setExistingMaskUrl(url);
        setShowCanvas(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

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
        setExistingMaskUrl(`${BACKEND_URL}/segmentaciones/${seg.id}/mask`);
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
      const url = `${BACKEND_URL}/segmentaciones/${json.segmentacionId}/mask`;
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

const generarMascaraAutomatica = async () => {

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
    const url = `${BACKEND_URL}/segmentaciones/${json.segmentacionId}/mask`;
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
      const url = `${BACKEND_URL}/segmentaciones/${existingSegId}/mask?${Date.now()}`;
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
    setMaskUrl(`${BACKEND_URL}/segmentaciones/${json.segmentacionId}/mask`);
    setShowCanvas(true);
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = drawColor;
    ctx.fillRect(x, y, 10, 10);
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
        const url = `${BACKEND_URL}/segmentaciones/${id}/mask?${Date.now()}`;
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
          <div style={{position:'relative', display:'inline-block', width:'256px', height:'256px'}}>
            <img
              src={`${BACKEND_URL}/imagenes/${imagen.id}/archivo`}
              alt="imagen"
              width={256}
              height={256}
            />
            {showCanvas && (
              <canvas
                ref={canvasRef}
                style={{position:'absolute', top:0, left:0, cursor:'crosshair', opacity: maskOpacity}}

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
            <button onClick={generarMascaraAutomatica}>Generar automática</button>

            <button onClick={handleNuevo}>Dibujar máscara</button>
            {loadingMask && <div className="spinner" style={{marginLeft:'0.5rem'}}></div>}
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
              <label>{`Categoria ${n}: `}</label>
              <input type="number" value={pwatscore[`cat${n}`]} onChange={e => setPwatscore({ ...pwatscore, [`cat${n}`]: e.target.value })} />

            </div>
          ))}
          <button onClick={handleUpdate}>Guardar</button>
        </div>
      )}
    </div>
  );
}
