#!/bin/bash

# Script de ejemplo para demostrar las métricas de rendimiento
# Este script genera datos de ejemplo para mostrar cómo funcionan las métricas

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║     📊 Demo de Métricas de Rendimiento - Sistema Seminario    ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cat << 'EOF'

Ejemplo de salida de métricas de rendimiento:

==================================================================
📊 Patient Flow Test - Performance Metrics
==================================================================
Total Requests:      10
Successful:          10
Failed:              0
Error Rate:          0.00%
Throughput:          4.12 ops/sec
Duration:            2.43 sec

Response Times:
  Min:               125.43 ms
  Max:               856.21 ms
  Avg:               243.12 ms
  P50 (median):      218.45 ms
  P95:               723.67 ms
  P99:               851.94 ms
==================================================================


==================================================================
📊 Imaging Flow Test - Performance Metrics
==================================================================
Total Requests:      8
Successful:          7
Failed:              1
Error Rate:          12.50%
Throughput:          2.91 ops/sec
Duration:            2.75 sec

Response Times:
  Min:               156.32 ms
  Max:               1243.76 ms
  Avg:               487.23 ms
  P50 (median):      398.56 ms
  P95:               1156.89 ms
  P99:               1237.45 ms
==================================================================


==================================================================
📊 Frontend - Listar Pacientes - Performance Metrics
==================================================================
Total Requests:      10
Successful:          10
Failed:              0
Error Rate:          0.00%
Throughput:          5.23 ops/sec
Duration:            1.91 sec

Response Times:
  Min:               145.23 ms
  Max:               432.11 ms
  Avg:               191.34 ms
  P50 (median):      178.92 ms
  P95:               389.45 ms
  P99:               428.76 ms
==================================================================


==================================================================
📊 Frontend - Laboratorio CRUD - Performance Metrics
==================================================================
Total Requests:      5
Successful:          4
Failed:              1
Error Rate:          20.00%
Throughput:          2.34 ops/sec
Duration:            2.14 sec

Response Times:
  Min:               234.56 ms
  Max:               876.43 ms
  Avg:               428.67 ms
  P50 (median):      389.23 ms
  P95:               823.45 ms
  P99:               871.23 ms
==================================================================

EOF

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  📈 Interpretación de Métricas                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cat << 'EOF'
✅ BUENAS MÉTRICAS (Patient Flow):
   - Error Rate: 0% (óptimo, sin errores)
   - P50: 218ms (muy bueno, < 500ms)
   - P95: 723ms (aceptable, < 1s)
   - Throughput: 4.12 ops/s (bueno)

⚠️  MÉTRICAS A MEJORAR (Imaging Flow):
   - Error Rate: 12.5% (alto, investigar errores)
   - P95: 1156ms (límite aceptable)
   - Considerar optimización de subida de archivos

✅ EXCELENTES MÉTRICAS (Frontend - Listar Pacientes):
   - Error Rate: 0%
   - P50: 178ms (excelente, < 200ms)
   - P95: 389ms (muy bueno, < 500ms)
   - Throughput: 5.23 ops/s (muy bueno)

⚠️  MÉTRICAS MIXTAS (Laboratorio CRUD):
   - Error Rate: 20% (alto para CRUD, revisar)
   - P50: 389ms (aceptable)
   - P95: 823ms (aceptable, pero cerca del límite)

EOF

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🎯 Acciones Recomendadas                                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cat << 'EOF'
1. IMAGING FLOW - Error Rate 12.5%:
   → Revisar logs de errores en subida de imágenes
   → Validar formato y tamaño de archivos
   → Implementar reintentos para operaciones de I/O

2. IMAGING FLOW - P95 alto (1156ms):
   → Optimizar procesamiento de imágenes
   → Considerar procesamiento asíncrono
   → Implementar streaming para archivos grandes

3. LABORATORIO CRUD - Error Rate 20%:
   → Validar datos de entrada antes de enviar
   → Mejorar manejo de errores en validaciones
   → Implementar circuit breaker para APIs

4. GENERAL - Mejorar throughput:
   → Revisar pooling de conexiones DB
   → Implementar caché para datos frecuentes
   → Considerar optimización de índices

EOF

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  📚 Recursos Disponibles                                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cat << 'EOF'
📖 Documentación:
   - Guía completa: backend/test/PERFORMANCE_METRICS_GUIDE.md
   - Implementación: METRICAS_RENDIMIENTO_IMPLEMENTACION.md

🔧 Herramientas:
   - Librería backend: backend/test/performance-metrics.js
   - Librería frontend: frontend/test/performance-metrics.ts
   - Script de reportes: backend/test/run-performance-tests.sh

🧪 Tests de ejemplo:
   - Backend: backend/test/system/*.test.ts
   - Frontend: frontend/test/performance-integration.test.tsx

🚀 Comandos rápidos:
   # Ejecutar tests con métricas
   cd backend && bun test test/system/*.test.ts
   
   # Generar reporte consolidado
   cd backend && ./test/run-performance-tests.sh
   
   # Frontend tests
   cd frontend && npm test -- performance-integration.test.tsx

EOF

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

