# 🔄 Migración: Vista Simple → Vista Completa

## Cambios Principales

### 1. Estadísticas: 2 → 4 Cards

```tsx
// ANTES
<StatCard title='Pacientes' value={stats.total} />
<StatCard title='Imágenes' value={stats.totalImgs} />

// DESPUÉS
<StatCard title='Pacientes' value={stats.total} />
<StatCard title='Sin control > 30 días' value={stats.alerta} />
<StatCard title='Controles recientes' value={stats.recientesPct} />
<StatCard title='Imágenes' value={stats.totalImgs} />
```

### 2. Agregado Filtro por RUT

```tsx
<TextInput
    placeholder='Buscar por RUT'
    value={filtro}
    onChangeText={setFiltro}
/>
```

### 3. Agregado Filtro por Estado

```tsx
<EstadoFilter estadoActual={filtroEstado} onChange={setFiltroEstado} />
```

### 4. Lista con Badge de Estado

```tsx
// ANTES: Solo nombre y RUT
{
    item.paciente.nombre;
}

// DESPUÉS: Badge + fecha última imagen
<EstadoBadge estado={item.paciente.estado} />;
{
    ultimas[item.paciente.id] && (
        <Text>{new Date(ultimas[item.paciente.id]).toLocaleDateString()}</Text>
    );
}
```

### 5. Vista de Detalle del Paciente

```tsx
{
    seleccionado && (
        <Card>
            {/* Información del paciente */}
            {/* Selector de estado */}
            {/* Botón subir imagen */}
            {/* Lista de imágenes */}
        </Card>
    );
}
```

### 6. Cambio de Estado Interactivo

```tsx
const cambiarEstadoPaciente = async (nuevoEstado) => {
    await updatePatient(seleccionado.paciente.id, { estado: nuevoEstado });
    setSeleccionado({
        ...seleccionado,
        paciente: { ...seleccionado.paciente, estado: nuevoEstado },
    });
    setPatients(
        patients.map((p) =>
            p.paciente.id === seleccionado.paciente.id
                ? { ...p, paciente: { ...p.paciente, estado: nuevoEstado } }
                : p
        )
    );
    Alert.alert('Éxito', 'Estado actualizado');
};

<EstadoSelector
    estadoActual={seleccionado.paciente.estado}
    onChange={cambiarEstadoPaciente}
/>;
```

---

## Componentes Nuevos Requeridos

1. **EstadoBadge.tsx** ✅ Creado
2. **translations.ts** ✅ Creado
3. **LanguageContext.tsx** ✅ Creado

---

## Funciones API Agregadas

```tsx
// En lib/api.ts
export async function updatePatient(
    patientId: number,
    data: { estado?: string }
) {
    return request(`/pacientes`, {
        method: 'PUT',
        body: JSON.stringify({ id: patientId, ...data }),
    });
}

export const BACKEND_URL = API_URL;
```

---

## Tipos Actualizados

```tsx
// Agregado campo 'estado' a PacienteDetalle
export interface PacienteDetalle {
    id: number;
    rut: string;
    nombre: string;
    correo: string;
    sexo: string | null;
    fecha_nacimiento: string | null;
    estado?: 'alta' | 'en_tratamiento' | 'interrumpido' | 'inactivo'; // ← NUEVO
}

// Agregado campo 'lado' a Imagen
export interface Imagen {
    id: number;
    nombre_archivo: string;
    fecha_captura: string;
    paciente_id: number;
    lado?: boolean | null; // ← NUEVO
}
```

---

## Cálculo de Estadísticas

```tsx
const now = Date.now();
let totalImgs = 0;
let recientes = 0;
let alerta = 0;

for (const atencion of response.pacientes) {
    const imgs = await getImagesForPatient(atencion.paciente.id);
    if (imgs.length > 0) {
        totalImgs += imgs.length;
        const latest = imgs.sort(
            (a, b) =>
                new Date(b.fecha_captura).getTime() -
                new Date(a.fecha_captura).getTime()
        )[0];
        const ts = new Date(latest.fecha_captura).getTime();
        const isReciente = now - ts < 1000 * 60 * 60 * 24 * 30; // 30 días
        if (isReciente) recientes++;
        else alerta++;
    } else {
        alerta++;
    }
}

setStats({
    total: response.pacientes.length,
    totalImgs,
    recientesPct: Math.round((recientes / total) * 100),
    alerta,
});
```

---

## Traducciones Clave

```tsx
const { t } = useLanguage();

t.professional.title; // "Profesionales" / "Professionals"
t.professional.myPatients; // "Mis Pacientes" / "My Patients"
t.professional.searchByRUT; // "Buscar por RUT" / "Search by ID"
t.patientStates.alta; // "Alta" / "Discharged"
t.images.upload; // "Subir Imagen" / "Upload Image"
```

---

## Resultado

-   Vista simple de lista → Vista completa con detalle
-   2 estadísticas → 4 estadísticas con alertas
-   Sin filtros → 2 filtros combinables
-   Sin gestión de estado → Cambio interactivo de estado
-   Sin imágenes → Lista de imágenes con thumbnails

🎉 **¡Migración Completada!**
