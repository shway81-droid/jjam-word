/* 금칙어 게이트 테스트 — 두 방향을 다 지킨다.
   (1) 진짜 위반은 반드시 잡는다
   (2) 멀쩡한 말은 잡지 않는다  ← 오탐이 쌓이면 사람이 게이트를 끄게 된다 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { violations, CHOSEONG_BANNED } from '../scripts/banned.mjs';

// 실제로 오탐이 났던 사례들. 하나라도 걸리면 문항을 못 쓰게 된다.
const CLEAN = [
  '설거지할 때 써요.',
  '사장님이 오셨어요.',
  '교장님 말씀을 들어요.',
  '반장님을 불러요.',
  '계모임에 다녀왔어요.',
  '물을 주면 불이 꺼져요.',
  '폭포가 장관이에요.',
  '영향을 미친 일이에요.',
  '해를 미친 적이 없어요.',
  '어려움에도 불구하고 해냈어요.',
  '정부 부처가 발표했어요.',
];

const DIRTY = [
  ['거지가 되었다', '가정 형편'],
  ['장님 코끼리 만지듯', '장애 비하'],
  ['계모가 시켰다', '가정 형편'],
  ['시끄러워, 꺼져', '비속어'],
  ['꺼져라', '비속어'],
  ['미친 사람처럼', '비속어'],
  ['바보 같은 짓', '비속어'],
  ['가난한 집 아이', '가정 형편'],
  ['일등을 했어요', '성적·등수'],
  ['꼴찌를 했어요', '성적·등수'],
  ['대통령 선거가 있어요', '정치'],
  ['하나님께 기도문을 읊어요', '종교'],
  ['뚱뚱하다고 놀렸다', '외모'],
  ['벙어리 냉가슴', '장애 비하'],
];

test('멀쩡한 말을 금칙어로 잡지 않는다', () => {
  for (const t of CLEAN) {
    assert.deepEqual(violations(t), [], `오탐: "${t}"`);
  }
});

test('진짜 위반은 빠짐없이 잡는다', () => {
  for (const [t, kind] of DIRTY) {
    const v = violations(t);
    assert.ok(v.length > 0, `놓침: "${t}" (${kind})`);
  }
});

test('violations 는 걸린 사유를 돌려준다', () => {
  const v = violations('가난한 거지');
  assert.equal(v.length, 1);
  assert.match(v[0], /가정 형편/);
});

/* ── 초성퀴즈 전용 ──
   초성만 화면 가득 띄우므로, 낱말이 멀쩡해도 초성이 욕설로 읽히면 못 쓴다.
   수박(ㅅㅂ)·버스(ㅂㅅ) 가 실제로 그렇게 걸려 다른 낱말로 바뀌었다. */

test('욕설로 읽히는 초성은 목록에 있다', () => {
  for (const c of ['ㅅㅂ', 'ㅂㅅ', 'ㅆㅂ', 'ㅈㄹ']) {
    assert.ok(CHOSEONG_BANNED.includes(c), `빠짐: ${c}`);
  }
});

test('세 글자 초성은 막지 않는다 — 소방관·줄넘기까지 날아간다', () => {
  for (const c of ['ㅅㅂㄱ', 'ㅈㄴㄱ', 'ㅂㅅㄱ', 'ㅁㅊㄷ']) {
    assert.ok(!CHOSEONG_BANNED.includes(c), `과잉 차단: ${c}`);
  }
});

test('바뀐 낱말의 초성은 깨끗하다', () => {
  for (const c of ['ㅍㄷ', 'ㄱㄱㅊ']) {   // 포도, 구급차
    assert.ok(!CHOSEONG_BANNED.includes(c));
  }
});
