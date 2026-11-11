// Asistente guiado: responde con los datos del modelo exportado (sin servidor ni IA generativa).
import { AVISO, consultar, probAlto } from "./modelo.js";

const norm = (s) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const pct = (x) => `${Math.round(x * 100)}%`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const NOMBRE = { via: "vía", actor: "tipo de víctima", dia: "día" };
const SIN = { motociclista: ["moto", "motos", "motero"], ciclista: ["bici", "bicicleta"], peaton: ["peatones"], conductor: ["conductores"] };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const BIENVENIDA = {
  texto:
    "¡Hola! Soy el asistente de MovilidadIA Barranquilla. No soy una IA generativa: respondo con los datos del modelo de riesgo vial. " +
    "Puedes preguntarme cosas o escribir una consulta, por ejemplo «motociclista en calle 70 el viernes».",
  sugerencias: ["¿Cómo uso la página?", "¿Qué significa riesgo alto?", "¿Qué vías son más riesgosas?", "¿Qué tan confiable es el modelo?"],
};

// Detecta vía, tipo de víctima y día mencionados en el texto (gana la coincidencia más larga).
function detectar(m, t) {
  const out = {};
  for (const c of Object.keys(NOMBRE)) {
    let mejor = null;
    for (const cat of m.categorias[c]) {
      const vars = [cat, cat + "s", cat + "es", ...(SIN[cat] || [])];
      if (vars.some((v) => new RegExp(`(^|[^a-z0-9])${esc(v)}($|[^a-z0-9])`).test(t)) && (!mejor || cat.length > mejor.length)) mejor = cat;
    }
    if (mejor) out[c] = mejor;
  }
  return out;
}

function media(m, filtro) {
  const L = (c) => (filtro[c] ? [filtro[c]] : m.categorias[c]);
  let s = 0, n = 0;
  for (const via of L("via")) for (const actor of L("actor")) for (const dia of L("dia")) { s += probAlto(m, { via, actor, dia }); n++; }
  return s / n;
}

const rankDim = (m, dim, filtro) =>
  m.categorias[dim].map((v) => ({ v, p: media(m, { ...filtro, [dim]: v }) })).sort((a, b) => b.p - a.p);

function textoFiltro(f) {
  const p = [];
  if (f.actor) p.push(cap(f.actor));
  if (f.via) p.push(cap(f.via));
  if (f.dia) p.push(f.dia);
  return p.length ? ` (${p.join(" · ")})` : "";
}

function textoRanking(m, dim, filtro) {
  const r = rankDim(m, dim, filtro);
  const lista = (dim === "dia" ? r : r.slice(0, 5)).map((x, i) => `${i + 1}. ${cap(x.v)} — ${pct(x.p)}`).join("\n");
  const prom = Object.keys(filtro).length < 2 ? " (promedio sobre las demás variables)" : "";
  let t = `Probabilidad de riesgo alto por ${NOMBRE[dim]}${textoFiltro(filtro)}${prom}:\n${lista}`;
  if (dim === "dia") t += "\n\nOjo: el día aporta muy poca información al modelo, así que las diferencias entre días son pequeñas.";
  return t;
}

function textoEfectos(r) {
  const l = r.efectos.map((e) => {
    const pts = Math.round(Math.abs(e.efecto) * 100);
    const acc = pts === 0 ? "casi no influye" : `${e.efecto > 0 ? "sube" : "baja"} la probabilidad (${pts} puntos)`;
    return `• ${cap(NOMBRE[e.variable])} «${cap(e.valor)}»: ${acc}`;
  });
  return l.join("\n");
}

export function responder(texto, m, ultima) {
  const t = norm(texto);
  const ent = detectar(m, t);
  const claves = Object.keys(ent);
  const sigue = ["¿Qué vías son más riesgosas?", "¿Qué tan confiable es el modelo?", "¿Cómo uso la página?"];

  // 1. Consulta completa escrita en lenguaje natural
  if (claves.length === 3) {
    const r = consultar(m, ent);
    return {
      consultar: ent,
      texto: `${cap(ent.via)} · ${ent.actor} · ${ent.dia}: ${r.clase}. La probabilidad de que esta combinación sea de riesgo alto es ${pct(r.prob)}.\n\nPor qué:\n${textoEfectos(r)}\n\nYa la dejé cargada en la pestaña Consulta.`,
      sugerencias: ["Explícame el resultado", "¿Qué significa riesgo alto?", "¿Qué tan confiable es el modelo?"],
    };
  }

  // 2. Explicar el último resultado
  if (/explic|por que|porque|resultado|interpret/.test(t)) {
    if (!ultima) return { texto: "Aún no hay un resultado. Haz una consulta en la pestaña Consulta, o escríbela aquí (por ejemplo «peatón en calle 70 el lunes»).", sugerencias: ["¿Cómo uso la página?"] };
    const f = ultima.fila;
    return {
      texto: `Tu última consulta fue ${cap(f.via)} · ${f.actor} · ${f.dia}: ${ultima.clase} (${pct(ultima.prob)} de probabilidad de riesgo alto; se clasifica como alto desde 50 %).\n\nQué pesó más:\n${textoEfectos(ultima)}\n\nEl efecto compara tu opción con el promedio de todas las opciones de esa variable.`,
      sugerencias: ["¿Qué día es más riesgoso?", "¿Qué vías son más riesgosas?", "¿Qué tan confiable es el modelo?"],
    };
  }

  // 3. Definición de riesgo alto
  if (/riesgo alto|riesgo bajo|umbral|significa|definicion|que es el riesgo/.test(t))
    return {
      texto: `Una combinación (vía, tipo de víctima, día) se considera de riesgo alto cuando, en un año, registra ${m.umbral} o más víctimas. El modelo estima la probabilidad de que eso ocurra y la clasifica como RIESGO ALTO si es de 50 % o más. Es riesgo relativo histórico, no una predicción de un accidente concreto.`,
      sugerencias: ["Explícame el resultado", "¿Qué variables influyen más?", "¿Cuáles son las limitaciones?"],
    };

  // 4. Importancia de variables
  if (/influy|importan|variable|pesa/.test(t) && m.importancia?.length) {
    const l = m.importancia.map((i) => `• ${cap(i.variable === "via" ? "vía" : i.variable === "actor" ? "tipo de víctima" : "día")}: ${i.importancia}`).join("\n");
    return { texto: `Importancia de cada variable (por permutación, mayor = más pesa):\n${l}\n\nSi el día queda cerca de 0 o negativo, el modelo casi no lo usa.`, sugerencias: ["¿Qué vías son más riesgosas?", "¿Qué tan confiable es el modelo?"] };
  }

  // 5. Métricas / confiabilidad
  if (/model|precision|recall|metric|confi|acert|exact|fiable|desempeno|evalu|funciona bien/.test(t)) {
    const f = m.ficha || {}, mm = f.metricas_modelo, b = f.metricas_base_repetir_anio_anterior;
    if (!mm) return { texto: "No encontré las métricas en modelo_web.json.", sugerencias: sigue };
    return {
      texto: `En el año de prueba (2025) el modelo detectó ${pct(mm.recall)} de las combinaciones de riesgo alto (recall) y acertó ${pct(mm.precision)} de las que marcó como altas (precisión); F1 = ${mm.f1}.\n` +
        (b ? `Comparación: simplemente repetir el año anterior da recall ${pct(b.recall)} y F1 ${b.f1}.\n` : "") +
        `\nLa exactitud global sola engaña: como la mayoría de combinaciones son de riesgo bajo, «decir siempre bajo» ya acierta ${pct(f.metricas_base_siempre_riesgo_bajo?.accuracy ?? 0)}. Mira la pestaña Ficha del modelo para el detalle por vía y tipo de víctima.`,
      sugerencias: ["¿Cuáles son las limitaciones?", "¿Qué datos usa el modelo?"],
    };
  }

  // 6. Limitaciones
  if (/limit|equivoc|sesgo|falla|problema|advertencia/.test(t)) {
    const l = (m.ficha?.limitaciones || []).slice(0, 5).map((x) => `• ${x}`).join("\n");
    return { texto: `Limitaciones principales:\n${l || "• Es una herramienta de apoyo; no sustituye el criterio humano."}\n\n${AVISO}`, sugerencias: ["¿Qué datos usa el modelo?", "¿Cómo uso la página?"] };
  }

  // 7. Datos y privacidad
  if (/dato|privacid|edad|sexo|direccion|personal/.test(t))
    return {
      texto: `El modelo usa conteos de víctimas por vía, tipo de víctima y día de la semana (${m.ficha?.origen_datos || "datos abiertos de accidentalidad"}). No usa dirección exacta, sexo, edad, gravedad ni clase de accidente, y trabaja con datos agregados, no con personas.`,
      sugerencias: ["¿Cuáles son las limitaciones?", "¿Qué tan confiable es el modelo?"],
    };

  // 8. Rankings
  if (/peligros|riesg|critic|ranking|top|mayor|peor|mas (alt|segur)|cual(es)? (via|vias|actor|victima|dia|dias)/.test(t)) {
    let dim = "via";
    if (/\bdias?\b/.test(t) && !ent.dia) dim = "dia";
    else if (/victima|actor|usuario|quien/.test(t) && !ent.actor) dim = "actor";
    const filtro = { ...ent };
    delete filtro[dim];
    return { texto: textoRanking(m, dim, filtro), sugerencias: ["¿Qué día es más riesgoso?", "¿Qué tipo de víctima tiene más riesgo?", "Explícame el resultado"] };
  }

  // 9. Guía de uso
  if (/como|ayuda|guia|usar|usa|empez|que puedo|hola|buen|gracias/.test(t))
    return {
      texto: "Así se usa:\n1. En Consulta elige una vía, un tipo de víctima y un día, y pulsa «Consultar».\n2. Verás la clasificación, la probabilidad y por qué (qué variable subió o bajó el riesgo).\n3. Abajo se compara esa consulta con todas las vías.\n4. En Ficha del modelo ves métricas y limitaciones; en Historial, tus consultas (con descarga en CSV).\n\nTambién puedes escribir aquí una consulta, como «peatón en calle 70 el lunes», o preguntar «¿qué vía es la más riesgosa para motociclistas?».",
      sugerencias: ["¿Qué significa riesgo alto?", "¿Qué vías son más riesgosas?", "¿Qué tan confiable es el modelo?"],
    };

  // 10. Consulta parcial: ranking de la dimensión que falta
  if (claves.length >= 1) {
    const dim = claves.length === 2 ? Object.keys(NOMBRE).find((c) => !ent[c]) : ent.via ? "actor" : "via";
    return {
      texto: textoRanking(m, dim, ent) + `\n\nSi quieres una consulta exacta, dime también ${claves.length === 2 ? "el " + NOMBRE[dim] : "los datos que faltan (vía, tipo de víctima y día)"}.`,
      sugerencias: ["¿Cómo uso la página?", "¿Qué significa riesgo alto?"],
    };
  }

  return { texto: "No te entendí bien. Puedo explicar el resultado, decirte qué vías o días son más riesgosos, resumir qué tan confiable es el modelo, o ejecutar una consulta como «motociclista en calle 70 el viernes».", sugerencias: BIENVENIDA.sugerencias };
}
