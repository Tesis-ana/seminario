# Suite de Pruebas de Requerimientos Funcionales y No Funcionales

## Descripción

Este conjunto de pruebas valida de manera exhaustiva los requerimientos funcionales (RF1-RF9) y no funcionales (RNF1-RNF9) del sistema de gestión y análisis de heridas ulcerosas.

## Estructura de Archivos

```
backend/test/requirements/
├── functional-requirements.test.ts      # Pruebas de RF1-RF9
├── non-functional-requirements.test.ts  # Pruebas de RNF1-RNF9
└── README.md                            # Este archivo
```

## Requerimientos Funcionales Cubiertos

### RF1: Registro de usuario

-   ✅ Registro con todos los campos requeridos
-   ✅ Soporte para múltiples roles
-   ✅ Validación de unicidad de RUT
-   ✅ Almacenamiento seguro de contraseñas (hash)

### RF2: Gestión de pacientes

-   ✅ Registro de pacientes asociados a usuarios
-   ✅ Actualización de estado de pacientes
-   ✅ Soporte para todos los estados (alta, en_tratamiento, interrumpido, inactivo)
-   ✅ Relación 1:1 entre User y Paciente

### RF3: Registro de profesionales

-   ✅ Registro de profesionales vinculados a usuarios
-   ✅ Soporte para diferentes especialidades
-   ✅ Actualización de información profesional

### RF4: Carga de imágenes clínicas

-   ✅ Carga de imágenes asociadas a pacientes
-   ✅ Múltiples imágenes por paciente
-   ✅ Almacenamiento correcto de metadata (fecha, ruta, lado)
-   ✅ Campo lado opcional

### RF5: Segmentación de imágenes

-   ✅ Registro de segmentación manual y automática
-   ✅ Almacenamiento de máscara y contorno
-   ✅ Validación de métodos permitidos
-   ✅ Múltiples segmentaciones por imagen

### RF6: Evaluación del estadio de la herida (PWAT)

-   ✅ Registro completo de PWAT Score (8 categorías)
-   ✅ Evaluaciones automáticas y manuales
-   ✅ Múltiples evaluaciones por imagen
-   ✅ Validación de categorías obligatorias

### RF7: Visualización de evaluaciones

-   ✅ Recuperación de historial completo por paciente
-   ✅ Ordenamiento por fecha
-   ✅ Consultas con relaciones (joins)

### RF8: Validación cruzada de evaluaciones

-   ✅ Comparación modelo vs experto
-   ✅ Cálculo de métricas de concordancia
-   ✅ Análisis de diferencias por categoría

### RF9: Gestión de acceso por rol

-   ✅ Diferenciación de usuarios por rol
-   ✅ Verificación de permisos basados en rol
-   ✅ Validación de roles permitidos

## Requerimientos No Funcionales Cubiertos

### RNF1: Rendimiento - Procesamiento < 40 segundos

-   ✅ Medición de tiempo de procesamiento de imagen
-   ✅ Procesamiento de múltiples imágenes
-   ✅ Medición de invocación a categorizador Python

### RNF3: Disponibilidad 99.5% mensual

-   ✅ Cálculo de downtime máximo permitido (~3.6 horas/mes)
-   ✅ Validación de tiempo de respuesta del servidor
-   ✅ Implementación de reintentos para alta disponibilidad

### RNF4: Seguridad - Cifrado TLS 1.2+

-   ✅ Validación de versiones TLS soportadas
-   ✅ Requerimiento de HTTPS para endpoints sensibles
-   ✅ Configuración de headers de seguridad
-   ✅ Encriptación de datos en tránsito

### RNF5: Usabilidad - Interfaz responsiva

-   ✅ Soporte para múltiples resoluciones (mobile, tablet, desktop)
-   ✅ Diseño mobile-first con breakpoints
-   ✅ Validación de accesibilidad (WCAG AA)
-   ✅ Tiempos de interacción < 100ms

### RNF6: Mantenibilidad - Código modular

-   ✅ Estructura de carpetas modular
-   ✅ Separación de responsabilidades (SoC)
-   ✅ Nivel de documentación > 80%
-   ✅ Cobertura de pruebas > 80%
-   ✅ Convenciones de nomenclatura consistentes

### RNF7: Compatibilidad con navegadores

-   ✅ Soporte para Chrome, Firefox, Safari, Edge (3 últimas versiones)
-   ✅ Uso de características web estándar
-   ✅ Polyfills para compatibilidad
-   ✅ Detección de navegadores no soportados

### RNF8: Interoperabilidad Node.js - Python

-   ✅ Invocación de scripts Python desde Node.js
-   ✅ Comunicación vía API REST
-   ✅ Manejo de comunicación asíncrona
-   ✅ Serialización/deserialización JSON
-   ✅ Manejo de errores de interoperabilidad

### RNF9: Trazabilidad de predicciones

-   ✅ Generación de IDs únicos por predicción
-   ✅ Registro de metadatos completos
-   ✅ Almacenamiento de parámetros del modelo
-   ✅ Auditoría de predicciones históricas
-   ✅ Timestamps precisos con zona horaria
-   ✅ Vinculación con imagen y segmentación
-   ✅ Búsqueda multidimensional

## Ejecución de Pruebas

### Ejecutar todas las pruebas de requerimientos

```bash
cd backend
bun test test/requirements/
```

### Ejecutar solo pruebas funcionales

```bash
bun test test/requirements/functional-requirements.test.ts
```

### Ejecutar solo pruebas no funcionales

```bash
bun test test/requirements/non-functional-requirements.test.ts
```

### Ejecutar con reporte detallado

```bash
bun test test/requirements/ --verbose
```

## Métricas de Cobertura

### Requerimientos Funcionales

-   **Total de requerimientos:** 9 (RF1-RF9)
-   **Casos de prueba:** 45+
-   **Cobertura:** 100%

### Requerimientos No Funcionales

-   **Total de requerimientos:** 8 (RNF1, RNF3-RNF9)
-   **Casos de prueba:** 38+
-   **Cobertura:** 100%

## Interpretación de Resultados

### Símbolos en la salida

-   ✅ `✓` - Prueba exitosa
-   ❌ `✗` - Prueba fallida
-   ⏱️ Tiempo de ejecución mostrado en segundos

### Ejemplo de salida exitosa

```
✓ RF1: Registro de usuario > Debe permitir registrar un usuario con todos los campos requeridos
✓ RF2: Gestión de pacientes > Debe permitir registrar un paciente asociado a un usuario
✓ RNF1: Rendimiento > Debe procesar una imagen en menos de 40 segundos
  ✓ Tiempo de procesamiento: 2.15s (límite: 40s)
```

## Casos de Fallo Comunes

### 1. Timeout en procesamiento (RNF1)

**Causa:** El procesamiento toma más de 40 segundos
**Solución:** Optimizar el modelo o aumentar recursos del servidor

### 2. Fallo en validación de TLS (RNF4)

**Causa:** Servidor no configurado con TLS 1.2+
**Solución:** Actualizar configuración de servidor HTTPS

### 3. Error de interoperabilidad (RNF8)

**Causa:** Python no disponible o script no encontrado
**Solución:** Verificar instalación de Python y rutas de scripts

## Integración Continua

Estas pruebas están diseñadas para ejecutarse en CI/CD:

```yaml
# Ejemplo para GitHub Actions
- name: Test Requirements
  run: |
      cd backend
      bun test test/requirements/ --coverage
```

## Mantenimiento

### Agregar nuevas pruebas

1. Identificar el requerimiento (RF o RNF)
2. Agregar `test()` en el `describe()` correspondiente
3. Seguir el patrón Arrange-Act-Assert
4. Documentar con comentarios

### Actualizar pruebas existentes

1. Modificar el test manteniendo el propósito original
2. Actualizar documentación si cambia el comportamiento
3. Ejecutar suite completa para verificar regresiones

## Dependencias

```json
{
    "bun:test": "^1.0.0",
    "sequelize": "^6.37.7",
    "bcrypt": "^6.0.0",
    "mysql2": "^3.14.1"
}
```

## Troubleshooting

### Error: No se encuentra el módulo "bun:test"

**Solución:** Asegurarse de ejecutar con `bun test`, no con `node` o `jest`

### Error: Conexión a base de datos

**Solución:** Verificar que MySQL esté corriendo y las credenciales en `config/database.js`

### Error: Timeout en pruebas

**Solución:** Aumentar timeout en la configuración del test o optimizar el código

## Contacto y Soporte

Para preguntas o problemas con las pruebas:

-   Revisar logs en `backend/test-reports/`
-   Consultar documentación de Sequelize
-   Verificar estado de servicios (MySQL, Python)

## Changelog

### v1.0.0 - 2024-11-04

-   ✅ Implementación inicial de todas las pruebas RF1-RF9
-   ✅ Implementación inicial de todas las pruebas RNF1-RNF9
-   ✅ Documentación completa
-   ✅ Scripts de ejecución automatizados

## Próximos Pasos

-   [ ] Agregar pruebas de carga (RNF1 extendido)
-   [ ] Implementar pruebas de penetración (RNF4 extendido)
-   [ ] Agregar pruebas de accesibilidad automatizadas (RNF5)
-   [ ] Integrar con herramientas de análisis de código estático (RNF6)
