/**
 * Dashboard Gestor Suro - Versión Backend API
 * Utiliza backend propio en lugar de Google Sheets API directa
 */

class GestorSuroDashboard {
    constructor() {
        this.isConnected = false;
        this.rawData = [];
        this.filteredData = [];
        this.charts = {};
        this.config = {
            backendUrl: '', // Se configurará automáticamente
            range: 'A1:Z1000'
        };
        this.pagination = {
            currentPage: 1,
            itemsPerPage: 100,
            totalPages: 1
        };
        this.excludedColumns = ['Vendedor Directa', 'Estado Municipio', 'Zona Geográfica', 'Mercaderismo', 'Condicion_Pago', 'Zona_Geografica', 'Estado_Municipio', 'NIF', 'Latitud', 'Longitud', 'Concatenado'];

        // Configuración de ordenamiento
        this.sortConfig = {
            column: 'Venta Prom',
            direction: 'desc'
        };

        // Configuración de escenarios
        this.scenarios = {
            current: 'Base',
            available: ['Base'],
            sheets: {}
        };

        // Datos del escenario Base para comparación
        this.baseScenarioData = [];
        this.changeAnalysis = {
            clientsWithChanges: 0,
            salesFromChanges: 0,
            changedClients: []
        };

        // Configuración financiera desde ConfigFinanciera
        this.financialConfig = {
            'nexo-venta': 0,
            'directa-venta': 0,
            'nexo-costo': 0,
            'directa-costo': 0,
            'nexo-ICA': 0,
            'directa-ICA': 0,
            'nexo-recursos': [],
            'directa-recursos': []
        };

        // Auto-conectar al inicializar
        this.init();
    }

    /**
     * Inicialización automática
     */
    async init() {
        try {
            this.showLoading(true);
            this.setupEventListeners();

            // Conectar automáticamente sin configuración manual
            await this.connectToBackend();

        } catch (error) {
            console.error("Error crítico en la inicialización:", error);
            this.updateConnectionStatus('Error al iniciar la aplicación', false);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Se conecta al backend API
     */
    async connectToBackend() {
        this.showLoading(true);
        this.updateConnectionStatus('Conectando...');

        // Sistema de debugging detallado
        const debugLog = (step, message, data = null) => {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`🔍 [${timestamp}] Paso ${step}: ${message}`, data || '');
            this.updateConnectionStatus(`Paso ${step}: ${message}`);
        };

        try {
            debugLog(1, 'Conectando a backend API...');

            // Test de conectividad con el backend
            debugLog(1.1, 'Probando conectividad con backend...');
            const healthCheck = await apiService.testConnectivity();

            if (!healthCheck.success) {
                debugLog(1.2, '❌ FALLO: Backend no accesible', healthCheck.error);
                throw new Error(`Backend no disponible: ${healthCheck.error}`);
            }
            debugLog(1.2, `✅ Backend conectado (${healthCheck.duration}ms)`);

            debugLog(2, 'Validando acceso a Google Sheets...');
            const validation = await apiService.validateConnection();

            if (!validation.success) {
                debugLog(2.1, '❌ FALLO: Validación Google Sheets', validation.error);
                throw new Error(`Google Sheets no accesible: ${validation.error}`);
            }
            debugLog(2.1, `✅ Google Sheets validado: "${validation.title}"`);

            debugLog(3, 'Cargando datos de referencia base...');
            await this.loadBaseData();
            debugLog(3.1, '✅ Datos base cargados');

            debugLog(4, 'Cargando datos principales de la hoja...');
            await this.loadSheetData();
            debugLog(4.1, '✅ Datos principales cargados');

            debugLog(5, 'Descubriendo escenarios disponibles...');
            await this.loadAvailableScenarios();
            debugLog(5.1, '✅ Escenarios descubiertos');

            debugLog(6, 'Cargando configuración financiera...');
            await this.loadFinancialConfig();
            debugLog(6.1, '✅ Configuración financiera cargada');

            this.isConnected = true;
            debugLog(7, '🎉 ¡CONEXIÓN EXITOSA VIA API! Dashboard listo para usar');
            this.updateConnectionStatus('Conectado via API', true);

        } catch (error) {
            const errorMessage = error.message || 'Error desconocido';
            console.error('❌ ERROR FINAL:', error);

            // Mensaje específico según el tipo de error
            let userMessage = 'Error al conectar con el backend.';
            if (errorMessage.includes('Backend no disponible')) {
                userMessage = '🚫 Backend API no accesible. Verifica que esté ejecutándose en el VPS.';
            } else if (errorMessage.includes('Google Sheets no accesible')) {
                userMessage = '🔑 Backend no puede acceder a Google Sheets. Verifica API Key en servidor.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
                userMessage = '⏱️ Timeout de red. Verifica conectividad con el backend.';
            }

            this.updateConnectionStatus(`❌ ${userMessage}`, false);
            alert(`${userMessage}\n\nError técnico: ${errorMessage}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Obtiene las pestañas disponibles via API
     */
    async loadAvailableScenarios() {
        try {
            const response = await apiService.getAvailableSheets();

            if (!response.success) {
                throw new Error(response.error || 'Error obteniendo escenarios');
            }

            const sheets = response.sheets;
            const availableSheets = sheets
                .filter(sheet => !sheet.hidden)
                .map(sheet => sheet.title);

            this.scenarios.available = availableSheets;
            this.scenarios.sheets = {};

            // Mapear sheets por nombre
            sheets.forEach(sheet => {
                this.scenarios.sheets[sheet.title] = sheet;
            });

            console.log('📋 Escenarios disponibles:', availableSheets);
            this.updateScenarioSelector();

        } catch (error) {
            console.error('Error obteniendo pestañas:', error);
            this.scenarios.available = ['Base'];
            this.updateScenarioSelector();
        }
    }

    /**
     * Carga configuración financiera via API
     */
    async loadFinancialConfig() {
        try {
            const response = await apiService.getFinancialConfig(this.scenarios.current);

            if (response.success && response.config) {
                // Resetear configuración
                this.financialConfig = {
                    'nexo-venta': 0,
                    'directa-venta': 0,
                    'nexo-costo': 0,
                    'directa-costo': 0,
                    'nexo-ICA': 0,
                    'directa-ICA': 0,
                    'nexo-recursos': [],
                    'directa-recursos': []
                };

                // Procesar configuración del backend
                Object.entries(response.config).forEach(([campo, data]) => {
                    if (campo.includes('recursos')) {
                        this.processConfigResource(campo, data.valor, data.cantidad);
                    } else {
                        this.financialConfig[campo] = data.valor;
                    }
                });

                console.log('💰 Configuración financiera cargada:', this.financialConfig);
                this.updateFinancialSummary();
            } else {
                console.log('⚠️ ConfigFinanciera no disponible, usando valores por defecto');
            }

        } catch (error) {
            console.log('⚠️ Error cargando configuración financiera:', error.message);
        }
    }

    /**
     * Carga datos de hoja via API
     */
    async loadSheetData() {
        try {
            console.log('🔍 Cargando datos desde API:', this.scenarios.current);

            const response = await apiService.getSheetData(this.config.range, this.scenarios.current);

            if (!response.success) {
                throw new Error(response.error || 'Error cargando datos');
            }

            const rows = response.data;

            if (rows.length === 0) {
                throw new Error('La hoja está vacía');
            }

            // Procesar datos igual que antes
            const headers = rows[0];
            this.rawData = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cliente = {};

                headers.forEach((header, index) => {
                    if (header) {
                        cliente[header] = row[index] || '';
                    }
                });

                // Solo agregar si tiene datos mínimos
                if (cliente.Cliente || cliente.cliente) {
                    this.rawData.push(cliente);
                }
            }

            console.log(`✅ ${this.rawData.length} registros cargados desde API`);
            this.updateDashboard();

        } catch (error) {
            console.error('Error cargando datos desde API:', error);
            throw error;
        }
    }

    /**
     * Carga datos base para comparación via API
     */
    async loadBaseData() {
        try {
            const response = await apiService.getSheetData(this.config.range, 'Base');

            if (!response.success) {
                console.log('⚠️ No se pudieron cargar datos base para comparación');
                return;
            }

            const rows = response.data;
            if (rows.length === 0) return;

            const headers = rows[0];
            this.baseScenarioData = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cliente = {};

                headers.forEach((header, index) => {
                    if (header) {
                        cliente[header] = row[index] || '';
                    }
                });

                if (cliente.Cliente || cliente.cliente) {
                    this.baseScenarioData.push(cliente);
                }
            }

            console.log(`📊 ${this.baseScenarioData.length} registros base cargados para comparación`);

        } catch (error) {
            console.log('⚠️ Error cargando datos base:', error.message);
        }
    }

    /**
     * Configura los event listeners del dashboard
     */
    setupEventListeners() {
        // Selector de escenarios
        const scenarioSelect = document.getElementById('scenarioSelect');
        if (scenarioSelect) {
            scenarioSelect.addEventListener('change', (e) => {
                this.switchScenario(e.target.value);
            });
        }

        // Botón de conexión manual (por si hay problemas)
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.connectToBackend();
            });
        }

        // Listeners para filtros (si existen)
        this.setupFilterListeners();
    }

    /**
     * Configura listeners para los filtros
     */
    setupFilterListeners() {
        // Implementar filtros si es necesario
        console.log('Filter listeners configurados');
    }

    /**
     * Actualiza el estado de conexión en la interfaz
     */
    updateConnectionStatus(message, isConnected = null) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;

        if (isConnected !== null) {
            statusElement.className = isConnected ? 'status-connected' : 'status-disconnected';
            statusElement.innerHTML = isConnected
                ? '<i class="fas fa-circle"></i> Conectado'
                : '<i class="fas fa-circle"></i> Desconectado';
        } else {
            // Solo actualizar el texto para estados de progreso
            statusElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
        }
    }

    /**
     * Muestra/oculta el indicador de carga
     */
    showLoading(show) {
        const loadingElement = document.getElementById('loadingIndicator');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }

        // También afectar botones si existen
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = show;
        });
    }

    /**
     * Actualiza todo el dashboard con nuevos datos
     */
    updateDashboard() {
        if (!this.isConnected || this.rawData.length === 0) {
            console.log('⚠️ No hay datos para actualizar dashboard');
            return;
        }

        console.log('📊 Actualizando dashboard...');

        // Filtrar datos según criterios actuales
        this.filterData();

        // Actualizar componentes básicos
        this.updateMetrics();
        this.updateScenarioIndicator();

        console.log('✅ Dashboard actualizado');
    }

    /**
     * Filtra los datos según criterios actuales
     */
    filterData() {
        // Por ahora, usar todos los datos
        this.filteredData = [...this.rawData];
        console.log(`🔍 Datos filtrados: ${this.filteredData.length} registros`);
    }

    /**
     * Actualiza las métricas básicas
     */
    updateMetrics() {
        const metrics = this.calculateBasicMetrics();
        this.displayMetrics(metrics);
    }

    /**
     * Calcula métricas básicas
     */
    calculateBasicMetrics() {
        const totalClients = this.filteredData.length;

        return {
            totalClients,
            nexoClients: 0, // Implementar según estructura de datos
            directaClients: 0, // Implementar según estructura de datos
            totalSales: 0 // Implementar según estructura de datos
        };
    }

    /**
     * Muestra las métricas en la interfaz
     */
    displayMetrics(metrics) {
        // Actualizar elementos de métricas si existen
        const totalClientsEl = document.getElementById('totalClients');
        if (totalClientsEl) {
            totalClientsEl.textContent = metrics.totalClients;
        }

        console.log('📈 Métricas actualizadas:', metrics);
    }

    /**
     * Actualiza el indicador de escenario actual
     */
    updateScenarioIndicator() {
        const indicator = document.getElementById('currentScenario');
        if (indicator) {
            indicator.textContent = this.scenarios.current;
        }
    }

    /**
     * Actualiza el selector de escenarios
     */
    updateScenarioSelector() {
        const scenarioSelect = document.getElementById('scenarioSelect');
        if (!scenarioSelect) return;

        // Limpiar opciones existentes
        scenarioSelect.innerHTML = '';

        // Añadir opciones de escenarios
        this.scenarios.available.forEach(scenario => {
            const option = document.createElement('option');
            option.value = scenario;
            option.textContent = scenario;
            if (scenario === this.scenarios.current) {
                option.selected = true;
            }
            scenarioSelect.appendChild(option);
        });
    }

    /**
     * Cambia a un escenario diferente
     */
    async switchScenario(scenarioName) {
        if (scenarioName === this.scenarios.current) return;

        console.log(`🔄 Cambiando a escenario: ${scenarioName}`);
        this.scenarios.current = scenarioName;

        try {
            this.showLoading(true);
            await this.loadSheetData();
            await this.loadFinancialConfig();
            this.updateScenarioIndicator();
        } catch (error) {
            console.error('Error cambiando escenario:', error);
            alert(`Error al cambiar escenario: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Procesa recursos con cantidades desde ConfigFinanciera
     */
    processConfigResource(campo, valor, cantidad = null) {
        if (!this.financialConfig[campo]) {
            this.financialConfig[campo] = [];
        }

        const recurso = {
            valor: parseFloat(valor) || 0,
            cantidad: cantidad ? parseFloat(cantidad) : null
        };

        this.financialConfig[campo].push(recurso);
    }

    /**
     * Actualiza el panel de resumen financiero consolidado
     */
    updateFinancialSummary() {
        // Implementar actualización del resumen financiero
        console.log('💰 Resumen financiero actualizado');
    }
}

// Variable global para acceder al dashboard desde los botones
let dashboard;

// Inicializar el dashboard cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new GestorSuroDashboard();
    // Función global para acceder al dashboard desde HTML
    window.dashboard = dashboard;
});