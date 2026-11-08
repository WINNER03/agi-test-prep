// Usage: node tools/import-pdf-text.js <pdftotext -layout output> <testId> "<title>" "<subtitle>" > data/testNN.js
// Parses "N. question / A. B. C. / Answer: X. explanation" text into a test bank file.
const fs = require("fs");
const [file, id, title, subtitle] = process.argv.slice(2);
let text = fs.readFileSync(file, "utf8").replace(/\f/g, "\n").split("Quick Answer Key")[0];
const lines = text.split("\n").filter((l) => !/^\s*Page \d+\s*$/.test(l));
const blocks = [];
let cur = null;
for (const line of lines) {
  const m = line.match(/^(\d+)\.\s+(.*)$/);
  if (m) { cur = { n: +m[1], raw: [m[2]] }; blocks.push(cur); }
  else if (cur) cur.raw.push(line);
}
const TOPICS = {
  "Human Factors": [1, 2, 34, 35, 36, 96, 97, 98], "Airport Operations": [3, 28, 29, 30, 31, 32, 33, 67, 84],
  "Airspace": [4, 18, 19, 20, 21, 22, 90, 91], "Regulations": [5, 6, 7, 8, 9, 10, 11, 12, 93],
  "Weather Services": [13, 14, 95], "Weather Theory": [94], "Weight & Balance": [15, 81, 100],
  "Fundamentals of Instructing": [16, 17], "Systems & Instruments": [23, 24, 25, 26, 68, 69, 70, 71, 76, 77, 78, 79, 85, 86, 87, 88, 89],
  "Aerodynamics": [27, 43, 51, 52, 53, 54, 55, 80, 99], "Performance": [37, 38, 39, 40, 82, 83, 92],
  "Rotorcraft & Other Categories": [41, 42, 44, 45, 46, 47, 48, 49, 50, 72, 73, 74, 75], "Navigation": [56, 57, 58, 59, 60],
  "Flight Maneuvers": [61, 62, 63, 64, 65, 66],
};
const topicOf = (n) => Object.keys(TOPICS).find((t) => TOPICS[t].includes(n)) || "General";
const clean = (s) => s.replace(/■/g, ",").replace(/`/g, "'").replace(/\s+/g, " ").trim();
const qs = blocks.map((b) => {
  const body = b.raw.join("\n");
  const ai = body.search(/^\s+A\.\s/m), bi = body.search(/^\s+B\.\s/m), ci = body.search(/^\s+C\.\s/m), ansI = body.search(/^\s+Answer:\s/m);
  if ([ai, bi, ci, ansI].some((x) => x < 0)) throw new Error("Could not parse question " + b.n);
  const q = clean(body.slice(0, ai));
  const choices = [body.slice(ai, bi), body.slice(bi, ci), body.slice(ci, ansI)].map((c) => clean(c).replace(/^[ABC]\.\s*/, "").replace(/\.$/, ""));
  let ans = clean(body.slice(ansI)).replace(/^Answer:\s*/, "");
  const verify = /Chart-based/.test(ans);
  ans = ans.replace(/\s*Chart-based.*$/, "");
  const letter = ans[0];
  const explain = ans.replace(/^[ABC]\.\s*/, "");
  const fig = q.match(/Figure (\d+)/);
  const ref = (explain.match(/(14 CFR [\d.()a-z]+|AIM)/) || [])[0] || "FAA AGI sample questions";
  const o = { topic: topicOf(b.n), q, choices, answer: "ABC".indexOf(letter), explain, ref };
  if (fig) o.figure = "FAA-CT-8080-5H, Figure " + fig[1];
  if (verify) o.verify = true;
  return o;
});
if (qs.length !== 100) throw new Error("Expected 100 questions, got " + qs.length);
qs.forEach((q, i) => { if (q.answer < 0) throw new Error("Bad answer on " + (i + 1)); });
process.stdout.write(`AGI.register({\n  id: ${id},\n  title: ${JSON.stringify(title)},\n  subtitle: ${JSON.stringify(subtitle)},\n  source: "faa",\n  questions: [\n${qs.map((q) => "    " + JSON.stringify(q)).join(",\n")}\n  ],\n});\n`);
