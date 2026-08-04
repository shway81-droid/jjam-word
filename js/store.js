/* ── localStorage 래퍼 ──
   저장하는 것: 유형별 최근 출제 id, 음소거, 오늘 푼 수. 그게 전부다.
   학생 정보는 없다 (PRD 7절).

   backend 를 주입받는 이유는 시험 때문만이 아니다. 사파리 프라이빗 모드처럼
   setItem 이 예외를 던지는 환경이 실제로 있고, 그때 앱이 멈추면 안 된다. */

import { RECENT_LIMIT } from './pick.js';

const NS = 'jjam-word:';

export function createStore(backend) {
  const read = (key) => {
    try {
      return backend.getItem(NS + key);
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      backend.setItem(NS + key, value);
    } catch {
      /* 저장에 실패해도 이번 수업은 굴러가야 한다 */
    }
  };
  const readJSON = (key, fallback) => {
    const raw = read(key);
    if (raw === null) return fallback;
    try {
      const v = JSON.parse(raw);
      return v === null || v === undefined ? fallback : v;
    } catch {
      return fallback;
    }
  };

  function recentIds(type) {
    const v = readJSON(`recent:${type}`, []);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  }

  function pushRecent(type, id) {
    const next = [id, ...recentIds(type).filter((x) => x !== id)].slice(0, RECENT_LIMIT);
    write(`recent:${type}`, JSON.stringify(next));
  }

  function clearRecent(type) {
    write(`recent:${type}`, JSON.stringify([]));
  }

  function isMuted() {
    return readJSON('muted', false) === true;
  }

  function setMuted(v) {
    write('muted', JSON.stringify(!!v));
  }

  /* 수업 타이머 재깍재깍 — 기본은 꺼 둔다.
     초 소리가 늘 나면 조용히 생각해야 하는 문항에서 방해가 된다.
     "지금은 시간이 간다"를 소리로 알리고 싶은 수업에서만 켠다. */
  function isTicking() {
    return readJSON('tick', false) === true;
  }

  function setTicking(v) {
    write('tick', JSON.stringify(!!v));
  }

  function todayCount(today) {
    const v = readJSON('today', null);
    return v && v.date === today && Number.isInteger(v.n) ? v.n : 0;
  }

  function bumpToday(today) {
    const n = todayCount(today) + 1;
    write('today', JSON.stringify({ date: today, n }));
    return n;
  }

  return { recentIds, pushRecent, clearRecent, isMuted, setMuted, isTicking, setTicking, todayCount, bumpToday };
}

// 브라우저 기본 인스턴스. Node(테스트)에는 localStorage 가 없으므로 방어한다.
const browserBackend =
  typeof localStorage !== 'undefined'
    ? localStorage
    : { getItem: () => null, setItem: () => {} };

export const store = createStore(browserBackend);
