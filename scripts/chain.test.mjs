// chain.js — 끝말잇기 차례 진행 규칙 (순수 로직)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRound, advance } from '../js/chain.js';

test('createRound: 1번 차례부터 시작하고 기록은 비어 있다', () => {
  const r = createRound({ word: '기차', groups: 4, seconds: 10 });
  assert.equal(r.turn, 1);
  assert.deepEqual(r.log, []);
  assert.equal(r.done, false);
  assert.equal(r.word, '기차');
});

test('advance(ok): 다음 차례로 넘어가고 기록이 남는다', () => {
  const r = advance(createRound({ word: '기차', groups: 4, seconds: 10 }), 'ok');
  assert.equal(r.turn, 2);
  assert.deepEqual(r.log, [{ turn: 1, result: 'ok' }]);
  assert.equal(r.done, false);
});

test('advance: 마지막 모둠 다음은 1번으로 돌아온다', () => {
  let r = createRound({ word: '기차', groups: 3, seconds: 10 });
  r = advance(r, 'ok');
  r = advance(r, 'ok');
  assert.equal(r.turn, 3);
  r = advance(r, 'ok');
  assert.equal(r.turn, 1);
  assert.equal(r.log.length, 3);
});

test('advance(out): 그 차례에서 판이 끝난다', () => {
  const r = advance(createRound({ word: '기차', groups: 4, seconds: 10 }), 'out');
  assert.equal(r.done, true);
  assert.deepEqual(r.log, [{ turn: 1, result: 'out' }]);
});

test('advance(timeout): 시간이 다 되어도 판이 끝난다', () => {
  const r = advance(createRound({ word: '기차', groups: 4, seconds: 10 }), 'timeout');
  assert.equal(r.done, true);
  assert.deepEqual(r.log, [{ turn: 1, result: 'timeout' }]);
});

test('advance: 끝난 판은 더 진행되지 않는다', () => {
  const a = advance(createRound({ word: '기차', groups: 4, seconds: 10 }), 'out');
  const b = advance(a, 'ok');
  assert.deepEqual(b, a);
});

test('advance: 원본을 바꾸지 않는다', () => {
  const a = createRound({ word: '기차', groups: 4, seconds: 10 });
  advance(a, 'ok');
  assert.equal(a.turn, 1);
  assert.deepEqual(a.log, []);
});

test('createRound: 모둠 수와 시간은 최소값 아래로 내려가지 않는다', () => {
  const r = createRound({ word: '기차', groups: 0, seconds: 1 });
  assert.ok(r.groups >= 2);
  assert.ok(r.seconds >= 5);
});

// ── 시작 단어 데이터 ──
// 두음법칙 때문에 우리말에는 ㄹ 로 시작하는 낱말이 거의 없다. 시작 단어가
// 그런 글자로 끝나면 첫 아이부터 막힌다 — validate-data 도 같은 규칙으로 막지만,
// 실제 데이터에도 하나도 없는지 여기서 다시 본다.
test('시작 단어 60개는 모두 이어 갈 수 있는 끝 글자다', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { items } = JSON.parse(readFileSync(join(root, 'data', 'words.json'), 'utf8'));
  const chain = items.filter((it) => it.type === 'chain');
  assert.equal(chain.length, 60);
  const bad = chain.filter((it) => {
    const tail = it.word.codePointAt(it.word.length - 1);
    return tail >= 0xb77c && tail <= 0xb9c7;   // 초성이 ㄹ 인 음절 구간
  });
  assert.deepEqual(bad.map((b) => b.word), []);
  assert.equal(new Set(chain.map((c) => c.word)).size, 60, '단어 중복 없음');
});
