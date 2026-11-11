import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const NOMBRES = { via: "Vía", actor: "Tipo de víctima", dia: "Día" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const num = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const porc = (v) => `${Math.round(v * 100)}%`;

// Lee los colores del tema (modo claro u oscuro) y se actualiza al cambiar de tema.
function leerColores() {
  const s = getComputedStyle(document.documentElement);
  const g = (n) => s.getPropertyValue(n).trim();
  return { tx: g("--tx"), mut: g("--mut"), bd: g("--bd"), ac: g("--ac"), card: g("--card") };
}
function useColores() {
  const [c, setC] = useState(leerColores);
  useEffect(() => {
    const o = new MutationObserver(() => setC(leerColores()));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => o.disconnect();
  }, []);
  return c;
}

const tooltipEstilo = (c) => ({
  contentStyle: { background: c.card, border: `1px solid ${c.bd}`, borderRadius: 8, color: c.tx },
  labelStyle: { color: c.tx, fontWeight: 600 },
  itemStyle: { color: c.tx },
  cursor: { fill: c.bd, opacity: 0.35 },
});
const leyenda = (c) => ({ formatter: (v) => <span style={{ color: c.tx }}>{v}</span> });

// 1. Modelo frente a las líneas base (precisión, recall y F1)
export function GraficoBases({ f }) {
  const c = useColores();
  const filas = [["precision", "Precisión"], ["recall", "Recall"], ["f1", "F1"]].map(([k, nombre]) => ({
    nombre,
    modelo: num(f.metricas_modelo?.[k]),
    siempre: num(f.metricas_base_siempre_riesgo_bajo?.[k]),
    anterior: num(f.metricas_base_repetir_anio_anterior?.[k]),
  }));
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={filas} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid stroke={c.bd} vertical={false} />
          <XAxis dataKey="nombre" stroke={c.mut} tick={{ fill: c.tx, fontSize: 13 }} />
          <YAxis domain={[0, 1]} tickFormatter={porc} stroke={c.mut} tick={{ fill: c.mut, fontSize: 12 }} />
          <Tooltip {...tooltipEstilo(c)} formatter={(v) => (v == null ? "—" : v.toFixed(3))} />
          <Legend {...leyenda(c)} />
          <Bar dataKey="modelo" name="Modelo" fill={c.ac} radius={[4, 4, 0, 0]} />
          <Bar dataKey="anterior" name="Base: repetir año anterior" fill="#e0a030" radius={[4, 4, 0, 0]} />
          <Bar dataKey="siempre" name="Base: siempre riesgo bajo" fill={c.mut} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 2. Importancia de variables (barras horizontales; gris si no aporta)
export function GraficoImportancia({ datos }) {
  const c = useColores();
  const d = datos.map((i) => ({ nombre: NOMBRES[i.variable] || i.variable, valor: num(i.importancia) ?? 0 }));
  return (
    <div style={{ width: "100%", height: 60 + d.length * 52 }}>
      <ResponsiveContainer>
        <BarChart data={d} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
          <CartesianGrid stroke={c.bd} horizontal={false} />
          <XAxis type="number" stroke={c.mut} tick={{ fill: c.mut, fontSize: 12 }} />
          <YAxis type="category" dataKey="nombre" width={120} stroke={c.mut} tick={{ fill: c.tx, fontSize: 13 }} />
          <ReferenceLine x={0} stroke={c.mut} />
          <Tooltip {...tooltipEstilo(c)} formatter={(v) => v.toFixed(4)} />
          <Bar dataKey="valor" name="Importancia" radius={[0, 4, 4, 0]}>
            {d.map((x) => <Cell key={x.nombre} fill={x.valor > 0.005 ? c.ac : c.mut} />)}
            <LabelList dataKey="valor" position="right" formatter={(v) => v.toFixed(3)} fill={c.tx} fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 3. Métricas por grupo (tipo de víctima o vía)
export function GraficoGrupo({ filas, clave, horizontal = false, tope = 0 }) {
  const c = useColores();
  const [todas, setTodas] = useState(false);
  if (!filas?.length) return null;

  const ordenadas = [...filas].sort((a, b) => (num(b.casos_riesgo_alto_reales) ?? 0) - (num(a.casos_riesgo_alto_reales) ?? 0));
  const vis = tope && !todas ? ordenadas.slice(0, tope) : ordenadas;
  const d = vis.map((r) => ({
    nombre: `${cap(String(r[clave]))}${r.advertencia ? " *" : ""}`,
    precision: num(r.precision),
    recall: num(r.recall),
    f1: num(r.f1),
    casos: r.casos_riesgo_alto_reales,
  }));
  const hayAdv = vis.some((r) => r.advertencia);
  const alto = horizontal ? 80 + d.length * 52 : 340;
  const fmt = (v) => (v == null ? "—" : v.toFixed(2));

  return (
    <>
      <div style={{ width: "100%", height: alto }}>
        <ResponsiveContainer>
          <BarChart data={d} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 10, right: 20, left: horizontal ? 10 : 0, bottom: 5 }}>
            <CartesianGrid stroke={c.bd} vertical={horizontal} horizontal={!horizontal} />
            {horizontal
              ? <XAxis type="number" domain={[0, 1]} tickFormatter={porc} stroke={c.mut} tick={{ fill: c.mut, fontSize: 12 }} />
              : <XAxis dataKey="nombre" stroke={c.mut} tick={{ fill: c.tx, fontSize: 12 }} interval={0} />}
            {horizontal
              ? <YAxis type="category" dataKey="nombre" width={140} stroke={c.mut} tick={{ fill: c.tx, fontSize: 12 }} interval={0} />
              : <YAxis domain={[0, 1]} tickFormatter={porc} stroke={c.mut} tick={{ fill: c.mut, fontSize: 12 }} />}
            <Tooltip {...tooltipEstilo(c)} formatter={fmt} labelFormatter={(l, p) => `${l}${p?.[0] ? ` · ${p[0].payload.casos} casos altos reales` : ""}`} />
            <Legend {...leyenda(c)} />
            <Bar dataKey="precision" name="Precisión" fill="#e0a030" radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} />
            <Bar dataKey="recall" name="Recall" fill={c.ac} radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} />
            <Bar dataKey="f1" name="F1" fill="#9b72cf" radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hayAdv && <p className="mut">* Pocos casos de riesgo alto reales: las métricas de ese grupo no son confiables.</p>}
      {tope > 0 && ordenadas.length > tope && (
        <button className="sec" onClick={() => setTodas(!todas)}>
          {todas ? `Mostrar solo las ${tope} con más casos` : `Mostrar las ${ordenadas.length} (ordenadas por casos altos)`}
        </button>
      )}
    </>
  );
}
