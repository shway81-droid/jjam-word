// pick.js 순수 로직 테스트 — 출제 규칙(PRD 8절)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { candidates, pickNext, RECENT_LIMIT } from '../js/pick.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { items } = JSON.parse(readFileSync(join(root, 'data', 'words.json'), 'utf8'));

// 순서가 정해진 가짜 난수 — 무작위 함수를 결정적으로 시험한다
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test('candidates: 유형으로 거른다', () => {
  const out = candidates(items, { type: 'choseong' });
  assert.ok(out.length > 0);
  assert.ok(out.every((it) => it.type === 'choseong'));
});

test('candidates: level 이 all 이면 난이도를 가리지 않는다', () => {
  const all = candidates(items, { type: 'choseong', level: 'all' });
  const easy = candidates(items, { type: 'choseong', level: 'easy' });
  assert.ok(all.length >= easy.length);
  assert.ok(easy.every((it) => it.level === 'easy'));
});

test('candidates: topic 으로 거른다', () => {
  const out = candidates(items, { type: 'choseong', topic: '동물' });
  assert.ok(out.length > 0);
  assert.ok(out.every((it) => it.topic === '동물'));
});

test('pickNext: 후보가 없으면 null', () => {
  assert.equal(pickNext([]), null);
});

test('pickNext: 최근 출제한 문항은 나오지 않는다', () => {
  const pool = candidates(items, { type: 'choseong' });
  const recentIds = pool.slice(0, pool.length - 1).map((it) => it.id);
  const got = pickNext(pool, { recentIds, rng: seq(0) });
  assert.equal(got.item.id, pool[pool.length - 1].id);
  assert.equal(got.exhausted, false);
});

test('pickNext: 후보가 다 소진되면 exhausted 를 알리고 처음부터 다시 낸다', () => {
  const pool = candidates(items, { type: 'choseong' });
  const recentIds = pool.map((it) => it.id);
  const got = pickNext(pool, { recentIds, rng: seq(0) });
  assert.equal(got.exhausted, true);
  assert.ok(pool.some((it) => it.id === got.item.id));
});

test('pickNext: 같은 주제가 3연속으로 나오지 않는다', () => {
  const pool = candidates(items, { type: 'choseong' });
  const got = pickNext(pool, { recentTopics: ['동물', '동물'], rng: seq(0) });
  assert.notEqual(got.item.topic, '동물');
});

test('pickNext: 주제를 피할 수 없으면(그 주제만 남으면) 그냥 낸다', () => {
  const only = candidates(items, { type: 'choseong', topic: '동물' });
  const got = pickNext(only, { recentTopics: ['동물', '동물'], rng: seq(0) });
  assert.equal(got.item.topic, '동물');
});

test('pickNext: topic 이 null 인 유형(속담 등)에는 주제 규칙이 걸리지 않는다', () => {
  const pool = [
    { id: 'a', type: 'proverb', level: 'easy', topic: null },
    { id: 'b', type: 'proverb', level: 'easy', topic: null },
  ];
  const got = pickNext(pool, { recentTopics: [null, null], rng: seq(0) });
  assert.ok(got !== null);
});

test('RECENT_LIMIT 은 PRD 8절대로 50', () => {
  assert.equal(RECENT_LIMIT, 50);
});
