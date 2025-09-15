/**
 * API Service - Maneja todas las comunicaciones con el backend
 */
class ApiService {
    constructor() {
        // URL del backend - actualizar según tu VPS
        this.baseURL = this.getApiBaseUrl();
        this.timeout = 30000; // 30 segundos
    }

    /**
     * Obtiene la URL base del API según el entorno
     */
    getApiBaseUrl() {
        // En desarrollo, usa localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }

        // En producción, usa tu VPS
        return 'https://aplicaciones-web-gestor-migracion-zona.vzrxex.easypanel.host';
    }

    /**
     * Método genérico para hacer requests con timeout y error handling
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

        try {
            // Crear promise con timeout
            const fetchPromise = fetch(url, config);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), this.timeout);
            });

            const response = await Promise.race([fetchPromise, timeoutPromise]);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ API Response: ${url}`, data.cached ? '(from cache)' : '(fresh)');

            return data;
        } catch (error) {
            console.error(`❌ API Error: ${url}`, error.message);
            throw new Error(`API request failed: ${error.message}`);
        }
    }

    /**
     * Valida la conexión con el backend y Google Sheets
     */
    async validateConnection() {
        return this.makeRequest('/api/sheets/validate');
    }

    /**
     * Obtiene datos de una hoja específica
     */
    async getSheetData(range = 'A:Z', sheetName = 'Base') {
        const params = new URLSearchParams({ range, sheet: sheetName });
        return this.makeRequest(`/api/sheets/data?${params}`);
    }

    /**
     * Obtiene todas las pestañas disponibles
     */
    async getAvailableSheets() {
        return this.makeRequest('/api/sheets/available');
    }

    /**
     * Obtiene configuración financiera
     */
    async getFinancialConfig(scenario = 'Base') {
        const params = new URLSearchParams({ scenario });
        return this.makeRequest(`/api/sheets/financial-config?${params}`);
    }

    /**
     * Obtiene estadísticas del cache
     */
    async getCacheStats() {
        return this.makeRequest('/api/cache/stats');
    }

    /**
     * Limpia el cache
     */
    async clearCache(pattern = null) {
        return this.makeRequest('/api/cache/clear', {
            method: 'POST',
            body: JSON.stringify({ pattern })
        });
    }

    /**
     * Health check del backend
     */
    async healthCheck() {
        return this.makeRequest('/');
    }

    /**
     * Test de conectividad básica
     */
    async testConnectivity() {
        try {
            const startTime = Date.now();
            const response = await this.healthCheck();
            const duration = Date.now() - startTime;

            return {
                success: true,
                duration: duration,
                message: `Backend respondió en ${duration}ms`,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Backend no accesible'
            };
        }
    }
}

// Exportar instancia singleton
const apiService = new ApiService();
window.apiService = apiService; // Para debugging en consola

// Función helper para debugging
window.testAPI = async () => {
    console.log('🧪 Testing API connectivity...');

    const health = await apiService.testConnectivity();
    console.log('Health:', health);

    if (health.success) {
        try {
            const validation = await apiService.validateConnection();
            console.log('Validation:', validation);

            const sheets = await apiService.getAvailableSheets();
            console.log('Available sheets:', sheets);
        } catch (error) {
            console.error('API test failed:', error);
        }
    }
};