# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

## Descripción del Proyecto

Esta es una aplicación de dashboard del lado del cliente para analizar escenarios de migración de clientes entre los modelos de negocio Nutresa (Atención Directa) y Nexo (Atención Indirecta). La aplicación se conecta a la API de Google Sheets para obtener y analizar datos de clientes en tiempo real.

## Arquitectura

- **Aplicación solo frontend**: No requiere servidor backend
- **Integración con Google Sheets**: Usa la API de Google Sheets como fuente de datos
- **Análisis basado en escenarios**: Soporta múltiples escenarios de datos via diferentes hojas/pestañas
- **Actualizaciones en tiempo real**: Se conecta directamente a Google Sheets para datos en vivo

### Estructura de Archivos Principales

- `index.html` - Interfaz principal del dashboard con métricas, gráficos y tablas de datos
- `app.js` - Clase principal de la aplicación (`GestorSuroDashboard`) que maneja toda la lógica de negocio
- `styles.css` - Estilos completos con variables CSS y diseño responsivo
- `config.js` - Configuración de la API de Google Sheets (contiene claves sensibles)
- `config.example.js` - Plantilla para configuración inicial

### Componentes Clave

1. **Métricas del Dashboard**: Conteo de clientes, potencial de migración, impacto en ingresos
2. **Visualización de Datos**: Gráficos usando Chart.js para tendencias y distribuciones
3. **Filtros Interactivos**: Filtrado por tipo de cliente, región y período de tiempo
4. **Gestión de Escenarios**: Cambio entre diferentes escenarios/hojas de datos
5. **Mapeo Geográfico**: Integración con Leaflet.js para análisis basado en ubicación
6. **Exportación de Datos**: Funcionalidad de exportación CSV para datos filtrados
7. **Pestaña Financiera**: Sistema avanzado de análisis financiero con:
   - Integración con ConfigFinanciera para configuración persistente
   - Cálculos automáticos de ventas, costos, recursos e ICA
   - Panel de resumen consolidado con métricas clave
   - Gestión híbrida de recursos con cantidades

## Dependencias

La aplicación usa estas librerías externas via CDN:
- Chart.js para visualización de datos
- Google APIs para integración con Sheets
- Font Awesome para iconos
- Leaflet.js para mapas
- Leaflet MarkerCluster para marcadores de mapa

## Configuración

### Configuración de Google Sheets API
1. La app requiere un proyecto de Google Cloud Console con la API de Sheets habilitada
2. La configuración se maneja a través de `config.js` (basado en `config.example.js`)
3. Campos requeridos: `SHEET_ID`, `API_KEY`, `SHEET_RANGE`

### Requisitos de Estructura de Datos
Las Google Sheets deben contener columnas para:
- Cliente (Nombre del cliente)
- Tipo Cliente (Tipo de cliente: Nutresa/Nexo)
- Region (Región geográfica)
- Volumen (Volumen de ventas)
- Valor (Valor de ingresos)

#### ConfigFinanciera (Hoja de Configuración)
Estructura requerida para la configuración financiera:
- **Escenario**: Nombre del escenario (Base, Escenario1, etc.)
- **Campo**: Identificador del campo (nexo-venta, directa-costo, etc.)
- **Valor**: Valor numérico de configuración
- **Cantidad**: Cantidad asociada (opcional, para recursos)

## Clases y Métodos Clave

### Clase GestorSuroDashboard
- `constructor()` - Inicializa el dashboard con configuración y event listeners
- `loadSheetData()` - Obtiene datos de la API de Google Sheets
- `updateDashboard()` - Actualiza todas las métricas y visualizaciones
- `switchScenario(scenario)` - Cambia la fuente de datos a una pestaña de hoja diferente
- `filterData()` - Aplica filtros seleccionados por el usuario al dataset
- `updateMetrics()` - Calcula y muestra indicadores clave de rendimiento
- `loadFinancialConfig()` - Carga configuración desde la hoja ConfigFinanciera
- `updateFinancialSummary()` - Actualiza el panel de resumen consolidado financiero
- `processConfigResource()` - Procesa recursos con cantidades desde ConfigFinanciera

## Lógica de Negocio

### Análisis de Migración
- Identifica clientes adecuados para migración basado en umbrales de volumen/valor
- Compara escenarios para mostrar impacto potencial en el negocio
- Rastrea cambios entre el escenario base y alternativas

### Procesamiento de Datos
- Mapeo flexible de columnas para diferentes estructuras de hojas
- Detección automática de tipos de datos y conversión
- Soporte para nombres de columnas y formatos en español

## Ejecutar la Aplicación

Esta es una aplicación web estática - no requiere proceso de build:

1. Abrir `index.html` en un navegador web
2. Configurar la conexión con Google Sheets via la interfaz
3. Los datos se cargan automáticamente una vez conectado

Para desarrollo local, servir archivos a través de un servidor web local para evitar problemas de CORS con la API de Google.

## Consideraciones de Seguridad

- **API Key visible**: Al ser una aplicación del lado del cliente, la API key es visible en el código fuente
- **Protección mediante restricciones**: La seguridad real viene de las restricciones configuradas en Google Cloud Console:
  - Restricción HTTP Referrer: Solo `*.vercel.app` puede usar la key
  - API limitations: Solo Google Sheets API habilitada
- **Buenas prácticas**: Para aplicaciones estáticas, este es el enfoque de seguridad estándar
- **config.js comprometido**: El archivo está en el repositorio por necesidad operacional, pero protegido por restricciones de dominio

## Personalización

### Agregar Nuevas Métricas
Modificar el método `updateMetrics()` en `app.js` y agregar elementos HTML correspondientes en `index.html`.

### Personalización de Gráficos
Las configuraciones de gráficos se definen en `config.js` bajo `CHART_CONFIG`. Los colores y opciones pueden modificarse ahí.

### Criterios de Migración
Las reglas de negocio para el análisis de migración son configurables en `config.js` bajo `MIGRATION_CRITERIA`.

## Deployment y CI/CD

### Vercel Integration
- **Auto-deployment**: Configurado con GitHub para deployment automático en cada push a `main`
- **Production URL**: https://gestor-suro-dashboard.vercel.app
- **Headers de seguridad**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Optimización de cache**: Headers controlados para evitar problemas de cache en desarrollo

### Configuración de Seguridad
- **API Key protegida**: Restricciones de dominio configuradas en Google Cloud Console
- **Referrer restrictions**: Solo dominios `*.vercel.app` pueden usar la API key
- **API limitations**: Solo Google Sheets API habilitada, otros servicios bloqueados

## Funcionalidades Recientes

### Mejoras del Mapa (Sesión Actual)
- **Leyenda reubicada**: Layout vertical al lado del mapa en lugar de overlay
- **Sidebar informativa**: Panel lateral con leyenda y estadísticas organizadas verticalmente
- **Responsive design**: En móvil, la sidebar se muestra arriba del mapa
- **Mejor aprovechamiento del espacio**: Diseño más limpio y profesional

### Popups del Mapa Mejorados
- **Eliminada "Venta Promedio"**: Información no relevante removida
- **Ventas por tipo agregadas**: 
  - **Ventas Nexo**: Monto y porcentaje del total
  - **Ventas Directa**: Monto y porcentaje del total
- **Distribución de clientes**: Porcentajes de clientes por tipo de atención
- **Cálculos automáticos**: Usa la misma lógica de la pestaña Población

### Panel de Resumen Financiero Consolidado
Se implementó un panel de resumen que muestra encima de las tablas financieras:
- **Ventas Totales**: Suma consolidada de ventas Nexo + Directa
- **Costos Totales**: Suma consolidada de costos Nexo + Directa
- **Diferencia Recursos**: Suma de recursos adicionales (puede ser positiva o negativa)
- **ICA Total**: Suma consolidada de ICA Nexo + Directa
- **% Costo x Servir Total**: Porcentaje de costos totales sobre ventas totales

### Integración ConfigFinanciera Avanzada
- Sistema híbrido que lee configuración persistente desde GoogleSheets
- Soporte para cantidades en recursos (4 columnas: Escenario, Campo, Valor, Cantidad)
- Conversión de campos editables a campos calculados automáticos
- Gestión inteligente de recursos con formato de signos (+/-)

### Conectividad Automática
- **Configuración automática**: La app se conecta automáticamente a Google Sheets sin intervención manual
- **Validación mejorada**: Sistema robusto de carga de configuración
- **Manejo de errores**: Mejor gestión de fallos en la API de Google