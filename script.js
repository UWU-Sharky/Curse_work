let myChart;

function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

function poissonPMF(k, lambda) {
    return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function solveSystem() {
    const lam = parseFloat(document.getElementById('lam').value);
    const mu = parseFloat(document.getElementById('mu').value);
    const a10 = parseFloat(document.getElementById('a10').value);
    const a12 = parseFloat(document.getElementById('a12').value);
    const a20 = parseFloat(document.getElementById('a20').value);
    const a21 = parseFloat(document.getElementById('a21').value);
    const a23 = parseFloat(document.getElementById('a23').value);
    const a30 = parseFloat(document.getElementById('a30').value);
    const a32 = parseFloat(document.getElementById('a32').value);

    const C1 = mu + a10 + a12;
    const C2 = mu + a20 + a21 + a23;
    const C3 = mu + a30 + a32;
    
    const matrix = [
        [C1, -a21, 0],
        [-a12, C2, -a32],
        [0, -a23, C3]
    ];
    const rhs = [lam, 0, 0];

    try {
        const A = math.lusolve(matrix, rhs).map(x => x[0]);
        return A;
    } catch (e) {
        return null;
    }
}

function updateAll() {
    const A = solveSystem();
    const resultsDiv = document.getElementById('results');
    
    if (!A || A.some(val => val < 0)) {
        resultsDiv.innerHTML = "<p class='text-red-600 font-bold'>Ошибка: Система нестабильна или матрица вырождена.</p>";
        return;
    }

    resultsDiv.innerHTML = `
        <p><strong>Средние значения (A<sub>i</sub>):</strong></p>
        <p>A1: ${A[0].toFixed(4)}</p>
        <p>A2: ${A[1].toFixed(4)}</p>
        <p>A3: ${A[2].toFixed(4)}</p>
    `;

    const max_n = 20;
    const labels = Array.from({length: max_n + 1}, (_, i) => i);
    
    const data1 = labels.map(n => poissonPMF(n, A[0]));
    const data2 = labels.map(n => poissonPMF(n, A[1]));
    const data3 = labels.map(n => poissonPMF(n, A[2]));

    if (myChart) {
        myChart.data.datasets[0].data = data1;
        myChart.data.datasets[0].label = `Узел 1 (A1=${A[0].toFixed(2)})`;
        myChart.data.datasets[1].data = data2;
        myChart.data.datasets[1].label = `Узел 2 (A2=${A[1].toFixed(2)})`;
        myChart.data.datasets[2].data = data3;
        myChart.data.datasets[2].label = `Узел 3 (A3=${A[2].toFixed(2)})`;
        myChart.update();
    } else {
        initChart(labels, data1, data2, data3, A);
    }
}

function initChart(labels, data1, data2, data3, A) {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Узел 1 (A1=${A[0].toFixed(2)})`,
                    data: data1,
                    borderColor: '#3b82f6',
                    backgroundColor: '#3b82f6',
                    tension: 0.2,
                    fill: false
                },
                {
                    label: `Узел 2 (A2=${A[1].toFixed(2)})`,
                    data: data2,
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    tension: 0.2,
                    fill: false
                },
                {
                    label: `Узел 3 (A3=${A[2].toFixed(2)})`,
                    data: data3,
                    borderColor: '#10b981',
                    backgroundColor: '#10b981',
                    tension: 0.2,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Вероятность P(n)' }
                },
                x: {
                    title: { display: true, text: 'Количество заявок (n)' }
                }
            }
        }
    });
}

window.onload = updateAll;