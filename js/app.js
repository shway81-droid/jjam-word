/* ── 짬짬이 낱말 ──
   화면에 닿는 코드는 전부 여기 있다. 출제 규칙(pick.js)·저장(store.js)은
   DOM을 모르는 모듈로 빼 두었다.

   검증 스크립트(scripts/validate-data.mjs)가 아래 TYPES·LEVELS·TOPICS 를
   정규식으로 읽어 간다. 상수 이름이나 형태를 바꾸면 그쪽도 함께 고쳐야 한다
   (안 고치면 검증이 통과하는 대신 실패한다 — 조용히 무력화되지 않도록). */

import { candidates, pickNext } from './pick.js';
import { store } from './store.js';
import { sound } from './sound.js';
import { createRound, advance, expire } from './chain.js';
import * as clock from './clock.js';

const TYPES = {
  choseong: { label: 'ㄱㄴㄷ 초성퀴즈', emoji: '🔤', kind: 'quiz', topics: true, blurb: '초성을 보고 낱말을 외쳐요' },
  proverb: { label: '속담 이어말하기', emoji: '🗣', kind: 'quiz', topics: false, blurb: '앞부분을 보고 뒷부분을 외쳐요' },
  idiom: { label: '사자성어', emoji: '🀄', kind: 'quiz', topics: false, blurb: '뜻을 보고 사자성어를 외쳐요' },
  riddle: { label: '수수께끼', emoji: '❓', kind: 'quiz', topics: false, blurb: '수수께끼의 답을 외쳐요' },
  chain: { label: '끝말잇기 도우미', emoji: '🔗', kind: 'tool', topics: false, blurb: '차례와 시간을 화면이 맡아요' },
  gesture: { label: '몸으로 말해요', emoji: '🎭', kind: 'tool', topics: true, blurb: '단어 카드를 크게 띄워요' },
};

const LEVELS = ['easy', 'normal', 'hard'];
const TOPICS = ['동물', '음식', '학교물건', '직업', '나라', '자연', '탈것', '운동'];
const STATES = ['HOME', 'SETUP', 'PROMPT', 'HINT', 'ANSWER', 'CHAIN', 'GESTURE', 'DONE'];

const LEVEL_LABEL = { all: '전체', easy: '쉬움', normal: '보통', hard: '어려움' };
const GROUPS = [2, 3, 4, 5, 6, 7, 8];
const SECONDS = [5, 10, 15, 20];

// 문제 길이에 따라 글자 크기를 세 단계로 (CSS .quiz-prompt[data-len])
const LEN_MID = 8;
const LEN_LONG = 18;
function lenClass(text) {
  if (text.length > LEN_LONG) return 'long';
  if (text.length > LEN_MID) return 'mid';
  return 'short';
}

// 최근 주제는 "3연속 회피"에만 쓰므로 몇 개만 들고 있으면 된다.
const TOPIC_MEMORY = 4;

// 속담은 빈칸을 그 자리에 채워야 한 문장으로 읽힌다.
//   "모르면 ______"  +  "약이요 아는 게 병"  →  "모르면 약이요 아는 게 병"
// 빈칸을 남겨 둔 채 답을 아래에 따로 띄우면, 정작 "이어 말한" 모습이 화면에 없다.
const BLANK = '______';

function fillBlank(el, prompt, answer) {
  const at = prompt.indexOf(BLANK);
  if (at < 0) return false;
  const head = prompt.slice(0, at);
  const tail = prompt.slice(at + BLANK.length);
  const span = document.createElement('span');
  span.className = 'filled';
  span.textContent = answer;
  el.textContent = '';
  el.append(document.createTextNode(head), span, document.createTextNode(tail));
  // 채우고 나면 문장이 길어진다 — 글자 크기를 다시 계산해 한 화면에 담는다.
  el.dataset.len = lenClass(head + answer + tail);
  return true;
}

const state = {
  screen: 'HOME',
  type: null,
  level: 'all',
  topic: 'all',
  groups: 4,
  seconds: 10,
  pool: [],
  item: null,
  stage: 'PROMPT',
  hintOpened: false,
  counted: false,
  recentTopics: [],
  items: [],
  round: null,        // 끝말잇기 한 판
  timerId: null,
  deadline: 0,
  paused: false,
  remainMs: 0,        // 멈춰 둔 동안 들고 있는 남은 시간
  lastTick: 0,        // 초읽기를 초당 한 번만 울리기 위한 마지막 정수 초
  cardCount: 0,       // 몸으로 말해요 — 이번에 넘긴 카드 수
  clock: clock.createClock(),   // 수업 타이머 — 놀이를 바꿔도 이어서 흐른다
  clockId: null,
};

const $ = (id) => document.getElementById(id);

const SCREENS = {
  HOME: 'screen-home',
  SETUP: 'screen-setup',
  PROMPT: 'screen-quiz',
  HINT: 'screen-quiz',
  ANSWER: 'screen-quiz',
  CHAIN: 'screen-chain',
  GESTURE: 'screen-gesture',
  DONE: 'screen-done',
  ERROR: 'screen-error',
};

function show(screen) {
  if (screen !== 'ERROR' && !STATES.includes(screen)) return;
  // 끝말잇기 화면을 떠나면 타이머를 끊는다. 안 끊으면 다른 화면에서
  // 시간이 다 되어 판이 끝나 버린다.
  if (state.screen === 'CHAIN' && screen !== 'CHAIN') stopChainTimer();
  state.screen = screen;
  const wanted = SCREENS[screen];
  for (const id of new Set(Object.values(SCREENS))) {
    $(id).hidden = id !== wanted;
  }
  window.scrollTo(0, 0);
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ── 홈 ────────────────────────────────────────────────────── */

function renderHome() {
  const quiz = $('type-grid-quiz');
  const tool = $('type-grid-tool');
  quiz.textContent = '';
  tool.textContent = '';

  for (const [key, t] of Object.entries(TYPES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'type-card btn';
    btn.innerHTML =
      `<span class="type-emoji" aria-hidden="true">${t.emoji}</span>` +
      `<span class="type-body"><span class="type-label"></span>` +
      `<span class="type-blurb"></span></span>`;
    btn.querySelector('.type-label').textContent = t.label;
    btn.querySelector('.type-blurb').textContent = t.blurb;
    btn.addEventListener('click', () => openSetup(key));
    (t.kind === 'quiz' ? quiz : tool).appendChild(btn);
  }
}

/* ── 조건 선택 ──────────────────────────────────────────────── */

function optionButton(row, label, checked, onPick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'option-btn';
  btn.setAttribute('role', 'radio');
  btn.setAttribute('aria-checked', checked ? 'true' : 'false');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    for (const sib of row.querySelectorAll('.option-btn')) sib.setAttribute('aria-checked', 'false');
    btn.setAttribute('aria-checked', 'true');
    onPick();
  });
  row.appendChild(btn);
}

function openSetup(type) {
  state.type = type;
  state.level = 'all';
  state.topic = 'all';
  state.recentTopics = [];

  const t = TYPES[type];
  $('setup-title').textContent = `${t.emoji} ${t.label}`;

  const isChain = type === 'chain';
  $('group-level').hidden = isChain;
  $('group-topic').hidden = !t.topics;
  $('group-groups').hidden = !isChain;
  $('group-seconds').hidden = !isChain;

  if (!isChain) {
    const levelRow = $('opt-level');
    levelRow.textContent = '';
    for (const lv of ['all', ...LEVELS]) {
      optionButton(levelRow, LEVEL_LABEL[lv], lv === 'all', () => {
        state.level = lv;
        updateCount();
      });
    }
  }

  if (t.topics) {
    const topicRow = $('opt-topic');
    topicRow.textContent = '';
    // 그 유형에 실제로 문항이 있는 주제만 보여 준다 — 고르고 나서 "0개"가 되면
    // 선생님이 이유를 알 수 없다.
    const present = TOPICS.filter((tp) => candidates(state.items, { type, topic: tp }).length > 0);
    optionButton(topicRow, '전체', true, () => {
      state.topic = 'all';
      updateCount();
    });
    for (const tp of present) {
      optionButton(topicRow, tp, false, () => {
        state.topic = tp;
        updateCount();
      });
    }
  }

  if (isChain) {
    const gRow = $('opt-groups');
    gRow.textContent = '';
    for (const g of GROUPS) {
      optionButton(gRow, `${g}모둠`, g === state.groups, () => { state.groups = g; });
    }
    const sRow = $('opt-seconds');
    sRow.textContent = '';
    for (const s of SECONDS) {
      optionButton(sRow, `${s}초`, s === state.seconds, () => { state.seconds = s; });
    }
  }

  updateCount();
  show('SETUP');
}

function poolNow() {
  return candidates(state.items, { type: state.type, level: state.level, topic: state.topic });
}

function updateCount() {
  const el = $('setup-count');
  if (state.type === 'chain') {
    const n = candidates(state.items, { type: 'chain' }).length;
    el.textContent = `시작 단어 ${n}개 중에서 뽑아요.`;
    el.classList.toggle('is-empty', n === 0);
    $('btn-start').disabled = n === 0;
    return;
  }
  const n = poolNow().length;
  el.textContent = n === 0
    ? '이 조건에 맞는 문제가 없어요. 난이도나 주제를 바꿔 주세요.'
    : `고른 조건에 맞는 문제 ${n}개`;
  el.classList.toggle('is-empty', n === 0);
  $('btn-start').disabled = n === 0;
}

/* ── 출제 ──────────────────────────────────────────────────── */

function start() {
  // 첫 사용자 제스처에서 오디오를 깨운다 — 이보다 늦으면 자동재생 정책에 막힌다.
  sound.ensure();
  state.pool = poolNow();
  if (TYPES[state.type].kind === 'tool') {
    startTool();
    return;
  }
  if (state.pool.length === 0) return;
  nextItem();
}

function nextItem() {
  const got = pickNext(state.pool, {
    recentIds: store.recentIds(state.type),
    recentTopics: state.recentTopics,
  });
  if (!got) { show('HOME'); return; }

  // 후보를 다 돌았으면 기록을 접는다. 접지 않으면 다음 문항부터 계속 exhausted 다.
  if (got.exhausted) store.clearRecent(state.type);

  state.item = got.item;
  store.pushRecent(state.type, got.item.id);
  state.recentTopics = [...state.recentTopics, got.item.topic].slice(-TOPIC_MEMORY);
  state.hintOpened = false;
  state.counted = false;

  renderItem();
  setStage('PROMPT');
  show('PROMPT');
}

function renderItem() {
  const it = state.item;
  $('quiz-topic').textContent = it.topic || '';
  const prompt = $('quiz-prompt');
  prompt.textContent = it.prompt;
  prompt.dataset.len = lenClass(it.prompt);
  $('quiz-hint').textContent = it.hint;
  $('answer-text').textContent = it.answer;
  $('answer-text').hidden = false;   // 빈칸에 채운 문항에서는 정답을 아래에 또 띄우지 않는다

  const also = $('answer-also');
  const alsoList = Array.isArray(it.also) ? it.also.filter(Boolean) : [];
  also.hidden = alsoList.length === 0;
  also.textContent = alsoList.length ? `이것도 맞아요 — ${alsoList.join(' · ')}` : '';

  const note = $('answer-note');
  note.hidden = !it.note;
  note.textContent = it.note || '';

  $('quiz-count').textContent = `오늘 ${store.todayCount(todayStr())}문항`;
}

function setStage(stage) {
  const entering = state.stage !== stage;
  state.stage = stage;
  if (stage === 'HINT') state.hintOpened = true;
  const showAnswer = stage === 'ANSWER';

  if (entering && stage === 'HINT') sound.hint();
  if (entering && stage === 'ANSWER') sound.reveal();

  // 건너뛴 힌트는 정답과 함께 나타나지 않는다. 안 그러면 정답 버튼 한 번에
  // 힌트와 정답이 동시에 튀어나와, 아이들 눈이 어디를 봐야 할지 모른다.
  $('quiz-hint').hidden = !state.hintOpened;
  $('quiz-answer').hidden = !showAnswer;
  $('btn-hint').hidden = state.hintOpened || showAnswer;   // 힌트는 한 번만
  $('btn-reveal').hidden = showAnswer;
  $('btn-next').hidden = !showAnswer;

  if (showAnswer) {
    // 빈칸이 있는 유형(속담)은 그 자리를 채운다. 채웠으면 같은 답을 아래에
    // 한 번 더 띄우지 않는다 — 화면에 답이 두 번 나오면 어디를 읽어야 할지 흐려진다.
    const filledIn = fillBlank($('quiz-prompt'), state.item.prompt, state.item.answer);
    $('answer-text').hidden = filledIn;
  }

  if (showAnswer && !state.counted) {
    // 오늘 푼 수는 정답을 처음 열 때만 센다. 힌트를 여러 번 눌러도 늘지 않는다.
    state.counted = true;
    $('quiz-count').textContent = `오늘 ${store.bumpToday(todayStr())}문항`;
  }
}

/* Space 한 번의 뜻 — 지금 단계에서 "다음"에 해당하는 하나 */
function advanceStage() {
  if (state.stage === 'ANSWER') nextItem();
  else setStage('ANSWER');
}

function finish() {
  const n = store.todayCount(todayStr());
  $('done-text').textContent = n > 0 ? `오늘 ${n}문항 했어요!` : '오늘도 잘했어요!';
  show('DONE');
}

/* ── 도구형 (끝말잇기·몸으로 말해요) ──────────────────────────
   화면은 각자의 모듈에서 그린다. 여기서는 어느 화면으로 보낼지만 정한다. */

function startTool() {
  if (state.type === 'chain') { startChain(); return; }
  state.cardCount = 0;
  nextCard();
}

/* ── 몸으로 말해요 ──
   한 명만 화면을 등지고 맞힌다. 정답 데이터가 없으니 단계도 없다 —
   카드를 크게 띄우고 [다음 카드] 하나뿐이다. */

function nextCard() {
  const got = pickNext(state.pool, {
    recentIds: store.recentIds('gesture'),
    recentTopics: state.recentTopics,
  });
  if (!got) { show('HOME'); return; }
  if (got.exhausted) store.clearRecent('gesture');

  state.item = got.item;
  store.pushRecent('gesture', got.item.id);
  state.recentTopics = [...state.recentTopics, got.item.topic].slice(-TOPIC_MEMORY);
  state.cardCount += 1;

  $('gesture-topic').textContent = got.item.topic || '';
  $('gesture-word').textContent = got.item.word;
  $('gesture-count').textContent = `${state.cardCount}장`;
  show('GESTURE');
}

/* ── 끝말잇기 도우미 ──
   화면은 아이들이 말한 단어를 모른다(교사가 타이핑하지 않으므로).
   차례와 남은 시간만 맡고, 성공·탈락은 교사의 딸깍으로 기록한다. */

function startChain() {
  const pool = candidates(state.items, { type: 'chain' });
  const got = pickNext(pool, { recentIds: store.recentIds('chain') });
  if (!got) { show('HOME'); return; }
  if (got.exhausted) store.clearRecent('chain');
  store.pushRecent('chain', got.item.id);

  state.round = createRound({ word: got.item.word, groups: state.groups, seconds: state.seconds });
  state.paused = false;   // 지난 판을 멈춰 둔 채 나갔을 수 있다
  renderChain();
  show('CHAIN');
  startChainTimer();
}

function renderChain() {
  const r = state.round;
  // 시간이 다 됐지만 아직 교사가 판정하지 않은 상태. 판은 살아 있다.
  const expired = r.expired && !r.done;

  $('chain-word').textContent = r.word;
  $('chain-turn').textContent = r.done
    ? '판이 끝났어요'
    : expired ? `${r.turn}번 모둠 — 시간 초과` : `${r.turn}번 모둠 차례`;
  $('chain-turn').classList.toggle('is-expired', expired);

  const log = $('chain-log');
  log.textContent = '';
  for (const e of r.log) {
    const chip = document.createElement('span');
    chip.className = 'chain-log-item' + (e.result === 'ok' ? '' : ' is-out');
    const mark = e.result === 'ok' ? '✓' : e.result === 'timeout' ? '⏱' : '✗';
    chip.textContent = `${e.turn}번 ${mark}`;
    log.appendChild(chip);
  }

  // 시간이 다 되면 두 버튼의 *뜻*이 바뀐다 — 자리는 그대로 둔다.
  // 교사는 화면이 아니라 교실을 보고 있으므로, 손이 기억한 위치가 흔들리면 안 된다.
  // Space 는 어느 쪽이든 "지금 가장 흔한 다음"에 붙는다.
  $('btn-chain-ok').innerHTML = expired ? '그래도 성공' : '성공 <kbd>Space</kbd>';
  $('btn-chain-out').innerHTML = expired ? '시간 초과 ⏱ <kbd>Space</kbd>' : '탈락';
  $('btn-chain-ok').hidden = r.done;
  $('btn-chain-out').hidden = r.done;
  $('btn-chain-again').hidden = !r.done;

  const pause = $('btn-chain-pause');
  pause.hidden = r.done || expired;
  pause.textContent = state.paused ? '▶ 이어서 (P)' : '⏸ 잠깐 (P)';
  pause.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
}

function stopChainTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

const TICK_MS = 100;      // 링이 뚝뚝 끊기지 않을 만큼만 자주 (숫자는 초 단위로 바뀐다)
const URGENT_FROM = 3;    // 남은 3초부터 초읽기

function startChainTimer() {
  stopChainTimer();
  state.paused = false;
  state.deadline = Date.now() + state.round.seconds * 1000;
  // 시작하자마자 초읽기가 울리지 않게 첫 초보다 위에서 시작한다.
  state.lastTick = state.round.seconds + 1;
  // 남은 시간은 벽시계(Date.now)로 계산한다. 인터벌이 몇 번 돌았는지로 세면
  // 탭이 백그라운드로 갔을 때 브라우저가 인터벌을 늦춰 시간이 어긋난다.
  state.timerId = setInterval(tickChainTimer, TICK_MS);
  tickChainTimer();
}

function tickChainTimer() {
  const leftMs = Math.max(0, state.deadline - Date.now());
  paintTimer(leftMs);

  // 초읽기는 정수 초가 내려간 순간에만. 인터벌은 그보다 훨씬 자주 돈다.
  const left = Math.ceil(leftMs / 1000);
  if (left > 0 && left <= URGENT_FROM && left < state.lastTick) sound.tick();
  state.lastTick = left;

  if (leftMs === 0) chainTimeUp();
}

/* 0 초 — 소리 한 번 울리고 화면은 여기서 멈춘다.
   다음에 무슨 일이 일어날지는 교사의 딸깍이 정한다. */
function chainTimeUp() {
  stopChainTimer();
  state.round = expire(state.round);
  sound.timeUp();
  renderChain();
}

function toggleChainPause() {
  if (state.round.done || state.round.expired) return;
  if (state.paused) {
    state.deadline = Date.now() + state.remainMs;
    state.paused = false;
    state.timerId = setInterval(tickChainTimer, TICK_MS);
    tickChainTimer();
  } else {
    state.remainMs = Math.max(0, state.deadline - Date.now());
    stopChainTimer();
    state.paused = true;
    paintTimer(state.remainMs);
  }
  renderChain();
}

function paintTimer(leftMs) {
  const el = $('chain-timer');
  const left = Math.ceil(leftMs / 1000);
  el.textContent = String(left);
  // 색으로만 알리지 않는다 — CSS 에서 크기도 함께 커지고, 링이 함께 줄어든다.
  el.classList.toggle('is-urgent', left > 0 && left <= URGENT_FROM);
  el.classList.toggle('is-over', left === 0);

  // 링은 남은 비율(0~1)로 그린다. 뒷자리에서는 숫자보다 줄어드는 호가 먼저 읽힌다.
  const total = state.round ? state.round.seconds * 1000 : 1;
  const clock = $('chain-clock');
  clock.style.setProperty('--left', String(Math.max(0, Math.min(1, leftMs / total))));
  clock.classList.toggle('is-paused', state.paused);
  clock.classList.toggle('is-over', leftMs === 0);
}

function chainAdvance(result) {
  stopChainTimer();
  state.round = advance(state.round, result);
  renderChain();
  if (!state.round.done) startChainTimer();
}

/* ── 수업 타이머 ───────────────────────────────────────────────
   규칙(js/clock.js)은 DOM 을 모른다. 여기서는 그리고 듣기만 한다.
   화면을 옮겨도 끊지 않는다 — show() 가 이 시계를 건드리지 않는 것이 핵심이다.
   (끝말잇기 차례 타이머는 반대로 화면을 떠나면 끊는다. 다른 물건이다.) */

const CLOCK_TICK_MS = 250;      // 숫자는 초 단위로만 바뀐다. 이보다 자주 볼 이유가 없다.
const CLOCK_URGENT_MS = 10000;  // 마지막 10초부터 커진다

function renderClock() {
  const c = state.clock;
  const left = clock.remaining(c, Date.now());
  const urgent = c.running && left > 0 && left <= CLOCK_URGENT_MS;
  const idle = clock.isIdle(c);

  $('clock').dataset.state = idle ? 'idle'
    : c.expired ? 'over'
    : urgent ? 'urgent'
    : c.running ? 'running' : 'paused';

  $('clock-time').textContent = c.expired ? '시간 끝' : clock.format(left);
  $('clock-label').textContent = c.expired ? '수업 타이머 — 끝' : '수업 타이머';

  // 지금 걸려 있는 시간에 표시를 남긴다 — 3분을 걸어 뒀는지 5분인지 나중에 헷갈린다.
  for (const b of $('clock-picks').children) {
    b.setAttribute('aria-pressed', !idle && Number(b.dataset.min) === c.totalMs / 60000 ? 'true' : 'false');
  }

  const pause = $('btn-clock');
  const canPause = !idle && !c.expired;
  pause.disabled = !canPause;
  pause.innerHTML = c.running || !canPause ? '⏸ 잠깐 <kbd>P</kbd>' : '▶ 이어서 <kbd>P</kbd>';
  // 눈으로 보이는 글자와 화면 낭독기가 읽는 말이 서로 어긋나지 않게 한다.
  pause.setAttribute('aria-label', !canPause ? '잠깐 멈춤 — 걸어 둔 시간이 없어요'
    : c.running ? `남은 시간 ${clock.format(left)}, 잠깐 멈추기`
    : `${clock.format(left)} 남기고 멈춤. 이어서 하기`);

  $('btn-clock-reset').disabled = idle;
}

function startClockTicking() {
  stopClockTicking();
  state.clockId = setInterval(clockTick, CLOCK_TICK_MS);
}

function stopClockTicking() {
  if (state.clockId !== null) {
    clearInterval(state.clockId);
    state.clockId = null;
  }
}

function clockTick() {
  const next = clock.tick(state.clock, Date.now());
  const justEnded = next.expired && !state.clock.expired;
  state.clock = next;
  if (justEnded) {
    stopClockTicking();
    sound.sessionEnd();
  }
  renderClock();
}

/* 고르는 순간이 곧 시작이다. 시간이 끝나도 놀이를 닫지 않는다 —
   답을 외치는 중에 화면이 혼자 홈으로 돌아가 버리면 곤란하다. */
function setClockMinutes(minutes) {
  sound.ensure();     // 첫 사용자 조작 — 여기서 오디오를 깨워 둔다
  state.clock = clock.start(state.clock, minutes, Date.now());
  startClockTicking();
  renderClock();
}

function resetClock() {
  stopClockTicking();
  state.clock = clock.createClock();
  renderClock();
}

/* 걸어 둔 시간이 없거나 이미 끝났으면 아무 일도 하지 않는다 —
   잠깐 멈춤은 "멈춤"이지 "타이머 켜기"가 아니다. */
function pauseClockNow() {
  const c = state.clock;
  if (!c.running) return;
  state.clock = clock.pause(c, Date.now());
  stopClockTicking();
  renderClock();
}

function resumeClockNow() {
  const c = state.clock;
  if (c.running || c.expired || clock.isIdle(c)) return;
  state.clock = clock.resume(c, Date.now());
  startClockTicking();
  renderClock();
}

function toggleClockPause() {
  if (state.clock.running) pauseClockNow(); else resumeClockNow();
}

/** `P` 와 끝말잇기의 [⏸ 잠깐] 이 함께 부른다.
    끝말잇기 화면에서는 차례 타이머와 수업 타이머가 한 번에 멈춘다 — 아이 말을
    되물을 때 둘 중 하나만 멈추면 소용이 없다. 하나라도 흐르고 있으면 둘 다
    멈추고, 아무것도 흐르지 않으면 둘 다 이어서 간다(따로 놀지 않게). */
function togglePauseAll() {
  const chainLive = state.screen === 'CHAIN' && state.round && !state.round.done && !state.round.expired;
  const running = state.clock.running || (chainLive && !state.paused);
  if (chainLive && state.paused !== running) toggleChainPause();
  if (running) pauseClockNow(); else resumeClockNow();
}

/* 시간 버튼은 늘 펴 둔다. 접어 두면 3분을 걸려고 딸깍을 두 번 해야 하는데,
   교실에서는 그 한 박자가 늦다 (교사 조작을 늘리지 않는다 — PRD 4절과 같은 뜻). */
function buildClockPicks() {
  const picks = $('clock-picks');
  for (const m of clock.MINUTES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.min = String(m);
    b.setAttribute('aria-pressed', 'false');
    b.textContent = `${m}분`;
    b.addEventListener('click', () => setClockMinutes(m));
    picks.appendChild(b);
  }
}

/* ── 부팅 ──────────────────────────────────────────────────── */

function wire() {
  $('brand-home').addEventListener('click', (e) => { e.preventDefault(); show('HOME'); });
  $('btn-setup-back').addEventListener('click', () => show('HOME'));
  $('btn-start').addEventListener('click', start);
  $('btn-hint').addEventListener('click', () => setStage('HINT'));
  $('btn-reveal').addEventListener('click', () => setStage('ANSWER'));
  $('btn-next').addEventListener('click', nextItem);
  $('btn-skip').addEventListener('click', nextItem);
  $('btn-quit').addEventListener('click', finish);
  $('btn-continue').addEventListener('click', () => (state.item ? nextItem() : show('HOME')));
  $('btn-home').addEventListener('click', () => show('HOME'));

  // 시간 초과 뒤의 [탈락] 자리는 '시간 초과'다 — 기록에 ⏱ 로 남는다.
  $('btn-chain-ok').addEventListener('click', () => chainAdvance('ok'));
  $('btn-chain-out').addEventListener('click', () => chainAdvance(state.round.expired ? 'timeout' : 'out'));
  $('btn-chain-pause').addEventListener('click', togglePauseAll);
  $('btn-chain-again').addEventListener('click', startChain);
  $('btn-chain-new').addEventListener('click', startChain);
  $('btn-chain-quit').addEventListener('click', () => show('HOME'));

  $('btn-gesture-next').addEventListener('click', nextCard);
  $('btn-gesture-quit').addEventListener('click', () => show('HOME'));

  buildClockPicks();
  renderClock();
  $('btn-clock').addEventListener('click', togglePauseAll);
  $('btn-clock-reset').addEventListener('click', resetClock);

  const mute = $('btn-mute');
  const paintMute = () => mute.setAttribute('aria-pressed', store.isMuted() ? 'true' : 'false');
  paintMute();
  sound.setMuted(store.isMuted());
  mute.addEventListener('click', () => {
    store.setMuted(!store.isMuted());
    sound.setMuted(store.isMuted());
    paintMute();
  });

  // 버튼에 포커스가 남으면 Space 가 두 번 먹는다(클릭 + 키보드). 눌린 뒤 포커스를 뗀다.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) b.blur();
  });

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const onQuiz = state.screen === 'PROMPT' || state.screen === 'HINT' || state.screen === 'ANSWER';
    const onChain = state.screen === 'CHAIN';
    const onGesture = state.screen === 'GESTURE';

    if (e.key === 'Escape') {
      if (onQuiz) { e.preventDefault(); finish(); }
      else if (onChain || onGesture) { e.preventDefault(); show('HOME'); }
      return;
    }

    // P 는 어느 화면에서든 "잠깐". 끝말잇기에서는 차례 타이머와 수업 타이머가
    // 한 번에 멈춘다 — 아이 말을 되물을 때 둘 중 하나만 멈추면 소용이 없다.
    // (한글 자판이 켜져 있으면 P 자리에서 'ㅔ' 가 온다 — 교실에서 흔한 상황이다.)
    if (e.key === 'p' || e.key === 'P' || e.key === 'ㅔ') {
      e.preventDefault();
      togglePauseAll();
      return;
    }

    if (onGesture) {
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); nextCard(); }
      return;
    }

    if (onChain) {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!state.round) return;
        // 시간이 다 됐으면 Space 의 뜻이 '시간 초과'로 옮겨 간다 — 화면의 버튼과 같다.
        if (state.round.done) startChain();
        else if (state.round.expired) chainAdvance('timeout');
        else chainAdvance('ok');
      }
      return;
    }
    if (!onQuiz) return;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();       // 스크롤 방지
      advanceStage();
    } else if (e.key === 'h' || e.key === 'H' || e.key === 'ㅗ') {
      // 한글 자판이 켜져 있으면 H 자리에서 'ㅗ' 가 온다 — 교실에서 흔한 상황이다.
      e.preventDefault();
      if (state.stage === 'PROMPT') setStage('HINT');
    }
  });
}

async function boot() {
  wire();
  try {
    const res = await fetch('data/words.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.items = Array.isArray(data.items) ? data.items : [];
    if (state.items.length === 0) throw new Error('빈 데이터');
  } catch {
    show('ERROR');
    return;
  }
  renderHome();
  show('HOME');
}

boot();

// 오프라인 (FR-09). 등록에 실패해도 앱은 그대로 돌아간다 — 오프라인만 안 될 뿐이다.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
