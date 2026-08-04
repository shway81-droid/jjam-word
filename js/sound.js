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

/* 초침 소리 한 번 — 잡음을 아주 짧게 끊어 낸다.
   맑은 음(오실레이터)으로 만들면 "삑" 하는 전자음이 되지 두 물체가 부딪는 소리가
   되지 않는다. 시계 소리는 음정이 아니라 딱딱한 마찰음이라, 백색잡음을 좁은
   대역으로 걸러 20ms 안에 떨어뜨린다. */
function clack(freq, peak) {
  const dur = 0.035;
  const buf = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  // 좁은 대역만 남겨야 "치익" 이 아니라 "똑" 이 된다.
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = 9;

  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(peak, t);          // 시작이 곧 최대 — 초침에는 여는 시간이 없다
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(band);
  band.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/* 수업 타이머 재깍재깍 — 1초에 한 번. level 0~1 로 세기를 받는다.
   마지막 10초에 점점 커지는 것이 이 소리의 일이다. 늘 같은 크기면 배경음이 되어
   아무도 안 듣지만, 커지면 "곧 끝난다"가 귀로 먼저 온다.
   짝·홀수 초의 대역을 달리해 "재깍-재깍" 두 소리로 들리게 한다. */
function tock(level = 0, high = false) {
  if (!ensure()) return;
  const t = Math.max(0, Math.min(1, level));
  clack(high ? 3200 : 2100, 0.12 + t * 0.5);
}

/* 수업 타이머 끝 — 차례 타이머(timeUp)와 반드시 달라야 한다. 끝말잇기 화면에서는
   둘이 같은 화면에서 울리므로, 소리가 같으면 "누구 시간이 끝났는지"를 못 가린다.
   이쪽은 세 음이 올라갔다 내려온다 — 종료를 알리는 소리지 재촉이 아니다. */
function sessionEnd() {
  if (!ensure()) return;
  [[523.25, 0], [698.46, 0.18], [392.0, 0.4]].forEach(([f, at]) => tone(f, at, 0.6, 0.07, 'triangle'));
}

function setMuted(v) {
  muted = !!v;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
}

export const sound = { ensure, hint, reveal, tick, tock, timeUp, sessionEnd, setMuted };
