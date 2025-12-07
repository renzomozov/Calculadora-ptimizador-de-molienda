window.addEventListener('load', function() {
    
    // --- VARIABLES GLOBALES ---
    let currentWiMode = 'manual';
    let currentChartMode = 'azzaroni';
    let currentNcFactor = 1.0; 
    let mainChart = null;
    let reportChart1 = null;
    let reportChart2 = null;

    // --- CONFIGURACIÓN TEMA ---
    const toggleBtn = document.getElementById('theme-toggle');
    const themeIcon = toggleBtn.querySelector('.theme-icon');

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
    }

    toggleBtn.addEventListener('click', () => {
        if (document.body.getAttribute('data-theme') === 'dark') {
            document.body.removeAttribute('data-theme');
            themeIcon.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            themeIcon.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        }
        calculateAll();
    });

    // Configuración base Chart.js
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Listeners Inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateAll);
    });

    // --- FUNCIONES GLOBALES ---

    window.setWiMode = function(mode) {
        currentWiMode = mode;
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + mode).classList.add('active');
        document.getElementById('mode-manual').classList.add('hidden');
        document.getElementById('mode-calc').classList.add('hidden');
        document.getElementById('mode-' + mode).classList.remove('hidden');
        calculateAll();
    }

    window.setChartMode = function(mode) {
        currentChartMode = mode;
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('chart-btn-' + mode).classList.add('active');
        calculateAll();
    }

    window.setNcFactor = function(factor) {
        currentNcFactor = factor;
        document.querySelectorAll('.nc-tab-btn').forEach(btn => btn.classList.remove('active'));
        if(factor === 1.0) document.getElementById('btn-nc-100').classList.add('active');
        if(factor === 0.8) document.getElementById('btn-nc-80').classList.add('active');
        if(factor === 0.7) document.getElementById('btn-nc-70').classList.add('active');
        let text = "Mostrando valores al " + (factor*100).toFixed(0) + "% de la Velocidad Crítica.";
        document.getElementById('nc-note-text').innerText = text;
        calculateAll();
    }

    window.closeReport = function() {
        document.getElementById('report-modal').classList.add('hidden');
        document.querySelector('.print-footer').style.display = 'none';
    }

    // --- GENERAR REPORTE (MODIFICADO) ---
    window.generateReport = function() {
        // Recoger datos
        let v = parseFloat(document.getElementById('v').value);
        let D = parseFloat(document.getElementById('d').value);
        let db_real = parseFloat(document.getElementById('db-real').value);
        let Wi, F80;

        if (currentWiMode === 'manual') {
            Wi = parseFloat(document.getElementById('wi-manual').value);
            F80 = parseFloat(document.getElementById('f80-manual').value);
        } else {
            Wi = parseFloat(document.getElementById('wi-calculated-result').value);
            F80 = parseFloat(document.getElementById('f80-calc').value);
        }

        // Recalcular para el reporte
        let numerator = 6.3 * Math.pow(F80, 0.29) * Math.pow(Wi, 0.4);
        let denominator = Math.pow((v * D), 0.25);
        let db_in_theo = (numerator / denominator) / 25.4;

        let D_ft = D * 3.28084;
        let d_ft_theo = db_in_theo / 12; 
        let d_ft_real = db_real / 12;
        let nc_theo = (76.6 / Math.sqrt(D_ft - d_ft_theo)) * currentNcFactor;
        let nc_real = (76.6 / Math.sqrt(D_ft - d_ft_real)) * currentNcFactor;

        // Calcular error bola
        let errorPercent = ((db_real - db_in_theo) / db_in_theo) * 100;
        let errorLabel = "";
        let errorClass = "";
        if (Math.abs(errorPercent) < 5) errorLabel = `Óptimo (${errorPercent.toFixed(2)}%)`;
        else if (errorPercent > 0) errorLabel = `Sobredimensionado (+${errorPercent.toFixed(2)}%)`;
        else errorLabel = `Subdimensionado (${errorPercent.toFixed(2)}%)`;

        // Llenar tabla
        let tbody = document.getElementById('report-table-body');
        tbody.innerHTML = `
            <tr>
                <td>Work Index (Wi)</td>
                <td>${Wi.toFixed(2)} kWh/t</td> 
                <td>Bola Teórica</td>
                <td>${db_in_theo.toFixed(2)}"</td>
            </tr>
            <tr>
                <td>F80</td>
                <td>${F80} μm</td> 
                <td>Bola Real</td>
                <td>${db_real.toFixed(2)}"</td>
            </tr>
            <tr>
                <td>Velocidad (v)</td>
                <td>${v} RPM</td> 
                <td><strong>Error Bola</strong></td>
                <td><strong>${errorLabel}</strong></td>
            </tr>
            <tr>
                <td>Diámetro (D)</td>
                <td>${D} m</td> 
                <td>Nc Real (${(currentNcFactor*100).toFixed(0)}%)</td>
                <td>${nc_real.toFixed(1)} RPM</td>
            </tr>
        `;

        // Mostrar Modal
        document.getElementById('report-modal').classList.remove('hidden');
        document.querySelector('.print-footer').style.display = 'block';

        // Configurar colores para reporte (usar gris oscuro para impresión limpia)
        const textColor = '#1f2937';
        const gridColor = '#e5e7eb';
        const primaryColor = '#558b6e';

        // Destruir gráficos viejos del reporte y crear nuevos
        if (reportChart1) reportChart1.destroy();
        let ctx1 = document.getElementById('reportChartAzzaroni').getContext('2d');
        // enableAnimation = false para que se vean al imprimir
        reportChart1 = new Chart(ctx1, getChartConfig('azzaroni', F80, Wi, v, D, db_in_theo, db_real, nc_theo, nc_real, false, textColor, gridColor, primaryColor));

        if (reportChart2) reportChart2.destroy();
        let ctx2 = document.getElementById('reportChartSpeed').getContext('2d');
        reportChart2 = new Chart(ctx2, getChartConfig('speed', F80, Wi, v, D, db_in_theo, db_real, nc_theo, nc_real, false, textColor, gridColor, primaryColor));
    }

    // --- FUNCIÓN DE CÁLCULO PRINCIPAL ---
    function calculateAll() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const labelColor = isDark ? '#94a3b8' : '#6b7280';
        const gridColor = isDark ? '#334155' : '#e5e7eb';
        const primaryColor = isDark ? '#60a5fa' : '#558b6e';

        Chart.defaults.color = labelColor;
        Chart.defaults.scale.grid.color = gridColor;

        let v = parseFloat(document.getElementById('v').value) || 18;
        let D_meters = parseFloat(document.getElementById('d').value) || 1;
        let db_real_inch = parseFloat(document.getElementById('db-real').value) || 0;
        let Wi, F80;

        if (currentWiMode === 'manual') {
            Wi = parseFloat(document.getElementById('wi-manual').value);
            F80 = parseFloat(document.getElementById('f80-manual').value);
        } else {
            let W = parseFloat(document.getElementById('bond-w').value);
            let P80_bond = parseFloat(document.getElementById('bond-p80').value);
            F80 = parseFloat(document.getElementById('f80-calc').value);

            if (W > 0 && P80_bond > 0 && F80 > 0 && F80 > P80_bond) {
                let term = (1 / Math.sqrt(P80_bond)) - (1 / Math.sqrt(F80));
                Wi = W / (10 * term);
                document.getElementById('wi-calculated-result').value = Wi.toFixed(2);
            } else {
                Wi = 0;
                document.getElementById('wi-calculated-result').value = "-";
            }
        }

        if (!Wi || Wi <= 0 || !F80 || F80 <= 0) return;

        let numerator = 6.3 * Math.pow(F80, 0.29) * Math.pow(Wi, 0.4);
        let denominator = Math.pow((v * D_meters), 0.25);
        let db_mm = numerator / denominator;
        let db_in_theo = db_mm / 25.4;

        document.getElementById('db-theoretical').innerText = db_in_theo.toFixed(2);
        document.getElementById('db-theoretical-mm').innerText = `${db_mm.toFixed(1)} mm`;

        let D_ft = D_meters * 3.28084;
        let d_ft_theo = db_in_theo / 12; 
        let nc_theo_base = 76.6 / Math.sqrt(D_ft - d_ft_theo);
        let d_ft_real = db_real_inch / 12; 
        let nc_real_base = 76.6 / Math.sqrt(D_ft - d_ft_real);

        let nc_theo_display = nc_theo_base * currentNcFactor;
        let nc_real_display = nc_real_base * currentNcFactor;

        document.getElementById('nc-theo-val').innerText = nc_theo_display.toFixed(1) + " RPM";
        document.getElementById('nc-real-val').innerText = nc_real_display.toFixed(1) + " RPM";

        // CALCULO ERROR NC
        updateNcStatus(nc_theo_display, nc_real_display);

        updateStatus(db_in_theo, db_real_inch);
        updateChart(F80, Wi, v, D_meters, db_in_theo, db_real_inch, nc_theo_display, nc_real_display, primaryColor);
    }

    function updateNcStatus(theo, real) {
        let diffPercent = ((real - theo) / theo) * 100;
        let msg = "", color = "", border = "", bg = "";

        if (Math.abs(diffPercent) < 0.5) {
            msg = "✓ Velocidades alineadas"; color = "#10b981"; border = "rgba(16, 185, 129, 0.3)"; bg = "rgba(16, 185, 129, 0.1)";
        } else if (diffPercent > 0) {
            msg = `⚠ Nc Real mayor (+${diffPercent.toFixed(2)}%)`; color = "#e67e22"; border = "rgba(230, 126, 34, 0.3)"; bg = "rgba(230, 126, 34, 0.1)";
        } else {
            msg = `⚠ Nc Real menor (${diffPercent.toFixed(2)}%)`; color = "#ef4444"; border = "rgba(239, 68, 68, 0.3)"; bg = "rgba(239, 68, 68, 0.1)";
        }

        const ncStatusDiv = document.getElementById('nc-status-container');
        ncStatusDiv.innerText = msg;
        ncStatusDiv.style.color = color;
        ncStatusDiv.style.borderColor = border;
        ncStatusDiv.style.backgroundColor = bg;
    }

    function updateStatus(teorico, real) {
        if (real === 0) return;
        let diff = ((real - teorico) / teorico) * 100;
        let msg = "", color = "#ccc";
        if (Math.abs(diff) < 5) {
            msg = "Eficiencia Óptima: El tamaño real es ideal."; color = "#10b981";
        } else if (diff > 0) {
            msg = `Sobredimensionado: +${diff.toFixed(1)}% del ideal.`; color = "#e67e22";
        } else {
            msg = `Subdimensionado: -${Math.abs(diff).toFixed(1)}% del ideal.`; color = "#ef4444";
        }
        document.getElementById('efficiency-msg').innerText = msg;
        document.getElementById('status-dot').style.backgroundColor = color;
    }

    function updateChart(F80, Wi, v, D_meters, db_theo, db_real, nc_theo, nc_real, primaryColor) {
        const ctx = document.getElementById('mainChart').getContext('2d');
        let config = getChartConfig(currentChartMode, F80, Wi, v, D_meters, db_theo, db_real, nc_theo, nc_real, true, null, null, primaryColor);
        
        if (mainChart) mainChart.destroy();
        mainChart = new Chart(ctx, config);
    }

    function getChartConfig(type, F80, Wi, v, D_meters, db_theo, db_real, nc_theo, nc_real, enableAnimation = true, forceLabel = null, forceGrid = null, forcePrimary = null) {
        let labels = [], datasets = [], xTitle = "", yTitle = "";
        
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const labelColor = forceLabel || (isDark ? '#94a3b8' : '#1f2937');
        const gridLineColor = forceGrid || (isDark ? '#334155' : '#e5e7eb');
        const lineColor = isDark ? '#d1d5db' : '#111827'; 
        const primaryPointColor = forcePrimary || (isDark ? '#60a5fa' : '#558b6e');

        const effectiveLineColor = forceLabel ? '#111827' : lineColor; // Si forzamos label (impresion), forzamos linea oscura

        if (type === 'azzaroni') {
            xTitle = "F80 (Alimentación μm)";
            yTitle = "Tamaño Bola (pulg)";
            let dataCurve = [];
            let start = F80 * 0.5, end = F80 * 1.5, step = (end - start) / 10;
            for (let x = start; x <= end; x += step) {
                let num = 6.3 * Math.pow(x, 0.29) * Math.pow(Wi, 0.4);
                let den = Math.pow((v * D_meters), 0.25);
                let y_in = (num / den) / 25.4;
                labels.push(x.toFixed(0));
                dataCurve.push(y_in);
            }
            datasets = [
                { label: 'Curva Azzaroni', data: dataCurve, borderColor: effectiveLineColor, borderWidth: 2, pointRadius: 0, tension: 0.4, borderDash: [5, 5] },
                { label: 'Real', data: [{x: F80, y: db_real}], backgroundColor: '#e74c3c', pointRadius: 6, type: 'scatter' },
                { label: 'Teórico', data: [{x: F80, y: db_theo}], backgroundColor: primaryPointColor, pointRadius: 6, type: 'scatter' }
            ];
        } else {
            xTitle = "Diámetro de Bola (pulg)";
            yTitle = "Velocidad (RPM)";
            let dataNcCurve = [], dataOper = [];
            let D_ft = D_meters * 3.28084;
            for (let d = 1; d <= 6; d += 0.5) {
                let d_ft = d / 12;
                let nc = (76.6 / Math.sqrt(D_ft - d_ft)) * currentNcFactor;
                labels.push(d);
                dataNcCurve.push(nc);
                dataOper.push(v);
            }
            datasets = [
                { label: `Curva Nc (${(currentNcFactor*100).toFixed(0)}%)`, data: dataNcCurve, borderColor: '#e67e22', borderWidth: 2, tension: 0.4 },
                { label: 'Velocidad Actual', data: dataOper, borderColor: effectiveLineColor, borderWidth: 1, borderDash: [2, 2], pointRadius: 0 },
                { label: 'Real', data: [{x: db_real, y: nc_real}], backgroundColor: '#e74c3c', pointRadius: 8, pointStyle: 'triangle', type: 'scatter' },
                { label: 'Teórico', data: [{x: db_theo, y: nc_theo}], backgroundColor: primaryPointColor, pointRadius: 8, pointStyle: 'rectRot', type: 'scatter' }
            ];
        }

        return {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: enableAnimation ? { duration: 1000 } : false,
                plugins: { 
                    legend: { 
                        position: 'top', 
                        align: 'end',
                        labels: { color: labelColor }
                    } 
                },
                scales: {
                    x: { 
                        type: 'linear', 
                        position: 'bottom', 
                        title: { display: true, text: xTitle, color: labelColor },
                        min: labels[0], 
                        max: labels[labels.length-1],
                        grid: { color: gridLineColor },
                        ticks: { color: labelColor }
                    },
                    y: { 
                        title: { display: true, text: yTitle, color: labelColor }, 
                        grid: { color: gridLineColor },
                        ticks: { color: labelColor }
                    }
                }
            }
        };
    }

    calculateAll();
});