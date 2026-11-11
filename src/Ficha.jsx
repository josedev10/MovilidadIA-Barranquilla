import { GraficoBases, GraficoGrupo, GraficoImportancia } from "./Graficos.jsx";

const NOMBRES = { via: "Vía", actor: "Tipo de víctima", dia: "Día" };

function Tabla({ filas, clave }) {
  if (!filas?.length) return null;
  return (
    <div className="sc">
      <table>
        <thead><tr><th>{NOMBRES[clave]}</th><th>Recall</th><th>Precisión</th><th>F1</th><th>Casos altos</th><th>Nota</th></tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f[clave]}><td>{f[clave]}</td><td>{f.recall}</td><td>{f.precision}</td><td>{f.f1}</td>
              <td>{f.casos_riesgo_alto_reales}</td><td>{f.advertencia}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Ficha({ m }) {
  const f = m.ficha || {};
  if (!f.nombre) return <div className="card">No hay ficha del modelo en modelo_web.json.</div>;
  const filaM = (n, x) => x && (
    <tr><td>{n}</td><td>{x.accuracy}</td><td>{x.precision}</td><td>{x.recall}</td><td>{x.f1}</td></tr>
  );

  return (
    <>
      <div className="card">
        <h2>{f.nombre} · v{f.version}</h2>
        <p className="mut">Entrenado: {f.fecha_entrenamiento} · Datos: {f.origen_datos} · Validación: {f.estrategia_validacion}</p>
        <p>{f.definicion_riesgo_alto}. <b>No usa:</b> {f.datos_no_usados}.</p>
      </div>

      <div className="card">
        <h2>Desempeño: modelo frente a líneas base</h2>
        <p className="mut">
          Se muestran precisión, recall y F1. La exactitud (accuracy) no se grafica porque engaña: como casi todo es riesgo bajo,
          «decir siempre bajo» ya acierta mucho pero no detecta ningún caso alto.
        </p>
        <GraficoBases f={f} />
        <details>
          <summary>Ver tabla completa</summary>
          <div className="sc">
            <table>
              <thead><tr><th></th><th>Accuracy</th><th>Precisión</th><th>Recall</th><th>F1</th></tr></thead>
              <tbody>
                {filaM("Modelo", f.metricas_modelo)}
                {filaM("Base: siempre riesgo bajo", f.metricas_base_siempre_riesgo_bajo)}
                {filaM("Base: repetir año anterior", f.metricas_base_repetir_anio_anterior)}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {m.importancia?.length > 0 && (
        <div className="card">
          <h2>Importancia de variables</h2>
          <p className="mut">Cuánto empeora el modelo al desordenar cada variable. Una barra gris (cerca de 0 o negativa) significa que casi no aporta.</p>
          <GraficoImportancia datos={m.importancia} />
        </div>
      )}

      {f.brechas_de_desempeno_detectadas?.length > 0 && (
        <div className="card">
          <h2>Brechas detectadas</h2>
          <ul>{f.brechas_de_desempeno_detectadas.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}

      {m.por_actor?.length > 0 && (
        <div className="card">
          <h2>Desempeño por tipo de víctima</h2>
          <GraficoGrupo filas={m.por_actor} clave="actor" />
          <details><summary>Ver tabla</summary><Tabla filas={m.por_actor} clave="actor" /></details>
        </div>
      )}

      {m.por_via?.length > 0 && (
        <div className="card">
          <h2>Desempeño por vía</h2>
          <GraficoGrupo filas={m.por_via} clave="via" horizontal tope={10} />
          <details><summary>Ver tabla</summary><Tabla filas={m.por_via} clave="via" /></details>
        </div>
      )}

      <div className="card">
        <h2>Limitaciones</h2>
        <ul>{f.limitaciones?.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
    </>
  );
}
