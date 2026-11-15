// lessonKit.js — the shared frame of the repair lessons (Solar Fix, Leak Fix): the console
// card, the step bar, Volt's speech bubble, the "What really happened?" screen and the quick
// question. Same look and rules as the Electrolysis lesson (ez-* classes): big text, 44 px+
// targets, a hint and a second try on a wrong answer, a source link on every fact.
import './lessonKit.css';
import { sfx } from '../ui/sfx.js';
import { IC, voltBot } from './electrolysis/icons.js';
import { showTutorial } from '../ui/tutorial.js';

export const plain = (html) => String(html).replace(/<[^>]+>/g, '');
const NS = 'http://www.w3.org/2000/svg';

/** Make an SVG element with attributes (and append it to parent). */
export function svgEl(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
/** Pointer position in the SVG's own coordinates. */
export function svgPoint(svg, e) {
  const p = svg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
/** Keep receiving moves while dragging; some browsers refuse capture (never break the drag). */
export function capture(el, e) {
  try {
    el.setPointerCapture?.(e.pointerId);
  } catch {
    // dragging still works while the pointer stays over the element
  }
}
/** Enter / Space on a focusable SVG "button" does the same as a click. */
export function onActivate(el, fn) {
  el.addEventListener('click', fn);
  el.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      fn(e);
    }
  });
}

/**
 * The card. opts: { root, ctx (voice), cls, titleIcon, title, labelId }
 * Returns helpers every screen uses.
 */
export function createShell({ root, ctx, cls, titleIcon, title, labelId }) {
  const el = document.createElement('div');
  el.className = `ez ${cls}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', labelId);
  el.innerHTML = `
    <div class="ez-card">
      <header class="ez-head">
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
        <h2 id="${labelId}" class="ez-title">${titleIcon}<span>${title}</span></h2>
        <ol class="ez-steps" aria-label="Steps"></ol>
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
      </header>
      <div class="ez-body"></div>
      <p class="ez-status" aria-live="polite"></p>
    </div>`;
  root.appendChild(el);
  const body = el.querySelector('.ez-body');
  const status = el.querySelector('.ez-status');
  const stepsEl = el.querySelector('.ez-steps');

  let raf = 0;
  let tick = null;
  let last = performance.now();
  let failed = false;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    raf = requestAnimationFrame(loop); // schedule first: one bad frame must never freeze the lesson
    try {
      tick?.(dt, now / 1000);
    } catch (err) {
      if (!failed) console.error(`[instance:${cls}] animation step failed`, err);
      failed = true;
    }
  }
  raf = requestAnimationFrame(loop);

  let tipTimer = 0;
  const shell = {
    el,
    body,
    screen: 'intro',
    steps: [],
    speak: (text) => ctx.voice?.speak(plain(text)),
    announce: (msg) => (status.textContent = plain(msg)),
    say: (mood, html, extra = '') => `<div class="ez-say ${extra}">${voltBot(mood)}<div class="ez-bubble">${html}</div></div>`,
    setTick(fn) {
      tick = fn;
    },
    setScreen(id) {
      shell.screen = id;
      tick = null;
      el.dataset.screen = id;
      const at = shell.steps.findIndex((s) => s.id === id);
      stepsEl.innerHTML = shell.steps
        .map((s, i) => `<li class="${i < at ? 'is-done' : ''} ${i === at ? 'is-now' : ''}" ${i === at ? 'aria-current="step"' : ''}><span>${i + 1}</span>${s.label}</li>`)
        .join('');
      body.classList.remove('ez-enter');
      void body.offsetWidth; // restart the entrance animation
      body.classList.add('ez-enter');
    },
    focusFirst: () => body.querySelector('button:not([disabled]), [tabindex="0"]')?.focus(),
    tutorialOpen: () => Boolean(el.querySelector('.tut')),
    /** First-time "How to play" card (ui/tutorial.js). */
    tutorial: (tut) => showTutorial(el, tut, { onSpeak: shell.speak }),
    /** Volt's one-line reaction during play, at the moment the kid sees it happen. */
    tip(text) {
      const t = body.querySelector('.ez-tip');
      if (!text || !t) return;
      t.querySelector('p').textContent = text;
      t.hidden = false;
      t.classList.remove('is-pop');
      void t.offsetWidth;
      t.classList.add('is-pop');
      shell.speak(text);
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => (t.hidden = true), 3600);
    },
    /** Put a big "Next"-style button in [data-next-slot]. */
    nextButton(label, onClick) {
      const row = body.querySelector('[data-next-slot]');
      if (!row) return;
      row.innerHTML = `<button class="ez-btn ez-btn-go ez-btn-xl" data-next><span>${label}</span></button>`;
      const b = row.querySelector('[data-next]');
      b.addEventListener('click', () => {
        sfx.click();
        onClick();
      });
      b.focus();
    },
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(tipTimer);
      tick = null;
      ctx.voice?.stop?.();
    },
  };
  return shell;
}

/** "What really happened?" — a picture, two short lines and the real-world link. */
export function learnScreen(shell, L, art, onNext) {
  shell.setScreen('learn');
  shell.speak(`What really happened? ${L.lines.join(' ')} ${L.real}`);
  shell.body.innerHTML = `
    ${shell.say('cheer', `<h3 class="ez-h3">What really happened?</h3>${L.lines.map((l) => `<p class="ez-learn-line">${l}</p>`).join('')}`)}
    <div class="ez-learn-art">${art}</div>
    <p class="ez-learn-real">${IC.book}<span>${L.real}</span></p>
    <p class="ez-source">${IC.link}<span>Source: <a href="${L.source.url}" target="_blank" rel="noopener">${L.source.label}</a></span></p>
    <div class="ez-row ez-row-end"><button class="ez-btn ez-btn-go ez-btn-xl" data-next><span>Got it!</span></button></div>`;
  shell.body.querySelector('[data-next]').addEventListener('click', () => {
    sfx.click();
    onNext();
  });
  shell.focusFirst();
}

/**
 * The quick question. quiz: { q, options: [text], answer, hint, explain, source }.
 * A wrong answer gets a hint and another try. onDone(firstTry) after "Finish".
 */
export function quizScreen(shell, quiz, onDone) {
  shell.setScreen('quiz');
  shell.speak(`Quick question! ${quiz.q}`);
  const order = quiz.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const letters = ['A', 'B', 'C', 'D'];
  const { body } = shell;
  body.innerHTML = `
    ${shell.say('think', `<h3 class="ez-h3">Quick question!</h3><p class="ez-q">${quiz.q}</p>`)}
    <div class="ez-answers" style="--n:${order.length}">
      ${order
        .map(
          (oi, pos) => `<button class="ez-answer" data-i="${oi}" style="--i:${pos}" aria-label="${letters[pos]}: ${plain(quiz.options[oi])}">
            <span class="ez-letter">${letters[pos]}</span>
            <span class="ez-answer-pic"><span class="ez-num sf-answer-txt">${quiz.options[oi]}</span></span>
            <span class="ez-answer-mark"></span>
          </button>`,
        )
        .join('')}
    </div>
    <div class="ez-explain" hidden></div>`;
  let tries = 0;
  const ex = body.querySelector('.ez-explain');
  function answer(i, btn) {
    tries++;
    if (i !== quiz.answer) {
      sfx.miss();
      btn.disabled = true;
      btn.classList.add('is-wrong');
      btn.querySelector('.ez-answer-mark').innerHTML = IC.cross;
      const left = [...body.querySelectorAll('.ez-answer:not([disabled])')];
      if (left.length > 1) {
        ex.hidden = false;
        ex.innerHTML = shell.say('happy', `<p><b class="ez-try">Not quite, try again!</b> ${quiz.hint}</p>`, 'ez-say-small');
        left[0].focus();
        shell.announce(`Not quite. Hint: ${quiz.hint}`);
        shell.speak(`Not quite. Try again! ${quiz.hint}`);
        return;
      }
    } else sfx.success();
    const right = i === quiz.answer;
    body.querySelectorAll('.ez-answer').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.i) === quiz.answer) {
        b.classList.add('is-right');
        b.querySelector('.ez-answer-mark').innerHTML = IC.check;
      }
    });
    const head = right && tries === 1 ? 'Yes! First try!' : right ? 'You got it!' : 'Here’s the answer!';
    ex.hidden = false;
    ex.innerHTML = `
      ${shell.say(
        right ? 'cheer' : 'happy',
        `<p><b class="${right ? 'ez-yes' : 'ez-try'}">${head}</b> ${quiz.explain}</p>
         <p class="ez-source">${IC.link}<span>Source: <a href="${quiz.source.url}" target="_blank" rel="noopener">${quiz.source.label}</a></span></p>`,
        'ez-say-small',
      )}
      <div class="ez-row ez-row-end"><button class="ez-btn ez-btn-go" data-next><span>Finish</span></button></div>`;
    const next = ex.querySelector('[data-next]');
    next.addEventListener('click', () => {
      sfx.click();
      onDone(right && tries === 1);
    });
    next.focus();
    shell.announce(`${head} ${quiz.explain}`);
    shell.speak(`${head} ${quiz.explain}`);
  }
  body.querySelectorAll('.ez-answer').forEach((btn) => btn.addEventListener('click', () => answer(Number(btn.dataset.i), btn)));
  shell.focusFirst();
}

/** The play screen frame: Volt's idea line, the game area, Leave + How to play. */
export function playFrame(shell, { concept, leaveLabel, helpLabel, goal = '' }) {
  shell.body.innerHTML = `
    <p class="ez-today rk-concept">${voltBot('happy')}<span>${concept}</span></p>
    <div class="ez-play rk-play"><div class="ez-tip" hidden aria-live="polite">${voltBot('wow')}<p></p></div></div>
    <div class="ez-row">
      <button class="ez-btn ez-btn-ghost" data-leave>${IC.back}<span>${leaveLabel}</span></button>
      <button class="ez-btn ez-btn-ghost ez-help" data-help aria-label="${helpLabel}">${IC.book}<span>How to play</span></button>
      ${goal ? `<span class="ez-goal">${goal}</span>` : ''}
    </div>`;
  return shell.body.querySelector('.rk-play');
}

