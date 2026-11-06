# MovilidadIA Barranquilla · Consulta web del modelo de riesgo vial

Aplicación web que permite consultar el modelo de **riesgo vial**. Dada una **vía**, un **tipo de víctima** y un **día de la semana**, la página indica si la combinación es de **riesgo alto o bajo**, la probabilidad estimada y **por qué** el modelo llegó a ese resultado.

> **Aviso:** es una herramienta de apoyo. Estima riesgo relativo a partir de datos históricos y puede equivocarse. No determina sanciones ni responsabilidades. Toda decisión (operativos, campañas, intervenciones) debe ser validada por una persona.

---

## 1. ¿Qué hace?

| Sección | Descripción |
|---|---|
| **Consulta** | Selecciona vía, tipo de víctima y día. Muestra la clasificación (RIESGO ALTO / BAJO), la probabilidad y el efecto de cada variable sobre el resultado. |
| **Comparación de vías** | Para el tipo de víctima y el día elegidos, muestra la probabilidad de riesgo alto en todas las vías. |
| **Ficha del modelo** | Métricas frente a dos líneas base, importancia de variables, desempeño por tipo de víctima y por vía, brechas detectadas y limitaciones. |
| **Historial** | Consultas de la sesión, con descarga de `registro_decisiones.csv` (validación humana en estado «pendiente»). |

---

## 2. Tecnologías utilizadas

**Modelo (cuaderno de Python, en Google Colab)**
- **Python** con **pandas** y **NumPy** para preparar los datos.
- **scikit-learn**: `RandomForestClassifier` (Breiman, 2001), `OneHotEncoder`, `ColumnTransformer`, `Pipeline` y `permutation_importance`.
- **joblib** para guardar el modelo entrenado.
- **Datos abiertos** de accidentalidad en Barranquilla (CSV de víctimas, 2018-2025).

**Aplicación web**
- **React 18**: interfaz y manejo de estado (`useState`, `useEffect`).
- **Vite 5**: servidor de desarrollo y compilación.
- **JavaScript (ES modules)**, **HTML** y **CSS** propio, con modo claro y oscuro automático.
- **Node.js y npm**: gestión de dependencias y scripts.

**Publicación**
- **GitHub Actions** y **GitHub Pages**: compilan y publican la página en cada `push`.

---

## 3. ¿Cómo funciona la implementación?

El modelo se entrena en Python, pero la página **no necesita Python ni servidor**. Esto es posible porque el modelo usa solo tres variables categóricas (`via`, `actor`, `dia`), así que existen pocas combinaciones posibles:

```
33 vías × 8 tipos de víctima × 7 días = 1.848 combinaciones
```

El flujo es:

```
Cuaderno (Colab)                       Aplicación web (navegador)
───────────────                        ──────────────────────────
Datos CSV                              public/modelo_web.json
   │                                          │
   ▼                                          ▼
Random Forest entrenado ──► celda de   React lee la tabla y calcula:
(scikit-learn)              exportación  · probabilidad de la consulta
                            (1.848       · explicación (efecto por variable)
                            probabilidades · ranking de vías
                            exactas)       · historial y CSV
```

1. **Entrenamiento:** el cuaderno construye un panel de conteos por año, vía, tipo de víctima y día. Define «riesgo alto» con un umbral (percentil 75 del entrenamiento, 3 o más víctimas), entrena el Random Forest con los años 2018-2024 y lo valida con 2025.
2. **Exportación:** una celda calcula con el modelo la probabilidad de riesgo alto de **todas** las combinaciones y las guarda en `modelo_web.json`, junto con la ficha, la importancia de variables y las métricas por grupo. Los valores son los del modelo real, no una aproximación.
3. **Consulta:** React busca la probabilidad de la combinación elegida. Si es de 0,5 o más, la clasifica como RIESGO ALTO.
4. **Explicación:** para cada variable, la app compara la probabilidad de la consulta con el **promedio** que se obtendría al probar todas las opciones de esa variable (misma lógica de la sección 13 del cuaderno). La diferencia indica cuánto sube o baja esa variable la probabilidad.

### Privacidad y transparencia
- El modelo **no usa** dirección exacta, sexo, edad, gravedad ni clase de accidente.
- Trabaja con conteos agregados, no con personas.
- Cada resultado incluye su explicación y el aviso de limitaciones.
- El historial puede descargarse con la columna `validacion_humana = pendiente`.

---

## 4. Estructura del proyecto

```
movilidad-react/
├── .github/workflows/deploy.yml   Flujo que compila y publica en GitHub Pages
├── public/
│   └── modelo_web.json            Modelo exportado (tabla de probabilidades y ficha)
├── src/
│   ├── main.jsx                   Punto de entrada de React
│   ├── App.jsx                    Interfaz (Consulta, Ficha, Historial)
│   ├── App.css                    Estilos
│   └── modelo.js                  Lógica: consulta, explicación, ranking, CSV
├── exportar_modelo.py             Alternativa local para exportar el modelo
├── index.html
├── package.json
├── vite.config.js
└── .gitignore
```

---

## 5. Instalación y ejecución local

### Requisitos
- [Node.js](https://nodejs.org) 18 o superior (incluye npm).
- Un editor como VS Code.

### Paso 1: obtener `modelo_web.json`
Ejecuta el cuaderno de Colab hasta la sección 12 (el modelo debe estar entrenado en esa sesión) y, en una celda nueva, ejecuta:

```python
import itertools, json, os
import pandas as pd

FEATURES = ["via", "actor", "dia"]
cats = modelo["categorias"]
combos = pd.DataFrame(list(itertools.product(*(cats[c] for c in FEATURES))), columns=FEATURES)
idx = list(pipe.classes_).index(1)
combos["p"] = pipe.predict_proba(combos[FEATURES])[:, idx].round(4)
tabla = {f"{r.via}|{r.actor}|{r.dia}": float(r.p) for r in combos.itertuples()}

def leer_csv(nombre):
    ruta = os.path.join(CARPETA_SALIDA, nombre)
    return json.loads(pd.read_csv(ruta).fillna("").to_json(orient="records")) if os.path.exists(ruta) else []

salida = {
    "version": modelo["version"], "umbral": int(modelo["umbral"]), "categorias": cats, "tabla": tabla,
    "ficha": json.load(open(os.path.join(CARPETA_SALIDA, "ficha_modelo.json"), encoding="utf-8")),
    "importancia": leer_csv("importancia_variables.csv"),
    "por_actor": leer_csv("metricas_por_actor.csv"),
    "por_via": leer_csv("metricas_por_via.csv"),
}
destino = os.path.join(CARPETA_SALIDA, "modelo_web.json")
json.dump(salida, open(destino, "w", encoding="utf-8"), ensure_ascii=False)

from google.colab import files
files.download(destino)
```

Copia el archivo descargado a `public/modelo_web.json`.

> **Importante:** haz la exportación en Colab. Si intentas cargar `modelo.joblib` en tu computador con otra versión de scikit-learn, fallará con un `InconsistentVersionWarning` o un `AttributeError`. `exportar_modelo.py` solo sirve si tu versión local de scikit-learn es idéntica a la usada para entrenar.

### Paso 2: instalar y ejecutar
En la terminal, dentro de la carpeta del proyecto:

```bash
npm install
npm run dev
```

Abre la dirección que muestra Vite (normalmente http://localhost:5173).

### Otros comandos
| Comando | Función |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente para probarlo |

---

## 6. Publicación en GitHub Pages

1. Crea un repositorio en GitHub y sube el proyecto. Asegúrate de que `package.json` y `.github` queden en la **raíz** del repositorio.
2. Verifica que exista un archivo `.gitignore` con estas líneas, para no subir carpetas generadas:
   ```
   node_modules
   dist
   ```
3. En `vite.config.js`, la opción `base: "./"` permite que los archivos carguen dentro de `usuario.github.io/repositorio/`.
4. En GitHub: **Settings → Pages → Source → GitHub Actions**.
5. Haz `git push`. El flujo de `.github/workflows/deploy.yml` instala dependencias, compila y publica.
6. La página queda en `https://TU_USUARIO.github.io/NOMBRE_REPO/`. Puedes ver el progreso en la pestaña **Actions**.

---

## 7. Solución de problemas

| Problema | Causa y solución |
|---|---|
| La página muestra «No se encontró public/modelo_web.json» | Falta el archivo. Genéralo (paso 1) y colócalo en `public/`. |
| Página en blanco en GitHub Pages | Source no está en «GitHub Actions», o falta `base: "./"` en `vite.config.js`. |
| `vite: Permission denied` en GitHub Actions | La carpeta `node_modules` se subió al repositorio. Agrégala a `.gitignore` y ejecuta `git rm -r --cached node_modules`. |
| `InconsistentVersionWarning` o `AttributeError` al cargar `modelo.joblib` | Versiones distintas de scikit-learn. Exporta el modelo desde Colab. |

---

## 8. Limitaciones

- Estima **riesgo relativo histórico**; no predice un siniestro individual.
- El conjunto de datos **no trae hora ni zona**: se usa el día de la semana y la vía se deduce de la dirección con una regla aproximada.
- Depende de la calidad y cobertura del registro oficial (posible subregistro).
- No incluye volumen de tráfico, clima ni estado de la vía.
- Los resultados de grupos con pocos casos son poco confiables (ver «Ficha del modelo»).
- La explicación muestra el peso de cada variable, pero **no prueba causas**.
- No debe usarse para sancionar personas, solo para orientar acciones de prevención.

---

## 9. Referencias

- Breiman, L. (2001). Random forests. *Machine Learning, 45*(1), 5-32.
- Pedregosa, F., et al. (2011). Scikit-learn: Machine learning in Python. *Journal of Machine Learning Research, 12*, 2825-2830.
