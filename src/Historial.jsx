import { registroCSV } from "./modelo.js";
import { CampoRevisor, Validacion } from "./Informe.jsx";

const pct = (x) => `${Math.round(x * 100)}%`;

export default function Historial({ historial, onValidar, onInforme, revisor, setRevisor }) {
  const cuenta = (e) => historial.filter((h) => (h.validacion || "pendiente") === e).length;

  const descargar = () => {
    const url = URL.createObjectURL(new Blob([registroCSV(historial)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "registro_decisiones.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <h2>Consultas de esta sesión</h2>
      {historial.length === 0 ? (
        <p className="mut">Aún no hay consultas.</p>
      ) : (
        <>
          <CampoRevisor revisor={revisor} onChange={setRevisor} />
          <p className="mut">
            Aprobadas: <b>{cuenta("aprobada")}</b> · Rechazadas: <b>{cuenta("rechazada")}</b> · Pendientes: <b>{cuenta("pendiente")}</b>
          </p>
          <div className="sc">
            <table>
              <thead>
                <tr><th>Hora</th><th>Vía</th><th>Víctima</th><th>Día</th><th>Prob.</th><th>Clase</th><th>Validación humana</th><th>Informe</th></tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td>{h.hora.replace("T", " ")}</td><td>{h.fila.via}</td><td>{h.fila.actor}</td><td>{h.fila.dia}</td>
                    <td>{pct(h.prob)}</td><td>{h.clase}</td>
                    <td><Validacion item={h} onValidar={onValidar} /></td>
                    <td><button className="sec" onClick={() => onInforme(h)}>🖨️ PDF</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="go" onClick={descargar}>Descargar registro_decisiones.csv</button>
        </>
      )}
      <p className="mut">
        El CSV refleja la decisión de cada consulta (aprobada, rechazada o pendiente) y la fecha en que se tomó.
        Las consultas se guardan solo mientras la página está abierta: descarga el CSV antes de cerrarla.
      </p>
    </div>
  );
}
