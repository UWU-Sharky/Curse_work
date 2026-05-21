/**
 * Клиентский скрипт: СТРОГО ОТРИСОВКА ТРЕХ ОТДЕЛЬНЫХ ГРАФИКОВ.
 * Вся математическая и вероятностная логика вычислений полностью изолирована в app.py.
 */

// Переменные для хранения трех отдельных экземпляров Chart.js
let chart1 = null;
let chart2 = null;
let chart3 = null;

let debounceTimer = null;

/**
 * Извлекает числовые значения из полей HTML-формы ввода параметров.
 */
function getFormValues() {
    const form = document.getElementById('parametersForm');
    if (!form) return {};
    const formData = new FormData(form);
    const params = {};
    
    for (const [key, value] of formData.entries()) {
        params[key] = parseFloat(value);
    }
    return params;
}

/**
 * Отправляет POST-запрос на Flask API и обновляет интерфейс.
 */
async function sendRequestToFlask() {
    const payload = getFormValues();
    const resultsContainer = document.getElementById('resultsCard');

    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            // Отрисовка сообщения об ошибке валидации со стороны сервера Flask
            if (resultsContainer) {
                resultsContainer.className = "p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-2 text-sm text-rose-900";
                resultsContainer.innerHTML = `
                    <p class="font-bold text-rose-950">Ошибка расчета:</p>
                    <p class="text-xs text-rose-700">${result.error}</p>
                `;
            }
            return;
        }

        // Восстанавливаем стандартный дизайн карточки результатов
        if (resultsContainer) {
            resultsContainer.className = "p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-sm text-blue-900";
            
            const A = result.A;
            resultsContainer.innerHTML = `
                <p class="font-bold text-blue-950">Стационарные средние (A<sub>i</sub>):</p>
                <div class="grid grid-cols-3 gap-2 text-center mt-2">
                    <div class="bg-white/80 p-2 rounded-lg border border-blue-100">
                        <span class="block text-xs font-bold text-slate-400">Узел 1</span>
                        <span class="text-base font-extrabold text-blue-600">${A[0].toFixed(3)}</span>
                    </div>
                    <div class="bg-white/80 p-2 rounded-lg border border-blue-100">
                        <span class="block text-xs font-bold text-slate-400">Узел 2</span>
                        <span class="text-base font-extrabold text-red-500">${A[1].toFixed(3)}</span>
                    </div>
                    <div class="bg-white/80 p-2 rounded-lg border border-blue-100">
                        <span class="block text-xs font-bold text-slate-400">Узел 3</span>
                        <span class="text-base font-extrabold text-emerald-500">${A[2].toFixed(3)}</span>
                    </div>
                </div>
            `;
        }

        // Отрисовываем три отдельных графика с динамическими осями и метками
        drawCharts(result.labels, result.p1, result.p2, result.p3, result.A);

    } catch (error) {
        if (resultsContainer) {
            resultsContainer.className = "p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-2 text-sm text-rose-900";
            resultsContainer.innerHTML = `
                <p class="font-bold text-rose-950">Сетевая ошибка:</p>
                <p class="text-xs text-rose-700">Не удалось связаться с сервером Flask.</p>
            `;
        }
    }
}

/**
 * Инициализирует или плавно обновляет три независимых объекта Chart.js.
 * Принимает готовые массивы координат и динамические метки оси X напрямую от Python.
 */
function drawCharts(labels, p1, p2, p3, A) {
    
    // --- ГРАФИК 1: УЗЕЛ 1 (Синий) ---
    if (chart1) {
        chart1.data.labels = labels;
        chart1.data.datasets[0].data = p1;
        chart1.data.datasets[0].label = `P(n1) для A1 = ${A[0].toFixed(2)}`;
        chart1.update('none'); // Обновление без дерганой анимации при вводе
    } else {
        const ctx1 = document.getElementById('chartNode1').getContext('2d');
        chart1 = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `P(n1) для A1 = ${A[0].toFixed(2)}`,
                    data: p1,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#2563eb',
                    pointHoverRadius: 5,
                    tension: 0.2,
                    fill: true
                }]
            },
            options: getChartOptions('Количество заявок (n1)')
        });
    }

    // --- ГРАФИК 2: УЗЕЛ 2 (Красный) ---
    if (chart2) {
        chart2.data.labels = labels;
        chart2.data.datasets[0].data = p2;
        chart2.data.datasets[0].label = `P(n2) для A2 = ${A[1].toFixed(2)}`;
        chart2.update('none');
    } else {
        const ctx2 = document.getElementById('chartNode2').getContext('2d');
        chart2 = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `P(n2) для A2 = ${A[1].toFixed(2)}`,
                    data: p2,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.05)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#dc2626',
                    pointHoverRadius: 5,
                    tension: 0.2,
                    fill: true
                }]
            },
            options: getChartOptions('Количество заявок (n2)')
        });
    }

    // --- ГРАФИК 3: УЗЕЛ 3 (Зеленый) ---
    if (chart3) {
        chart3.data.labels = labels;
        chart3.data.datasets[0].data = p3;
        chart3.data.datasets[0].label = `P(n3) для A3 = ${A[2].toFixed(2)}`;
        chart3.update('none');
    } else {
        const ctx3 = document.getElementById('chartNode3').getContext('2d');
        chart3 = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `P(n3) для A3 = ${A[2].toFixed(2)}`,
                    data: p3,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#10b981',
                    pointHoverRadius: 5,
                    tension: 0.2,
                    fill: true
                }]
            },
            options: getChartOptions('Количество заявок (n3)')
        });
    }
}

/**
 * Возвращает стандартизированную конфигурацию опций для каждого графика.
 * @param {string} xTitle - Название оси X
 */
function getChartOptions(xTitle) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        size: 11,
                        weight: '600',
                        family: 'ui-sans-serif, system-ui, sans-serif'
                    },
                    usePointStyle: true,
                    boxWidth: 6
                }
            },
            tooltip: {
                padding: 10,
                cornerRadius: 6,
                callbacks: {
                    label: function(context) {
                        return ` Вероятность P(n) = ${context.raw.toFixed(4)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#f8fafc' },
                title: {
                    display: true,
                    text: 'Вероятность P(n)',
                    font: { size: 11, weight: '600' }
                }
            },
            x: {
                grid: { color: '#f8fafc' },
                title: {
                    display: true,
                    text: xTitle,
                    font: { size: 11, weight: '600' }
                }
            }
        }
    };
}

/**
 * Исключает лавинообразные запросы к Flask при наборе текста (debounce-эффект)
 */
function onFormChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(sendRequestToFlask, 150);
}

// Регистрация обработчиков событий формы
document.addEventListener('DOMContentLoaded', () => {
    // Вешаем слушатели на инпуты для авторасчета
    const inputs = document.querySelectorAll('#parametersForm input');
    inputs.forEach(input => {
        input.addEventListener('input', onFormChange);
    });
    
    // Выполняем первичный расчет при первой загрузке страницы
    sendRequestToFlask();
});