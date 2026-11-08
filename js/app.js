/* AGI Test Prep — single-page app, no build step. */
(function () {
  "use strict";

  const TOTAL_TESTS = 10;
  const EXAM_MINUTES = 150; // FAA AGI: 100 questions, 2.5 hours
  const PASS_PCT = 70;
  const LETTERS = ["A", "B", "C", "D", "E"];
  const app = document.getElementById("app");

  // ---------- Storage ----------
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("agi." + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem("agi." + key, JSON.stringify(value));
      } catch (e) {
        /* storage unavailable: keep going in memory */
      }
    },
  };
  let missed = store.get("missed", {}); // { key: true }
  let marked = store.get("marked", {}); // { key: true }
  let scores = store.get("scores", {}); // { testId: { best, last, attempts } }
  let prefs = store.get("prefs", { shuffle: false });

  const save = () => {
    store.set("missed", missed);
    store.set("marked", marked);
    store.set("scores", scores);
    store.set("prefs", prefs);
  };

  // ---------- Helpers ----------
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const allQuestions = () => Object.values(AGI.tests).flatMap((t) => t.questions);
  const findQuestion = (key) => allQuestions().find((q) => q.key === key);
  const fmtTime = (sec) => {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ":" : "") + String(m).padStart(h ? 2 : 1, "0") + ":" + String(s).padStart(2, "0");
  };
  const parseHash = () => {
    const [path, qs] = location.hash.replace(/^#/, "").split("?");
    return { path: path || "/", params: new URLSearchParams(qs || "") };
  };

  // ---------- Session ----------
  let session = null;
  let timerId = null;
  const stopTimer = () => { if (timerId) { clearInterval(timerId); timerId = null; } };

  function startSession(mode, testId) {
    let questions, title;
    if (mode === "missed") {
      questions = Object.keys(missed).map(findQuestion).filter(Boolean);
      title = "Missed questions";
    } else if (mode === "marked") {
      questions = Object.keys(marked).map(findQuestion).filter(Boolean);
      title = "Marked questions";
    } else if (testId === "all") {
      questions = allQuestions();
      title = "All tests combined";
    } else {
      const t = AGI.tests[testId];
      if (!t) return null;
      questions = t.questions;
      title = t.title;
    }
    if (!questions.length) return null;
    if (prefs.shuffle && mode !== "study") questions = shuffle(questions);
    return {
      mode, testId, title, questions,
      idx: 0,
      answers: {},       // key -> chosen index
      showExplain: false,
      submitted: false,
      endsAt: mode === "exam" ? Date.now() + EXAM_MINUTES * 60 * 1000 : null,
    };
  }

  // ---------- Home ----------
  function renderHome() {
    stopTimer();
    session = null;
    const missedCount = Object.keys(missed).filter((k) => findQuestion(k)).length;
    const markedCount = Object.keys(marked).filter((k) => findQuestion(k)).length;
    const loaded = Object.keys(AGI.tests).length;

    let cards = "";
    for (let id = 1; id <= TOTAL_TESTS; id++) {
      const t = AGI.tests[id];
      const sc = scores[id];
      if (!t) {
        cards += `<div class="card card-locked"><div class="card-head"><h3>Practice Test ${id}</h3><span class="pill">Coming soon</span></div>
          <p class="muted">Question bank not added yet.</p></div>`;
        continue;
      }
      const badge = sc
        ? `<span class="pill ${sc.best >= PASS_PCT ? "pill-pass" : "pill-fail"}">Best ${sc.best}%</span>`
        : `<span class="pill">${t.questions.length} Q</span>`;
      cards += `<div class="card">
        <div class="card-head"><h3>${esc(t.title)}</h3>${badge}</div>
        ${t.source === "faa" ? `<span class="pill pill-faa">Official FAA questions</span>` : ""}
        <p class="muted">${esc(t.subtitle || "")}</p>
        ${sc ? `<p class="small muted">Last ${sc.last}% · ${sc.attempts} exam attempt${sc.attempts === 1 ? "" : "s"}</p>` : ""}
        <div class="btn-row">
          <a class="btn" href="#/run?mode=study&test=${id}">Study</a>
          <a class="btn" href="#/run?mode=practice&test=${id}">Practice</a>
          <a class="btn btn-primary" href="#/run?mode=exam&test=${id}">Exam</a>
        </div></div>`;
    }

    app.innerHTML = `
      <section class="hero">
        <h1>Advanced Ground Instructor practice</h1>
        <p>The real AGI knowledge test has <b>100 questions</b>, <b>2.5 hours</b>, and needs <b>70%</b> to pass.
        Every practice test here uses the same format.</p>
        <div class="modes">
          <div><b>Study</b>: each question with only the correct answer, to memorize fast.</div>
          <div><b>Practice</b>: pick A/B/C and see right or wrong right away, with the explanation.</div>
          <div><b>Exam</b>: timed like the real test, results at the end.</div>
        </div>
      </section>

      <section class="toolbar">
        <a class="btn ${missedCount ? "btn-warn" : "btn-disabled"}" href="${missedCount ? "#/run?mode=missed" : "#/"}">Review missed (${missedCount})</a>
        <a class="btn ${markedCount ? "" : "btn-disabled"}" href="${markedCount ? "#/run?mode=marked" : "#/"}">Marked (${markedCount})</a>
        ${loaded > 1 ? `<a class="btn" href="#/run?mode=study&test=all">Study all tests combined</a>` : ""}
        <label class="check"><input type="checkbox" id="shuffle" ${prefs.shuffle ? "checked" : ""}/> Shuffle questions (Practice/Exam)</label>
        <button class="btn btn-ghost" id="reset">Reset progress</button>
      </section>

      <section class="grid">${cards}</section>`;

    document.getElementById("shuffle").onchange = (e) => { prefs.shuffle = e.target.checked; save(); };
    document.getElementById("reset").onclick = () => {
      if (confirm("Clear all scores, missed and marked questions?")) {
        missed = {}; marked = {}; scores = {}; save(); renderHome();
      }
    };
  }

  // ---------- Runner ----------
  function renderRunner() {
    const s = session;
    if (s.mode === "exam" && s.submitted) return renderResults();
    const q = s.questions[s.idx];
    const chosen = s.answers[q.key];
    const answered = chosen !== undefined;
    const total = s.questions.length;
    const modeLabel = { study: "Study", practice: "Practice", exam: "Exam", missed: "Missed review", marked: "Marked review" }[s.mode];
    const interactive = s.mode !== "study";
    const reveal = s.mode === "practice" || s.mode === "missed" || s.mode === "marked";

    let choicesHtml = "";
    if (s.mode === "study") {
      choicesHtml = `<div class="choice choice-correct static"><span class="letter">${LETTERS[q.answer]})</span> ${esc(q.choices[q.answer])}</div>`;
    } else {
      choicesHtml = q.choices.map((c, i) => {
        let cls = "choice";
        if (reveal && answered) {
          if (i === q.answer) cls += " choice-correct";
          else if (i === chosen) cls += " choice-wrong";
        } else if (chosen === i) cls += " choice-selected";
        const disabled = reveal && answered ? "disabled" : "";
        return `<button class="${cls}" data-i="${i}" ${disabled}><span class="letter">${LETTERS[i]})</span> ${esc(c)}</button>`;
      }).join("");
    }

    const showExplain = s.mode === "study" ? s.showExplain : (reveal && answered);
    const explainHtml = showExplain && q.explain
      ? `<div class="explain"><b>Explanation:</b> ${esc(q.explain)}${q.ref ? `<div class="ref">Reference: ${esc(q.ref)}</div>` : ""}</div>` : "";

    let feedback = "";
    if (reveal && answered) {
      feedback = chosen === q.answer
        ? `<div class="feedback ok">Correct</div>`
        : `<div class="feedback bad">Incorrect. The answer is ${LETTERS[q.answer]}.</div>`;
    }

    let stats = "";
    if (interactive) {
      const keys = Object.keys(s.answers);
      if (reveal) {
        const right = keys.filter((k) => s.answers[k] === s.questions.find((x) => x.key === k).answer).length;
        stats = `<span>Score ${right}/${keys.length}</span>`;
      } else {
        stats = `<span>Answered ${keys.length}/${total}</span>`;
      }
    }

    const navGrid = s.mode === "exam"
      ? `<div class="navgrid">${s.questions.map((x, i) => {
          let c = "nav";
          if (s.answers[x.key] !== undefined) c += " nav-done";
          if (marked[x.key]) c += " nav-marked";
          if (i === s.idx) c += " nav-current";
          return `<button class="${c}" data-go="${i}">${i + 1}</button>`;
        }).join("")}</div>` : "";

    app.innerHTML = `
      <div class="runner">
        <div class="run-head">
          <div>
            <a href="#/" class="back-link">← All tests</a>
            <div class="run-title">${esc(s.title)} · <span class="muted">${modeLabel}</span></div>
          </div>
          <div class="run-meta">
            ${s.mode === "exam" ? `<span id="timer" class="timer"></span>` : ""}
            ${stats}
            <span>Question ${s.idx + 1} of ${total}</span>
          </div>
        </div>
        <div class="progress"><div style="width:${((s.idx + 1) / total) * 100}%"></div></div>

        <div class="qcard">
          <div class="qmeta"><span class="pill">${esc(q.topic || "General")}</span><span class="muted small">${s.testId === undefined || s.mode === "missed" || s.mode === "marked" || s.testId === "all" ? `Test ${q.testId} · Q${q.n}` : `Q${q.n}`}</span></div>
          <p class="qtext">${esc(q.q)}</p>
          ${q.figure ? `<div class="figure-note">📄 Needs <b>${esc(q.figure)}</b> (FAA Airman Knowledge Testing Supplement)${q.verify ? ". Chart-based answer: confirm it against the figure." : ""}</div>` : ""}
          <div class="choices">${choicesHtml}</div>
          ${feedback}
          ${explainHtml}
        </div>

        <div class="controls">
          <button class="btn" id="prev" ${s.idx === 0 ? "disabled" : ""}>Back</button>
          <button class="btn" id="next" ${s.idx === total - 1 ? "disabled" : ""}>Next</button>
          ${s.mode === "study" ? `<button class="btn" id="explain">${s.showExplain ? "Hide" : "Show"} explanation</button>` : ""}
          <label class="check"><input type="checkbox" id="mark" ${marked[q.key] ? "checked" : ""}/> Mark question</label>
          <span class="spacer"></span>
          <form id="jump" class="jump"><label>Jump to #</label><input type="number" min="1" max="${total}" id="jumpN"/><button class="btn">Go</button></form>
          ${s.mode === "exam" ? `<button class="btn btn-primary" id="submit">Submit exam</button>` : ""}
        </div>
        ${navGrid}
        <p class="hint small muted">Keys: ← → to move, A/B/C or 1/2/3 to answer${s.mode === "study" ? ", E for explanation" : ""}, M to mark.</p>
      </div>`;

    // Wire events
    app.querySelectorAll("button.choice").forEach((b) => (b.onclick = () => choose(+b.dataset.i)));
    app.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => go(+b.dataset.go)));
    document.getElementById("prev").onclick = () => go(s.idx - 1);
    document.getElementById("next").onclick = () => go(s.idx + 1);
    const ex = document.getElementById("explain");
    if (ex) ex.onclick = toggleExplain;
    document.getElementById("mark").onchange = toggleMark;
    document.getElementById("jump").onsubmit = (e) => {
      e.preventDefault();
      const n = parseInt(document.getElementById("jumpN").value, 10);
      if (n >= 1 && n <= total) go(n - 1);
    };
    const sub = document.getElementById("submit");
    if (sub) sub.onclick = () => {
      const left = total - Object.keys(s.answers).length;
      if (confirm(left ? `${left} question(s) unanswered. Submit anyway?` : "Submit exam?")) submitExam();
    };
    if (s.mode === "exam") tickTimer();
  }

  function choose(i) {
    const s = session;
    if (!s || s.mode === "study") return;
    const q = s.questions[s.idx];
    const reveal = s.mode !== "exam";
    if (reveal && s.answers[q.key] !== undefined) return; // locked after answering
    if (i >= q.choices.length) return;
    s.answers[q.key] = i;
    if (reveal) {
      if (i === q.answer) delete missed[q.key];
      else missed[q.key] = true;
      save();
    }
    renderRunner();
  }

  function go(i) {
    const s = session;
    if (i < 0 || i >= s.questions.length) return;
    s.idx = i;
    s.showExplain = false;
    renderRunner();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleExplain() { session.showExplain = !session.showExplain; renderRunner(); }
  function toggleMark() {
    const q = session.questions[session.idx];
    if (marked[q.key]) delete marked[q.key]; else marked[q.key] = true;
    save();
    renderRunner();
  }

  function tickTimer() {
    stopTimer();
    const el = () => document.getElementById("timer");
    const update = () => {
      const left = Math.max(0, Math.round((session.endsAt - Date.now()) / 1000));
      if (el()) {
        el().textContent = "⏱ " + fmtTime(left);
        el().classList.toggle("timer-low", left < 600);
      }
      if (left <= 0) { stopTimer(); alert("Time is up. Your exam will be graded."); submitExam(); }
    };
    update();
    timerId = setInterval(update, 1000);
  }

  function submitExam() {
    const s = session;
    stopTimer();
    s.submitted = true;
    s.timeUsed = Math.round((Date.now() - (s.endsAt - EXAM_MINUTES * 60000)) / 1000);
    let right = 0;
    s.questions.forEach((q) => {
      const a = s.answers[q.key];
      if (a === q.answer) { right++; delete missed[q.key]; }
      else if (a !== undefined) missed[q.key] = true; // unanswered questions are not added to "missed"
    });
    const pct = Math.round((right / s.questions.length) * 100);
    s.result = { right, pct };
    if (s.testId && s.testId !== "all") {
      const prev = scores[s.testId] || { best: 0, attempts: 0 };
      scores[s.testId] = { best: Math.max(prev.best, pct), last: pct, attempts: prev.attempts + 1 };
    }
    save();
    renderResults();
  }

  function renderResults() {
    const s = session;
    const { right, pct } = s.result;
    const pass = pct >= PASS_PCT;
    const wrong = s.questions.filter((q) => s.answers[q.key] !== q.answer);

    // topic breakdown
    const topics = {};
    s.questions.forEach((q) => {
      const t = q.topic || "General";
      topics[t] = topics[t] || { right: 0, total: 0 };
      topics[t].total++;
      if (s.answers[q.key] === q.answer) topics[t].right++;
    });
    const topicRows = Object.entries(topics)
      .sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total)
      .map(([t, v]) => {
        const p = Math.round((v.right / v.total) * 100);
        return `<tr><td>${esc(t)}</td><td>${v.right}/${v.total}</td><td><div class="bar"><div class="${p >= PASS_PCT ? "bar-ok" : "bar-bad"}" style="width:${p}%"></div></div></td><td>${p}%</td></tr>`;
      }).join("");

    const wrongList = wrong.map((q) => {
      const c = s.answers[q.key];
      return `<div class="review">
        <div class="qmeta"><span class="pill">${esc(q.topic || "General")}</span><span class="muted small">Q${q.n}</span></div>
        <p class="qtext">${esc(q.q)}</p>
        ${c !== undefined ? `<div class="choice choice-wrong static"><span class="letter">${LETTERS[c]})</span> ${esc(q.choices[c])}</div>` : `<div class="muted small">Not answered</div>`}
        <div class="choice choice-correct static"><span class="letter">${LETTERS[q.answer]})</span> ${esc(q.choices[q.answer])}</div>
        ${q.explain ? `<div class="explain">${esc(q.explain)}${q.ref ? `<div class="ref">Reference: ${esc(q.ref)}</div>` : ""}</div>` : ""}
      </div>`;
    }).join("");

    app.innerHTML = `
      <div class="runner">
        <a href="#/" class="back-link">← All tests</a>
        <div class="result ${pass ? "result-pass" : "result-fail"}">
          <div class="result-score">${pct}%</div>
          <div><div class="result-label">${pass ? "PASS" : "FAIL"}</div>
          <div>${right} of ${s.questions.length} correct · time used ${fmtTime(s.timeUsed || 0)} · passing is ${PASS_PCT}%</div></div>
        </div>
        <h2>By topic</h2>
        <table class="topics"><thead><tr><th>Topic</th><th>Score</th><th></th><th></th></tr></thead><tbody>${topicRows}</tbody></table>
        <div class="btn-row">
          <a class="btn btn-primary" href="#/run?mode=exam&test=${s.testId}&r=${Date.now()}">Retake exam</a>
          ${wrong.length ? `<a class="btn btn-warn" href="#/run?mode=missed">Practice missed questions</a>` : ""}
        </div>
        <h2>Questions you missed (${wrong.length})</h2>
        ${wrongList || `<p>Perfect score. Nice work.</p>`}
      </div>`;
  }

  // ---------- Keyboard ----------
  document.addEventListener("keydown", (e) => {
    if (!session || session.submitted) return;
    if (e.target.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (k === "arrowright") go(session.idx + 1);
    else if (k === "arrowleft") go(session.idx - 1);
    else if (["a", "b", "c", "1", "2", "3"].includes(k)) choose("abc".includes(k) ? "abc".indexOf(k) : +k - 1);
    else if (k === "e" && session.mode === "study") toggleExplain();
    else if (k === "m") toggleMark();
  });

  // ---------- Router ----------
  function route() {
    const { path, params } = parseHash();
    if (path === "/run") {
      const mode = params.get("mode");
      const t = params.get("test");
      const testId = t === "all" ? "all" : t ? parseInt(t, 10) : undefined;
      stopTimer();
      session = startSession(mode, testId);
      if (!session) { location.hash = "#/"; return; }
      renderRunner();
    } else {
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("beforeunload", (e) => {
    if (session && session.mode === "exam" && !session.submitted) { e.preventDefault(); e.returnValue = ""; }
  });
  route();
})();
