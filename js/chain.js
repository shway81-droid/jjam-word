/* ── 끝말잇기 도우미 — 차례 진행 규칙 ──
   화면은 아이들이 말한 단어를 모른다. 교사가 타이핑하지 않기 때문이다.
   PRD 5절이 "지나간 단어 목록(교사 입력 없이 딸깍 기록)"이라고 적었는데,
   단어를 남기려면 타이핑이 필요해 서로 모순이다. 입력 없는 쪽을 택해
   *차례*를 기록한다: 1번 ✓  2번 ✓  3번 ✗

   불변 객체로 다룬다 — 화면이 이전 상태를 붙들고 있어도 어긋나지 않는다. */

const MIN_GROUPS = 2;
const MIN_SECONDS = 5;

export function createRound({ word, groups, seconds }) {
  return {
    word,
    groups: Math.max(MIN_GROUPS, Number(groups) || MIN_GROUPS),
    seconds: Math.max(MIN_SECONDS, Number(seconds) || MIN_SECONDS),
    turn: 1,
    log: [],
    done: false,
  };
}

/** result: 'ok' 성공 → 다음 차례 / 'out' 탈락 · 'timeout' 시간 초과 → 판 종료 */
export function advance(round, result) {
  if (round.done) return round;
  const log = [...round.log, { turn: round.turn, result }];
  if (result !== 'ok') return { ...round, log, done: true };
  return { ...round, log, turn: (round.turn % round.groups) + 1 };
}
