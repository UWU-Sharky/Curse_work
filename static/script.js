/**
 * Клиентский скрипт: СТРОГО ОТРИСОВКА И УПРАВЛЕНИЕ ОТОБРАЖЕНИЕМ.
 * Вся математическая и вероятностная логика вычислений полностью изолирована в app.py.
 */

let distributionChart = null;
let debounceTimer = null;

// Кэш для хранения результатов последнего успешного ответа от Flask
let cachedResult = null;

// Конфигурация цветов для нормального (активного) и полупрозрачного состояния
const chartColors = {
    node1: {
        active: {
            border: '#2563eb', // Насыщенный синий
            bg: 'rgba(37, 99, 235, 0.1)',
            pointBg: '#2563eb',
            pointBorder: '#2563eb',
            width: 3
        },
        faded: {
            border: 'rgba(37, 99, 235, 0.15)', // Полупрозрачный синий
            bg: 'rgba(37, 99, 235, 0.01)',
            pointBg: 'rgba(37, 99, 235, 0.15)',
            pointBorder: 'rgba(37, 99, 235, 0.15)',
            width: 1.5
        }
    },
    node2: {
        active: {
            border: '#dc2626', // Насыщенный красный
            bg: 'rgba(220, 38, 38, 0.1)',
            pointBg: '#dc2626',
            pointBorder: '#dc2626',
            width: 3
        },
        faded: {
                border: 'rgba(220, 38, 38, 0.15)', // Полупрозрачный красный
                bg: 'rgba(220, 38, 38, 0.01)',
                pointBg: 'rgba(220, 38, 38, 0.15)',
                pointBorder: 'rgba(220, 38, 38, 0.15)',
                width: 1.5
        }
    },
    node3: {
        active: {
            border: '#10b981', // Насыщенный зеленый
            bg: 'rgba(16, 185, 129, 0.1)',
            pointBg: '#10b981',
            pointBorder: '#10b981',
            width: 3
        },
        faded: {
            border: 'rgba(16, 185, 129, 0.15)', // Полупрозрачный зеленый
            bg: 'rgba(16, 185, 129, 0.01)',
            pointBg: 'rgba(16, 185, 129, 0.15)',
            pointBorder: 'rgba(16, 185, 129, 0.15)',
            width: 1.5
        }
    }
};

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
            // Если сервер вернул ошибку стабильности системы
            if (resultsContainer) {
                resultsContainer.className = "p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-2 text-sm text-rose-900";
                resultsContainer.innerHTML = `
                    <p class="font-bold text-rose-950">Ошибка расчета:</p>
                    <p class="text-xs text-rose-700">${result.error}</p>
                `;
            }
            return;
        }

        // Сохраняем успешный ответ в кэш для быстрой фильтрации на клиенте
        cachedResult = result;

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

        // Отрисовываем график с применением текущего выбранного фильтра
        applyDisplayFilterAndDraw();

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
 * Управляет стилями прозрачности и толщины линий графиков в зависимости от значения селектора.
 * Все изменения стилей применяются мгновенно без обращений к бэкенду.
 */
function applyDisplayFilterAndDraw() {
    if (!cachedResult) return;

    const filterElement = document.getElementById('graphFilter');
    const filterValue = filterElement ? filterElement.value : 'all';
    const { labels, p1, p2, p3, A } = cachedResult;

    // Сначала отрисовываем/обновляем холст новыми значениями
    drawChart(labels, p1, p2, p3, A);

    if (distributionChart) {
        // Определяем, какие узлы должны оставаться яркими (активными)
        const node1Active = (filterValue === 'all' || filterValue === 'node1');
        const node2Active = (filterValue === 'all' || filterValue === 'node2');
        const node3Active = (filterValue === 'all' || filterValue === 'node3');

        // Применяем цветовую конфигурацию в зависимости от состояния фокуса
        const style1 = node1Active ? chartColors.node1.active : chartColors.node1.faded;
        const style2 = node2Active ? chartColors.node2.active : chartColors.node2.faded;
        const style3 = node3Active ? chartColors.node3.active : chartColors.node3.faded;

        let order1 = 1;
        let order2 = 1;
        let order3 = 1;

        if (filterValue === 'node1') {
            order1 = 0; // На самый передний план
            order2 = 1;
            order3 = 2;
        } else if (filterValue === 'node2') {
            order1 = 1;
            order2 = 0; // На самый передний план
            order3 = 2;
        } else if (filterValue === 'node3') {
            order1 = 1;
            order2 = 2;
            order3 = 0; // На самый передний план
        }

        // Обновляем Dataset 0 (Узел 1)
        distributionChart.data.datasets[0].borderColor = style1.border;
        distributionChart.data.datasets[0].backgroundColor = style1.bg;
        distributionChart.data.datasets[0].borderWidth = style1.width;
        distributionChart.data.datasets[0].pointBackgroundColor = style1.pointBg;
        distributionChart.data.datasets[0].pointBorderColor = style1.pointBorder;
        distributionChart.data.datasets[0].pointHoverBackgroundColor = style1.pointBg;
        distributionChart.data.datasets[0].pointHoverBorderColor = style1.pointBorder;
        distributionChart.data.datasets[0].order = order1;

        // Обновляем Dataset 1 (Узел 2)
        distributionChart.data.datasets[1].borderColor = style2.border;
        distributionChart.data.datasets[1].backgroundColor = style2.bg;
        distributionChart.data.datasets[1].borderWidth = style2.width;
        distributionChart.data.datasets[1].pointBackgroundColor = style2.pointBg;
        distributionChart.data.datasets[1].pointBorderColor = style2.pointBorder;
        distributionChart.data.datasets[1].pointHoverBackgroundColor = style2.pointBg;
        distributionChart.data.datasets[1].pointHoverBorderColor = style2.pointBorder;
        distributionChart.data.datasets[1].order = order2;

        // Обновляем Dataset 2 (Узел 3)
        distributionChart.data.datasets[2].borderColor = style3.border;
        distributionChart.data.datasets[2].backgroundColor = style3.bg;
        distributionChart.data.datasets[2].borderWidth = style3.width;
        distributionChart.data.datasets[2].pointBackgroundColor = style3.pointBg;
        distributionChart.data.datasets[2].pointBorderColor = style3.pointBorder;
        distributionChart.data.datasets[2].pointHoverBackgroundColor = style3.pointBg;
        distributionChart.data.datasets[2].pointHoverBorderColor = style3.pointBorder;
        distributionChart.data.datasets[2].order = order3;

        // Мягко обновляем график
        distributionChart.update('none');
    }
}

/**
 * Инициализирует или обновляет объект Chart.js на основе готовых данных.
 */
function drawChart(labels, p1, p2, p3, A) {
    if (distributionChart) {
        // Если холст уже инициализирован, заменяем массивы точек
        distributionChart.data.labels = labels;
        
        distributionChart.data.datasets[0].data = p1;
        distributionChart.data.datasets[0].label = `Узел 1 (A₁ = ${A[0].toFixed(2)})`;
        
        distributionChart.data.datasets[1].data = p2;
        distributionChart.data.datasets[1].label = `Узел 2 (A₂ = ${A[1].toFixed(2)})`;
        
        distributionChart.data.datasets[2].data = p3;
        distributionChart.data.datasets[2].label = `Узел 3 (A₃ = ${A[2].toFixed(2)})`;
    } else {
        // Инициализация Chart.js при первой загрузке приложения
        const ctx = document.getElementById('distributionChart').getContext('2d');
        distributionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Узел 1 (A₁ = ${A[0].toFixed(2)})`,
                        data: p1,
                        borderColor: chartColors.node1.active.border,
                        backgroundColor: chartColors.node1.active.bg,
                        borderWidth: chartColors.node1.active.width,
                        pointBackgroundColor: chartColors.node1.active.border,
                        pointHoverRadius: 6,
                        tension: 0.25,
                        fill: true
                    },
                    {
                        label: `Узел 2 (A₂ = ${A[1].toFixed(2)})`,
                        data: p2,
                        borderColor: chartColors.node2.active.border,
                        backgroundColor: chartColors.node2.active.bg,
                        borderWidth: chartColors.node2.active.width,
                        pointBackgroundColor: chartColors.node2.active.border,
                        pointHoverRadius: 6,
                        tension: 0.25,
                        fill: true
                    },
                    {
                        label: `Узел 3 (A₃ = ${A[2].toFixed(2)})`,
                        data: p3,
                        borderColor: chartColors.node3.active.border,
                        backgroundColor: chartColors.node3.active.bg,
                        borderWidth: chartColors.node3.active.width,
                        pointBackgroundColor: chartColors.node3.active.border,
                        pointHoverRadius: 6,
                        tension: 0.25,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                weight: '600',
                                family: 'ui-sans-serif, system-ui, sans-serif'
                            },
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label.split(' ')[0]} ${context.dataset.label.split(' ')[1]}: P(${context.label}) = ${context.raw.toFixed(4)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        title: {
                            display: true,
                            text: 'Вероятность P(n)',
                            font: { size: 13, weight: '600' }
                        }
                    },
                    x: {
                        grid: { color: '#f1f5f9' },
                        title: {
                            display: true,
                            text: 'Количество требований в системе (n)',
                            font: { size: 13, weight: '600' }
                        }
                    }
                }
            }
        });
    }
}

/**
 * Исключает лавинообразные запросы к Flask при наборе текста (debounce)
 */
function onFormChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(sendRequestToFlask, 150);
}

// Регистрация обработчиков событий формы и фильтрации
document.addEventListener('DOMContentLoaded', () => {
    // Вешаем слушатели на инпуты для авторасчета
    const inputs = document.querySelectorAll('#parametersForm input');
    inputs.forEach(input => {
        input.addEventListener('input', onFormChange);
    });

    // Обработчик выпадающего списка выбора фокуса графика
    const filterSelect = document.getElementById('graphFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', applyDisplayFilterAndDraw);
    }
    
    // Делаем первичный расчет
    sendRequestToFlask();
});