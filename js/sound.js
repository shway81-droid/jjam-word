/* ── Web Audio 합성 효과음 ──
   음원 파일을 두지 않는다 (PRD 10절): 저작권 0, 용량 0, 오프라인 완전 동작.
   AudioContext 는 첫 사용자 조작 뒤에 만든다 — 자동재생 정책 때문.
   소리는 항상 보조다. 음소거 상태로도 전 기능이 완결된다 (PRD 12절). */

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

function tone(freq, at, dur, peak, type = 'sine') {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + at;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/* 힌트 — 아주 작은 한 음. "뭔가 열렸다" 정도의 신호. */
function hint() {
  if (!ensure()) return;
  tone(660, 0, 0.18, 0.05, 'triangle');
}

/* 정답 공개 — 도-미-솔 상승 아르페지오. 반 전체가 외친 직후의 "맞았다" 신호. */
function reveal() {
  if (!ensure()) return;
  [[523.25, 0], [659.25, 0.09], [783.99, 0.18]].forEach(([f, at]) => tone(f, at, 0.5, 0.08));
}

/* 남은 3초 초읽기 — 짧고 마른 한 점. 초읽기는 재촉이지 경고가 아니므로
   시간 초과 소리보다 확실히 작고 짧게 둔다. */
function tick() {
  if (!ensure()) return;
  tone(880, 0, 0.07, 0.035, 'triangle');
}

/* 시간 초과 — 끝말잇기에서 쓴다. 내려가는 두 음, 야단치는 소리가 아니게 작게. */
function timeUp() {
  if (!ensure()) return;
  [[440, 0], [330, 0.16]].forEach(([f, at]) => tone(f, at, 0.34, 0.06, 'triangle'));
}

function setMuted(v) {
  muted = !!v;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
}

export const sound = { ensure, hint, reveal, tick, timeUp, setMuted };
