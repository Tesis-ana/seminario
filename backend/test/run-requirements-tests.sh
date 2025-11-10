#!/bin/bash

###############################################################################
# Script de Ejecución de Pruebas de Requerimientos
# 
# Este script facilita la ejecución de las suites de pruebas de requerimientos
# funcionales y no funcionales del sistema.
#
# ESTRUCTURA SOPORTADA:
#   1. Categorizada (Recomendada): unit, integration, system, acceptance
#   2. Monolítica (Legacy): functional-requirements.test.ts, non-functional-requirements.test.ts
#
# Uso:
#   ./run-requirements-tests.sh [opción]
#
# Opciones principales:
#   all         - Ejecutar todas las pruebas categorizadas (predeterminado)
#   unit        - Solo pruebas unitarias
#   integration - Solo pruebas de integración
#   system      - Solo pruebas de sistema
#   acceptance  - Solo pruebas de aceptación
#   monolithic  - Ejecutar estructura legacy (funcionales + no funcionales)
#   functional  - Solo pruebas funcionales (legacy)
#   nonfunc     - Solo pruebas no funcionales (legacy)
#   report      - Generar reporte detallado
#   coverage    - Ejecutar con análisis de cobertura
#   help        - Mostrar esta ayuda
###############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Directorio base
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$BACKEND_DIR/test/requirements"
REPORT_DIR="$BACKEND_DIR/test-reports/requirements"

# Función para imprimir encabezados
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

# Función para imprimir éxito
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Función para imprimir error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Función para imprimir info
print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -d "$TEST_DIR" ]; then
    print_error "Directorio de pruebas no encontrado: $TEST_DIR"
    exit 1
fi

# Crear directorio de reportes si no existe
mkdir -p "$REPORT_DIR"

# Función para ejecutar pruebas funcionales
run_functional_tests() {
    print_header "Ejecutando Pruebas de Requerimientos Funcionales (RF1-RF9) [LEGACY]"
    
    cd "$BACKEND_DIR"
    
    if bun test "$TEST_DIR/functional-requirements.test.ts"; then
        print_success "Todas las pruebas funcionales pasaron"
        return 0
    else
        print_error "Algunas pruebas funcionales fallaron"
        return 1
    fi
}

# Función para ejecutar pruebas no funcionales
run_nonfunctional_tests() {
    print_header "Ejecutando Pruebas de Requerimientos No Funcionales (RNF1-RNF9) [LEGACY]"
    
    cd "$BACKEND_DIR"
    
    if bun test "$TEST_DIR/non-functional-requirements.test.ts"; then
        print_success "Todas las pruebas no funcionales pasaron"
        return 0
    else
        print_error "Algunas pruebas no funcionales fallaron"
        return 1
    fi
}

# NUEVAS FUNCIONES PARA ESTRUCTURA CATEGORIZADA

# Función para ejecutar pruebas unitarias
run_unit_tests() {
    print_header "Ejecutando Pruebas Unitarias (Componentes Aislados)"
    
    cd "$BACKEND_DIR"
    
    if bun test "$TEST_DIR/unit/rf-unit.test.ts" --timeout 120000; then
        print_success "Todas las pruebas unitarias pasaron"
        return 0
    else
        print_error "Algunas pruebas unitarias fallaron"
        return 1
    fi
}

# Función para ejecutar pruebas de integración
run_integration_tests() {
    print_header "Ejecutando Pruebas de Integración (Interacciones entre Componentes)"
    
    cd "$BACKEND_DIR"
    
    if bun test "$TEST_DIR/integration/rf-integration.test.ts" --timeout 120000; then
        print_success "Todas las pruebas de integración pasaron"
        return 0
    else
        print_error "Algunas pruebas de integración fallaron"
        return 1
    fi
}

# Función para ejecutar pruebas de sistema
run_system_tests() {
    print_header "Ejecutando Pruebas de Sistema (Requerimientos No Funcionales)"
    
    cd "$BACKEND_DIR"
    
    if bun test "$TEST_DIR/system/rnf-system.test.ts" --timeout 120000; then
        print_success "Todas las pruebas de sistema pasaron"
        return 0
    else
        print_error "Algunas pruebas de sistema fallaron"
        return 1
    fi
}

# Función para ejecutar pruebas de aceptación
run_acceptance_tests() {
    print_header "Ejecutando Pruebas de Aceptación (Casos de Uso del Usuario)"
    
    cd "$BACKEND_DIR"
    
    if bun test "$TEST_DIR/acceptance/acceptance.test.ts" --timeout 120000; then
        print_success "Todas las pruebas de aceptación pasaron"
        return 0
    else
        print_error "Algunas pruebas de aceptación fallaron"
        return 1
    fi
}

# Función para ejecutar todas las pruebas categorizadas
run_all_categorized_tests() {
    print_header "Ejecutando TODAS las Pruebas Categorizadas (Pirámide de Testing)"
    
    print_info "Estructura: Unit → Integration → System → Acceptance"
    echo ""
    
    local unit_result=0
    local integration_result=0
    local system_result=0
    local acceptance_result=0
    
    run_unit_tests || unit_result=$?
    run_integration_tests || integration_result=$?
    run_system_tests || system_result=$?
    run_acceptance_tests || acceptance_result=$?
    
    echo ""
    print_header "Resumen de Resultados - Estructura Categorizada"
    
    echo -e "${CYAN}┌─────────────────────┬──────────┐${NC}"
    echo -e "${CYAN}│ Categoría           │ Estado   │${NC}"
    echo -e "${CYAN}├─────────────────────┼──────────┤${NC}"
    
    if [ $unit_result -eq 0 ]; then
        echo -e "${CYAN}│${NC} Unit Tests          ${CYAN}│${NC} ${GREEN}✓ PASS${NC}   ${CYAN}│${NC}"
    else
        echo -e "${CYAN}│${NC} Unit Tests          ${CYAN}│${NC} ${RED}✗ FAIL${NC}   ${CYAN}│${NC}"
    fi
    
    if [ $integration_result -eq 0 ]; then
        echo -e "${CYAN}│${NC} Integration Tests   ${CYAN}│${NC} ${GREEN}✓ PASS${NC}   ${CYAN}│${NC}"
    else
        echo -e "${CYAN}│${NC} Integration Tests   ${CYAN}│${NC} ${RED}✗ FAIL${NC}   ${CYAN}│${NC}"
    fi
    
    if [ $system_result -eq 0 ]; then
        echo -e "${CYAN}│${NC} System Tests        ${CYAN}│${NC} ${GREEN}✓ PASS${NC}   ${CYAN}│${NC}"
    else
        echo -e "${CYAN}│${NC} System Tests        ${CYAN}│${NC} ${RED}✗ FAIL${NC}   ${CYAN}│${NC}"
    fi
    
    if [ $acceptance_result -eq 0 ]; then
        echo -e "${CYAN}│${NC} Acceptance Tests    ${CYAN}│${NC} ${GREEN}✓ PASS${NC}   ${CYAN}│${NC}"
    else
        echo -e "${CYAN}│${NC} Acceptance Tests    ${CYAN}│${NC} ${RED}✗ FAIL${NC}   ${CYAN}│${NC}"
    fi
    
    echo -e "${CYAN}└─────────────────────┴──────────┘${NC}"
    echo ""
    
    if [ $unit_result -eq 0 ] && [ $integration_result -eq 0 ] && [ $system_result -eq 0 ] && [ $acceptance_result -eq 0 ]; then
        print_success "TODAS LAS PRUEBAS CATEGORIZADAS PASARON ✓"
        return 0
    else
        print_error "ALGUNAS PRUEBAS CATEGORIZADAS FALLARON ✗"
        return 1
    fi
}

# Función para ejecutar todas las pruebas
run_all_tests() {
    print_header "Ejecutando TODAS las Pruebas de Requerimientos [LEGACY MONOLITHIC]"
    
    local functional_result=0
    local nonfunctional_result=0
    
    run_functional_tests || functional_result=$?
    run_nonfunctional_tests || nonfunctional_result=$?
    
    echo ""
    print_header "Resumen de Resultados - Estructura Monolítica"
    
    if [ $functional_result -eq 0 ]; then
        print_success "Requerimientos Funcionales: PASARON"
    else
        print_error "Requerimientos Funcionales: FALLARON"
    fi
    
    if [ $nonfunctional_result -eq 0 ]; then
        print_success "Requerimientos No Funcionales: PASARON"
    else
        print_error "Requerimientos No Funcionales: FALLARON"
    fi
    
    if [ $functional_result -eq 0 ] && [ $nonfunctional_result -eq 0 ]; then
        print_success "TODAS LAS PRUEBAS PASARON ✓"
        return 0
    else
        print_error "ALGUNAS PRUEBAS FALLARON ✗"
        return 1
    fi
}

# Función para generar reporte
run_with_report() {
    print_header "Generando Reporte Detallado de Pruebas"
    
    cd "$BACKEND_DIR"
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local report_file="$REPORT_DIR/requirements_report_${timestamp}.txt"
    
    print_info "Ejecutando pruebas y generando reporte..."
    
    {
        echo "=========================================="
        echo "REPORTE DE PRUEBAS DE REQUERIMIENTOS"
        echo "Fecha: $(date)"
        echo "=========================================="
        echo ""
        
        echo "--- REQUERIMIENTOS FUNCIONALES ---"
        bun test "$TEST_DIR/functional-requirements.test.ts" 2>&1 || true
        
        echo ""
        echo "--- REQUERIMIENTOS NO FUNCIONALES ---"
        bun test "$TEST_DIR/non-functional-requirements.test.ts" 2>&1 || true
        
        echo ""
        echo "=========================================="
        echo "FIN DEL REPORTE"
        echo "=========================================="
    } > "$report_file"
    
    print_success "Reporte generado en: $report_file"
    
    # Mostrar resumen en consola
    cat "$report_file"
}

# Función para ejecutar con cobertura
run_with_coverage() {
    print_header "Ejecutando Pruebas con Análisis de Cobertura"
    
    cd "$BACKEND_DIR"
    
    print_info "Analizando cobertura de código..."
    
    if bun test "$TEST_DIR/" --coverage; then
        print_success "Análisis de cobertura completado"
    else
        print_error "Error en análisis de cobertura"
        return 1
    fi
}

# Función de ayuda
show_help() {
    cat << EOF

${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}
${MAGENTA}║${NC}  ${BLUE}Script de Pruebas de Requerimientos - Sistema PWAT${NC}        ${MAGENTA}║${NC}
${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}

${YELLOW}ESTRUCTURA CATEGORIZADA (Recomendada - Testing Pyramid):${NC}
─────────────────────────────────────────────────────────

${CYAN}Uso:${NC}
  ./run-requirements-tests.sh [opción]

${CYAN}Opciones - Estructura Categorizada:${NC}
  ${GREEN}all${NC}              - Ejecutar TODAS las pruebas categorizadas (predeterminado)
  ${GREEN}categorized${NC}      - Ejecutar explícitamente todas las pruebas categorizadas
  ${GREEN}unit${NC}             - Solo pruebas unitarias (componentes aislados)
  ${GREEN}integration${NC}      - Solo pruebas de integración (interacciones entre componentes)
  ${GREEN}system${NC}           - Solo pruebas de sistema (RNF del sistema completo)
  ${GREEN}acceptance${NC}       - Solo pruebas de aceptación (casos de uso del usuario)

${CYAN}Opciones - Estructura Monolítica (Legacy):${NC}
  ${YELLOW}monolithic${NC}       - Ejecutar todas las pruebas monolíticas (RF + RNF)
  ${YELLOW}functional${NC}       - Solo pruebas funcionales (RF1-RF9)
  ${YELLOW}nonfunc${NC}          - Solo pruebas no funcionales (RNF1-RNF9)

${CYAN}Opciones - Utilidades:${NC}
  ${MAGENTA}report${NC}           - Generar reporte detallado
  ${MAGENTA}coverage${NC}         - Ejecutar con análisis de cobertura
  ${MAGENTA}help${NC}             - Mostrar esta ayuda

${YELLOW}Ejemplos de Uso:${NC}
──────────────
  ${GREEN}# Ejecutar todas las pruebas categorizadas (recomendado)${NC}
  ./run-requirements-tests.sh
  ./run-requirements-tests.sh all

  ${GREEN}# Ejecutar solo pruebas unitarias (más rápidas)${NC}
  ./run-requirements-tests.sh unit

  ${GREEN}# Ejecutar solo pruebas de aceptación (casos de uso)${NC}
  ./run-requirements-tests.sh acceptance

  ${YELLOW}# Ejecutar estructura monolítica legacy${NC}
  ./run-requirements-tests.sh monolithic

  ${MAGENTA}# Generar reporte detallado${NC}
  ./run-requirements-tests.sh report

${YELLOW}Pirámide de Testing (Testing Pyramid):${NC}
──────────────────────────────────────
  
  ${CYAN}Acceptance${NC}    ▲          Casos de uso completos
  ${CYAN}System${NC}        │          Requisitos no funcionales (RNF)
  ${CYAN}Integration${NC}   │          Interacciones entre componentes
  ${CYAN}Unit${NC}          ▼          Componentes individuales aislados
  
  ${GREEN}Base (Unit):${NC}       Muchas pruebas, ejecución rápida
  ${GREEN}Integración:${NC}       Pruebas moderadas, ejecución media
  ${GREEN}Sistema:${NC}            Pruebas enfocadas, verifica RNF
  ${GREEN}Aceptación:${NC}         Casos críticos, flujos end-to-end

${YELLOW}Requerimientos Cubiertos:${NC}
─────────────────────────

${GREEN}Funcionales (RF):${NC}
  RF1  - Registro de usuario
  RF2  - Gestión de pacientes
  RF3  - Registro de profesionales
  RF4  - Carga de imágenes clínicas
  RF5  - Segmentación de imágenes
  RF6  - Evaluación del estadio de la herida (PWAT)
  RF7  - Visualización de evaluaciones
  RF8  - Validación cruzada de evaluaciones
  RF9  - Gestión de acceso por rol

${GREEN}No Funcionales (RNF):${NC}
  RNF1 - Rendimiento (procesamiento < 40s)
  RNF3 - Disponibilidad (99.5% mensual)
  RNF4 - Seguridad (TLS 1.2+, bcrypt)
  RNF5 - Usabilidad (interfaz responsiva)
  RNF6 - Mantenibilidad (código modular)
  RNF7 - Compatibilidad (navegadores modernos)
  RNF8 - Interoperabilidad (Node.js ↔ Python)
  RNF9 - Trazabilidad (registro de predicciones)

${YELLOW}Distribución de Pruebas por Categoría:${NC}
──────────────────────────────────────

${CYAN}Unit Tests:${NC}
  • Validación de modelos (User, Paciente, Profesional, Imagen)
  • Verificación de enums y estados
  • Validación de campos y constraints
  • Hash de contraseñas (bcrypt)

${CYAN}Integration Tests:${NC}
  • Relaciones entre modelos (User-Paciente-Profesional)
  • Flujos multi-componente (Imagen-Segmentación-PWAT)
  • Consultas con JOINs
  • Historial completo de pacientes

${CYAN}System Tests:${NC}
  • Performance (RNF1: < 40s procesamiento)
  • Disponibilidad (RNF3: 99.5%)
  • Seguridad (RNF4: TLS, bcrypt)
  • Mantenibilidad (RNF6: modularidad)
  • Compatibilidad (RNF7: navegadores)
  • Interoperabilidad (RNF8: Node-Python)
  • Trazabilidad (RNF9: auditoría)

${CYAN}Acceptance Tests:${NC}
  • UC1: Ingreso de nuevo paciente
  • UC2: Captura y análisis de herida
  • UC3: Validación médica de evaluación automática
  • UC4: Seguimiento de evolución temporal
  • UC5: Alta de paciente curado
  • UC6: Control de acceso por roles
  • UC7: Rendimiento del sistema
  • UC8: Auditoría y trazabilidad

${YELLOW}Notas:${NC}
──────
• La estructura categorizada es la ${GREEN}RECOMENDADA${NC} para nuevos desarrollos
• La estructura monolítica se mantiene por compatibilidad (legacy)
• Timeout configurado en 120 segundos para pruebas complejas
• Base de datos: MySQL (wound_assessment)
• Framework: Bun Test

EOF
}

# Procesar argumentos
case "${1:-all}" in
    all|categorized)
        run_all_categorized_tests
        exit $?
        ;;
    unit)
        run_unit_tests
        exit $?
        ;;
    integration|integr)
        run_integration_tests
        exit $?
        ;;
    system)
        run_system_tests
        exit $?
        ;;
    acceptance|accept)
        run_acceptance_tests
        exit $?
        ;;
    monolithic|legacy)
        run_all_tests
        exit $?
        ;;
    functional|func|rf)
        run_functional_tests
        exit $?
        ;;
    nonfunctional|nonfunc|rnf)
        run_nonfunctional_tests
        exit $?
        ;;
    report)
        run_with_report
        exit $?
        ;;
    coverage|cov)
        run_with_coverage
        exit $?
        ;;
    help|--help|-h)
        show_help
        exit 0
        ;;
    *)
        print_error "Opción no reconocida: $1"
        echo ""
        print_info "Use './run-requirements-tests.sh help' para ver todas las opciones disponibles"
        echo ""
        exit 1
        ;;
esac
