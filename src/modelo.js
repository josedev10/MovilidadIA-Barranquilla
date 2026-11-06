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

export function registroCSV(historial) {
  const cab = ["fecha_hora", "via", "actor", "dia", "prob_riesgo_alto", "clasificacion", "version_modelo", "validacion_humana"];
  const filas = historial.map((h) =>
    [h.hora, h.fila.via, h.fila.actor, h.fila.dia, h.prob.toFixed(3), h.clase, h.version, "pendiente"].join(",")
  );
  return [cab.join(","), ...filas].join("\n");
}
