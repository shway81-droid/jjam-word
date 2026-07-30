// store.js — localStorage 래퍼. 브라우저 없이 시험하려고 backend 를 주입한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/store.js';
import { RECENT_LIMIT } from '../js/pick.js';

function memoryBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test('recentIds: 처음에는 비어 있다', () => {
  const s = createStore(memoryBackend());
  assert.deepEqual(s.recentIds('choseong'), []);
});

test('pushRecent: 최신이 앞에 오고 유형별로 나뉜다', () => {
  const s = createStore(memoryBackend());
  s.pushRecent('choseong', 'a');
  s.pushRecent('choseong', 'b');
  s.pushRecent('proverb', 'p');
  assert.deepEqual(s.recentIds('choseong'), ['b', 'a']);
  assert.deepEqual(s.recentIds('proverb'), ['p']);
});

test('pushRecent: RECENT_LIMIT 을 넘기면 오래된 것부터 버린다', () => {
  const s = createStore(memoryBackend());
  for (let i = 0; i < RECENT_LIMIT + 10; i++) s.pushRecent('choseong', `id-${i}`);
  const got = s.recentIds('choseong');
  assert.equal(got.length, RECENT_LIMIT);
  assert.equal(got[0], `id-${RECENT_LIMIT + 9}`);
  assert.ok(!got.includes('id-0'));
});

test('pushRecent: 같은 id 를 다시 넣어도 중복되지 않는다', () => {
  const s = createStore(memoryBackend());
  s.pushRecent('choseong', 'a');
  s.pushRecent('choseong', 'b');
  s.pushRecent('choseong', 'a');
  assert.deepEqual(s.recentIds('choseong'), ['a', 'b']);
});

test('clearRecent: 그 유형만 비운다', () => {
  const s = createStore(memoryBackend());
  s.pushRecent('choseong', 'a');
  s.pushRecent('proverb', 'p');
  s.clearRecent('choseong');
  assert.deepEqual(s.recentIds('choseong'), []);
  assert.deepEqual(s.recentIds('proverb'), ['p']);
});

test('저장소가 새로고침을 넘어 유지된다 (같은 backend 로 다시 열기)', () => {
  const backend = memoryBackend();
  createStore(backend).pushRecent('choseong', 'a');
  assert.deepEqual(createStore(backend).recentIds('choseong'), ['a']);
});

test('깨진 값이 들어 있어도 터지지 않고 빈 배열로 돈다', () => {
  const backend = memoryBackend();
  backend.setItem('jjam-word:recent:choseong', '{{{');
  assert.deepEqual(createStore(backend).recentIds('choseong'), []);
});

test('음소거 설정이 저장된다', () => {
  const backend = memoryBackend();
  const s = createStore(backend);
  assert.equal(s.isMuted(), false);
  s.setMuted(true);
  assert.equal(createStore(backend).isMuted(), true);
});

test('오늘 푼 수는 날짜가 바뀌면 0부터 다시 센다', () => {
  const s = createStore(memoryBackend());
  assert.equal(s.bumpToday('2026-07-29'), 1);
  assert.equal(s.bumpToday('2026-07-29'), 2);
  assert.equal(s.todayCount('2026-07-29'), 2);
  assert.equal(s.todayCount('2026-07-30'), 0);
  assert.equal(s.bumpToday('2026-07-30'), 1);
});

test('저장이 막힌 환경(setItem 이 던지는)에서도 앱이 멈추지 않는다', () => {
  const s = createStore({
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError'); },
  });
  s.pushRecent('choseong', 'a');       // 던지지 않아야 한다
  s.setMuted(true);
  assert.deepEqual(s.recentIds('choseong'), []);
  assert.equal(s.isMuted(), false);
});
