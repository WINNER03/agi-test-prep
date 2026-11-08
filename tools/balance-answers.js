// Usage: node tools/balance-answers.js data/testNN.js [extra-questions.json]
// Spreads correct answers evenly across A/B/C (numeric choices keep their order) and rewrites the file.
const fs=require("fs"),vm=require("vm");
const file=process.argv[2];
const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/registry.js","utf8"),ctx);ctx.AGI=ctx.window.AGI;
vm.runInContext(fs.readFileSync(file,"utf8"),ctx);
const t=Object.values(ctx.AGI.tests)[0];
if(process.argv[3]) t.questions.push(...JSON.parse(fs.readFileSync(process.argv[3],"utf8")));
const numeric=q=>q.choices.every(c=>/^[-+]?[\d.,]+/.test(c));
const count=()=>{const d=[0,0,0];t.questions.forEach(q=>d[q.answer]++);return d;};
let i=0;
for(const q of t.questions){
  const d=count(); const max=d.indexOf(Math.max(...d)), min=d.indexOf(Math.min(...d));
  if(q.answer!==max||numeric(q)||d[max]-d[min]<2) continue;
  // swap correct choice into the least-used slot
  [q.choices[q.answer],q.choices[min]]=[q.choices[min],q.choices[q.answer]];
  q.answer=min;
}
const clean=t.questions.map(({topic,q,choices,answer,explain,ref})=>({topic,q,choices,answer,explain,ref}));
const body=clean.map(o=>"    "+JSON.stringify(o)).join(",\n");
fs.writeFileSync(file,`AGI.register({\n  id: ${t.id},\n  title: ${JSON.stringify(t.title)},\n  subtitle: ${JSON.stringify(t.subtitle)},\n  questions: [\n${body}\n  ],\n});\n`);
