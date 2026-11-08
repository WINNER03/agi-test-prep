# AGI Test Prep

A study platform for the FAA **Advanced Ground Instructor (AGI)** knowledge test. It has 10 tests of 100 multiple-choice questions each (A/B/C, one correct answer), with explanations and references.

- **Test 1** contains the FAA's 100 published AGI sample questions, with answers and explanations. Nine of them need figures from the FAA testing supplement (FAA-CT-8080-5H), and the app shows which figure each one needs.
- **Test 2** is a set of FAA-style practice questions covering the AGI knowledge areas.

The real AGI test has 100 questions, a 2.5-hour time limit and a 70% passing score. The exam mode here uses the same format.

## Modes

| Mode | What it does |
|---|---|
| **Study** | Shows each question with only the correct answer, to memorize fast. Press E for the explanation. |
| **Practice** | Pick A/B/C and see right or wrong right away, with the explanation. |
| **Exam** | 150-minute timer and a question grid. Results come at the end, with a score by topic and a review of missed questions. |
| **Review missed** | Retry every question you've answered wrong in any test. Answer it right and it drops off the list. |
| **Marked** | Questions you flagged with "Mark question". |

Progress (scores, missed, marked) is saved in your browser's localStorage.

Keyboard: `←` `→` move, `A`/`B`/`C` or `1`/`2`/`3` answer, `M` mark, `E` explanation (Study).

## Run it

There's no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

### Publish with GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / root → Save.
The site will be at `https://winner03.github.io/agi-test-prep/`.

## Project layout

```
index.html          page shell, loads every data/testNN.js
css/style.css       styles (light + dark)
js/registry.js      AGI.register() — question banks add themselves here
js/app.js           the app: home, study/practice/exam, results, storage
data/test01.js      Test 1: FAA AGI sample questions (100)
data/test02.js      Test 2: FAA-style practice questions (100)
data/test03.js …    Tests 3–10 (added as they're ready)
tools/validate.js   checks every bank: 100 questions, 3 choices, valid answer, explanation, no duplicates
tools/balance-answers.js  spreads correct answers evenly across A/B/C
tools/import-pdf-text.js  turns a Q&A PDF (pdftotext -layout output) into a test file
```

## Adding questions

Each test file looks like this:

```js
AGI.register({
  id: 2,
  title: "Practice Test 2",
  subtitle: "Short description",
  questions: [
    {
      topic: "Regulations",
      q: "Question text",
      choices: ["Choice A", "Choice B", "Choice C"],
      answer: 1,               // zero-based index of the correct choice (1 = B)
      explain: "Why B is correct.",
      ref: "14 CFR 61.217"
    }
  ]
});
```

Then run:

```bash
node tools/validate.js
```

## Disclaimer

Test 1 uses the FAA's public sample questions. The answers and explanations were added for this project, not by the FAA. The other tests are FAA-style practice questions. This project is not affiliated with the FAA or any test-prep vendor. Regulations change, so confirm against the current 14 CFR, the AIM and FAA handbooks.
