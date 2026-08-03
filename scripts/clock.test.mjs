// clock.js — 수업 타이머 (순수 로직)
// 시간을 밖에서 넣어 주므로 실제로 기다리지 않고 시험한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock, isIdle, start, remaining, tick, pause, resume, format, MINUTES } from '../js/clock.js';

const T0 = 1_700_000_000_000;   // 아무 시각이나. 벽시계 값 자체는 뜻이 없다.
const MIN = 60_000;

test('createClock: 아무 시간도 걸리지 않은 상태', () => {
  const c = createClock();
  assert.equal(isIdle(c), true);
  assert.equal(c.running, false);
  assert.equal(c.expired, false);
  assert.equal(remaining(c, T0), 0);
});

test('start: 고르는 순간이 곧 시작이다', () => {
  const c = start(createClock(), 3, T0);
  assert.equal(c.running, true);
  assert.equal(isIdle(c), false);
  assert.equal(remaining(c, T0), 3 * MIN);
  assert.equal(remaining(c, T0 + MIN), 2 * MIN);
});

test('start: 고를 수 있는 시간은 1~5분', () => {
  assert.deepEqual(MINUTES, [1, 2, 3, 4, 5]);
  for (const m of MINUTES) {
    assert.equal(start(createClock(), m, T0).totalMs, m * MIN);
  }
});

test('tick: 0 에 닿으면 멈추고 expired 가 선다', () => {
  const c = start(createClock(), 1, T0);
  const mid = tick(c, T0 + 30_000);
  assert.equal(mid.expired, false);
  assert.equal(mid.running, true);

  const over = tick(c, T0 + MIN);
  assert.equal(over.expired, true);
  assert.equal(over.running, false);
  assert.equal(remaining(over, T0 + 5 * MIN), 0);
});

test('tick: 0 을 지나 한참 뒤에 깨어나도 음수가 되지 않는다', () => {
  // 전자칠판을 덮어 두면 탭이 잠들었다가 한참 뒤에 깨어난다.
  const c = start(createClock(), 1, T0);
  const over = tick(c, T0 + 30 * MIN);
  assert.equal(over.remainMs, 0);
  assert.equal(over.expired, true);
});

test('pause/resume: 멈춘 동안에는 시간이 흐르지 않는다', () => {
  const c = start(createClock(), 3, T0);
  const p = pause(c, T0 + MIN);                 // 1분 쓰고 멈춤
  assert.equal(p.running, false);
  assert.equal(remaining(p, T0 + 10 * MIN), 2 * MIN);   // 아무리 지나도 그대로

  const r = resume(p, T0 + 10 * MIN);           // 9분 뒤에 다시 시작
  assert.equal(r.running, true);
  assert.equal(remaining(r, T0 + 10 * MIN), 2 * MIN);
  assert.equal(remaining(r, T0 + 11 * MIN), MIN);
});

test('resume: 끝난 시계는 다시 흐르지 않는다', () => {
  const over = tick(start(createClock(), 1, T0), T0 + MIN);
  assert.equal(resume(over, T0 + 2 * MIN).running, false);
});

test('resume: 걸어 둔 시간이 없으면 아무 일도 없다', () => {
  assert.equal(resume(createClock(), T0).running, false);
});

test('pause: 이미 멈춘 시계를 또 멈춰도 남은 시간이 줄지 않는다', () => {
  const p = pause(start(createClock(), 2, T0), T0 + 30_000);
  const pp = pause(p, T0 + 10 * MIN);
  assert.equal(pp.remainMs, p.remainMs);
});

test('start: 이미 돌던 시계에 새 시간을 걸면 처음부터 다시 잰다', () => {
  const c = pause(start(createClock(), 5, T0), T0 + 4 * MIN);
  const again = start(c, 2, T0 + 4 * MIN);
  assert.equal(again.running, true);
  assert.equal(again.expired, false);
  assert.equal(remaining(again, T0 + 4 * MIN), 2 * MIN);
});

test('불변: 원래 객체는 손대지 않는다', () => {
  const c = start(createClock(), 3, T0);
  const before = { ...c };
  pause(c, T0 + MIN);
  tick(c, T0 + 3 * MIN);
  assert.deepEqual(c, before);
});

test('format: 자리 수가 흔들리지 않는다', () => {
  assert.equal(format(3 * MIN), '3:00');
  assert.equal(format(59_000), '0:59');
  assert.equal(format(1000), '0:01');
  assert.equal(format(0), '0:00');
  assert.equal(format(-5000), '0:00');
  // 0.5초가 남았어도 아직 "1초"로 보여 준다 — 0 은 진짜 끝났을 때만.
  assert.equal(format(500), '0:01');
});
