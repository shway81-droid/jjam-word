/* ── 수업 타이머 — 자투리 시간 자체를 재는 시계 ──
   끝말잇기의 차례 타이머(chain.js)와 다른 물건이다. 저쪽은 "한 모둠이 말할
   시간"이고, 이쪽은 "오늘 이 놀이에 쓸 시간" 전체다. 3분을 걸어 놓으면
   초성퀴즈를 하다 수수께끼로 갈아타도 시간은 이어서 흐른다 — 그래서 이
   시계는 어느 놀이에도 속하지 않고 상단바에 혼자 산다.

   남은 시간은 벽시계(now)로 계산한다. 인터벌이 몇 번 돌았는지로 세면 탭이
   백그라운드로 갔을 때 브라우저가 인터벌을 늦춰 시간이 어긋난다. 그래서
   now 를 밖에서 받는다 — 덤으로 이 파일은 시간에 의존하지 않아 시험하기 쉽다.

   chain.js 와 같이 불변 객체로 다룬다. */

export const MINUTES = [1, 2, 3, 4, 5];

const MS_PER_MIN = 60000;

/** 꺼져 있는 시계. totalMs 가 0 이면 "아직 아무 시간도 걸지 않았다"는 뜻이다. */
export function createClock() {
  return { totalMs: 0, endsAt: 0, remainMs: 0, running: false, expired: false };
}

export function isIdle(clock) {
  return clock.totalMs === 0;
}

/** 시간을 걸고 곧바로 시작한다. 고르는 순간이 곧 시작이다 —
    [3분] 을 누르고 다시 [시작] 을 눌러야 한다면 교실에서 한 박자 늦는다. */
export function start(clock, minutes, now) {
  const m = Math.max(1, Math.round(Number(minutes) || 0));
  const totalMs = m * MS_PER_MIN;
  return { totalMs, endsAt: now + totalMs, remainMs: totalMs, running: true, expired: false };
}

/** 지금 남은 시간(ms). 멈춰 있으면 멈춘 순간의 값이 그대로 남는다. */
export function remaining(clock, now) {
  if (isIdle(clock)) return 0;
  if (!clock.running) return clock.remainMs;
  return Math.max(0, clock.endsAt - now);
}

/** 인터벌마다 부른다. 0 에 닿으면 멈추고 expired 를 세운다.
    끝났다고 해서 놀이를 닫지는 않는다 — 그 판단은 화면 밖(교사)의 몫이다. */
export function tick(clock, now) {
  if (!clock.running) return clock;
  const left = Math.max(0, clock.endsAt - now);
  if (left === 0) return { ...clock, remainMs: 0, running: false, expired: true };
  return left === clock.remainMs ? clock : { ...clock, remainMs: left };
}

export function pause(clock, now) {
  if (!clock.running) return clock;
  return { ...clock, running: false, remainMs: Math.max(0, clock.endsAt - now) };
}

export function resume(clock, now) {
  if (clock.running || clock.expired || isIdle(clock)) return clock;
  return { ...clock, running: true, endsAt: now + clock.remainMs };
}

/** m:ss. 1 분 미만이어도 앞자리를 남긴다 — 자리 수가 흔들리면 상단바가 들썩인다. */
export function format(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
