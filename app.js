/**
 * Dashboard Gestor Suro - Análisis de Migración
 * Conecta con Google Sheets para analizar datos de clientes Nutresa vs Nexo
 */

class GestorSuroDashboard {
    constructor() {
        this.isConnected = false;
        this.rawData = [];
        this.filteredData = [];
        this.charts = {};
        this.config = {
            sheetId: '',
            apiKey: '',
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
        
        this.init();
    }

    /**
     * Inicializa el dashboard y configura los event listeners
     */
    async init() {
        this.showLoading(true);
        this.setupEventListeners();
        this.setupTabNavigation();
        try {
            await this.loadConfig();
            // Solo conectar si hay configuración válida
            if (this.config.sheetId && this.config.apiKey) {
                await this.connectToGoogleSheets();
                // loadBaseData y loadAvailableScenarios se ejecutan dentro de connectToGoogleSheets cuando la conexión es exitosa
            }
        } catch (error) {
            console.error("Error crítico en la inicialización:", error);
            this.updateConnectionStatus('Error al iniciar la aplicación', false);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Configura todos los event listeners del dashboard
     */
    setupEventListeners() {
        // Botón de conexión
        document.getElementById('connectBtn').addEventListener('click', () => {
            // Si ya hay configuración válida, reconecta directamente
            if (this.config.sheetId && this.config.apiKey) {
                this.connectToGoogleSheets();
            } else {
                this.showConfigModal();
            }
        });

        // Botón de actualización (verificar si existe)
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // Nuevos filtros
        const segmentoFilter = document.getElementById('segmentoFilter');
        const atencionFilter = document.getElementById('atencionFilter');
        const zonaGeograficaFilter = document.getElementById('zonaGeograficaFilter');
        const poblacionFilter = document.getElementById('poblacionFilter');
        const origenFilter = document.getElementById('origenFilter');
        const cambioAtencionFilter = document.getElementById('cambioAtencionFilter');
        
        if (segmentoFilter) {
            segmentoFilter.addEventListener('change', () => this.applyFilters());
        }
        if (atencionFilter) {
            atencionFilter.addEventListener('change', () => this.applyFilters());
        }
        if (zonaGeograficaFilter) {
            zonaGeograficaFilter.addEventListener('change', () => this.applyFilters());
        }
        if (poblacionFilter) {
            poblacionFilter.addEventListener('change', () => this.applyFilters());
        }
        if (origenFilter) {
            origenFilter.addEventListener('change', () => this.applyFilters());
        }
        if (cambioAtencionFilter) {
            cambioAtencionFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // Filtro de categorías
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }

        // Botón limpiar filtros
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Búsqueda en tabla
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTable(e.target.value);
            });
        }



        // Modal de configuración
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        const cancelConfigBtn = document.getElementById('cancelConfigBtn');
        
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveConfig();
            });
        }
        
        if (cancelConfigBtn) {
            cancelConfigBtn.addEventListener('click', () => {
                this.hideConfigModal();
            });
        }

        // Botón configurar categorías

        


        // Cerrar modal
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideConfigModal();
            });
        }
        


        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('configModal');
            if (e.target === modal) {
                this.hideConfigModal();
            }
        });
        
        // Selector de escenarios
        const scenarioSelect = document.getElementById('scenarioSelect');
        if (scenarioSelect) {
            scenarioSelect.addEventListener('change', (e) => {
                this.loadSelectedScenario();
            });
        }
    }

    /**
     * Configura la navegación por pestañas
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remover clase active de todos los botones y paneles
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Agregar clase active al botón y panel seleccionado
                button.classList.add('active');
                const targetPane = document.getElementById(`${targetTab}-tab`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
                
                // Actualizar contenido específico de la pestaña
                if (targetTab === 'poblacion') {
                    this.updatePoblacionSummary();
                } else if (targetTab === 'financiero') {
                    this.initializeFinancialCalculations();
                } else if (targetTab === 'mapa') {
                    // Inicializar el mapa con un pequeño delay para asegurar que el contenedor esté visible
                    setTimeout(() => {
                        this.initializeMap();
                    }, 100);
                }
            });
        });
    }

    /**
     * Carga la configuración desde config.js o localStorage
     */
    loadConfig() {
        // Primero intenta cargar desde config.js global
        if (typeof CONFIG !== 'undefined' && CONFIG.SHEET_ID && CONFIG.API_KEY && 
            CONFIG.API_KEY !== 'TU_NUEVA_GOOGLE_API_KEY_AQUI' &&
            CONFIG.API_KEY !== 'TU_GOOGLE_API_KEY_AQUI') {
            this.config = {
                sheetId: CONFIG.SHEET_ID,
                apiKey: CONFIG.API_KEY,
                range: CONFIG.SHEET_RANGE || 'A:Z'
            };
            return;
        }
        
        // Si no hay config.js, intenta cargar desde localStorage
        const savedConfig = localStorage.getItem('gestorSuroConfig');
        if (savedConfig) {
            this.config = JSON.parse(savedConfig);
        }
        

    }

    /**
     * Muestra el modal de configuración
     */
    showConfigModal() {
        const modal = document.getElementById('configModal');
        document.getElementById('sheetId').value = this.config.sheetId || '';
        document.getElementById('sheetRange').value = this.config.range || 'A1:Z1000';
        document.getElementById('apiKey').value = this.config.apiKey || '';
        modal.style.display = 'block';
    }

    /**
     * Oculta el modal de configuración
     */
    hideConfigModal() {
        document.getElementById('configModal').style.display = 'none';
    }

    /**
     * Guarda la configuración y se conecta a Google Sheets
     */
    async saveConfig() {
        const sheetId = document.getElementById('sheetId').value.trim();
        const range = document.getElementById('sheetRange').value.trim();
        const apiKey = document.getElementById('apiKey').value.trim();

        if (!sheetId || !apiKey) {
            alert('Por favor, completa todos los campos requeridos.');
            return;
        }

        this.config = { sheetId, range, apiKey };
        localStorage.setItem('gestorSuroConfig', JSON.stringify(this.config));
        
        this.hideConfigModal();
        await this.connectToGoogleSheets();
    }

    /**
     * Se conecta a Google Sheets API y carga los datos
     */
    async connectToGoogleSheets() {
        this.showLoading(true);
        this.updateConnectionStatus('Conectando...');

        try {
            // Inicializar Google API
            await new Promise((resolve, reject) => {
                gapi.load('client', {
                    callback: resolve,
                    onerror: reject
                });
            });

            await gapi.client.init({
                apiKey: this.config.apiKey,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });

            // Esperar un momento para asegurar que la API esté completamente inicializada
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verificar que gapi.client.sheets esté disponible
            if (!gapi.client.sheets) {
                throw new Error('Google Sheets API no se inicializó correctamente');
            }

            // Cargar datos de referencia base primero
            await this.loadBaseData();
            
            // Cargar datos de la hoja
            await this.loadSheetData();
            
            // Cargar escenarios disponibles
            await this.loadAvailableScenarios();
            
            // Cargar configuración financiera
            await this.loadFinancialConfig();
            
            this.isConnected = true;
            this.updateConnectionStatus('Conectado', true);
            
        } catch (error) {
            console.error('Error conectando a Google Sheets:', error);
            this.updateConnectionStatus('Error de conexión', false);
            alert('Error al conectar con Google Sheets. Verifica tu configuración.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Obtiene las pestañas disponibles del spreadsheet
     */
    async loadAvailableScenarios() {
        try {
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.config.sheetId
            });
            
            const sheets = response.result.sheets;
            const availableSheets = sheets
                .filter(sheet => !sheet.properties.hidden)
                .map(sheet => sheet.properties.title)
                .filter(sheetName => !sheetName.startsWith('Config'));
            
            this.scenarios.available = availableSheets;
            
            // Establecer "Base" como escenario inicial si está disponible
            if (availableSheets.includes('Base')) {
                this.scenarios.current = 'Base';
            } else if (availableSheets.length > 0) {
                this.scenarios.current = availableSheets[0];
            }
            
            this.updateScenarioSelector();
            
            // Cargar datos del escenario inicial
            if (this.scenarios.current) {
                await this.loadSelectedScenario(true); // isInitialLoad = true
            }
            
        } catch (error) {
            console.error('Error obteniendo pestañas:', error);
            this.scenarios.available = ['Base'];
            this.updateScenarioSelector();
        }
    }
    
    /**
     * Actualiza el selector de escenarios con las pestañas disponibles
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
     * Carga la configuración financiera desde la pestaña ConfigFinanciera
     */
    async loadFinancialConfig() {
        try {
            console.log('🔧 Cargando configuración financiera...');
            
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.config.sheetId,
                range: 'ConfigFinanciera!A:D'
            });

            const values = response.result.values;
            if (!values || values.length <= 1) {
                console.log('⚠️ No se encontraron datos de configuración financiera');
                return;
            }

            // Procesar los datos (asumiendo estructura: Escenario | Campo | Valor | Cantidad)
            const configData = values.slice(1); // Saltar header
            
            // Reiniciar arrays de recursos para el nuevo escenario
            this.financialConfig['nexo-recursos'] = [];
            this.financialConfig['directa-recursos'] = [];
            
            configData.forEach(row => {
                if (row.length >= 3) {
                    const [escenario, campo, valor, cantidad] = row;
                    
                    // Para el escenario "Todos" o que coincida con el actual
                    if (escenario === 'Todos' || escenario === this.scenarios.current) {
                        
                        // Verificar si es un recurso
                        if (campo.includes('recurso:')) {
                            this.processConfigResource(campo, valor, cantidad);
                        }
                        // Si no es recurso, es un valor base
                        else if (this.financialConfig.hasOwnProperty(campo)) {
                            this.financialConfig[campo] = parseFloat(valor) || 0;
                        }
                    }
                }
            });

            console.log('✅ Configuración financiera cargada:', this.financialConfig);
            
        } catch (error) {
            console.log('⚠️ Error cargando configuración financiera (pestaña no existe o sin datos):', error.message);
            // No es un error crítico, la app puede continuar con valores por defecto
        }
    }
    
    /**
     * Procesa un recurso desde ConfigFinanciera y lo agrega al array correspondiente
     */
    processConfigResource(campo, valor, cantidad) {
        try {
            // Dividir el campo: "nexo-recurso:Vendedores" → ["nexo-recurso", "Vendedores"]
            const [tipo_campo, descripcion] = campo.split(':');
            
            if (!descripcion) {
                console.warn('⚠️ Recurso sin descripción:', campo);
                return;
            }
            
            // Extraer tipo: "nexo-recurso" → "nexo"
            const tipo = tipo_campo.split('-')[0];
            
            if (tipo !== 'nexo' && tipo !== 'directa') {
                console.warn('⚠️ Tipo de recurso no válido:', tipo);
                return;
            }
            
            // Procesar cantidad si existe
            const cantidadNum = parseFloat(cantidad);
            let descripcionFinal = descripcion.trim();
            
            // Si hay cantidad, agregarla a la descripción
            if (!isNaN(cantidadNum) && cantidad !== undefined && cantidad !== '') {
                const signo = cantidadNum >= 0 ? '+' : '';
                descripcionFinal = `${descripcionFinal} (${signo}${cantidadNum})`;
            }
            
            // Crear objeto recurso
            const recurso = {
                descripcion: descripcionFinal,
                valor: parseFloat(valor) || 0,
                cantidad: cantidadNum || null,
                source: 'config' // Identificar que viene de ConfigFinanciera
            };
            
            // Agregar al array correspondiente
            this.financialConfig[`${tipo}-recursos`].push(recurso);
            
            console.log(`✅ Recurso agregado: ${tipo} - ${recurso.descripcion}: ${recurso.valor}`);
            
        } catch (error) {
            console.error('❌ Error procesando recurso:', campo, error);
        }
    }
    
    /**
     * Carga el escenario seleccionado
     */
    async loadSelectedScenario(isInitialLoad = false) {
        const scenarioSelect = document.getElementById('scenarioSelect');
        if (!scenarioSelect) return;
        
        const selectedScenario = scenarioSelect.value;

        
        if (!isInitialLoad && selectedScenario === this.scenarios.current) {
            alert('El escenario seleccionado ya está cargado.');
            return;
        }
        
        this.showLoading(true);
        this.updateConnectionStatus(`Cargando escenario: ${selectedScenario}...`);
        
        try {
            // Actualizar el rango para la pestaña seleccionada
            const originalRange = this.config.range;
            this.config.range = `${selectedScenario}!A:Z`;
            
            // IMPORTANTE: Actualizar escenario actual ANTES de cargar datos
            this.scenarios.current = selectedScenario;
            
            // Limpiar filtros y datos existentes
            this.clearFiltersOnly();
            this.rawData = [];
            this.filteredData = [];
            
            // Cargar datos del escenario
            await this.loadSheetData();

            // Recargar configuración financiera para el nuevo escenario
            await this.loadFinancialConfig();
            
            // Recalcular valores financieros con los nuevos datos
            this.initializeFinancialCalculations();
            
            // Actualizar tabla de población después de cargar nuevos datos
            this.updatePoblacionSummary();
            
            // Forzar actualización visual de la tabla de población
            setTimeout(() => {
                this.renderPoblacionTable();
            }, 100);
            
            // Actualizar tabla de clientes para mostrar cambios de atención
            this.updateDashboard();
            
            // Actualizar indicador visual
            this.updateScenarioIndicator(selectedScenario);
            
            this.updateConnectionStatus(`Escenario "${selectedScenario}" cargado`, true);
            
        } catch (error) {
            console.error('Error cargando escenario:', error);
            this.updateConnectionStatus('Error cargando escenario', false);
            if (!isInitialLoad) {
                alert(`Error al cargar el escenario "${selectedScenario}". Verifica que la pestaña existe.`);
            }
            
            // Restaurar configuración anterior
            this.config.range = originalRange;
            
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Actualiza el indicador visual del escenario activo
     */
    updateScenarioIndicator(scenarioName) {
        const currentScenarioElement = document.getElementById('currentScenario');
        if (currentScenarioElement) {
            currentScenarioElement.textContent = scenarioName;
        }
    }

    /**
     * Actualiza el indicador visual del escenario activo
     */
    updateScenarioIndicator(scenarioName) {
        const currentScenarioElement = document.getElementById('currentScenario');
        if (currentScenarioElement) {
            currentScenarioElement.textContent = scenarioName;
        }
    }

    /**
     * Carga los datos del escenario "Base" para usar como referencia en comparaciones
     */
    async loadBaseData() {
        console.log('⏳ Cargando datos del escenario de referencia "Base"...');
        this.showLoading(true);
        this.updateConnectionStatus('Cargando datos de referencia...');
        try {
            // Verificar que gapi.client esté inicializado
            if (!gapi || !gapi.client || !gapi.client.sheets) {
                throw new Error('Google API client no está inicializado');
            }
            
            const baseRange = 'Base!A:Z'; // Asume que la pestaña se llama 'Base'
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.config.sheetId,
                range: baseRange
            });

            const values = response.result.values;
            if (!values || values.length === 0) {
                throw new Error('No se encontraron datos en la hoja "Base"');
            }

            const headers = values[0];
            const rows = values.slice(1);
            
            const mappedData = rows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });

            this.baseScenarioData = mappedData.filter(row => 
                Object.values(row).some(value => value.toString().trim() !== '')
            );
            
            console.log('✅ Datos de referencia "Base" cargados:', this.baseScenarioData.length, 'registros');

        } catch (error) {
            console.error('Error cargando datos de referencia "Base":', error);
            // No mostrar alerta para no ser intrusivo si solo falla la base
            // Las comparaciones simplemente no funcionarán.
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Carga los datos desde Google Sheets
     */
    async loadSheetData() {
        try {
            console.log('🔍 Cargando datos desde:', this.config.range);
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.config.sheetId,
                range: this.config.range
            });

            const values = response.result.values;
            if (!values || values.length === 0) {
                throw new Error('No se encontraron datos en la hoja');
            }

            console.log('📊 Filas totales obtenidas de Google Sheets:', values.length);
            console.log('📋 Encabezados:', values[0]);
            
            this.processSheetData(values);
            this.applyFilters();
            this.updateDashboard();
            
        } catch (error) {
            console.error('Error cargando datos:', error);
            throw error;
        }
    }

    /**
     * Procesa los datos crudos de Google Sheets
     * @param {Array} values - Datos de la hoja de cálculo
     */
    processSheetData(values) {
        const headers = values[0];
        const rows = values.slice(1);
        
        console.log('🔄 Procesando', rows.length, 'filas de datos');

        const mappedData = rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
        
        console.log('📝 Datos mapeados:', mappedData.length, 'registros');

        this.rawData = mappedData.filter(row => {
            // Filtrar filas vacías
            const hasData = Object.values(row).some(value => value.toString().trim() !== '');
            return hasData;
        });
        
        console.log('✅ Datos después de filtrar filas vacías:', this.rawData.length, 'registros');
        console.log('📋 Muestra de primeros 3 registros:', this.rawData.slice(0, 3));

        // Actualizar filtros dinámicos
        this.updateFilterOptions();
    }

    /**
     * Poblar filtros con datos únicos
     */
    populateFilters() {
        if (!this.rawData || this.rawData.length === 0) {
            return;
        }
        
        // Obtener valores únicos para cada filtro (tolerando acentos/variantes de nombre)
        const segmentos = [...new Set(this.rawData.map(row => row['Segmento'] || row['segmento']).filter(Boolean))];
        const atenciones = [...new Set(this.rawData.map(row => row['Atencion'] || row['Atención']).filter(Boolean))];
        const zonasGeograficas = [...new Set(this.rawData.map(row => row['Zona_Geografica'] || row['Zona Geográfica']).filter(Boolean))];
        const poblaciones = [...new Set(this.rawData.map(row => row['Poblacion'] || row['Población']).filter(Boolean))];
        const origenes = [...new Set(this.rawData.map(row => row['Origen']).filter(Boolean))];
        
        // Poblar filtro de segmento
        const segmentoFilter = document.getElementById('segmentoFilter');
        if (segmentoFilter) {
            segmentoFilter.innerHTML = '<option value="">Segmento: Todos</option>';
            segmentos.forEach(segmento => {
                const option = document.createElement('option');
                option.value = segmento;
                option.textContent = segmento;
                segmentoFilter.appendChild(option);
            });
        }
        
        // Poblar filtro de atención
        const atencionFilter = document.getElementById('atencionFilter');
        if (atencionFilter) {
            atencionFilter.innerHTML = '<option value="">Atención: Todas</option>';
            atenciones.forEach(atencion => {
                const option = document.createElement('option');
                option.value = atencion;
                option.textContent = atencion;
                atencionFilter.appendChild(option);
            });
        }
        
        // Poblar filtro de zona geográfica
        const zonaGeograficaFilter = document.getElementById('zonaGeograficaFilter');
        if (zonaGeograficaFilter) {
            zonaGeograficaFilter.innerHTML = '<option value="">Zona: Todas</option>';
            zonasGeograficas.forEach(zona => {
                const option = document.createElement('option');
                option.value = zona;
                option.textContent = zona;
                zonaGeograficaFilter.appendChild(option);
            });
        }
        
        // Poblar filtro de población
        const poblacionFilter = document.getElementById('poblacionFilter');
        if (poblacionFilter) {
            poblacionFilter.innerHTML = '<option value="">Población: Todas</option>';
            poblaciones.forEach(poblacion => {
                const option = document.createElement('option');
                option.value = poblacion;
                option.textContent = poblacion;
                poblacionFilter.appendChild(option);
            });
        }
        
        // Poblar filtro de origen
        const origenFilter = document.getElementById('origenFilter');
        if (origenFilter) {
            origenFilter.innerHTML = '<option value="">Origen: Todos</option>';
            origenes.forEach(origen => {
                const option = document.createElement('option');
                option.value = origen;
                option.textContent = origen;
                origenFilter.appendChild(option);
            });
        }
        
        // Poblar filtro de categorías
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Categoría: Todas</option>';
            const categorias = ['Top', 'Grande', 'Mediano', 'Pequeño'];
            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria;
                option.textContent = categoria;
                categoryFilter.appendChild(option);
            });
        }
        
        // Poblar filtro de cambio de atención
        const cambioAtencionFilter = document.getElementById('cambioAtencionFilter');
        if (cambioAtencionFilter) {
            cambioAtencionFilter.innerHTML = '<option value="">Cambio: Todos</option>';
            const cambios = ['Pasa a Nexo', 'Pasa a Directa', 'Sin Cambio'];
            cambios.forEach(cambio => {
                const option = document.createElement('option');
                option.value = cambio;
                option.textContent = cambio;
                cambioAtencionFilter.appendChild(option);
            });
        }
    }

    /**
     * Actualiza las opciones de los filtros basado en los datos
     */
    updateFilterOptions() {
        this.populateFilters();
    }

    /**
     * Compara datos actuales con el escenario Base para detectar cambios de atención
     */
    analyzeAttentionChanges() {
        if (!this.baseScenarioData || this.baseScenarioData.length === 0) {
            this.changeAnalysis = {
                clientsWithChanges: 0,
                salesFromChanges: 0,
                changedClients: []
            };
            return;
        }

        if (this.scenarios.current === 'Base') {
            // Si estamos en el escenario Base, no hay cambios
            this.changeAnalysis = {
                clientsWithChanges: 0,
                salesFromChanges: 0,
                changedClients: []
            };
            return;
        }

        console.log('🔍 Analizando cambios de atención vs escenario Base');
        
        // Crear mapas para comparación rápida
        const baseMap = new Map();
        this.baseScenarioData.forEach(client => {
            const key = `${client['Código']}_${client['Nombre']}`;
            baseMap.set(key, client['Tipo Atención'] || client['Atencion'] || client['Atención']);
        });

        const changedClients = [];
        let salesFromChanges = 0; // Inicializar la suma de ventas

        // Usar filteredData para calcular solo los cambios visibles
        const dataToAnalyze = this.filteredData && this.filteredData.length > 0 ? this.filteredData : this.rawData;
        
        dataToAnalyze.forEach(client => {
            // Solo contar clientes que tienen un cambio de atención diferente a "Sin Cambio"
            const cambioAtencion = client['Cambio de Atención'];
            if (cambioAtencion && cambioAtencion !== 'Sin Cambio') {
                changedClients.push(client);
                // Sumar la venta del cliente al total de ventas de cambios
                const venta = parseFloat(client['Venta Prom'] || client['Venta_Prom'] || 0);
                
                
                if (!isNaN(venta)) {
                    salesFromChanges += venta;
                }
            }
        });

        this.changeAnalysis = {
            clientsWithChanges: changedClients.length,
            salesFromChanges: salesFromChanges, // Asignar la suma calculada
            changedClients: changedClients
        };

    }

    /**
     * Determina el tipo de cambio de atención
     */
    getChangeType(baseAttention, currentAttention) {
        if (baseAttention === 'Directa' && currentAttention === 'Nexo') {
            return 'Pasa a Nexo';
        } else if (baseAttention === 'Nexo' && currentAttention === 'Directa') {
            return 'Pasa a Directa';
        }
        return 'Sin Cambio';
    }

    /**
     * Agrega la columna de cambio de atención a los datos filtrados
     */
    addChangeColumn(data) {
        if (!this.baseScenarioData || this.baseScenarioData.length === 0) {
            return data.map(item => ({
                ...item,
                'Cambio de Atención': 'Sin Cambio'
            }));
        }

        const baseMap = new Map();
        this.baseScenarioData.forEach(client => {
            const key = `${client['Código']}_${client['Nombre']}`;
            baseMap.set(key, client['Tipo Atención'] || client['Atencion'] || client['Atención']);
        });

        return data.map(item => {
            const key = `${item['Código']}_${item['Nombre']}`;
            const baseAttention = baseMap.get(key);
            const currentAttention = item['Tipo Atención'] || item['Atencion'] || item['Atención'];
            
            let changeType = 'Sin Cambio';
            if (baseAttention && baseAttention !== currentAttention) {
                changeType = this.getChangeType(baseAttention, currentAttention);
            }
            
            return {
                ...item,
                'Cambio de Atención': changeType
            };
        });
    }

    /**
     * Agrupa los datos por Código y Nombre Comercial
     * @param {Array} data - Datos a agrupar
     * @returns {Array} - Datos agrupados
     */
    groupDataByCodeAndName(data) {
        // Helper para obtener un campo con tolerancia a variantes/acentos
        const getField = (obj, names) => {
            for (const n of names) {
                if (obj[n] !== undefined && obj[n] !== null && String(obj[n]).toString() !== '') {
                    return obj[n];
                }
            }
            return '';
        };

        const grouped = {};
        
        data.forEach(item => {
            const code = getField(item, ['Código', 'Codigo', 'codigo', 'CÓDIGO']);
            const name = getField(item, ['Nombre Comercial', 'Nombre comercial', 'Nombre']);
            const key = `${code}_${name}`;
            
            if (grouped[key]) {
                // Sumar valores numéricos (tolerando variantes)
                const ventaProm = parseFloat(getField(item, ['Venta Prom', 'Venta Promedio', 'Venta promedio', 'Venta_Prom'])) || 0;
                const volumen = parseFloat(getField(item, ['Volumen', 'Cantidad', 'Cant'])) || 0;

                const prevVenta = parseFloat(getField(grouped[key], ['Venta Prom', 'Venta Promedio', 'Venta promedio', 'Venta_Prom'])) || 0;
                const prevVol = parseFloat(getField(grouped[key], ['Volumen', 'Cantidad', 'Cant'])) || 0;
                
                // Escribir en las claves más comunes conservando el resto de campos originales
                grouped[key]['Venta Prom'] = (prevVenta + ventaProm).toString();
                grouped[key]['Volumen'] = (prevVol + volumen).toString();
            } else {
                // Crear nueva entrada conservando todas las columnas del item original
                grouped[key] = { ...item };
            }
        });
        
        // Agregar categoría calculada a cada cliente
        const result = Object.values(grouped);
        result.forEach(client => {
            const getField = (obj, names) => {
                for (const n of names) {
                    if (obj[n] !== undefined && obj[n] !== null && String(obj[n]).toString() !== '') {
                        return obj[n];
                    }
                }
                return '';
            };
            

        });
        
        return result;
    }

    /**
     * Aplica los filtros seleccionados a los datos
     */
    applyFilters() {
        const segmentoFilter = document.getElementById('segmentoFilter')?.value || '';
        const atencionFilter = document.getElementById('atencionFilter')?.value || '';
        const zonaGeograficaFilter = document.getElementById('zonaGeograficaFilter')?.value || '';
        const poblacionFilter = document.getElementById('poblacionFilter')?.value || '';
        const origenFilter = document.getElementById('origenFilter')?.value || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const cambioAtencionFilter = document.getElementById('cambioAtencionFilter')?.value || '';
        const searchInput = document.getElementById('searchInput');
        
        // Debug: Verificar filtros activos
        const activeFilters = {
            segmento: segmentoFilter,
            atencion: atencionFilter,
            zonaGeografica: zonaGeograficaFilter,
            poblacion: poblacionFilter,
            origen: origenFilter,
            category: categoryFilter,
            cambioAtencion: cambioAtencionFilter,
            search: searchInput?.value || ''
        };
        const hasActiveFilters = Object.values(activeFilters).some(filter => filter !== '');
        console.log('🔍 Filtros activos:', hasActiveFilters ? activeFilters : 'Ninguno');
        console.log('📊 Datos originales para filtrar:', this.rawData.length, 'registros');

        let filtered = this.rawData.filter(item => {
            // Filtro por segmento
            if (segmentoFilter && segmentoFilter !== '') {
                const segmento = item['Segmento'] || item['segmento'] || '';
                if (segmento !== segmentoFilter) {
                    return false;
                }
            }

            // Filtro por atención
            if (atencionFilter && atencionFilter !== '') {
                const atencion = item['Atencion'] || item['Atención'] || '';
                if (atencion !== atencionFilter) {
                    return false;
                }
            }

            // Filtro por zona geográfica
            if (zonaGeograficaFilter && zonaGeograficaFilter !== '') {
                const zonaGeografica = item['Zona_Geografica'] || item['Zona Geográfica'] || '';
                if (zonaGeografica !== zonaGeograficaFilter) {
                    return false;
                }
            }

            // Filtro por población
            if (poblacionFilter && poblacionFilter !== '') {
                const poblacion = item['Poblacion'] || item['Población'] || '';
                if (poblacion !== poblacionFilter) {
                    return false;
                }
            }

            // Filtro por origen
            if (origenFilter && origenFilter !== '') {
                const origen = item['Origen'] || '';
                if (origen !== origenFilter) {
                    return false;
                }
            }

            // Filtro por categoría
            if (categoryFilter && categoryFilter !== '') {
                const categoria = item['Categoria'] || '';
                if (categoria !== categoryFilter) {
                    return false;
                }
            }

            return true;
        });

        // Aplicar búsqueda
        if (searchInput && searchInput.value.trim() !== '') {
            const searchTerm = searchInput.value.toLowerCase();
            filtered = filtered.filter(item => {
                return Object.values(item).some(value => 
                    value.toString().toLowerCase().includes(searchTerm)
                );
            });
        }

        console.log('🔍 Datos antes del agrupamiento:', filtered.length, 'registros');
        
        // Agrupar datos por Código y Nombre Comercial después de aplicar todos los filtros
        filtered = this.groupDataByCodeAndName(filtered);
        
        console.log('📊 Datos después del agrupamiento:', filtered.length, 'registros');

        // Agregar columna de cambio de atención
        filtered = this.addChangeColumn(filtered);
        
        // Aplicar filtro de cambio de atención
        if (cambioAtencionFilter && cambioAtencionFilter !== '') {
            filtered = filtered.filter(item => {
                const cambioAtencion = item['Cambio de Atención'] || 'Sin Cambio';
                return cambioAtencion === cambioAtencionFilter;
            });
        }
        
        this.filteredData = filtered;
        
        // Analizar cambios de atención después de asignar filteredData
        this.analyzeAttentionChanges();

        this.updateClientCounter();
        this.updateDashboard();
        
        // Aplicar ordenamiento por defecto si hay datos
        if (this.filteredData.length > 0 && this.sortConfig.column) {
            this.applySorting();
        }
    }

    /**
     * Limpia solo los campos de filtros sin aplicar filtros
     */
    clearFiltersOnly() {
        const segmentoFilter = document.getElementById('segmentoFilter');
        const atencionFilter = document.getElementById('atencionFilter');
        const zonaGeograficaFilter = document.getElementById('zonaGeograficaFilter');
        const poblacionFilter = document.getElementById('poblacionFilter');
        const origenFilter = document.getElementById('origenFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const cambioAtencionFilter = document.getElementById('cambioAtencionFilter');
        const searchInput = document.getElementById('searchInput');
        
        if (segmentoFilter) segmentoFilter.value = '';
        if (atencionFilter) atencionFilter.value = '';
        if (zonaGeograficaFilter) zonaGeograficaFilter.value = '';
        if (poblacionFilter) poblacionFilter.value = '';
        if (origenFilter) origenFilter.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (cambioAtencionFilter) cambioAtencionFilter.value = '';
        if (searchInput) searchInput.value = '';
        
        console.log('✅ Filtros limpiados (solo UI)');
    }

    /**
     * Limpia todos los filtros y aplica los cambios
     */
    clearFilters() {
        this.clearFiltersOnly();
        this.applyFilters();
    }

    /**
     * Actualiza el contador de clientes únicos y la suma de ventas
     */
    updateClientCounter() {
        console.log('🔢 Actualizando contador - Datos filtrados:', this.filteredData.length, 'registros');
        console.log('📊 Escenario actual:', this.scenarios.current);
        
        const counterElement = document.getElementById('clientCounter');
        const salesSum = this.calculateSalesSum();
        
        console.log('💰 Suma de ventas calculada:', salesSum);
        
        if (counterElement) {
            counterElement.textContent = `Total de clientes únicos: ${this.filteredData.length}`;
        }
        
        // Actualizar suma de ventas
        const salesSumElement = document.getElementById('salesSum');
        if (salesSumElement) {
            salesSumElement.textContent = `Suma Venta Promedio: ${this.formatCurrency(salesSum)}`;
        }
        
        // Actualizar contador de cambios
        const changeCounterElement = document.getElementById('changeCounter');
        const changeSalesCounterElement = document.getElementById('changeSalesCounter');
        
        if (this.changeAnalysis) {
            if (changeCounterElement) {
                changeCounterElement.textContent = `Clientes con cambios: ${this.changeAnalysis.clientsWithChanges}`;
            }
            if (changeSalesCounterElement) {
                const formattedValue = this.formatCurrency(this.changeAnalysis.salesFromChanges);
                changeSalesCounterElement.textContent = `Ventas de cambios: ${formattedValue}`;
            }
        } else {
            if (changeCounterElement) {
                changeCounterElement.textContent = 'Clientes con cambios: 0';
            }
            if (changeSalesCounterElement) {
                changeSalesCounterElement.textContent = 'Ventas de cambios: $0';
            }
        }
    }
    
    /**
     * Calcula la suma total de Venta Promedio de los datos filtrados
     * @returns {number} - Suma total de ventas
     */
    calculateSalesSum() {
        console.log('💰 Calculando suma de ventas con', this.filteredData.length, 'registros');
        
        let totalSum = 0;
        let validRecords = 0;
        let invalidRecords = 0;
        
        this.filteredData.forEach((item, index) => {
            const ventaProm = parseFloat(item['Venta Prom']) || 0;
            if (ventaProm > 0) {
                validRecords++;
                if (index < 3) { // Log primeros 3 registros
                    console.log(`  Registro ${index + 1}: ${item['Nombre Comercial']} - Venta: ${ventaProm}`);
                }
            } else {
                invalidRecords++;
            }
            totalSum += ventaProm;
        });
        
        console.log(`💰 Suma total: ${totalSum}, Registros válidos: ${validRecords}, Inválidos: ${invalidRecords}`);
        return totalSum;
    }
    
    /**
     * Formatea un número como moneda
     * @param {number} amount - Cantidad a formatear
     * @returns {string} - Cantidad formateada
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Parsea un valor de moneda formateado y lo convierte a número
     * @param {string} currencyText - Texto con formato de moneda (ej: "$ 200.000.000")
     * @returns {number} - Valor numérico
     */
    parseCurrency(currencyText) {
        if (!currencyText) return 0;
        // Remover símbolo de moneda y espacios, luego reemplazar puntos por nada (separadores de miles)
        // y mantener solo el último punto si es decimal
        const cleanText = currencyText.toString().replace(/[$\s]/g, '');
        // Si tiene comas, las tratamos como decimales
        if (cleanText.includes(',')) {
            return parseFloat(cleanText.replace(/\./g, '').replace(',', '.')) || 0;
        }
        // Si no tiene comas, todos los puntos son separadores de miles
        return parseFloat(cleanText.replace(/\./g, '')) || 0;
    }


    /**
     * Actualiza todo el dashboard con los datos filtrados
     */
    updateDashboard() {
        this.updateTable();
    }





    /**
     * Actualiza la tabla de datos con paginación y columnas filtradas
     */
    updateTable() {
        const table = document.getElementById('clientsTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        // Limpiar tabla
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        if (this.filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 15px;">No hay datos para mostrar</td></tr>';
            this.updatePaginationControls();
            return;
        }
        
        // Obtener columnas filtradas (excluyendo las no deseadas)
        const allColumns = Object.keys(this.filteredData[0]);
        let columns = allColumns.filter(column => 
            !this.excludedColumns.some(excluded => 
                column.toLowerCase().includes(excluded.toLowerCase()) ||
                excluded.toLowerCase().includes(column.toLowerCase())
            )
        );
        
        // Reordenar columnas: Origen antes que Atención
        const origenIndex = columns.findIndex(col => col === 'Origen');
        const atencionIndex = columns.findIndex(col => col === 'Atencion' || col === 'Atención');
        
        if (origenIndex !== -1 && atencionIndex !== -1 && origenIndex > atencionIndex) {
            // Intercambiar posiciones
            const origenCol = columns[origenIndex];
            const atencionCol = columns[atencionIndex];
            columns[atencionIndex] = origenCol;
            columns[origenIndex] = atencionCol;
        }
        
        // Crear encabezados dinámicamente
        const headerRow = document.createElement('tr');
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            th.style.padding = '8px 12px';
            th.style.borderBottom = '2px solid var(--primary-color)';
            th.style.backgroundColor = 'var(--secondary-color)';
            th.style.color = 'var(--light-color)';
            th.style.fontWeight = '600';
            th.style.fontSize = '14px';
            th.style.cursor = 'pointer';
            th.style.userSelect = 'none';
            th.style.position = 'relative';
            
            // Agregar indicador de ordenamiento
            const sortIndicator = document.createElement('span');
            sortIndicator.style.marginLeft = '5px';
            sortIndicator.style.fontSize = '10px';
            
            if (this.sortConfig.column === column) {
                sortIndicator.textContent = this.sortConfig.direction === 'asc' ? '▲' : '▼';
                sortIndicator.style.color = 'var(--light-color)';
            } else {
                sortIndicator.textContent = '▲▼';
                sortIndicator.style.color = 'rgba(255, 255, 255, 0.5)';
            }
            
            th.appendChild(sortIndicator);
            
            // Agregar evento de clic para ordenamiento
            th.addEventListener('click', () => this.sortTable(column));
            
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        
        // Calcular paginación
        this.pagination.totalPages = Math.ceil(this.filteredData.length / this.pagination.itemsPerPage);
        const startIndex = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
        const endIndex = Math.min(startIndex + this.pagination.itemsPerPage, this.filteredData.length);
        const paginatedData = this.filteredData.slice(startIndex, endIndex);
        
        // Crear filas de datos paginados
        paginatedData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.style.backgroundColor = index % 2 === 0 ? 'var(--light-color)' : '#f8f9fa';
            
            columns.forEach(column => {
                const td = document.createElement('td');
                const value = item[column] || '';
                
                // Formato especial para la columna Categoría
                if (column === 'Categoria' || column === 'Categoría') {
                    const tag = document.createElement('span');
                    tag.textContent = value;
                    tag.className = `category-tag ${value.toLowerCase()}`;
                    td.appendChild(tag);
                } 
                // Formato especial para la columna Cambio de Atención
                else if (column === 'Cambio de Atención') {
                    const tag = document.createElement('span');
                    tag.textContent = value;
                    tag.className = 'change-cell';
                    
                    if (value === 'Pasa a Nexo') {
                        tag.classList.add('change-pasa-nexo');
                    } else if (value === 'Pasa a Directa') {
                        tag.classList.add('change-pasa-directa');
                    } else {
                        tag.classList.add('change-sin-cambio');
                    }
                    
                    td.appendChild(tag);
                }
                // Formato especial para la columna Atención
                else if (column === 'Atencion' || column === 'Atención') {
                    const tag = document.createElement('span');
                    tag.textContent = value;
                    tag.style.padding = '4px 8px';
                    tag.style.borderRadius = '12px';
                    tag.style.fontSize = '11px';
                    tag.style.fontWeight = '500';
                    tag.style.display = 'inline-block';
                    
                    if (value === 'Directa') {
                        tag.style.backgroundColor = '#e3f2fd';
                        tag.style.color = '#1976d2';
                        tag.style.border = '1px solid #bbdefb';
                    } else if (value === 'Nexo') {
                        tag.style.backgroundColor = '#f3e5f5';
                        tag.style.color = '#7b1fa2';
                        tag.style.border = '1px solid #e1bee7';
                    } else {
                        tag.style.backgroundColor = '#f5f5f5';
                        tag.style.color = '#666';
                        tag.style.border = '1px solid #ddd';
                    }
                    
                    td.appendChild(tag);
                } else if (this.isNumericColumn(column, value)) {
                    // Formatear valores numéricos si es apropiado
                    td.textContent = this.formatNumericValue(value, column);
                } else {
                    td.textContent = value;
                }
                
                td.style.padding = '6px 12px';
                td.style.borderBottom = '1px solid #e9ecef';
                td.style.fontSize = '13px';
                td.style.lineHeight = '1.4';
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        });
        
        this.updatePaginationControls();
    }
    
    /**
     * Determina si una columna contiene valores numéricos
     */
    isNumericColumn(columnName, value) {
        const numericKeywords = ['volumen', 'valor', 'precio', 'cantidad', 'monto', 'total', 'ingreso', 'venta', 'prom'];
        const columnLower = columnName.toLowerCase();
        
        // Verificar si el nombre de la columna sugiere valores numéricos
        const hasNumericKeyword = numericKeywords.some(keyword => columnLower.includes(keyword));
        
        // Verificar si el valor parece numérico
        const seemsNumeric = !isNaN(parseFloat(value)) && isFinite(value);
        
        return hasNumericKeyword && seemsNumeric;
    }
    
    /**
     * Función auxiliar para determinar si una columna es monetaria
     */
    isMonetaryColumn(columnName) {
        const monetaryKeywords = ['venta', 'precio', 'valor', 'monto', 'prom'];
        const columnLower = columnName.toLowerCase();
        return monetaryKeywords.some(keyword => columnLower.includes(keyword));
    }
    
    /**
     * Formatea valores numéricos con separadores de miles y formato monetario
     */
    formatNumericValue(value, columnName) {
        const numericValue = parseFloat(String(value).replace(/[^\d.-]/g, ''));
        if (isNaN(numericValue)) return value;
        
        if (this.isMonetaryColumn(columnName)) {
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(numericValue);
        } else {
            return numericValue.toLocaleString('es-ES');
        }
    }

    /**
     * Actualiza los controles de paginación
     */
    updatePaginationControls() {
        const paginationContainer = document.getElementById('paginationControls');
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        if (this.pagination.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        // Información de página actual
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        const startItem = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage + 1;
        const endItem = Math.min(this.pagination.currentPage * this.pagination.itemsPerPage, this.filteredData.length);
        pageInfo.textContent = `Mostrando ${startItem}-${endItem} de ${this.filteredData.length} registros`;
        
        // Botón anterior
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Anterior';
        prevBtn.disabled = this.pagination.currentPage === 1;
        prevBtn.addEventListener('click', () => this.goToPage(this.pagination.currentPage - 1));
        
        // Botones de páginas
        const pageButtons = document.createElement('div');
        pageButtons.className = 'page-buttons';
        
        const startPage = Math.max(1, this.pagination.currentPage - 2);
        const endPage = Math.min(this.pagination.totalPages, this.pagination.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === this.pagination.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            pageButtons.appendChild(pageBtn);
        }
        
        // Botón siguiente
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = 'Siguiente <i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = this.pagination.currentPage === this.pagination.totalPages;
        nextBtn.addEventListener('click', () => this.goToPage(this.pagination.currentPage + 1));
        
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(prevBtn);
        paginationContainer.appendChild(pageButtons);
        paginationContainer.appendChild(nextBtn);
    }

    /**
     * Navega a una página específica
     */
    goToPage(page) {
        if (page < 1 || page > this.pagination.totalPages) return;
        
        this.pagination.currentPage = page;
        this.updateTable();
    }

    /**
     * Aplica el ordenamiento configurado sin modificar la configuración
     */
    applySorting() {
        // Ordenar los datos filtrados según la configuración actual
        this.filteredData.sort((a, b) => {
            let valueA = a[this.sortConfig.column] || '';
            let valueB = b[this.sortConfig.column] || '';
            
            // Convertir a números si es posible para ordenamiento numérico
            const numA = parseFloat(valueA);
            const numB = parseFloat(valueB);
            
            if (!isNaN(numA) && !isNaN(numB)) {
                return this.sortConfig.direction === 'asc' ? numA - numB : numB - numA;
            }
            
            // Ordenamiento de strings
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();
            
            if (valueA < valueB) {
                return this.sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return this.sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        // Actualizar visualización
        this.updateTable();
    }
    
    /**
     * Ordena la tabla por la columna especificada
     */
    sortTable(column) {
        // Determinar dirección del ordenamiento
        if (this.sortConfig.column === column) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.column = column;
            // Para Venta Prom, empezar con desc (mayor a menor), para otras columnas asc
            this.sortConfig.direction = (column === 'Venta Prom') ? 'desc' : 'asc';
        }
        
        // Ordenar los datos filtrados
        this.filteredData.sort((a, b) => {
            let valueA = a[column] || '';
            let valueB = b[column] || '';
            
            // Convertir a números si es una columna numérica
            if (this.isNumericColumn(column, valueA) || this.isNumericColumn(column, valueB)) {
                valueA = parseFloat(String(valueA).replace(/[^\d.-]/g, '')) || 0;
                valueB = parseFloat(String(valueB).replace(/[^\d.-]/g, '')) || 0;
            } else {
                // Convertir a string para comparación alfabética
                valueA = String(valueA).toLowerCase();
                valueB = String(valueB).toLowerCase();
            }
            
            if (valueA < valueB) {
                return this.sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return this.sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        // Resetear a la primera página después del ordenamiento
        this.pagination.currentPage = 1;
        
        // Actualizar la tabla
        this.updateTable();
    }

    /**
     * Busca en la tabla
     * @param {string} searchTerm - Término de búsqueda
     */
    searchTable(searchTerm) {
        const rows = document.querySelectorAll('#clientsTableBody tr');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }

    /**
     * Cambia el tipo de gráfico
     * @param {HTMLElement} button - Botón clickeado
     */
    switchChartType(button) {
        const chartType = button.dataset.chart;
        const container = button.closest('.chart-container');
        const canvas = container.querySelector('canvas');
        
        // Actualizar botones activos
        container.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Cambiar tipo de gráfico para distribución
        if (canvas.id === 'distributionChart') {
            this.charts.distribution.destroy();
            this.charts.distribution = new Chart(canvas.getContext('2d'), {
                type: chartType,
                data: {
                    labels: ['Nutresa (Directa)', 'Nexo (Indirecta)'],
                    datasets: [{
                        label: 'Número de Clientes',
                        data: [0, 0],
                        backgroundColor: ['#e74c3c', '#27ae60'],
                        borderColor: ['#c0392b', '#229954'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: chartType === 'pie'
                        }
                    },
                    scales: chartType === 'pie' ? {} : {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            this.updateDistributionChart();
        }
    }

    /**
     * Actualiza el estado de conexión
     * @param {string} message - Mensaje de estado
     * @param {boolean} connected - Si está conectado
     */
    updateConnectionStatus(message, connected = false) {
        const statusElement = document.getElementById('connectionStatus');
        const connectBtn = document.getElementById('connectBtn');
        
        statusElement.textContent = message;
        statusElement.className = connected ? 'status-connected' : 'status-disconnected';
        
        // Actualiza el texto del botón según el estado
        if (connected) {
            connectBtn.textContent = 'Actualizar Datos';
        } else if (this.config.sheetId && this.config.apiKey) {
            connectBtn.textContent = 'Conectar';
        } else {
            connectBtn.textContent = 'Configurar Conexión';
        }
        
        this.isConnected = connected;
    }

    /**
     * Muestra u oculta el overlay de carga
     * @param {boolean} show - Mostrar overlay
     */
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'block' : 'none';
    }

    /**
     * Refresca los datos desde Google Sheets
     */
    async refreshData() {
        if (!this.isConnected) {
            alert('Primero debes conectarte a Google Sheets');
            return;
        }

        this.showLoading(true);
        try {
            await this.loadSheetData();
        } catch (error) {
            console.error('Error refrescando datos:', error);
            alert('Error al actualizar los datos');
        } finally {
            this.showLoading(false);
        }
    }



    /**
     * Muestra datos de ejemplo cuando no hay conexión
     */
    showSampleData() {
        this.rawData = [
            {
                'Código': 'COD001',
                'Nombre Comercial': 'Empresa A',
                'NIF': 'NIF12345',
                Segmento: 'Premium',
                Atencion: 'Directa',
                Zona_Geografica: 'Norte',
                Poblacion: 'Bogotá',
                Origen: 'Nutresa',
                'Venta Prom': '75000',
                Volumen: '1500'
            },
            {
                'Código': 'COD002',
                'Nombre Comercial': 'Empresa B',
                'NIF': 'NIF67890',
                Segmento: 'Estándar',
                Atencion: 'Indirecta',
                Zona_Geografica: 'Sur',
                Poblacion: 'Medellín',
                Origen: 'Nexo',
                'Venta Prom': '40000',
                Volumen: '800'
            },
            {
                'Código': 'COD003',
                'Nombre Comercial': 'Empresa C',
                'NIF': 'NIF11111',
                Segmento: 'Premium',
                Atencion: 'Directa',
                Zona_Geografica: 'Centro',
                Poblacion: 'Cali',
                Origen: 'Nexo',
                'Venta Prom': '60000',
                Volumen: '1200'
            },
            {
                'Código': 'COD001',
                'Nombre Comercial': 'Empresa A',
                'NIF': 'NIF12345',
                Segmento: 'Premium',
                Atencion: 'Directa',
                Zona_Geografica: 'Norte',
                Poblacion: 'Bogotá',
                Origen: 'Nutresa',
                'Venta Prom': '85000',
                Volumen: '1800'
            }
        ];
        
        // Usar setTimeout para asegurar que el DOM esté listo
        setTimeout(() => {
            this.populateFilters();
            this.applyFilters();
            this.updateClientCounter();
            // Forzar una segunda actualización de filtros para asegurar que se carguen
            setTimeout(() => {
                this.populateFilters();
            }, 200);
        }, 100);
    }

    /**
     * Ver detalles de un cliente específico
     * @param {string} clientName - Nombre del cliente
     */
    viewClientDetails(clientName) {
        const client = this.filteredData.find(item => 
            (item.Cliente || item.cliente) === clientName
        );
        
        if (client) {
            alert(`Detalles de ${clientName}:\n${JSON.stringify(client, null, 2)}`);
        }
    }
    
    /**
     * Actualiza el resumen de la pestaña Población
     */
    updatePoblacionSummary() {
        if (!this.rawData || this.rawData.length === 0) {
            return;
        }

        // CORRECCIÓN: Agrupar datos actuales de la misma forma que los datos base
        // para asegurar conteo consistente de clientes únicos
        const groupedCurrentData = this.groupDataByCodeAndName(this.rawData);
        
        // Agrupar datos por población
        const poblacionData = {};
        
        groupedCurrentData.forEach(item => {
            const poblacion = item['Poblacion'] || item['Población'] || 'Sin Población';
            const atencion = item['Tipo Atención'] || item['Atencion'] || item['Atención'] || 'Sin Atención';
            const ventaProm = parseFloat(String(item['Venta Prom'] || item['VentaProm'] || 0).replace(/[^\d.-]/g, '')) || 0;
            
            if (!poblacionData[poblacion]) {
                poblacionData[poblacion] = {
                    totalClientes: 0,
                    clientesNexo: 0,
                    clientesDirecta: 0,
                    ventasNexo: 0,
                    ventasDirecta: 0,
                    ventasTotal: 0,
                    clientes: [],
                    // Datos para comparación con escenario Base
                    deltaClientes: 0,
                    deltaPorcentajeNexo: 0
                };
            }
            
            poblacionData[poblacion].totalClientes++;
            poblacionData[poblacion].ventasTotal += ventaProm;
            poblacionData[poblacion].clientes.push({
                nombre: item['Nombre'] || item['Cliente'] || 'Sin Nombre',
                ventas: ventaProm,
                atencion: atencion,
                categoria: item['Categoria'] || ''
            });
            
            if (atencion.toLowerCase().includes('nexo')) {
                poblacionData[poblacion].clientesNexo++;
                poblacionData[poblacion].ventasNexo += ventaProm;
            } else if (atencion.toLowerCase().includes('directa')) {
                poblacionData[poblacion].clientesDirecta++;
                poblacionData[poblacion].ventasDirecta += ventaProm;
            }
        });
        
        // Contar clientes de categoría TOP para cada población
        Object.keys(poblacionData).forEach(poblacion => {
            const data = poblacionData[poblacion];
            // Contar clientes con categoría 'Top'
            data.clientesTop = data.clientes.filter(cliente => 
                cliente.categoria && cliente.categoria.toLowerCase() === 'top'
            ).length;
        });
        
        // Calcular cambios en distribución si hay datos del escenario Base
        if (this.baseScenarioData && this.baseScenarioData.length > 0) {
            this.calculateDistributionChanges(poblacionData);
        }
        
        // Calcular clientes con cambios usando filteredData (que ya tiene la columna de cambios)
        this.calculateClientesConCambiosPorPoblacion(poblacionData);
        
        // Guardar datos para ordenamiento
        this.poblacionData = poblacionData;
        
        // Renderizar tabla
        this.renderPoblacionTable();
        
        // Configurar event listeners para ordenamiento
        this.setupPoblacionSorting();
    }
    
    /**
     * Renderiza la tabla de población con los datos actuales
     */
    renderPoblacionTable() {
        const tbody = document.getElementById('poblacionTableBody');
        if (!tbody) {
            return;
        }
        tbody.innerHTML = '';
        
        // Aplicar ordenamiento actual
        const sortedPoblaciones = this.sortPoblacionData();
        
        sortedPoblaciones.forEach(([poblacion, data]) => {
            const row = document.createElement('tr');
            
            const porcentajeNexo = data.totalClientes > 0 ? (data.clientesNexo / data.totalClientes * 100).toFixed(1) : '0.0';
            const porcentajeDirecta = data.totalClientes > 0 ? (data.clientesDirecta / data.totalClientes * 100).toFixed(1) : '0.0';
            
            // Calcular porcentajes de ventas
            const porcentajeVentasNexo = data.ventasTotal > 0 ? (data.ventasNexo / data.ventasTotal * 100).toFixed(1) : '0.0';
            const porcentajeVentasDirecta = data.ventasTotal > 0 ? (data.ventasDirecta / data.ventasTotal * 100).toFixed(1) : '0.0';
            
            const clientesTopCount = data.clientesTop || 0;
            
            // Formatear valores de cambio
            const deltaClientesFormatted = data.deltaClientes > 0 ? `+${data.deltaClientes}` : data.deltaClientes.toString();
            
            // Determinar colores para los cambios
            const deltaClientesColor = data.deltaClientes > 0 ? '#27ae60' : data.deltaClientes < 0 ? '#e74c3c' : '#6c757d';
            
            row.innerHTML = `
                <td style="font-weight: 600; color: var(--primary-color);">${poblacion}</td>
                <td>${data.totalClientes.toLocaleString()}</td>
                <td>${data.clientesNexo.toLocaleString()}</td>
                <td>${porcentajeNexo}%</td>
                <td>${data.clientesDirecta.toLocaleString()}</td>
                <td>${porcentajeDirecta}%</td>
                <td style="font-weight: 500; color: #6b5b00; background: #f8f5e4; border-radius: 2px; padding: 1px 2px; font-size: 8px; max-width: 50px; width: 50px;">${deltaClientesFormatted}</td>
                <td style="font-weight: 500; color: #6b5b00; background: #f8f5e4; border-radius: 2px; padding: 1px 3px; font-size: 8px;">${this.formatCurrency(data.clientesConCambios || 0)}</td>
                <td>${this.formatCurrency(data.ventasNexo)}</td>
                <td>${porcentajeVentasNexo}%</td>
                <td>${this.formatCurrency(data.ventasDirecta)}</td>
                <td>${porcentajeVentasDirecta}%</td>
                <td style="font-weight: 600; font-size: 8px; min-width: 120px !important; width: 120px !important; max-width: 120px !important; text-overflow: initial !important; overflow: visible !important; white-space: nowrap !important;">${this.formatCurrency(data.ventasTotal)}</td>
                <td style="font-weight: 500; color: var(--secondary-color);">${clientesTopCount}</td>
            `;
            
            // Aplicar estilos a las celdas
            Array.from(row.children).forEach(cell => {
                cell.style.padding = '12px 8px';
                cell.style.borderBottom = '1px solid #e9ecef';
                cell.style.fontSize = '13px';
                cell.style.textAlign = 'center';
            });
            
            // Estilo especial para la primera columna (nombre de población)
            row.children[0].style.textAlign = 'left';
            
            tbody.appendChild(row);
         });
     }

    /**
     * Calcula ventas de clientes con cambios por población usando filteredData
     */
    calculateClientesConCambiosPorPoblacion(poblacionData) {
        // Usar filteredData que ya tiene la columna 'Cambio de Atención'
        if (!this.filteredData || this.filteredData.length === 0) {
            // Si no hay filteredData, inicializar en 0
            Object.keys(poblacionData).forEach(poblacion => {
                poblacionData[poblacion].clientesConCambios = 0;
            });
            return;
        }

        // Sumar VENTAS de clientes con cambios por población
        this.filteredData.forEach(cliente => {
            const poblacion = cliente['Poblacion'] || cliente['Población'] || 'Sin Población';
            const cambioAtencion = cliente['Cambio de Atención'];
            
            if (poblacionData[poblacion] && cambioAtencion && cambioAtencion !== 'Sin Cambio') {
                if (!poblacionData[poblacion].clientesConCambios) {
                    poblacionData[poblacion].clientesConCambios = 0;
                }
                
                // Sumar la venta del cliente
                const venta = parseFloat(cliente['Venta Prom'] || cliente['Venta_Prom'] || 0);
                if (!isNaN(venta)) {
                    poblacionData[poblacion].clientesConCambios += venta;
                }
            }
        });

        // Asegurar que todas las poblaciones tengan el campo inicializado
        Object.keys(poblacionData).forEach(poblacion => {
            if (!poblacionData[poblacion].clientesConCambios) {
                poblacionData[poblacion].clientesConCambios = 0;
            }
        });
    }
     
    /**
     * Calcula los cambios en distribución de clientes comparando con el escenario Base
     */
    calculateDistributionChanges(poblacionData) {
        // Si no hay datos base, no calcular cambios
        if (!this.baseScenarioData || this.baseScenarioData.length === 0) {
            Object.keys(poblacionData).forEach(poblacion => {
                poblacionData[poblacion].deltaClientes = 0;
                poblacionData[poblacion].deltaPorcentajeNexo = 0;
            });
            return;
        }
        
        // Agrupar datos del escenario Base para asegurar conteo único de clientes
        const groupedBaseData = this.groupDataByCodeAndName(this.baseScenarioData);

        // Crear datos del escenario Base agrupados por población
        const basePoblacionData = {};
        
        groupedBaseData.forEach(item => {
            const poblacion = item['Poblacion'] || item['Población'] || 'Sin Población';
            const atencion = item['Tipo Atención'] || item['Atencion'] || item['Atención'] || 'Sin Atención';
            
            if (!basePoblacionData[poblacion]) {
                basePoblacionData[poblacion] = {
                    totalClientes: 0,
                    clientesNexo: 0,
                    clientesDirecta: 0
                };
            }
            
            basePoblacionData[poblacion].totalClientes++;
            
            if (atencion.toLowerCase().includes('nexo')) {
                basePoblacionData[poblacion].clientesNexo++;
            } else if (atencion.toLowerCase().includes('directa')) {
                basePoblacionData[poblacion].clientesDirecta++;
            }
        });
        

        
        // Calcular deltas para cada población
        Object.keys(poblacionData).forEach(poblacion => {
            const currentData = poblacionData[poblacion];
            const baseData = basePoblacionData[poblacion] || { totalClientes: 0, clientesNexo: 0, clientesDirecta: 0 };
            
            // Δ Clientes = Clientes Nexo actual - Clientes Nexo base
            currentData.deltaClientes = currentData.clientesNexo - baseData.clientesNexo;
            
            // Δ % Nexo = % Nexo actual - % Nexo base
            const currentPorcentajeNexo = currentData.totalClientes > 0 ? (currentData.clientesNexo / currentData.totalClientes * 100) : 0;
            const basePorcentajeNexo = baseData.totalClientes > 0 ? (baseData.clientesNexo / baseData.totalClientes * 100) : 0;
            currentData.deltaPorcentajeNexo = currentPorcentajeNexo - basePorcentajeNexo;
            

        });
    }
    
     /**
      * Ordena los datos de población según la configuración actual
      */
     sortPoblacionData() {
         if (!this.poblacionData) return [];
         
         const sortConfig = this.poblacionSortConfig || { column: 'ventasTotal', direction: 'desc' };
         
         return Object.entries(this.poblacionData).sort(([nameA, dataA], [nameB, dataB]) => {
             let valueA, valueB;
             
             switch (sortConfig.column) {
                 case 'poblacion':
                     valueA = nameA;
                     valueB = nameB;
                     break;
                 case 'totalClientes':
                     valueA = dataA.totalClientes;
                     valueB = dataB.totalClientes;
                     break;
                 case 'clientesNexo':
                     valueA = dataA.clientesNexo;
                     valueB = dataB.clientesNexo;
                     break;
                 case 'clientesDirecta':
                     valueA = dataA.clientesDirecta;
                     valueB = dataB.clientesDirecta;
                     break;
                 case 'porcentajeNexo':
                     valueA = dataA.totalClientes > 0 ? (dataA.clientesNexo / dataA.totalClientes * 100) : 0;
                     valueB = dataB.totalClientes > 0 ? (dataB.clientesNexo / dataB.totalClientes * 100) : 0;
                     break;
                 case 'porcentajeDirecta':
                     valueA = dataA.totalClientes > 0 ? (dataA.clientesDirecta / dataA.totalClientes * 100) : 0;
                     valueB = dataB.totalClientes > 0 ? (dataB.clientesDirecta / dataB.totalClientes * 100) : 0;
                     break;
                 case 'ventasNexo':
                     valueA = dataA.ventasNexo;
                     valueB = dataB.ventasNexo;
                     break;
                 case 'ventasDirecta':
                     valueA = dataA.ventasDirecta;
                     valueB = dataB.ventasDirecta;
                     break;
                 case 'ventasTotal':
                     valueA = dataA.ventasTotal;
                     valueB = dataB.ventasTotal;
                     break;
                 case 'clienteTop':
                     valueA = dataA.clientesTop || 0;
                     valueB = dataB.clientesTop || 0;
                     break;
                 case 'clientesConCambios':
                     valueA = dataA.clientesConCambios || 0;
                     valueB = dataB.clientesConCambios || 0;
                     break;
                 case 'porcentajeVentasNexo':
                     valueA = dataA.ventasTotal > 0 ? (dataA.ventasNexo / dataA.ventasTotal * 100) : 0;
                     valueB = dataB.ventasTotal > 0 ? (dataB.ventasNexo / dataB.ventasTotal * 100) : 0;
                     break;
                 case 'porcentajeVentasDirecta':
                     valueA = dataA.ventasTotal > 0 ? (dataA.ventasDirecta / dataA.ventasTotal * 100) : 0;
                     valueB = dataB.ventasTotal > 0 ? (dataB.ventasDirecta / dataB.ventasTotal * 100) : 0;
                     break;
                 default:
                     valueA = dataA.ventasTotal;
                     valueB = dataB.ventasTotal;
                     break;
             }
             
             // Comparación
             let comparison = 0;
             if (typeof valueA === 'string' && typeof valueB === 'string') {
                 comparison = valueA.localeCompare(valueB);
             } else {
                 comparison = valueA - valueB;
             }
             
             return sortConfig.direction === 'desc' ? -comparison : comparison;
         });
     }
     
     /**
      * Configura los event listeners para el ordenamiento de la tabla de población
      */
     setupPoblacionSorting() {
         const headers = document.querySelectorAll('#poblacionTable th.sortable');
         
         headers.forEach(header => {
             header.addEventListener('click', () => {
                 const column = header.dataset.column;
                 this.sortPoblacionTable(column);
             });
         });
     }
     
     /**
      * Ordena la tabla de población por la columna especificada
      */
     sortPoblacionTable(column) {
         // Inicializar configuración de ordenamiento si no existe
         if (!this.poblacionSortConfig) {
             this.poblacionSortConfig = { column: 'ventasTotal', direction: 'desc' };
         }
         
         // Determinar dirección del ordenamiento
         if (this.poblacionSortConfig.column === column) {
             this.poblacionSortConfig.direction = this.poblacionSortConfig.direction === 'asc' ? 'desc' : 'asc';
         } else {
             this.poblacionSortConfig.column = column;
             this.poblacionSortConfig.direction = 'desc';
         }
         
         // Actualizar indicadores visuales
         this.updatePoblacionSortIndicators();
         
         // Re-renderizar tabla
         this.renderPoblacionTable();
     }
     
     /**
      * Actualiza los indicadores visuales de ordenamiento en la tabla de población
      */
     updatePoblacionSortIndicators() {
         const headers = document.querySelectorAll('#poblacionTable th.sortable');
         
         headers.forEach(header => {
             header.classList.remove('sort-asc', 'sort-desc');
             
             if (header.dataset.column === this.poblacionSortConfig.column) {
                 header.classList.add(`sort-${this.poblacionSortConfig.direction}`);
             }
         });
     }

     /**
      * Inicializa los cálculos financieros para la pestaña Financiero
      */
     initializeFinancialCalculations() {
         // Calcular rezonificación automática
         this.calculateAutomaticRezonification();
         
         // Pre-llenar campos con valores de configuración
         this.applyFinancialConfigValues();
         
         // Ya no hay campos editables, todos los valores vienen de ConfigFinanciera

         // Calcular valores iniciales
         this.calculateNexoFinancials();
         this.calculateDirectaFinancials();
         
         // Actualizar resumen consolidado
         this.updateFinancialSummary();
      }

     /**
      * Calcula los valores financieros para el bloque Nexo
      */
     calculateNexoFinancials() {
         // Obtener valores de entrada
         const ventaBase = this.financialConfig['nexo-venta'] || 0;
         const rezonificacionVentas = this.parseCurrency(document.getElementById('nexo-rezonificacion-ventas').textContent);
         const costoBase = this.financialConfig['nexo-costo'] || 0;
         const recursosAdicionales = this.calculateTotalResources('nexo');
         const icaPorcentaje = (this.financialConfig['nexo-ICA'] || 0) * 100; // Convertir de decimal a porcentaje

         // Calcular valores derivados
         const ventaTotal = ventaBase + rezonificacionVentas;
         const costoTotal = costoBase + recursosAdicionales;
         const icaValor = (ventaTotal * icaPorcentaje) / 100;
         const gastosTotal = costoTotal + icaValor;
         const costoPorcentaje = ventaTotal > 0 ? (gastosTotal / ventaTotal) * 100 : 0;

         // Actualizar elementos en el DOM
         document.getElementById('nexo-venta-total').textContent = this.formatCurrency(ventaTotal);
         document.getElementById('nexo-costo-total').textContent = this.formatCurrency(costoTotal);
         document.getElementById('nexo-ica-valor').textContent = this.formatCurrency(icaValor);
         document.getElementById('nexo-gastos-total').textContent = this.formatCurrency(gastosTotal);
         document.getElementById('nexo-costo-porcentaje').textContent = `${costoPorcentaje.toFixed(2)}%`;
         
         // Aplicar formato de color a la rezonificación
         const rezonElement = document.getElementById('nexo-rezonificacion-ventas');
         if (rezonElement) {
             rezonElement.style.color = rezonificacionVentas >= 0 ? '#059669' : '#dc2626';
         }
         
         // Actualizar resumen consolidado
         this.updateFinancialSummary();
      }

     /**
      * Calcula los valores financieros para el bloque Directa
      */
     calculateDirectaFinancials() {
         // Obtener valores de entrada
         const ventaBase = this.financialConfig['directa-venta'] || 0;
         const rezonificacionVentas = this.parseCurrency(document.getElementById('directa-rezonificacion-ventas').textContent);
         const costoBase = this.financialConfig['directa-costo'] || 0;
         const recursosAdicionales = this.calculateTotalResources('directa');
         const icaPorcentaje = (this.financialConfig['directa-ICA'] || 0) * 100; // Convertir de decimal a porcentaje

         // Calcular valores derivados
         const ventaTotal = ventaBase + rezonificacionVentas;
         const costoTotal = costoBase + recursosAdicionales;
         const icaValor = (ventaTotal * icaPorcentaje) / 100;
         const gastosTotal = costoTotal + icaValor;
         const costoPorcentaje = ventaTotal > 0 ? (gastosTotal / ventaTotal) * 100 : 0;

         // Actualizar elementos en el DOM
         document.getElementById('directa-venta-total').textContent = this.formatCurrency(ventaTotal);
         document.getElementById('directa-costo-total').textContent = this.formatCurrency(costoTotal);
         document.getElementById('directa-ica-valor').textContent = this.formatCurrency(icaValor);
         document.getElementById('directa-gastos-total').textContent = this.formatCurrency(gastosTotal);
         document.getElementById('directa-costo-porcentaje').textContent = `${costoPorcentaje.toFixed(2)}%`;
         
         // Aplicar formato de color a la rezonificación
         const rezonElement = document.getElementById('directa-rezonificacion-ventas');
         if (rezonElement) {
             rezonElement.style.color = rezonificacionVentas >= 0 ? '#059669' : '#dc2626';
         }
         
         // Actualizar resumen consolidado
         this.updateFinancialSummary();
      }


/**
      * Calcula automáticamente la rezonificación basada en cambios de Origen a Atención
      */
     calculateAutomaticRezonification() {
         if (!this.filteredData || this.filteredData.length === 0) {
             return;
         }

         let nexoRezonification = 0; // Cambio neto en ventas de Nexo
         let directaRezonification = 0; // Cambio neto en ventas de Directa

         this.filteredData.forEach(cliente => {
             const origen = (cliente['Origen'] || '').toLowerCase();
             const atencion = (cliente['Atencion'] || cliente['Atención'] || '').toLowerCase();
             const ventas = parseFloat(cliente['Venta Prom'] || cliente['Ventas'] || 0);

             // Si origen era Directa y ahora atención es Nexo
             if (origen.includes('directa') && atencion.includes('nexo')) {
                 nexoRezonification += ventas; // Nexo gana
                 directaRezonification -= ventas; // Directa pierde
             }
             // Si origen era Nexo y ahora atención es Directa
             else if (origen.includes('nexo') && atencion.includes('directa')) {
                 directaRezonification += ventas; // Directa gana
                 nexoRezonification -= ventas; // Nexo pierde
             }
         });

         // Actualizar los campos de rezonificación
         const nexoRezonElement = document.getElementById('nexo-rezonificacion-ventas');
         const directaRezonElement = document.getElementById('directa-rezonificacion-ventas');

         if (nexoRezonElement) {
             nexoRezonElement.textContent = this.formatCurrency(nexoRezonification);
             nexoRezonElement.style.color = nexoRezonification >= 0 ? '#059669' : '#dc2626';
         }
         if (directaRezonElement) {
             directaRezonElement.textContent = this.formatCurrency(directaRezonification);
             directaRezonElement.style.color = directaRezonification >= 0 ? '#059669' : '#dc2626';
         }
     }

     /**
      * Aplica los valores de configuración financiera a los campos calculados
      */
     applyFinancialConfigValues() {
         // Aplicar valores de venta base con formato de moneda
         const nexoVentaSpan = document.getElementById('nexo-venta-base');
         if (nexoVentaSpan) {
             nexoVentaSpan.textContent = this.formatCurrency(this.financialConfig['nexo-venta'] || 0);
         }
         
         const directaVentaSpan = document.getElementById('directa-venta-base');
         if (directaVentaSpan) {
             directaVentaSpan.textContent = this.formatCurrency(this.financialConfig['directa-venta'] || 0);
         }
         
         // Aplicar valores de costo base con formato de moneda
         const nexoCostoSpan = document.getElementById('nexo-costo-base');
         if (nexoCostoSpan) {
             nexoCostoSpan.textContent = this.formatCurrency(this.financialConfig['nexo-costo'] || 0);
         }
         
         const directaCostoSpan = document.getElementById('directa-costo-base');
         if (directaCostoSpan) {
             directaCostoSpan.textContent = this.formatCurrency(this.financialConfig['directa-costo'] || 0);
         }
         
         // Aplicar valores de ICA con formato de porcentaje
         const nexoIcaSpan = document.getElementById('nexo-ica-porcentaje');
         if (nexoIcaSpan) {
             const percentage = (this.financialConfig['nexo-ICA'] || 0) * 100;
             nexoIcaSpan.textContent = `${percentage.toFixed(3)}%`;
         }
         
         const directaIcaSpan = document.getElementById('directa-ica-porcentaje');
         if (directaIcaSpan) {
             const percentage = (this.financialConfig['directa-ICA'] || 0) * 100;
             directaIcaSpan.textContent = `${percentage.toFixed(3)}%`;
         }
         
         // Cargar recursos desde configuración
         this.loadConfigResources('nexo');
         this.loadConfigResources('directa');
         
         console.log('✅ Valores de configuración aplicados a los campos calculados financieros');
     }

     /**
      * Carga los recursos desde ConfigFinanciera para el tipo especificado
      */
     loadConfigResources(tipo) {
         const container = document.getElementById(`${tipo}-resources-list`);
         if (!container) return;
         
         // Limpiar recursos existentes de config (mantener los manuales)
         const configResources = container.querySelectorAll('.config-resource');
         configResources.forEach(element => element.remove());
         
         // Cargar recursos desde configuración
         const recursos = this.financialConfig[`${tipo}-recursos`] || [];
         
         recursos.forEach(recurso => {
             const resourceDiv = document.createElement('div');
             // Determinar clase según el signo del valor
             const colorClass = recurso.valor >= 0 ? 'config-resource-positive' : 'config-resource-negative';
             resourceDiv.className = `resource-item config-resource ${colorClass}`;
             
             resourceDiv.innerHTML = `
                 <span class="resource-description">${recurso.descripcion}</span>
                 <span class="resource-value">${this.formatCurrency(recurso.valor)}</span>
             `;
             
             container.appendChild(resourceDiv);
         });
         
         // Recalcular después de cargar recursos
         if (tipo === 'nexo') {
             this.calculateNexoFinancials();
         } else {
             this.calculateDirectaFinancials();
         }
         
         console.log(`✅ Recursos de configuración cargados para ${tipo}:`, recursos.length);
     }


     /**
      * Calcula el total de recursos adicionales desde la configuración
      */
     calculateTotalResources(type) {
         const recursos = this.financialConfig[`${type}-recursos`] || [];
         return recursos.reduce((total, recurso) => total + (recurso.valor || 0), 0);
     }

     /**
      * Actualiza el resumen financiero consolidado
      */
     updateFinancialSummary() {
         // Obtener valores de Nexo
         const nexoVentaBase = this.financialConfig['nexo-venta'] || 0;
         const nexoRezonificacionVentas = this.parseCurrency(document.getElementById('nexo-rezonificacion-ventas')?.textContent || '$0');
         const nexoCostoBase = this.financialConfig['nexo-costo'] || 0;
         const nexoRecursosAdicionales = this.calculateTotalResources('nexo');
         const nexoIcaPorcentaje = (this.financialConfig['nexo-ICA'] || 0) * 100;

         // Calcular totales Nexo
         const nexoVentaTotal = nexoVentaBase + nexoRezonificacionVentas;
         const nexoCostoTotal = nexoCostoBase + nexoRecursosAdicionales;
         const nexoIcaValor = (nexoVentaTotal * nexoIcaPorcentaje) / 100;

         // Obtener valores de Directa
         const directaVentaBase = this.financialConfig['directa-venta'] || 0;
         const directaRezonificacionVentas = this.parseCurrency(document.getElementById('directa-rezonificacion-ventas')?.textContent || '$0');
         const directaCostoBase = this.financialConfig['directa-costo'] || 0;
         const directaRecursosAdicionales = this.calculateTotalResources('directa');
         const directaIcaPorcentaje = (this.financialConfig['directa-ICA'] || 0) * 100;

         // Calcular totales Directa
         const directaVentaTotal = directaVentaBase + directaRezonificacionVentas;
         const directaCostoTotal = directaCostoBase + directaRecursosAdicionales;
         const directaIcaValor = (directaVentaTotal * directaIcaPorcentaje) / 100;

         // Calcular consolidado
         const ventasTotales = nexoVentaTotal + directaVentaTotal;
         const costosTotales = nexoCostoTotal + directaCostoTotal;
         const diferenciaRecursos = nexoRecursosAdicionales + directaRecursosAdicionales;
         const icaTotal = nexoIcaValor + directaIcaValor;
         const costoPorServirTotal = ventasTotales > 0 ? ((costosTotales + icaTotal) / ventasTotales) * 100 : 0;

         // Actualizar elementos del resumen
         document.getElementById('summary-ventas-total').textContent = this.formatCurrency(ventasTotales);
         document.getElementById('summary-costos-total').textContent = this.formatCurrency(costosTotales);
         
         // Aplicar color a diferencia recursos
         const recursosElement = document.getElementById('summary-recursos-total');
         recursosElement.textContent = this.formatCurrency(diferenciaRecursos);
         recursosElement.style.color = diferenciaRecursos >= 0 ? '#dc2626' : '#059669';
         
         document.getElementById('summary-ica-total').textContent = this.formatCurrency(icaTotal);
         document.getElementById('summary-costo-porcentaje').textContent = `${costoPorServirTotal.toFixed(2)}%`;
     }

    /**
     * Inicializa el mapa de Leaflet
     */
    initializeMap() {
        // Verificar si el mapa ya existe
        if (this.map) {
            this.map.remove();
        }

        // Crear el mapa centrado en Colombia
        this.map = L.map('map').setView([4.5709, -74.2973], 6);

        // Agregar capa de mapa base
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Inicializar grupos de clustering
        this.nexoClusterGroup = L.markerClusterGroup({
            iconCreateFunction: function(cluster) {
                return L.divIcon({
                    html: '<div style="background-color: #27ae60; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold;">' + cluster.getChildCount() + '</div>',
                    className: 'nexo-cluster',
                    iconSize: [40, 40]
                });
            }
        });
        
        this.directaClusterGroup = L.markerClusterGroup({
            iconCreateFunction: function(cluster) {
                return L.divIcon({
                    html: '<div style="background-color: #e74c3c; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold;">' + cluster.getChildCount() + '</div>',
                    className: 'directa-cluster',
                    iconSize: [40, 40]
                });
            }
        });

        // Agregar grupos de clustering al mapa
        this.map.addLayer(this.nexoClusterGroup);
        this.map.addLayer(this.directaClusterGroup);

        // Configurar eventos de zoom para optimización de rendimiento
        this.setupMapZoomOptimization();

        // Cargar datos del mapa
        this.loadMapData();
    }

    /**
     * Configura la optimización de rendimiento basada en el nivel de zoom
     */
    setupMapZoomOptimization() {
        // Configurar diferentes niveles de detalle según el zoom
        this.map.on('zoomend', () => {
            const currentZoom = this.map.getZoom();
            
            // Ajustar la distancia de clustering según el zoom
            if (currentZoom <= 8) {
                // Zoom bajo: clustering más agresivo
                this.nexoClusterGroup.options.maxClusterRadius = 80;
                this.directaClusterGroup.options.maxClusterRadius = 80;
            } else if (currentZoom <= 12) {
                // Zoom medio: clustering moderado
                this.nexoClusterGroup.options.maxClusterRadius = 50;
                this.directaClusterGroup.options.maxClusterRadius = 50;
            } else {
                // Zoom alto: clustering mínimo
                this.nexoClusterGroup.options.maxClusterRadius = 20;
                this.directaClusterGroup.options.maxClusterRadius = 20;
            }
            
            // Refrescar los clusters con la nueva configuración
            this.nexoClusterGroup.refreshClusters();
            this.directaClusterGroup.refreshClusters();
        });
        
        // Configurar lazy loading para grandes conjuntos de datos
        this.map.on('moveend', () => {
            this.optimizeVisibleMarkers();
        });
    }

    /**
     * Optimiza los marcadores visibles según la vista actual del mapa
     */
    optimizeVisibleMarkers() {
        const bounds = this.map.getBounds();
        const currentZoom = this.map.getZoom();
        
        // Solo procesar si hay muchos marcadores y el zoom es bajo
        if (currentZoom < 10 && this.rawData && this.rawData.length > 100) {
            // Implementar lógica de lazy loading si es necesario
            // Por ahora, el clustering maneja la optimización
            console.log(`Optimizando vista: Zoom ${currentZoom}, Bounds:`, bounds);
        }
    }

    /**
     * Valida si las coordenadas están dentro del territorio colombiano
     * @param {number} lat - Latitud
     * @param {number} lng - Longitud
     * @returns {boolean} - True si las coordenadas son válidas para Colombia
     */
    validateColombianCoordinates(lat, lng) {
        // Límites aproximados de Colombia
        const minLat = -4.2;
        const maxLat = 12.5;
        const minLng = -81.7;
        const maxLng = -66.9;
        
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    }

    /**
     * Obtiene coordenadas de fallback para municipios conocidos
     * @param {string} ciudad - Nombre de la ciudad/municipio
     * @returns {object|null} - Coordenadas de fallback o null
     */
    getFallbackCoordinates(ciudad) {
        const fallbackCoords = {
            'bogotá': { lat: 4.7110, lng: -74.0721 },
            'medellín': { lat: 6.2442, lng: -75.5812 },
            'cali': { lat: 3.4516, lng: -76.5320 },
            'barranquilla': { lat: 10.9639, lng: -74.7964 },
            'cartagena': { lat: 10.3910, lng: -75.4794 },
            'bucaramanga': { lat: 7.1193, lng: -73.1227 },
            'pereira': { lat: 4.8133, lng: -75.6961 },
            'manizales': { lat: 5.0703, lng: -75.5138 },
            'ibagué': { lat: 4.4389, lng: -75.2322 },
            'santa marta': { lat: 11.2408, lng: -74.2099 }
        };
        
        const cityKey = ciudad.toLowerCase().trim();
        return fallbackCoords[cityKey] || null;
    }

    /**
     * Procesa y carga los datos en el mapa
     */
    loadMapData() {
        if (!this.rawData || this.rawData.length === 0) {
            console.log('No hay datos disponibles para el mapa');
            return;
        }

        // Limpiar marcadores existentes
        this.nexoClusterGroup.clearLayers();
        this.directaClusterGroup.clearLayers();

        // Agrupar datos por ubicación con proximidad inteligente
        const locationData = this.groupDataByProximity();

        let exclusiveNexoCount = 0;
        let exclusiveDirectaCount = 0;
        let sharedCount = 0;
        let invalidCoordinates = 0;

        // Crear marcadores para cada ubicación
        Object.values(locationData).forEach(location => {
            const { lat, lng, ciudad, nexoClients, directaClients, totalClients, totalSales } = location;

            if (lat && lng && !isNaN(lat) && !isNaN(lng) && this.validateColombianCoordinates(lat, lng)) {
                // Determinar el tipo de población
                const hasNexo = nexoClients.length > 0;
                const hasDirecta = directaClients.length > 0;
                
                let populationType, markerColor, clusterGroup;
                
                if (hasNexo && hasDirecta) {
                    // Población compartida
                    populationType = 'compartida';
                    markerColor = '#f39c12'; // Naranja para compartidas
                    clusterGroup = this.nexoClusterGroup; // Usar grupo Nexo para compartidas
                    sharedCount++;
                } else if (hasNexo) {
                    // Exclusivamente Nexo
                    populationType = 'exclusiva-nexo';
                    markerColor = '#27ae60'; // Verde para Nexo exclusivo
                    clusterGroup = this.nexoClusterGroup;
                    exclusiveNexoCount++;
                } else {
                    // Exclusivamente Directa
                    populationType = 'exclusiva-directa';
                    markerColor = '#e74c3c'; // Rojo para Directa exclusiva
                    clusterGroup = this.directaClusterGroup;
                    exclusiveDirectaCount++;
                }

                // Calcular tamaño basado en ventas totales del municipio
                const avgSales = totalSales / totalClients; // Mantener para popup
                const baseRadius = 6;
                const maxRadius = 35;
                
                // Normalizar las ventas totales para mejor visualización
                const minTotalSales = 100000; // Ventas totales mínimas esperadas
                const maxTotalSales = 10000000; // Ventas totales máximas esperadas
                const normalizedSales = Math.max(0, Math.min(1, (totalSales - minTotalSales) / (maxTotalSales - minTotalSales)));
                
                // Aplicar escala cuadrática para mayor diferenciación
                const salesRadius = baseRadius + (maxRadius - baseRadius) * Math.pow(normalizedSales, 0.6);

                // Crear marcador personalizado
                const marker = L.circleMarker([lat, lng], {
                    radius: salesRadius,
                    fillColor: markerColor,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });

                // Agregar información del tipo de población al location
                location.populationType = populationType;
                location.avgSales = avgSales;

                // Crear contenido del popup
                const popupContent = this.createPopupContent(location);
                marker.bindPopup(popupContent);

                // Agregar al grupo de clustering correspondiente
                clusterGroup.addLayer(marker);
            } else {
                invalidCoordinates++;
                console.warn(`Coordenadas inválidas para ${ciudad}: ${lat}, ${lng}`);
            }
        });

        // Mostrar estadísticas de validación
        if (invalidCoordinates > 0) {
            console.log(`Se encontraron ${invalidCoordinates} ubicaciones con coordenadas inválidas`);
        }

        // Actualizar estadísticas mejoradas
        this.updateMapStats({
            total: exclusiveNexoCount + exclusiveDirectaCount + sharedCount,
            exclusiveNexo: exclusiveNexoCount,
            exclusiveDirecta: exclusiveDirectaCount,
            shared: sharedCount
        });
    }

    /**
     * Calcula la distancia entre dos puntos geográficos en kilómetros
     * @param {number} lat1 - Latitud del primer punto
     * @param {number} lng1 - Longitud del primer punto
     * @param {number} lat2 - Latitud del segundo punto
     * @param {number} lng2 - Longitud del segundo punto
     * @returns {number} - Distancia en kilómetros
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Agrupa los datos por proximidad geográfica (radio de 1km)
     */
    groupDataByProximity() {
        const locationMap = {};
        const proximityRadius = 1; // 1 km de radio

        this.rawData.forEach(client => {
            let lat = parseFloat(client['Latitud']);
            let lng = parseFloat(client['Longitud']);
            const ciudad = client['Concatenado Ciudad'] || 'Ubicación desconocida';
            const atencion = client['Atencion'] || 'Desconocido';
            const ventaProm = parseFloat(client['Venta Prom']) || 0;

            // Si las coordenadas no son válidas, intentar usar fallback
            if (!lat || !lng || isNaN(lat) || isNaN(lng) || !this.validateColombianCoordinates(lat, lng)) {
                const fallback = this.getFallbackCoordinates(ciudad);
                if (fallback) {
                    lat = fallback.lat;
                    lng = fallback.lng;
                    console.log(`Usando coordenadas de fallback para ${ciudad}: ${lat}, ${lng}`);
                } else {
                    return; // Saltar este cliente si no hay coordenadas válidas
                }
            }

            // Buscar si existe una ubicación cercana
            let foundNearbyLocation = false;
            for (const locationKey in locationMap) {
                const existingLocation = locationMap[locationKey];
                const distance = this.calculateDistance(lat, lng, existingLocation.lat, existingLocation.lng);
                
                if (distance <= proximityRadius) {
                    // Agregar a la ubicación existente
                    existingLocation.totalClients++;
                    existingLocation.totalSales += ventaProm;
                    
                    if (atencion === 'Nexo') {
                        existingLocation.nexoClients.push(client);
                    } else {
                        existingLocation.directaClients.push(client);
                    }
                    
                    foundNearbyLocation = true;
                    break;
                }
            }

            // Si no se encontró una ubicación cercana, crear una nueva
            if (!foundNearbyLocation) {
                const locationKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
                locationMap[locationKey] = {
                    lat,
                    lng,
                    ciudad,
                    nexoClients: atencion === 'Nexo' ? [client] : [],
                    directaClients: atencion !== 'Nexo' ? [client] : [],
                    totalClients: 1,
                    totalSales: ventaProm
                };
            }
        });

        return locationMap;
    }

    /**
     * Agrupa los datos por ubicación geográfica (método original como fallback)
     */
    groupDataByLocation() {
        const locationMap = {};

        this.rawData.forEach(client => {
            const lat = parseFloat(client['Latitud']);
            const lng = parseFloat(client['Longitud']);
            const ciudad = client['Concatenado Ciudad'] || 'Ubicación desconocida';
            const atencion = client['Atencion'] || 'Desconocido';
            const ventaProm = parseFloat(client['Venta Prom']) || 0;

            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                const locationKey = `${lat}_${lng}`;

                if (!locationMap[locationKey]) {
                    locationMap[locationKey] = {
                        lat,
                        lng,
                        ciudad,
                        nexoClients: [],
                        directaClients: [],
                        totalClients: 0,
                        totalSales: 0
                    };
                }

                const location = locationMap[locationKey];
                location.totalClients++;
                location.totalSales += ventaProm;

                if (atencion === 'Nexo') {
                    location.nexoClients.push(client);
                } else {
                    location.directaClients.push(client);
                }
            }
        });

        return locationMap;
    }

    /**
     * Crea el contenido HTML para el popup del marcador
     */
    createPopupContent(location) {
        const { ciudad, nexoClients, directaClients, totalClients, totalSales, populationType, avgSales } = location;
        
        // Determinar etiquetas y estilos según el tipo de población
        let typeLabel, typeClass;
        switch(populationType) {
            case 'exclusiva-nexo':
                typeLabel = 'Exclusiva Nexo';
                typeClass = 'nexo';
                break;
            case 'exclusiva-directa':
                typeLabel = 'Exclusiva Directa';
                typeClass = 'directa';
                break;
            case 'compartida':
                typeLabel = 'Compartida';
                typeClass = 'compartida';
                break;
            default:
                typeLabel = 'Desconocida';
                typeClass = 'unknown';
        }

        return `
            <div class="popup-content">
                <div class="popup-title">${ciudad}</div>
                <div class="popup-info">
                    <div class="popup-row">
                        <span class="popup-label">Tipo de Población:</span>
                        <span class="popup-tension ${typeClass}">${typeLabel}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">Total Clientes:</span>
                        <span class="popup-value">${totalClients}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">Clientes Nexo:</span>
                        <span class="popup-value">${nexoClients.length}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">Clientes Directa:</span>
                        <span class="popup-value">${directaClients.length}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">Ventas Totales:</span>
                        <span class="popup-value">${this.formatCurrency(totalSales)}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">Venta Promedio:</span>
                        <span class="popup-value">${this.formatCurrency(avgSales)}</span>
                    </div>
                    ${nexoClients.length > 0 && directaClients.length > 0 ? `
                    <div class="popup-row">
                        <span class="popup-label">Distribución:</span>
                        <span class="popup-value">${Math.round((nexoClients.length/totalClients)*100)}% Nexo / ${Math.round((directaClients.length/totalClients)*100)}% Directa</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Actualiza las estadísticas del mapa
     */
    updateMapStats(stats) {
        if (typeof stats === 'object') {
            // Nuevo formato con estadísticas detalladas
            document.getElementById('total-locations').textContent = stats.total;
            document.getElementById('nexo-locations').textContent = stats.exclusiveNexo;
            document.getElementById('directa-locations').textContent = stats.exclusiveDirecta;
            
            // Actualizar estadística de poblaciones compartidas si existe el elemento
            const sharedElement = document.getElementById('shared-locations');
            if (sharedElement) {
                sharedElement.textContent = stats.shared;
            }
        } else {
            // Formato legacy para compatibilidad
            document.getElementById('total-locations').textContent = arguments[0];
            document.getElementById('nexo-locations').textContent = arguments[1];
            document.getElementById('directa-locations').textContent = arguments[2];
        }
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