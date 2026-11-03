import { app, h, text } from "hyperapp";
import {
  create,
  explore,
  flag,
  chord,
  record,
  readSave,
  expeditions,
  nextSeed,
} from "./model.js";
import "./style.css";
const e = (tag, props, ...children) =>
  h(
    tag,
    props || {},
    children
      .flat(Infinity)
      .filter((c) => c !== false && c !== null && c !== undefined)
      .map((c) =>
        typeof c === "string" || typeof c === "number" ? text(String(c)) : c,
      ),
  );
let save = readSave(null);
try {
  save = readSave(localStorage.getItem("fresta.save.v1"));
} catch {}
const dialog = document.querySelector("#dialog");
let audio = null,
  voices = 0,
  opener = null;
const Persist = (_, save) => {
  try {
    localStorage.setItem("fresta.save.v1", JSON.stringify(save));
  } catch {}
  document.body.classList.toggle("reduced", save.motion);
};
const Focus = () =>
  document.querySelector("#board")?.focus({ preventScroll: true });
const Tone = (_, win) => {
  if (voices >= 4) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const o = audio.createOscillator(),
      gain = audio.createGain();
    o.frequency.value = win ? 587 : 220;
    gain.gain.setValueAtTime(0.02, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    o.connect(gain).connect(audio.destination);
    voices++;
    o.onended = () => {
      voices--;
      o.disconnect();
      gain.disconnect();
    };
    o.start();
    o.stop(audio.currentTime + 0.13);
  } catch {}
};
function finish(s, g, selected = s.selected) {
  if (s.paused || g === s.g) return s;
  const ended = g.status === "won" || g.status === "lost";
  let save = s.save;
  const fx = [];
  if (ended && s.g.status !== "won" && s.g.status !== "lost") {
    save = record(save, g);
    fx.push([Persist, save]);
  }
  if (save.sound) fx.push([Tone, g.status === "won"]);
  return [
    {
      ...s,
      g,
      selected,
      save,
      message:
        g.status === "won"
          ? "Terreno seguro mapeado. Expedição concluída."
          : g.status === "lost"
            ? "Uma fenda foi explorada. Você pode repetir este mapa ou gerar outro."
            : g.mines
              ? "Leia os números e mantenha suas hipóteses sob revisão."
              : "A primeira exploração e suas vizinhas serão seguras.",
    },
    ...fx,
  ];
}
const Explore = (s, i) => finish(s, explore(s.g, i), i);
const Mark = (s, i) => finish(s, flag(s.g, i), i);
const Chord = (s, i) => {
  if (s.paused) return s;
  const g = chord(s.g, i);
  return g === s.g
    ? {
        ...s,
        message:
          "Para abrir vizinhas, escolha um número aberto com igual quantidade de bandeiras ao redor.",
      }
    : finish(s, g, i);
};
const Click = (s, i) => {
  if (s.paused) return s;
  const g = (s.tool === "flag" ? flag : explore)(s.g, i);
  return g === s.g ? { ...s, selected: i } : finish(s, g, i);
};
const Context = (s, event) => {
  event.preventDefault();
  return Mark(s, Number(event.currentTarget.dataset.index));
};
const Tool = (s, tool) => ({
  ...s,
  tool,
  message:
    tool === "flag"
      ? "Ferramenta de bandeira: toque para marcar ou desmarcar."
      : "Ferramenta de exploração: toque para revelar terreno.",
});
const Move = (s, dir) => {
  if (s.paused) return s;
  const x = s.selected % s.g.width,
    y = Math.floor(s.selected / s.g.width),
    dx = { left: -1, right: 1, up: 0, down: 0 }[dir],
    dy = { left: 0, right: 0, up: -1, down: 1 }[dir];
  return [
    {
      ...s,
      selected:
        Math.max(0, Math.min(s.g.height - 1, y + dy)) * s.g.width +
        Math.max(0, Math.min(s.g.width - 1, x + dx)),
    },
    Focus,
  ];
};
const Key = (s, event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return s;
  const k = event.key.toLowerCase(),
    d = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
    }[k];
  if (d) {
    event.preventDefault();
    return Move(s, d);
  }
  if (event.repeat) return s;
  if (["enter", " ", "f", "c", "escape", "p"].includes(k))
    event.preventDefault();
  if (k === "enter" || k === " ") return Explore(s, s.selected);
  if (k === "f") return Mark(s, s.selected);
  if (k === "c") return Chord(s, s.selected);
  if (k === "escape" || k === "p") return Pause(s, "pause");
  return s;
};
const Reset = (s, { config = s.g.config, fresh = false } = {}) => {
  if (s.paused) return s;
  const seed =
    config !== s.g.config
      ? expeditions[config].seed
      : fresh
        ? nextSeed(s.g.seed)
        : s.g.seed;
  return [
    {
      ...s,
      g: create(config, seed),
      selected: 0,
      tool: "explore",
      message:
        "Novo início. Escolha qualquer ponto; a primeira região será segura.",
    },
    Focus,
  ];
};
const Preference = (s, key) => {
  const save = { ...s.save, [key]: !s.save[key] };
  return [{ ...s, save }, [Persist, save]];
};
const Modal = (_, kind) => {
  opener = document.activeElement;
  const body = document.querySelector("#dialog-body");
  body.replaceChildren();
  document.querySelector("#dialog-title").textContent =
    kind === "help" ? "Leia o gelo antes de avançar." : "O gelo pode esperar.";
  const lines =
    kind === "help"
      ? [
          "Explore todo terreno seguro sem revelar uma fenda. O número de uma casa mostra quantas fendas há nas suas oito vizinhas, incluindo diagonais. Zero abre automaticamente a região e sua borda.",
          "A primeira exploração e suas vizinhas são seguras. Depois disso pode haver situações que exigem arriscar: o gerador não garante solução somente por lógica.",
          "Bandeiras são hipóteses, não confirmações. Uma casa marcada não abre nem propaga zeros. O limite de bandeiras é o número de fendas do mapa. Não é preciso marcar todas para vencer.",
          "Escolha a ferramenta Explorar ou Marcar e toque nas casas. Botão direito também marca. Com a área focada: setas/WASD movem a seleção; Enter/Espaço explora, F marca, C abre vizinhas. Há botões grandes equivalentes, úteis em telas pequenas.",
          "Abrir vizinhas num número aberto exige igual quantidade de bandeiras ao redor. Todas as vizinhas não marcadas serão exploradas; uma bandeira errada pode causar derrota.",
          "Repetir mapa mantém seed e formato. Novo mapa troca seed. Reiniciar abandona a tentativa sem registrar resultado. Recordes locais são separados por formato, mas mapas diferentes podem exigir quantidades de ações diferentes. Não há cronômetro.",
          "Escape/P pausa, e a perda de foco também. Preferências e resultados ficam neste navegador; a expedição em andamento não é salva.",
        ]
      : [
          "O mapa está pausado. Nenhuma casa pode ser explorada até você voltar.",
        ];
  for (const line of lines) {
    const p = document.createElement("p");
    p.textContent = line;
    body.append(p);
  }
  dialog.showModal();
};
function Pause(s, kind = "pause") {
  if (s.paused) return s;
  return [{ ...s, paused: true }, [Modal, kind]];
}
const Close = () => {
  dialog.close();
  if (opener?.isConnected) opener.focus({ preventScroll: true });
  else Focus();
};
const Resume = (s) => [{ ...s, paused: false }, Close];
const coords = (g, i) =>
  `L${Math.floor(i / g.width) + 1} C${(i % g.width) + 1}`;
function label(g, i) {
  if (g.status === "lost" && g.mines[i])
    return `${coords(g, i)}: fenda${g.exploded === i ? ", explorada" : ""}`;
  if (g.flags[i])
    return `${coords(g, i)}: bandeira${g.status === "lost" && !g.mines[i] ? ", incorreta" : ""}`;
  return `${coords(g, i)}: ${g.revealed[i] ? g.counts[i] + (g.counts[i] === 1 ? " fenda vizinha" : " fendas vizinhas") : "terreno oculto"}`;
}
function cell(s, i) {
  const g = s.g,
    lost = g.status === "lost",
    mine = lost && g.mines[i],
    wrong = lost && g.flags[i] && !g.mines[i],
    opened = g.revealed[i];
  return e(
    "button",
    {
      key: i,
      id: "cell-" + i,
      "data-index": i,
      "aria-label": label(g, i),
      "aria-pressed": String(i === s.selected),
      tabindex: -1,
      class: {
        cell: true,
        open: opened,
        flag: g.flags[i],
        mine,
        wrong,
        selected: i === s.selected,
        exploded: g.exploded === i,
      },
      onclick: [Click, i],
      oncontextmenu: Context,
    },
    e(
      "span",
      { "aria-hidden": "true", class: "cell-value" },
      mine
        ? "×"
        : wrong
          ? "!"
          : g.flags[i]
            ? "⚑"
            : opened
              ? g.counts[i] || "·"
              : "",
    ),
    e("small", { "aria-hidden": "true" }, String(i + 1).padStart(2, "0")),
  );
}
function view(s) {
  const g = s.g,
    config = expeditions[g.config],
    r = s.save.records[g.config],
    safe = g.revealed.filter(Boolean).length,
    flags = g.flags.filter(Boolean).length,
    ended = g.status === "won" || g.status === "lost";
  return e(
    "main",
    { id: "app" },
    e(
      "header",
      {},
      e(
        "a",
        { href: "./", class: "brand", "aria-label": "Fresta início" },
        "FR",
        e("span", { "aria-hidden": "true" }, "╱"),
        "ESTA",
      ),
      e(
        "div",
        { class: "header-note" },
        "CARTOGRAFIA DO INCERTO.",
        e("br", {}),
        "UM MAPA FICTÍCIO DE CADA VEZ.",
      ),
      e(
        "nav",
        { "aria-label": "Preferências" },
        e("button", { id: "help", onclick: [Pause, "help"] }, "Manual ↗"),
        e(
          "button",
          {
            id: "sound",
            "aria-pressed": String(s.save.sound),
            onclick: [Preference, "sound"],
          },
          s.save.sound ? "Som ligado" : "Som desligado",
        ),
        e(
          "button",
          {
            id: "motion",
            "aria-pressed": String(s.save.motion),
            onclick: [Preference, "motion"],
          },
          "Menos movimento",
        ),
      ),
    ),
    e(
      "section",
      { class: "brief" },
      e(
        "div",
        {},
        e("span", { class: "eyebrow" }, "EXPEDIÇÕES / LEITURA DE TERRENO"),
        e(
          "h1",
          {},
          "Nem todo silêncio",
          e("br", {}),
          e("em", {}, "é chão firme."),
        ),
      ),
      e(
        "p",
        {},
        "Explore o gelo. Interprete os sinais.",
        e("br", {}),
        "Marque suas hipóteses. Avance com cuidado.",
      ),
    ),
    e(
      "section",
      { class: "top-controls", "aria-label": "Selecionar expedição" },
      e(
        "nav",
        { "aria-label": "Expedições" },
        expeditions.map((p, i) =>
          e(
            "button",
            {
              id: "expedition-" + i,
              class: { chosen: g.config === i },
              "aria-pressed": String(g.config === i),
              onclick: [Reset, { config: i }],
            },
            e("span", {}, "0" + (i + 1)),
            p.name,
            e("small", {}, `${p.width} × ${p.height}`),
          ),
        ),
      ),
      e(
        "div",
        { class: "seed" },
        "MAPA #" + String(g.seed).padStart(6, "0"),
        e("small", {}, config.description),
      ),
    ),
    e(
      "section",
      { class: "map-frame", "aria-label": "Mapa da expedição" },
      e(
        "div",
        { class: "map-ruler" },
        e("span", {}, "N ↑ / TERRENO NÃO VERIFICADO"),
        e("span", {}, "INSTITUTO FRESTA — ÁREA FICTÍCIA"),
      ),
      e(
        "div",
        { class: "hud" },
        e(
          "div",
          {},
          e("span", {}, "FENDAS / BANDEIRAS RESTANTES"),
          e("strong", { id: "remaining" }, `${g.total} / ${g.total - flags}`),
        ),
        e(
          "div",
          {},
          e("span", {}, "TERRENO SEGURO MAPEADO"),
          e(
            "strong",
            { id: "progress" },
            `${safe}/${g.width * g.height - g.total}`,
          ),
        ),
        e(
          "div",
          {},
          e("span", {}, "AÇÕES"),
          e("strong", { id: "moves" }, String(g.moves).padStart(2, "0")),
        ),
      ),
      e(
        "div",
        {
          id: "board",
          class: "board",
          tabindex: 0,
          role: "group",
          "aria-label":
            "Terreno jogável. Setas movem seleção; Enter explora; F marca; C abre vizinhas.",
          onkeydown: Key,
          style: { "--cols": g.width },
        },
        g.revealed.map((_, i) => cell(s, i)),
      ),
      e(
        "div",
        { class: "map-bottom" },
        e(
          "span",
          { id: "selection" },
          `SELEÇÃO ${coords(g, s.selected)} / ${label(g, s.selected).split(": ")[1]}`,
        ),
        e("span", {}, "○ OCULTO   · SEGURO   ⚑ HIPÓTESE   × FENDA"),
      ),
    ),
    e(
      "section",
      { class: "workbench", "aria-label": "Ferramentas e navegação" },
      e(
        "div",
        { class: "tools" },
        e(
          "button",
          {
            id: "tool-explore",
            class: { orange: s.tool === "explore" },
            "aria-pressed": String(s.tool === "explore"),
            onclick: [Tool, "explore"],
          },
          "01 / Explorar",
        ),
        e(
          "button",
          {
            id: "tool-flag",
            class: { orange: s.tool === "flag" },
            "aria-pressed": String(s.tool === "flag"),
            onclick: [Tool, "flag"],
          },
          "02 / Marcar",
        ),
      ),
      e(
        "div",
        { class: "direction-pad", "aria-label": "Mover seleção" },
        e(
          "button",
          { id: "up", "aria-label": "Selecionar acima", onclick: [Move, "up"] },
          "↑",
        ),
        e(
          "button",
          {
            id: "left",
            "aria-label": "Selecionar à esquerda",
            onclick: [Move, "left"],
          },
          "←",
        ),
        e(
          "button",
          {
            id: "down",
            "aria-label": "Selecionar abaixo",
            onclick: [Move, "down"],
          },
          "↓",
        ),
        e(
          "button",
          {
            id: "right",
            "aria-label": "Selecionar à direita",
            onclick: [Move, "right"],
          },
          "→",
        ),
      ),
      e(
        "div",
        { class: "actions" },
        e(
          "button",
          { id: "explore", disabled: ended, onclick: [Explore, s.selected] },
          "Explorar seleção ↗",
        ),
        e(
          "button",
          { id: "mark", disabled: ended, onclick: [Mark, s.selected] },
          "Marcar / tirar [F]",
        ),
        e(
          "button",
          { id: "chord", disabled: ended, onclick: [Chord, s.selected] },
          "Abrir vizinhas [C]",
        ),
      ),
    ),
    e(
      "div",
      { class: "status-bar" },
      e("p", { id: "message", role: "status" }, s.message),
      e(
        "button",
        {
          id: "pause",
          disabled: g.status !== "playing",
          onclick: [Pause, "pause"],
        },
        "Pausar [Esc]",
      ),
    ),
    ended &&
      e(
        "section",
        {
          id: "result",
          class: { result: true, success: g.status === "won" },
          "aria-label": "Resultado",
        },
        e("span", { "aria-hidden": "true" }, g.status === "won" ? "↗" : "×"),
        e(
          "div",
          {},
          e(
            "h2",
            {},
            g.status === "won"
              ? "Um caminho para a certeza."
              : "O terreno tinha outra resposta.",
          ),
          e(
            "p",
            {},
            `${safe} casas seguras mapeadas · ${g.moves} ações · ${g.status === "won" ? "expedição concluída" : "fenda explorada"}.`,
          ),
        ),
      ),
    e(
      "section",
      { class: "log" },
      e(
        "div",
        {},
        e(
          "span",
          { class: "eyebrow" },
          "ARQUIVO LOCAL / " + config.name.toUpperCase(),
        ),
        e(
          "p",
          { id: "record" },
          `${r.played} ${r.played === 1 ? "expedição" : "expedições"} · ${r.wins} ${r.wins === 1 ? "vitória" : "vitórias"} · melhor ${r.best === null ? "—" : r.best + " ações (qualquer mapa)"}`,
        ),
        e(
          "small",
          {},
          "A partida em andamento não é salva. Sem cronômetro ou competição online.",
        ),
      ),
      e(
        "div",
        { class: "reset-tools" },
        e("button", { id: "repeat", onclick: [Reset, {}] }, "Repetir mapa ↶"),
        e(
          "button",
          { id: "new-map", onclick: [Reset, { fresh: true }] },
          "Novo mapa ↗",
        ),
      ),
    ),
    e(
      "footer",
      {},
      e(
        "span",
        {},
        "O PRIMEIRO PASSO É SEGURO. AS CERTEZAS SE CONSTROEM DEPOIS.",
      ),
      e("span", {}, "SEM CONTAS, COMPRAS OU SERVIÇOS REMOTOS."),
    ),
  );
}
const dispatch = app({
  init: {
    g: create(),
    selected: 0,
    tool: "explore",
    save,
    paused: false,
    message:
      "Comece por qualquer casa. Sua primeira exploração e as vizinhas serão seguras.",
  },
  view,
  node: document.querySelector("#app"),
});
document.body.classList.toggle("reduced", save.motion);
document
  .querySelector("#resume")
  .addEventListener("click", () => dispatch(Resume));
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  dispatch(Resume);
});
const Blur = (s) => (s.g.status === "playing" ? Pause(s) : s);
window.addEventListener("blur", () => dispatch(Blur));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) dispatch(Blur);
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) dispatch(Blur);
});
window.addEventListener("pagehide", (e) => {
  if (!e.persisted) void audio?.close();
});
