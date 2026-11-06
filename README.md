# MovilidadIA Barranquilla · Web (React + Vite)

Corre 100 % en el navegador: no necesita Python, Colab ni servidor.

## 1. Exportar el modelo (una sola vez)
Con la carpeta `salida/` que genera el cuaderno (hasta la sección 12) junto a `exportar_modelo.py`:

    pip install joblib pandas scikit-learn   # misma version de scikit-learn con que se entreno
    python exportar_modelo.py

Esto crea `salida/modelo_web.json`. Cópialo a `public/modelo_web.json`.
(En Colab: pega `exportar_modelo.py` en una celda tras la sección 12, ejecútala y descarga ese JSON.)

## 2. Ejecutar
    npm install
    npm run dev

Abre la URL que muestra Vite (normalmente http://localhost:5173).

## Notas
- `modelo_web.json` contiene la probabilidad exacta del Random Forest para cada combinación
  (vía × tipo de víctima × día); la explicación se calcula en `src/modelo.js` igual que en la sección 13.
- Si reentrenas el modelo, vuelve a exportar y reemplaza el JSON.
- `npm run build` genera `dist/`; abre `dist/` con un servidor estático (no con doble clic), porque la página carga el JSON con fetch.
