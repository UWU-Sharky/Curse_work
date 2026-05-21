import os
import numpy as np
from flask import Flask, render_template, request, jsonify
from scipy.stats import poisson

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():

    data = request.json or {}

    try:
        lam = float(data.get('lam', 5.0))
        mu = float(data.get('mu', 1.0))
        
        a10 = float(data.get('a10', 0.5))
        a12 = float(data.get('a12', 3.0))
        
        a20 = float(data.get('a20', 0.5))
        a21 = float(data.get('a21', 1.0))
        a23 = float(data.get('a23', 2.0))
        
        a30 = float(data.get('a30', 1.0))
        a32 = float(data.get('a32', 0.5))
        
        C1 = mu + a10 + a12
        C2 = mu + a20 + a21 + a23
        C3 = mu + a30 + a32
        
        M_T = np.array([
            [ C1,  -a21,    0],
            [-a12,  C2,  -a32],
            [   0, -a23,   C3]
        ])
        
        rhs = np.array([lam, 0, 0])
        
        A = np.linalg.solve(M_T, rhs)
        
        if np.any(A < 0):
            return jsonify({
                "error": "Система перегружена (A_i < 0). Интенсивность обслуживания меньше интенсивности входящего потока."
            }), 400
            
    except np.linalg.LinAlgError:
        return jsonify({
            "error": "Матрица системы вырождена. Не удалось рассчитать стационарный режим."
        }), 400
    except Exception as e:
        return jsonify({"error": f"Внутренняя ошибка сервера: {str(e)}"}), 400

    max_A = max(A)
    max_n = max(int(max_A * 6), 10)# Увеличиваем диапазон для отображения распределения    
    
    n_values = np.arange(0, max_n + 1)
    
    p1 = poisson.pmf(n_values, A[0]).tolist()
    p2 = poisson.pmf(n_values, A[1]).tolist()
    p3 = poisson.pmf(n_values, A[2]).tolist()

    return jsonify({
        "A": A.tolist(),
        "labels": n_values.tolist(),
        "p1": p1,
        "p2": p2,
        "p3": p3
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)