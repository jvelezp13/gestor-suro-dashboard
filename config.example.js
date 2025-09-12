/**
 * Archivo de configuración de ejemplo para Google Sheets API
 * 
 * INSTRUCCIONES:
 * 1. Copia este archivo como 'config.js'
 * 2. Completa los valores con tu información
 * 3. Nunca subas config.js a un repositorio público
 */

// Configuración de Google Sheets API
const CONFIG = {
    // ID de tu hoja de cálculo de Google Sheets
    // Lo encuentras en la URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
    SHEET_ID: '1QCjfTgxQOgs5dXUniafhJyLfHOHa4Zj4s8D7MEbyaMk',
    
    // Tu API Key de Google Cloud Console
    // Asegúrate de que tenga permisos para Google Sheets API
    API_KEY: 'AIzaSyABC4roT1lVCmcm02V5GlOg-VzbC64VQjI',
    
    // Rango de datos en la hoja (formato A1)
    // Configurado para leer todas las columnas con datos de clientes
    SHEET_RANGE: 'A:Z',
    
    // Configuración de actualización automática
    AUTO_REFRESH: {
        enabled: true,
        interval: 300000 // 5 minutos en milisegundos
    },
    
    // Mapeo de columnas (personaliza según tu hoja)
    COLUMN_MAPPING: {
        cliente: ['Cliente', 'cliente', 'CLIENTE', 'Nombre Cliente', 'nombre_cliente'],
        tipo: ['Tipo Cliente', 'tipo_cliente', 'tipo', 'TIPO', 'Tipo de Cliente', 'Categoria'],
        region: ['Region', 'region', 'REGION', 'Región', 'Ciudad', 'Ubicacion'],
        volumen: ['Volumen', 'volumen', 'VOLUMEN', 'Volumen Ventas', 'Cantidad'],
        valor: ['Valor', 'valor', 'VALOR', 'Valor Ventas', 'Ingresos', 'Revenue'],
        fecha: ['Fecha', 'fecha', 'FECHA', 'Fecha Registro', 'Date'],
        estado: ['Estado', 'estado', 'ESTADO', 'Status', 'Activo']
    },
    
    // Criterios para análisis de migración
    MIGRATION_CRITERIA: {
        // Volumen mínimo para considerar migración
        MIN_VOLUME_FOR_MIGRATION: 1000,
        
        // Valor mínimo para alta prioridad
        HIGH_VALUE_THRESHOLD: 50000,
        
        // Palabras clave para identificar tipos de cliente
        CLIENT_TYPES: {
            nutresa: ['nutresa', 'directa', 'direct'],
            nexo: ['nexo', 'indirecta', 'indirect']
        }
    },
    
    // Configuración de visualizaciones
    CHART_CONFIG: {
        colors: {
            nutresa: '#e74c3c',
            nexo: '#27ae60',
            migration: '#f39c12',
            revenue: '#9b59b6'
        },
        
        // Configuración por defecto de Chart.js
        defaultOptions: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    }
};

// Función para obtener configuración
function getConfig() {
    return CONFIG;
}

// Función para validar configuración
function validateConfig() {
    const errors = [];
    
    if (!CONFIG.SHEET_ID || CONFIG.SHEET_ID === 'tu_sheet_id_aqui') {
        errors.push('SHEET_ID no configurado');
    }
    
    if (!CONFIG.API_KEY || CONFIG.API_KEY === 'tu_api_key_aqui') {
        errors.push('API_KEY no configurado');
    }
    
    if (!CONFIG.SHEET_RANGE) {
        errors.push('SHEET_RANGE no configurado');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getConfig, validateConfig };
}