/**
 * Utilidades para calcular métricas de rendimiento en tests de sistema
 * - Percentiles (P50, P95, P99)
 * - Tasas de error
 * - Throughput (operaciones por segundo)
 */

class PerformanceMetrics {
    constructor() {
        this.responseTimes = [];
        this.errors = 0;
        this.successes = 0;
        this.startTime = null;
        this.endTime = null;
    }

    /**
     * Inicia el tracking de tiempo
     */
    start() {
        this.startTime = Date.now();
        this.responseTimes = [];
        this.errors = 0;
        this.successes = 0;
    }

    /**
     * Registra el tiempo de respuesta de una operación
     * @param {number} responseTimeMs - Tiempo de respuesta en milisegundos
     * @param {boolean} success - Si la operación fue exitosa
     */
    recordResponse(responseTimeMs, success = true) {
        this.responseTimes.push(responseTimeMs);
        if (success) {
            this.successes++;
        } else {
            this.errors++;
        }
    }

    /**
     * Finaliza el tracking de tiempo
     */
    end() {
        this.endTime = Date.now();
    }

    /**
     * Calcula el percentil especificado
     * @param {number} percentile - Percentil a calcular (0-100)
     * @returns {number} Valor del percentil en ms
     */
    getPercentile(percentile) {
        if (this.responseTimes.length === 0) return 0;

        const sorted = [...this.responseTimes].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Obtiene P50 (mediana)
     * @returns {number} P50 en ms
     */
    getP50() {
        return this.getPercentile(50);
    }

    /**
     * Obtiene P95
     * @returns {number} P95 en ms
     */
    getP95() {
        return this.getPercentile(95);
    }

    /**
     * Obtiene P99
     * @returns {number} P99 en ms
     */
    getP99() {
        return this.getPercentile(99);
    }

    /**
     * Calcula la tasa de error
     * @returns {number} Porcentaje de errores (0-100)
     */
    getErrorRate() {
        const total = this.errors + this.successes;
        if (total === 0) return 0;
        return (this.errors / total) * 100;
    }

    /**
     * Calcula el throughput (operaciones por segundo)
     * @returns {number} Operaciones por segundo
     */
    getThroughput() {
        if (!this.startTime || !this.endTime) return 0;

        const durationSeconds = (this.endTime - this.startTime) / 1000;
        if (durationSeconds === 0) return 0;

        const totalOps = this.errors + this.successes;
        return totalOps / durationSeconds;
    }

    /**
     * Calcula el tiempo promedio de respuesta
     * @returns {number} Tiempo promedio en ms
     */
    getAverageResponseTime() {
        if (this.responseTimes.length === 0) return 0;
        const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
        return sum / this.responseTimes.length;
    }

    /**
     * Calcula el tiempo mínimo de respuesta
     * @returns {number} Tiempo mínimo en ms
     */
    getMinResponseTime() {
        if (this.responseTimes.length === 0) return 0;
        return Math.min(...this.responseTimes);
    }

    /**
     * Calcula el tiempo máximo de respuesta
     * @returns {number} Tiempo máximo en ms
     */
    getMaxResponseTime() {
        if (this.responseTimes.length === 0) return 0;
        return Math.max(...this.responseTimes);
    }

    /**
     * Genera un reporte completo de métricas
     * @returns {Object} Objeto con todas las métricas
     */
    getReport() {
        return {
            totalRequests: this.errors + this.successes,
            successfulRequests: this.successes,
            failedRequests: this.errors,
            errorRate: this.getErrorRate().toFixed(2) + '%',
            throughput: this.getThroughput().toFixed(2) + ' ops/sec',
            responseTime: {
                min: this.getMinResponseTime().toFixed(2) + ' ms',
                max: this.getMaxResponseTime().toFixed(2) + ' ms',
                avg: this.getAverageResponseTime().toFixed(2) + ' ms',
                p50: this.getP50().toFixed(2) + ' ms',
                p95: this.getP95().toFixed(2) + ' ms',
                p99: this.getP99().toFixed(2) + ' ms',
            },
            duration:
                this.startTime && this.endTime
                    ? ((this.endTime - this.startTime) / 1000).toFixed(2) +
                      ' sec'
                    : '0 sec',
        };
    }

    /**
     * Imprime el reporte en consola
     */
    printReport(testName = 'Performance Test') {
        const report = this.getReport();
        console.log('\n' + '='.repeat(60));
        console.log(`📊 ${testName} - Performance Metrics`);
        console.log('='.repeat(60));
        console.log(`Total Requests:      ${report.totalRequests}`);
        console.log(`Successful:          ${report.successfulRequests}`);
        console.log(`Failed:              ${report.failedRequests}`);
        console.log(`Error Rate:          ${report.errorRate}`);
        console.log(`Throughput:          ${report.throughput}`);
        console.log(`Duration:            ${report.duration}`);
        console.log('\nResponse Times:');
        console.log(`  Min:               ${report.responseTime.min}`);
        console.log(`  Max:               ${report.responseTime.max}`);
        console.log(`  Avg:               ${report.responseTime.avg}`);
        console.log(`  P50 (median):      ${report.responseTime.p50}`);
        console.log(`  P95:               ${report.responseTime.p95}`);
        console.log(`  P99:               ${report.responseTime.p99}`);
        console.log('='.repeat(60) + '\n');
    }
}

/**
 * Helper para ejecutar operaciones con tracking de métricas
 * @param {Function} operation - Operación async a ejecutar
 * @param {PerformanceMetrics} metrics - Instancia de métricas
 * @returns {Promise<any>} Resultado de la operación
 */
async function trackOperation(operation, metrics) {
    const start = Date.now();
    let success = true;
    let result;

    try {
        result = await operation();
    } catch (error) {
        success = false;
        throw error;
    } finally {
        const duration = Date.now() - start;
        metrics.recordResponse(duration, success);
    }

    return result;
}

/**
 * Ejecuta múltiples operaciones en paralelo con tracking
 * @param {Array<Function>} operations - Array de operaciones async
 * @param {PerformanceMetrics} metrics - Instancia de métricas
 * @returns {Promise<Array>} Resultados de las operaciones
 */
async function trackParallelOperations(operations, metrics) {
    return Promise.all(operations.map((op) => trackOperation(op, metrics)));
}

/**
 * Ejecuta operaciones secuenciales con tracking
 * @param {Array<Function>} operations - Array de operaciones async
 * @param {PerformanceMetrics} metrics - Instancia de métricas
 * @returns {Promise<Array>} Resultados de las operaciones
 */
async function trackSequentialOperations(operations, metrics) {
    const results = [];
    for (const operation of operations) {
        results.push(await trackOperation(operation, metrics));
    }
    return results;
}

module.exports = {
    PerformanceMetrics,
    trackOperation,
    trackParallelOperations,
    trackSequentialOperations,
};
