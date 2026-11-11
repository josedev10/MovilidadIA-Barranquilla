import { useEffect, useRef, useState } from "react";
import { BIENVENIDA, responder } from "./bot.js";

export default function Asistente({ m, ultima, onConsulta }) {
  const [abierto, setAbierto] = useState(false);
  const [msgs, setMsgs] = useState([{ de: "bot", texto: BIENVENIDA.texto }]);
  const [sug, setSug] = useState(BIENVENIDA.sugerencias);
  const [txt, setTxt] = useState("");
  const caja = useRef(null);

  useEffect(() => {
    if (caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [msgs, abierto]);

  const enviar = (t) => {
    const q = t.trim();
    if (!q) return;
    const r = responder(q, m, ultima);
    if (r.consultar) onConsulta(r.consultar);
    setMsgs((p) => [...p, { de: "yo", texto: q }, { de: "bot", texto: r.texto }]);
    setSug(r.sugerencias || []);
    setTxt("");
  };

  return (
    <>
      {abierto && (
        <div className="bot-panel" role="dialog" aria-label="Asistente">
          <div className="bot-cab">
            <b>Asistente</b>
            <button onClick={() => setAbierto(false)} aria-label="Cerrar asistente">✕</button>
          </div>
          <div className="bot-msgs" ref={caja}>
            {msgs.map((x, i) => <div key={i} className={`msg ${x.de}`}>{x.texto}</div>)}
          </div>
          <div className="bot-sug">
            {sug.map((s) => <button key={s} onClick={() => enviar(s)}>{s}</button>)}
          </div>
          <form className="bot-in" onSubmit={(e) => { e.preventDefault(); enviar(txt); }}>
            <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Escribe tu pregunta…" />
            <button type="submit">Enviar</button>
          </form>
        </div>
      )}
      <button className="bot-fab" onClick={() => setAbierto(!abierto)}>💬 Asistente</button>
    </>
  );
}
