import { AVISO, fechaCorta, ranking } from "./modelo.js";

const NOMBRES = { via: "Vía", actor: "Tipo de víctima", dia: "Día" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (x) => `${Math.round(x * 100)}%`;
const ETIQUETA = { pendiente: "Pendiente de validación", aprobada: "Aprobada por una persona", rechazada: "Rechazada por una persona" };

// Botones de validación humana (pendiente / aprobada / rechazada)
export function Validacion({ item, onValidar }) {
  const e = item.validacion || "pendiente";
  return (
    <span className="valid">
      {e === "pendiente" ? (
        <>
          <button className="ok" onClick={() => onValidar(item.id, "aprobada")}>✓ Aprobar</button>
          <button className="no" onClick={() => onValidar(item.id, "rechazada")}>✗ Rechazar</button>
        </>
      ) : (
        <>
          <span className={`estado ${e}`}>{e === "aprobada" ? "Aprobada" : "Rechazada"}</span>
          {item.revisor && <span className="mut">por {item.revisor}</span>}
          <button className="sec" onClick={() => onValidar(item.id, "pendiente")}>Deshacer</button>
        </>
      )}
    </span>
  );
}

// Nombre opcional de quien valida; se guarda en la consulta al aprobarla o rechazarla
export function CampoRevisor({ revisor, onChange }) {
  return (
    <label className="campo-revisor">
      <span>Revisado por (opcional) · se registra al aprobar o rechazar</span>
      <input type="text" value={revisor} maxLength={60} placeholder="Nombre de quien valida"
        onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// Hoja de informe: invisible en pantalla, es lo único que se imprime (ver informe.css)
export function Informe({ m, item }) {
  const f = item.fila;
  const alto = item.prob >= 0.5;
  const rk = ranking(m, f.actor, f.dia).slice(0, 5);
  const lim = (m.ficha?.limitaciones || []).slice(0, 3);
  const estado = item.validacion || "pendiente";

  return (
    <div className="informe">
      <h1>Informe de consulta · MovilidadIA Barranquilla</h1>
      <p className="inf-meta">
        Generado: {item.hora.replace("T", " ")} · Modelo v{m.version} (Random Forest)
      </p>

      <table className="inf-t">
        <tbody>
          <tr><th>Vía</th><td>{cap(f.via)}</td><th>Tipo de víctima</th><td>{cap(f.actor)}</td><th>Día</th><td>{cap(f.dia)}</td></tr>
        </tbody>
      </table>

      <div className="inf-res" style={{ borderColor: alto ? "#c0392b" : "#2e8b57" }}>
        <b style={{ color: alto ? "#c0392b" : "#2e8b57" }}>{item.clase}</b>
        <span> · Probabilidad de que esta combinación sea de riesgo alto: <b>{pct(item.prob)}</b></span>
        <div className="inf-nota">
          Riesgo alto = {m.umbral} o más víctimas en esa combinación en un año. Se clasifica como alto con probabilidad de 50 % o más.
        </div>
      </div>

      <h2>¿Por qué?</h2>
      <p className="inf-nota">Efecto de cada variable frente al promedio de sus opciones (rojo sube la probabilidad, verde la baja).</p>
      {item.efectos.map((e) => (
        <div className="inf-fila" key={e.variable}>
          <span className="inf-n">{NOMBRES[e.variable]}: {cap(e.valor)}</span>
          <span className="inf-barra"><i style={{ width: `${Math.min(100, Math.abs(e.efecto) * 100)}%`, background: e.efecto > 0 ? "#c0392b" : "#2e8b57" }} /></span>
          <span className="inf-v">{Math.round(Math.abs(e.efecto) * 100) === 0 ? "0%" : `${e.efecto > 0 ? "+" : "−"}${pct(Math.abs(e.efecto))}`}</span>
        </div>
      ))}

      <h2>Comparación con otras vías</h2>
      <p className="inf-nota">Cinco vías con mayor probabilidad para «{cap(f.actor)}» el {f.dia}.</p>
      {rk.map((x) => (
        <div className="inf-fila" key={x.via}>
          <span className="inf-n" style={x.via === f.via ? { fontWeight: 700 } : null}>{cap(x.via)}</span>
          <span className="inf-barra"><i style={{ width: pct(x.prob), background: x.prob >= 0.5 ? "#c0392b" : "#2e8b57" }} /></span>
          <span className="inf-v">{pct(x.prob)}</span>
        </div>
      ))}

      <h2>Validación humana</h2>
      <p>
        Estado: <b>{ETIQUETA[estado]}</b>
        {item.validadoEn ? ` (${item.validadoEn.replace("T", " ")})` : ""}
      </p>
      <div className="inf-firma">
        <span>Revisado por: <span className="inf-linea">{item.revisor || ""}</span></span>
        <span>Fecha: <span className="inf-linea corta">{fechaCorta(item.validadoEn)}</span></span>
      </div>

      <h2>Aviso y limitaciones</h2>
      <p className="inf-aviso">{AVISO}</p>
      {lim.length > 0 && <ul>{lim.map((l) => <li key={l}>{l}</li>)}</ul>}
    </div>
  );
}
