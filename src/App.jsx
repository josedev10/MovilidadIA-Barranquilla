import { useEffect, useState } from "react";
import { AVISO, ahora, consultar, ranking, registroCSV } from "./modelo.js";
import Asistente from "./Asistente.jsx";
import Historial from "./Historial.jsx";
import { CampoRevisor, Informe, Validacion } from "./Informe.jsx";
import Ficha from "./Ficha.jsx";

const NOMBRES = { via: "Vía", actor: "Tipo de víctima", dia: "Día" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (x) => `${Math.round(x * 100)}%`;
const color = (p) => (p >= 0.5 ? "var(--alto)" : "var(--bajo)");

function Barra({ valor, color: c }) {
  return (
    <div className="bar">
      <i style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%`, background: c }} />
    </div>
  );
}

function Fila({ nombre, valor, color: c, texto, negrita }) {
  return (
    <div className="row">
      <span className="n" style={negrita ? { fontWeight: 700 } : null}>{nombre}</span>
      <span className="b"><Barra valor={valor} color={c} /></span>
      <span className="v">{texto}</span>
    </div>
  );
}

function Consulta({ m, onResultado, historial, onValidar, onInforme, revisor, setRevisor }) {
  const [sel, setSel] = useState({
    via: m.categorias.via[0],
    actor: m.categorias.actor.includes("motociclista") ? "motociclista" : m.categorias.actor[0],
    dia: "viernes",
});

  const r = historial[0]?.fila ? historial[0] : null;
  const rk = r ? ranking(m, r.fila.actor, r.fila.dia) : [];

  return (
    <>
      <div className="card">
        <div className="grid">
          {Object.keys(NOMBRES).map((c) => (
            <div key={c}>
              <label htmlFor={c}>{NOMBRES[c]}</label>
              <select id={c} value={sel[c]} onChange={(e) => setSel({ ...sel, [c]: e.target.value })}>
                {m.categorias[c].map((v) => <option key={v} value={v}>{cap(v)}</option>)}
              </select>
            </div>
          ))}
        </div>
        <button className="go" onClick={() => onResultado(consultar(m, sel))}>Consultar</button>
        <p className="mut">
          Riesgo alto = {m.umbral} o más víctimas en esa combinación (vía, tipo de víctima, día) y año · Modelo v{m.version}
        </p>
      </div>

      {r && (
        <>
          <div className="card">
            <h2>Resultado</h2>
            <p>
              <span className="badge" style={{ background: color(r.prob) }}>{r.clase}</span>
            </p>
            <p>
              Probabilidad de que esta combinación sea de <b>riesgo alto</b>: <b>{pct(r.prob)}</b>
            </p>
            <Barra valor={r.prob} color={color(r.prob)} />
            <p className="mut">
              {r.prob >= 0.5
                ? "Se clasifica como RIESGO ALTO porque la probabilidad es de 50 % o más."
                : "Se clasifica como RIESGO BAJO porque la probabilidad es menor a 50 %."}
            </p>
            <h2 style={{ marginTop: 16 }}>¿Por qué?</h2>
            <p className="mut">Efecto de cada variable frente al promedio de sus opciones.</p>
            {r.efectos.map((e) => (
              <Fila key={e.variable} nombre={`${NOMBRES[e.variable]}: ${cap(e.valor)}`} valor={Math.abs(e.efecto)}
                color={e.efecto > 0 ? "var(--alto)" : "var(--bajo)"}
                texto={Math.round(Math.abs(e.efecto) * 100) === 0 ? "0%" : `${e.efecto > 0 ? "+" : "−"}${pct(Math.abs(e.efecto))}`} />
            ))}
            <p className="mut">Rojo: sube la probabilidad · Verde: la baja.</p>
            <div className="aviso">{AVISO}</div>
              
              <div className="acciones">
                <CampoRevisor revisor={revisor} onChange={setRevisor} />
                <Validacion item={r} onValidar={onValidar} />
                <button className="sec" onClick={() => onInforme(r)}>🖨️ Informe / PDF</button>
              </div>

          </div>
          <div className="card">
            <h2>Comparación: todas las vías</h2>
            <p className="mut">«{cap(r.fila.actor)}» el {r.fila.dia}.</p>
            {rk.map((x) => (
              <Fila key={x.via} nombre={cap(x.via)} valor={x.prob} color={color(x.prob)} texto={pct(x.prob)}
                negrita={x.via === r.fila.via} />
            ))}
          </div>
        </>
      )}
    </>
  );
}




export default function App() {
  const [m, setM] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("q");
  const [historial, setHistorial] = useState([]);

  const [informe, setInforme] = useState(null);

    useEffect(() => {
        if (!informe) return;
        const titulo = document.title;
        const f = informe.fila;
        document.title = `Informe riesgo vial - ${f.via} - ${f.actor} - ${f.dia}`;
        const t = setTimeout(() => window.print(), 100);
        const limpiar = () => setInforme(null);
        window.addEventListener("afterprint", limpiar);
        return () => {
          clearTimeout(t);
          window.removeEventListener("afterprint", limpiar);
          document.title = titulo;
        };
      }, [informe]);

    const [revisor, setRevisor] = useState(() => {
     try { return localStorage.getItem("revisor") || ""; } catch { return ""; }
   });
   useEffect(() => {
     try { localStorage.setItem("revisor", revisor); } catch {}
   }, [revisor]);

  const [tema, setTema] = useState(() => {
      
    try {
        const guardado = localStorage.getItem("tema");
        if (guardado) return guardado;
      } catch {}
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });

    useEffect(() => {
      document.documentElement.setAttribute("data-theme", tema);
      try { localStorage.setItem("tema", tema); } catch {}
    }, [tema]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}modelo_web.json`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setM)
      .catch(() => setError("No se encontró public/modelo_web.json. Genera el archivo con exportar_modelo.py y cópialo en la carpeta public (ver README)."));
  }, []);

  const onResultado = (r) =>
     setHistorial((h) => [
       { ...r, id: Date.now() + Math.random(), hora: ahora(), version: m.version, validacion: "pendiente", validadoEn: null },
       ...h,
     ]);

  const validar = (id, estado) =>
     setHistorial((h) =>
       h.map((x) =>
         x.id === id
           ? { ...x, validacion: estado, revisor: estado === "pendiente" ? "" : revisor.trim(), validadoEn: estado === "pendiente" ? null : ahora() }
           : x
       )
  );

  const onConsultaBot = (fila) => {
    onResultado(consultar(m, fila));
    setTab("q");
  };

  return (
    <>
      <header>
        <div>
          <h1>MovilidadIA Barranquilla</h1>
          <p>Consulta el modelo de riesgo vial (Random Forest) con explicación de cada resultado.</p>
        </div>
        <button
          className="tema"
          onClick={() => setTema(tema === "dark" ? "light" : "dark")}
          aria-label="Cambiar entre modo claro y oscuro"
        >
          {tema === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
        </button>
      </header>
      <nav>
        {[["q", "Consulta"], ["f", "Ficha del modelo"], ["h", "Historial"]].map(([k, t]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{t}</button>
        ))}
      </nav>
      <main>
        {error && <div className="card err">{error}</div>}
        {!m && !error && <div className="card">Cargando modelo…</div>}
        {m && tab === "q" && <Consulta m={m} onResultado={onResultado} historial={historial} onValidar={validar} onInforme={setInforme} revisor={revisor} setRevisor={setRevisor} />}
        {m && tab === "f" && <Ficha m={m} />}
        {m && tab === "h" && <Historial historial={historial} onValidar={validar} onInforme={setInforme} revisor={revisor} setRevisor={setRevisor} />}
        {m && <Asistente m={m} ultima={historial[0]} onConsulta={onConsultaBot} />}
        </main>
        {informe && <Informe m={m} item={informe} />}
    </>
  );
}
