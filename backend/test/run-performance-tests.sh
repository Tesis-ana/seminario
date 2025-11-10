#!/bin/bash

# Script para ejecutar tests de sistema con métricas de rendimiento
# y generar un reporte consolidado

set -e

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$(cd "$BACKEND_DIR/../frontend" && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="$BACKEND_DIR/test-reports/performance"
REPORT_FILE="$REPORT_DIR/performance-report-$TIMESTAMP.md"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}     🚀 Ejecutando Tests de Sistema con Métricas de Rendimiento${NC}"
echo -e "${BLUE}==================================================================${NC}\n"

# Crear directorio de reportes si no existe
mkdir -p "$REPORT_DIR"

# Iniciar reporte
cat > "$REPORT_FILE" << EOF
# Reporte de Métricas de Rendimiento - Sistema de Gestión de Heridas

**Fecha:** $(date '+%Y-%m-%d %H:%M:%S')  
**Versión:** $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")

---

## 📊 Resumen Ejecutivo

Este reporte consolida las métricas de rendimiento obtenidas de los tests de sistema del backend y frontend.

### Métricas Clave
- **P50 (Percentil 50)**: Tiempo de respuesta mediano
- **P95 (Percentil 95)**: 95% de las requests completaron en este tiempo o menos
- **P99 (Percentil 99)**: 99% de las requests completaron en este tiempo o menos
- **Error Rate**: Porcentaje de operaciones fallidas
- **Throughput**: Operaciones por segundo

---

## 🔧 Tests del Backend

EOF

echo -e "${YELLOW}📦 Ejecutando tests de sistema del backend...${NC}\n"

cd "$BACKEND_DIR"

# Ejecutar tests del backend y capturar output
BACKEND_OUTPUT=$(bun test test/system/*.test.ts 2>&1 | tee /dev/tty)
BACKEND_EXIT_CODE=$?

# Extraer métricas del output y agregarlas al reporte
echo "$BACKEND_OUTPUT" | grep -A 20 "Performance Metrics" >> "$REPORT_FILE" 2>/dev/null || echo "No se encontraron métricas en el output del backend" >> "$REPORT_FILE"

if [ $BACKEND_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Tests de backend completados exitosamente${NC}\n"
    echo -e "\n### ✅ Estado: PASARON\n" >> "$REPORT_FILE"
else
    echo -e "\n${RED}❌ Algunos tests de backend fallaron (exit code: $BACKEND_EXIT_CODE)${NC}\n"
    echo -e "\n### ❌ Estado: FALLARON (Exit Code: $BACKEND_EXIT_CODE)\n" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF

---

## 🎨 Tests del Frontend

EOF

echo -e "${YELLOW}🌐 Ejecutando tests de integración del frontend...${NC}\n"

cd "$FRONTEND_DIR"

# Ejecutar tests del frontend y capturar output
FRONTEND_OUTPUT=$(npm test -- performance-integration.test.tsx --verbose 2>&1 | tee /dev/tty)
FRONTEND_EXIT_CODE=$?

# Extraer métricas y agregarlas al reporte
echo "$FRONTEND_OUTPUT" | grep -A 20 "Performance" >> "$REPORT_FILE" 2>/dev/null || echo "No se encontraron métricas en el output del frontend" >> "$REPORT_FILE"

if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Tests de frontend completados exitosamente${NC}\n"
    echo -e "\n### ✅ Estado: PASARON\n" >> "$REPORT_FILE"
else
    echo -e "\n${RED}❌ Algunos tests de frontend fallaron (exit code: $FRONTEND_EXIT_CODE)${NC}\n"
    echo -e "\n### ❌ Estado: FALLARON (Exit Code: $FRONTEND_EXIT_CODE)\n" >> "$REPORT_FILE"
fi

# Agregar conclusiones
cat >> "$REPORT_FILE" << EOF

---

## 📈 Análisis y Recomendaciones

### Umbrales Esperados

| Métrica | Umbral Óptimo | Umbral Aceptable | Acción si se Excede |
|---------|---------------|------------------|---------------------|
| P50 | < 200ms | < 500ms | Optimizar queries DB y caché |
| P95 | < 500ms | < 1000ms | Revisar operaciones lentas |
| P99 | < 1000ms | < 2000ms | Identificar outliers |
| Error Rate | < 1% | < 5% | Revisar manejo de errores |
| Throughput | > 10 ops/s | > 5 ops/s | Escalar recursos |

### Acciones Recomendadas

**Si P95 > 1s:**
- Revisar queries N+1 en el ORM
- Implementar índices en tablas frecuentes
- Considerar caché de Redis

**Si Error Rate > 5%:**
- Analizar logs de errores
- Mejorar validaciones de entrada
- Implementar circuit breakers

**Si Throughput < 5 ops/s:**
- Revisar pooling de conexiones DB
- Optimizar middleware
- Considerar load balancing

---

## 📝 Notas Adicionales

- Los tests se ejecutaron en ambiente: **$(echo ${NODE_ENV:-development})**
- Backend Puerto: **$(echo ${RUN_PORT:-3001})**
- Frontend Puerto: **$(echo ${PORT:-3000})**

---

**Generado automáticamente por:** \`run-performance-tests.sh\`

EOF

echo -e "${BLUE}==================================================================${NC}"
echo -e "${GREEN}✨ Reporte de métricas generado en:${NC}"
echo -e "${YELLOW}   $REPORT_FILE${NC}"
echo -e "${BLUE}==================================================================${NC}\n"

# Mostrar resumen final
echo -e "${BLUE}📊 Resumen de Ejecución:${NC}"
echo -e "   Backend: $([ $BACKEND_EXIT_CODE -eq 0 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "   Frontend: $([ $FRONTEND_EXIT_CODE -eq 0 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo ""

# Exit con el código más alto
MAX_EXIT_CODE=$((BACKEND_EXIT_CODE > FRONTEND_EXIT_CODE ? BACKEND_EXIT_CODE : FRONTEND_EXIT_CODE))
exit $MAX_EXIT_CODE
