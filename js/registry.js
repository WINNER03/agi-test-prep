// Global registry that each data/testNN.js file adds itself to.
// Question format:
//   { topic: "Regulations", q: "Question text", choices: ["A", "B", "C"], answer: 0, explain: "Why", ref: "14 CFR 61.217" }
// `answer` is the zero-based index of the correct choice.
window.AGI = {
  tests: {},
  register(test) {
    if (!test || !test.id || !Array.isArray(test.questions)) {
      console.warn("AGI.register: invalid test", test);
      return;
    }
    test.questions.forEach((q, i) => {
      q.n = i + 1;
      q.key = `t${test.id}-q${i + 1}`;
      q.testId = test.id;
    });
    this.tests[test.id] = test;
  },
};
