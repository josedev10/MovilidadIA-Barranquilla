// Misma logica que la seccion 13 del cuaderno (consultar / explicar_prediccion), sobre la tabla exportada.
export const FEATURES = ["via", "actor", "dia"];

export const AVISO =
  "AVISO: esta es una herramienta de APOYO. Estima riesgo relativo a partir de datos historicos y puede equivocarse. " +
  "No determina sanciones ni responsabilidades. Toda decision (operativos, campanas, intervenciones) debe ser validada por una persona.";

export const probAlto = (m, f) => m.tabla[`${f.via}|${f.actor}|${f.dia}`];

export function explicar(m, fila) {
  const base = probAlto(m, fila);
  const efectos = FEATURES.map((c) => {
    const probs = m.categorias[c].map((op) => probAlto(m, { ...fila, [c]: op }));
    const media = probs.reduce((a, b) => a + b, 0) / probs.length;
    return { variable: c, valor: fila[c], efecto: base - media };
  });
  efectos.sort((a, b) => Math.abs(b.efecto) - Math.abs(a.efecto));
  return { prob: base, efectos };
}

export function consultar(m, fila) {
  const { prob, efectos } = explicar(m, fila);
  return { fila, prob, efectos, clase: prob >= 0.5 ? "RIESGO ALTO" : "RIESGO BAJO" };
}

export function ranking(m, actor, dia) {
  return m.categorias.via
    .map((via) => ({ via, prob: probAlto(m, { via, actor, dia }) }))
    .sort((a, b) => b.prob - a.prob);
}

// Fecha y hora local (Colombia) en formato ISO sin zona, p. ej. 2026-11-10T14:05:30
export const ahora = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
};

// 2026-11-10T14:05:30 -> 10/11/2026
export const fechaCorta = (iso) => {
  const [y, mo, d] = String(iso || "").slice(0, 10).split("-");
  return y && mo && d ? `${d}/${mo}/${y}` : "";
};

const celda = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Mismo formato del registro del cuaderno, con la decision humana real (pendiente / aprobada / rechazada).
export function registroCSV(historial) {
  const cab = ["fecha_hora", "via", "actor", "dia", "prob_riesgo_alto", "clasificacion", "version_modelo", "validacion_humana", "revisado_por", "fecha_validacion"];
  const filas = historial.map((h) =>
    [h.hora, h.fila.via, h.fila.actor, h.fila.dia, h.prob.toFixed(3), h.clase, h.version, h.validacion || "pendiente", h.revisor || "", h.validadoEn || ""]
      .map(celda)
      .join(",")
  );
  return [cab.join(","), ...filas].join("\n");
}
