// Usage: node tools/validate.js  — checks every data/testNN.js file
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.join(__dirname, "..", "data");
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "registry.js"), "utf8"), ctx);
ctx.AGI = ctx.window.AGI;
let ok = true; const seen = new Map();
for (const f of fs.readdirSync(dir).filter((f) => /^test\d+\.js$/.test(f)).sort()) {
  vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f });
}
for (const t of Object.values(ctx.AGI.tests)) {
  const dist = [0, 0, 0], topics = {};
  t.questions.forEach((q, i) => {
    const where = `Test ${t.id} Q${i + 1}`;
    if (!q.q || !Array.isArray(q.choices) || q.choices.length !== 3) { ok = false; console.log(`${where}: needs text and exactly 3 choices`); }
    if (!(q.answer >= 0 && q.answer < q.choices.length)) { ok = false; console.log(`${where}: bad answer index`); }
    if (!q.explain) { ok = false; console.log(`${where}: missing explanation`); }
    if (new Set(q.choices).size !== q.choices.length) { ok = false; console.log(`${where}: duplicate choices`); }
    const k = q.q.trim().toLowerCase();
    if (seen.has(k)) { ok = false; console.log(`${where}: duplicate of ${seen.get(k)}`); } else seen.set(k, where);
    dist[q.answer]++; topics[q.topic] = (topics[q.topic] || 0) + 1;
  });
  console.log(`Test ${t.id}: ${t.questions.length} questions | answers A/B/C = ${dist.join("/")}`);
  console.log("  topics:", JSON.stringify(topics));
  if (t.questions.length !== 100) { ok = false; console.log(`  expected 100 questions`); }
}
// Near-duplicate check across all tests (word overlap of question stems)
const all = Object.values(ctx.AGI.tests).flatMap((t) => t.questions.map((q) => ({ where: `Test ${t.id} Q${q.n}`, words: new Set(q.q.toLowerCase().match(/[a-z0-9]+/g)) })));
for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
  const a = all[i].words, b = all[j].words; let inter = 0; a.forEach((w) => b.has(w) && inter++);
  const sim = inter / (a.size + b.size - inter);
  if (sim > 0.75) console.log(`  similar (${sim.toFixed(2)}): ${all[i].where} ~ ${all[j].where}`);
}
process.exit(ok ? 0 : 1);
