"""Exporta el modelo entrenado a public/modelo_web.json para la pagina React.
Uso A (Colab, despues de la seccion 12): pega este archivo en una celda y ejecutalo; descarga salida/modelo_web.json.
Uso B (local): python exportar_modelo.py   (con la carpeta 'salida' del cuaderno junto a este archivo).

Como el modelo solo usa 3 variables categoricas, se precalcula la probabilidad EXACTA del
Random Forest para todas las combinaciones (via x actor x dia): la web no necesita Python."""
import itertools, json, os
import joblib, pandas as pd

CARPETA = "salida"
FEATURES = ["via", "actor", "dia"]

m = joblib.load(os.path.join(CARPETA, "modelo.joblib"))
cats, pipe = m["categorias"], m["pipeline"]
combos = pd.DataFrame(list(itertools.product(*(cats[c] for c in FEATURES))), columns=FEATURES)
idx = list(pipe.classes_).index(1)
combos["p"] = pipe.predict_proba(combos[FEATURES])[:, idx].round(4)
tabla = {f"{r.via}|{r.actor}|{r.dia}": float(r.p) for r in combos.itertuples()}


def leer_csv(nombre):
    ruta = os.path.join(CARPETA, nombre)
    return json.loads(pd.read_csv(ruta).fillna("").to_json(orient="records")) if os.path.exists(ruta) else []


ruta_ficha = os.path.join(CARPETA, "ficha_modelo.json")
salida = {
    "version": m.get("version", "?"), "umbral": int(m["umbral"]), "categorias": cats, "tabla": tabla,
    "ficha": json.load(open(ruta_ficha, encoding="utf-8")) if os.path.exists(ruta_ficha) else {},
    "importancia": leer_csv("importancia_variables.csv"),
    "por_actor": leer_csv("metricas_por_actor.csv"),
    "por_via": leer_csv("metricas_por_via.csv"),
}
destino = os.path.join(CARPETA, "modelo_web.json")
json.dump(salida, open(destino, "w", encoding="utf-8"), ensure_ascii=False)
print("Listo:", destino, "|", len(tabla), "combinaciones")
