# 📊 Gestor Suro Dashboard

> Dashboard de análisis de migración de clientes Nutresa vs Nexo con conexión en tiempo real a Google Sheets

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jvelezp13/gestor-suro-dashboard)

## 🚀 Demo en Vivo

**URL del Proyecto**: [https://github.com/jvelezp13/gestor-suro-dashboard](https://github.com/jvelezp13/gestor-suro-dashboard)

## ✨ Características

- 📈 **Visualizaciones Interactivas** con Chart.js
- 🗺️ **Mapas Geográficos** con Leaflet.js
- 📊 **Análisis Financiero** en tiempo real
- 🔄 **Conexión Google Sheets** automática
- 📱 **Diseño Responsive** para todos los dispositivos
- 🎯 **Análisis de Migración** Nutresa vs Nexo
- 📋 **Filtros Avanzados** y búsqueda
- 💰 **Cálculos Financieros** automáticos

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Visualizaciones**: Chart.js, Leaflet.js
- **APIs**: Google Sheets API
- **Despliegue**: Vercel
- **Control de Versiones**: Git + GitHub

## 📦 Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/jvelezp13/gestor-suro-dashboard.git
cd gestor-suro-dashboard

# Servir archivos localmente
python3 -m http.server 8000
# o con Node.js
npx serve .
```

## ⚙️ Configuración

1. **Copia el archivo de configuración**:
   ```bash
   cp config.example.js config.js
   ```

2. **Edita `config.js` con tus credenciales**:
   ```javascript
   const CONFIG = {
       SHEET_ID: 'tu-sheet-id-aqui',
       API_KEY: 'tu-api-key-aqui',
       // ... más configuraciones
   };
   ```

3. **Configura Google Sheets API**:
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Habilita Google Sheets API
   - Crea una API Key
   - Configura las restricciones necesarias

## 🚀 Despliegue en Vercel

### Opción 1: Deploy Automático
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jvelezp13/gestor-suro-dashboard)

### Opción 2: Deploy Manual
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy desde el directorio del proyecto
vercel
```

### Variables de Entorno en Vercel
Configura estas variables en tu dashboard de Vercel:
- `GOOGLE_SHEETS_API_KEY`
- `GOOGLE_SHEET_ID`

## 📊 Uso

1. **Conectar con Google Sheets**
   - Haz clic en "Conectar" en el header
   - Verifica que los datos se carguen correctamente

2. **Explorar Datos**
   - **Dashboard**: Vista general con métricas clave
   - **Tabla**: Datos detallados con filtros
   - **Población**: Análisis por ubicación geográfica
   - **Financiero**: Cálculos y proyecciones
   - **Mapa**: Visualización geográfica

3. **Filtros Disponibles**
   - Por tipo de atención (Nutresa/Nexo)
   - Por región geográfica
   - Por rango de ventas
   - Búsqueda por nombre de cliente

## 📁 Estructura del Proyecto

```
gestor-suro-dashboard/
├── index.html          # Página principal
├── app.js             # Lógica de la aplicación
├── styles.css         # Estilos CSS
├── config.js          # Configuración (no incluido en repo)
├── config.example.js  # Ejemplo de configuración
├── vercel.json        # Configuración de Vercel
├── .gitignore         # Archivos ignorados por Git
└── README.md          # Este archivo
```

## 🔒 Seguridad

- ✅ API Keys protegidas con `.gitignore`
- ✅ Headers de seguridad configurados
- ✅ Validación de datos de entrada
- ✅ Configuración de CORS apropiada

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👨‍💻 Autor

**Julian Velez** - [@jvelezp13](https://github.com/jvelezp13)

---

⭐ ¡No olvides dar una estrella al proyecto si te fue útil!

## 📋 Requisitos Previos

### 1. Google Sheets API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Sheets API**
4. Crea credenciales (API Key)
5. Configura las restricciones de la API Key para mayor seguridad

### 2. Estructura de Datos en Google Sheets

Tu hoja de cálculo debe tener las siguientes columnas (nombres flexibles):

| Columna | Nombres Alternativos | Descripción |
|---------|---------------------|-------------|
| Cliente | cliente | Nombre del cliente |
| Tipo Cliente | tipo_cliente, tipo | Nutresa/Nexo o Directa/Indirecta |
| Region | region | Región geográfica |
| Volumen | volumen | Volumen de ventas/transacciones |
| Valor | valor | Valor monetario |

**Ejemplo de estructura:**
```
Cliente          | Tipo Cliente | Region | Volumen | Valor
Empresa ABC      | Nutresa      | Norte  | 1500    | 75000
Distribuidora XYZ| Nexo         | Sur    | 800     | 40000
```

## 🛠️ Instalación y Configuración

### Paso 1: Preparar los archivos

1. Descarga todos los archivos del proyecto
2. Colócalos en una carpeta en tu servidor web o abre `index.html` directamente

### Paso 2: Configurar Google Sheets

1. Abre el dashboard en tu navegador
2. Haz clic en **"Conectar a Google Sheets"**
3. Completa la configuración:
   - **ID de la Hoja**: Copia el ID desde la URL de tu Google Sheet
     ```
     https://docs.google.com/spreadsheets/d/[ID_AQUI]/edit
     ```
   - **Rango de Datos**: Por defecto `A1:Z1000` (ajusta según necesites)
   - **API Key**: Tu clave de API de Google

### Paso 3: Verificar la conexión

- El estado de conexión debe cambiar a "Conectado" (verde)
- Los datos deben cargarse automáticamente
- Las métricas y gráficos deben actualizarse

## 📊 Uso del Dashboard

### Métricas Principales

- **Clientes Nutresa**: Total de clientes con atención directa
- **Clientes Nexo**: Total de clientes con atención indirecta
- **Potencial Migración**: Clientes candidatos para migrar
- **Impacto Estimado**: Valor potencial de las migraciones

### Filtros Disponibles

- **Tipo de Cliente**: Todos, Nutresa, Nexo
- **Región**: Dinámico basado en tus datos
- **Período**: Últimos 30/90/180 días, último año

### Visualizaciones

1. **Distribución de Clientes**: Gráfico de barras/circular
2. **Tendencia de Migración**: Línea temporal
3. **Análisis Regional**: Distribución por regiones
4. **Matriz de Oportunidades**: Scatter plot volumen vs valor

### Tabla de Datos

- **Búsqueda**: Filtra clientes en tiempo real
- **Exportación**: Descarga datos en formato CSV
- **Detalles**: Ve información completa de cada cliente

## 🔧 Personalización

### Modificar Criterios de Migración

En `app.js`, busca la función `updateMetrics()` y ajusta los criterios:

```javascript
// Ejemplo: cambiar umbral de volumen para migración
const migrationPotential = nexoClients.filter(item => {
    const volume = parseFloat(item.Volumen || item.volumen || 0);
    return volume > 1000; // Cambiar este valor
});
```

### Agregar Nuevas Métricas

1. Añade el HTML en `index.html`:
```html
<div class="metric-card">
    <div class="metric-icon custom">
        <i class="fas fa-chart-bar"></i>
    </div>
    <div class="metric-content">
        <h3>Nueva Métrica</h3>
        <span id="newMetric" class="metric-value">-</span>
        <span class="metric-label">Descripción</span>
    </div>
</div>
```

2. Actualiza el CSS en `styles.css`:
```css
.metric-icon.custom {
    background: #your-color;
}
```

3. Calcula la métrica en `app.js`:
```javascript
// En updateMetrics()
const newMetricValue = this.filteredData.filter(/* tu lógica */).length;
document.getElementById('newMetric').textContent = newMetricValue;
```

### Personalizar Colores

Modifica las variables CSS en `styles.css`:

```css
:root {
    --nutresa-color: #e74c3c;  /* Color Nutresa */
    --nexo-color: #27ae60;     /* Color Nexo */
    --migration-color: #f39c12; /* Color migración */
    /* ... otros colores */
}
```

## 🔒 Seguridad

### Mejores Prácticas

1. **Restricciones de API Key**:
   - Limita por dominio en Google Cloud Console
   - Restringe a Google Sheets API únicamente

2. **Datos Sensibles**:
   - No incluyas información confidencial en el repositorio
   - Usa variables de entorno para producción

3. **Permisos de Google Sheets**:
   - Configura permisos de solo lectura cuando sea posible
   - Usa cuentas de servicio para mayor control

## 🚨 Solución de Problemas

### Error de Conexión

**Problema**: "Error al conectar con Google Sheets"

**Soluciones**:
1. Verifica que la API Key sea correcta
2. Confirma que Google Sheets API esté habilitada
3. Revisa las restricciones de la API Key
4. Verifica que el ID de la hoja sea correcto

### Datos No Se Cargan

**Problema**: Dashboard muestra datos vacíos

**Soluciones**:
1. Verifica el rango de datos (ej: A1:Z1000)
2. Confirma que la hoja tenga datos en las celdas especificadas
3. Revisa que los nombres de columnas coincidan
4. Verifica permisos de lectura en Google Sheets

### Gráficos No Se Actualizan

**Problema**: Visualizaciones permanecen vacías

**Soluciones**:
1. Abre la consola del navegador (F12) para ver errores
2. Verifica que Chart.js se haya cargado correctamente
3. Confirma que los datos tengan el formato correcto

## 📱 Compatibilidad

- **Navegadores**: Chrome, Firefox, Safari, Edge (últimas versiones)
- **Dispositivos**: Desktop, tablet, móvil
- **Resoluciones**: Responsive design desde 320px

## 🔄 Actualizaciones Automáticas

El dashboard se actualiza automáticamente cuando:
- Cambias filtros
- Haces clic en "Actualizar"
- Se detectan cambios en Google Sheets (manual)

Para actualizaciones automáticas periódicas, puedes agregar:

```javascript
// En app.js, al final del constructor
setInterval(() => {
    if (this.isConnected) {
        this.refreshData();
    }
}, 300000); // Cada 5 minutos
```

## 📞 Soporte

Para problemas técnicos:
1. Revisa la consola del navegador (F12)
2. Verifica la configuración de Google Sheets API
3. Confirma la estructura de datos
4. Consulta la documentación de Google Sheets API

## 📄 Licencia

Este proyecto está diseñado para uso interno de análisis de migración de clientes.

---

**¡Listo para analizar tus datos de migración!** 🎯