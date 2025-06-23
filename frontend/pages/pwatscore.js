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
    } catch (err) {
      setError(err.message);
    }
  };

  const handleManual = async () => {
    if (!imagen || !maskFile) return;
    const formData = new FormData();
    formData.append('id', imagen.id);
    formData.append('imagen', maskFile);
    try {
      const res = await apiFetch('/segmentaciones/manual', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error');
      setSegmentacionId(json.segmentacionId);
      setMaskUrl(`${BACKEND_URL}/segmentaciones/${json.segmentacionId}/mask`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAutomatico = async () => {
    if (!imagen) return;
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
    } catch (err) {
      setError(err.message);
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
    if (!maskUrl || !canvasRef.current) return;
    const img = new Image();
    img.src = maskUrl;
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    };
  }, [maskUrl]);

  const handleGuardarMascara = async () => {
    if (!segmentacionId || !canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('id', segmentacionId);
      formData.append('imagen', new File([blob], 'mask.jpg', { type: 'image/jpg' }));
      try {
        const res = await apiFetch('/segmentaciones/editar', { method: 'POST', body: formData });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Error');
        alert('Máscara guardada');
      } catch (err) {
        setError(err.message);
      }
    }, 'image/jpeg');
  };

  const handlePwatscore = async () => {
    if (!imagen) return;
    setPwatscore(null);
    setError('');
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
    <div>
      <h1>Calcular PWATScore</h1>
      <div>
        <input type="text" placeholder="ID de imagen" value={imagenId} onChange={e => setImagenId(e.target.value)} />
        <button onClick={handleBuscar}>Buscar</button>
      </div>
      {imagen && (
        <div style={{marginTop:'1rem'}}>
          <img src={`${BACKEND_URL}/imagenes/${imagen.id}/archivo`} alt="imagen" style={{maxWidth:'300px'}} />
          <div style={{marginTop:'1rem'}}>
            <input type="file" onChange={e => setMaskFile(e.target.files[0])} />
            <button onClick={handleManual}>Subir máscara</button>
            <button onClick={handleAutomatico}>Generar automática</button>
          </div>
        </div>
      )}
      {maskUrl && (
        <div style={{marginTop:'1rem'}}>
          <h2>Editar máscara</h2>
          <div>
            <label>Color: </label>
            <select value={drawColor} onChange={e => setDrawColor(e.target.value)}>
              <option value="#ffffff">Blanco</option>
              <option value="#000000">Negro</option>
            </select>
            <button onClick={handleGuardarMascara}>Guardar máscara</button>
            <button onClick={handlePwatscore}>Calcular PWATScore</button>
          </div>
          <canvas
            ref={canvasRef}
            style={{border:'1px solid #000', cursor:'crosshair'}}
            onMouseDown={startDraw}
            onMouseUp={endDraw}
            onMouseMove={draw}
            onMouseLeave={endDraw}
          />
        </div>
      )}
      {error && <p style={{color:'red'}}>{error}</p>}
      {pwatscore && (
        <div>
          <h2>Categorías</h2>
          {[3,4,5,6,7,8].map(n => (
            <div key={n}>
              <label>{`Cat${n}: `}</label>
              <input type="number" value={pwatscore[`cat${n}`]} onChange={e => setPwatscore({ ...pwatscore, [`cat${n}`]: e.target.value })} />
            </div>
          ))}
          <button onClick={handleUpdate}>Guardar</button>
        </div>
      )}
    </div>
  );
}
