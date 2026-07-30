/* ── 출제 선택 (PRD 8절) ──
   화면을 모르는 순수 함수만 둔다. 그래야 브라우저 없이 시험할 수 있고,
   "무엇이 나올 수 있는가"라는 규칙이 렌더링 코드에 섞여 흐려지지 않는다. */

// 유형별로 최근 이만큼은 다시 내지 않는다. 한 시간 수업에서 같은 문제를
// 두 번 만나면 아이들이 바로 알아채고 김이 샌다.
export const RECENT_LIMIT = 50;

export function candidates(items, { type, level = 'all', topic = 'all' } = {}) {
  return items.filter(
    (it) =>
      it.type === type &&
      (level === 'all' || it.level === level) &&
      (topic === 'all' || it.topic === topic)
  );
}

// 같은 값이 끝에서 몇 번 연달아 나왔는지
function tailRun(list) {
  if (list.length === 0) return 0;
  const last = list[list.length - 1];
  let n = 0;
  for (let i = list.length - 1; i >= 0 && list[i] === last; i--) n++;
  return n;
}

export function pickNext(pool, { recentIds = [], recentTopics = [], rng = Math.random } = {}) {
  if (!pool || pool.length === 0) return null;

  const recent = new Set(recentIds);
  let fresh = pool.filter((it) => !recent.has(it.id));

  // 후보를 다 쓴 경우. 여기서 멈추면 화면이 죽는다 — 기록을 접고 처음부터 다시 낸다.
  let exhausted = false;
  if (fresh.length === 0) {
    fresh = pool.slice();
    exhausted = true;
  }

  // 같은 주제 3연속 회피. topic 이 null 인 유형(속담·사자성어·수수께끼)은 규칙 대상이 아니다.
  const lastTopic = recentTopics.length ? recentTopics[recentTopics.length - 1] : null;
  const blocked = lastTopic != null && tailRun(recentTopics) >= 2 ? lastTopic : null;

  let usable = blocked === null ? fresh : fresh.filter((it) => it.topic !== blocked);
  // 그 주제밖에 안 남았으면 규칙보다 "문제가 나오는 것"이 우선이다.
  if (usable.length === 0) usable = fresh;

  const item = usable[Math.floor(rng() * usable.length)];
  return { item, exhausted };
}
