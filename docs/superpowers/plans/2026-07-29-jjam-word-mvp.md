# 짬짬이 낱말 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전자칠판에 말놀이 문제 하나를 크게 띄우고 교사가 딸깍 최대 3번(문제→힌트→정답)으로 진행하는 정적 웹앱을, 짬짬이 가족 공통 인프라에 합류시킨 상태로 GitHub Pages에 배포한다.

**Architecture:** 빌드 단계가 없는 정적 SPA. `index.html` 한 장에 화면 6개를 섹션으로 두고 `js/app.js`가 해시 없이 섹션을 토글한다. 순수 로직(출제 선택·최근 기록·끝말잇기 차례)은 ES module로 분리해 `node --test`로 검증하고, DOM에 닿는 코드는 `app.js`에 모은다. 데이터는 `data/words.json` 한 파일이 단일 소스이며 `scripts/validate-data.mjs`가 CI 게이트로 스키마·분포·안전 기준을 강제한다.

**Tech Stack:** Vanilla HTML/CSS/JS(ES modules), Node 20+ (`node --test`, 검증 스크립트 전용), Web Audio API, Service Worker, GitHub Pages, playwright(아이콘 생성 전용 devDependency)

---

## Global Constraints

PRD의 프로젝트 전역 요구사항. 모든 태스크의 요구사항에 이 절이 암묵적으로 포함된다.

- **저장소명:** `jjam-word` · **로컬 경로:** `C:\Users\User\Desktop\claude2\word` · **배포:** GitHub Pages, `main` 브랜치 루트 직접 서빙
- **프레임워크·빌드 도구 없음.** Vanilla HTML/CSS/JS(ES modules). 번들러·트랜스파일러 금지 (가족 공통)
- **외부 의존 0.** 외부 이미지·영상·웹폰트 CDN·JS 라이브러리 금지. 효과음은 음원 파일 없이 Web Audio 합성 (PRD 10절)
- **브랜드 색:** 코럴/로즈 `#E4576E` — PRD 10절이 "제안, 아이콘 시안 보고 확정"으로 남긴 값. Task 10에서 시안을 만들어 확정한다. 그 전 태스크는 CSS 변수 `--accent` 한 곳만 참조해 색 교체가 1줄로 끝나게 둔다. 기존 가족: 게임 앰버 `#FFB703` · 퀴즈 그린 `#12A57C` · 영상 스카이 `#4FA8E8` · 이야기 퍼플 `#6145B5` · 쉼 티일 `#0E7C86`
- **문항당 교사 조작 최대 3회** (문제→힌트→정답). 힌트 생략 시 2회. 자동 진행 없음 — 외침을 기다려야 하므로 모든 단계 전환은 교사 조작으로만
- **화면 상수와 데이터는 따로 놀 수 없다.** `scripts/validate-data.mjs`는 검증 기준(TYPES·LEVELS·TOPICS)을 `js/app.js`에서 정규식으로 읽어 온다. 상수 이름이 바뀌면 스크립트가 조용히 통과하지 않고 실패해야 한다 (jjam-rest 관례)
- **안전 기준 (PRD 3절):** 비속어·차별 표현·외모 소재, 가정 형편·성적 등 특정 학생이 상처받을 소재, 정치·종교 소재 제외. 속담·사자성어 원문에 장애 비하 등 낡은 표현이 있으면 문항에서 뺀다. 사람 검토에만 맡기지 않고 `validate-data.mjs`의 금칙어 표로 강제한다
- **개인정보 0.** localStorage에는 최근 출제 기록·음소거 설정·오늘 푼 수만 저장. 학생 정보·계정·정답 입력 없음
- **가족 공통 파일은 jjam이 상류.** `shared/jjam-switcher.js`, `scripts/check-font-coverage.mjs`, `assets/fonts/*` 는 이 저장소에서 직접 고치지 않는다. jjam에서 고치고 머지한 뒤 `npm run sync:shared`
- **PR 워크플로:** 작업은 브랜치에서, PR 생성 → CI 통과 시 squash 머지 (가족 공통 사용자 지시)
- **커밋 메시지 말미:** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

### 확정한 판단 (PRD가 범위만 정하고 값을 비운 항목)

| 항목 | 확정값 | 근거 |
|---|---|---|
| 유형 키 | `choseong` `proverb` `idiom` `riddle` (문항형) / `chain` `gesture` (도구형) | PRD 7절 예시 JSON의 `type` 값 |
| 난이도 키 | `easy` `normal` `hard` | PRD 7절 예시 JSON |
| 문항 분포 | 초성 120 / 속담 100 / 사자성어 90 / 수수께끼 90 = **400** | PRD 11절 "유형별 난이도별 25~35개 ≈ 400문항" |
| 초성 주제 | 동물·음식·학교물건·직업·나라·자연·탈것·운동 (8종) | PRD 3절 "동물·음식·학교 물건·직업·나라 등" 확장 |
| 모듈 방식 | ES module + `<script type="module">`, 테스트는 `scripts/*.test.mjs`가 `../js/*.js` import | jjam-stretch 선례 (`js/random.js` ↔ `scripts/random.test.mjs`) |
| 끝말잇기 "지나간 단어 기록" | **차례 기록**(1번 ✓, 2번 ✓, 3번 ✗)으로 구현. 단어 자체는 기록하지 않음 | PRD 5절이 같은 문장에서 "교사 입력 없이 딸깍 기록"이라고 못박음 — 단어를 남기려면 타이핑이 필요해 서로 모순. 입력 없는 쪽을 택함 |

---

## File Structure

```
jjam-word/
├── index.html                      화면 6개 섹션 마크업 + 상단바(가족 공통 구조)
├── css/style.css                   코럴 디자인 시스템. --accent 한 곳만 브랜드 색
├── js/
│   ├── app.js                      부트스트랩·상수(TYPES/LEVELS/TOPICS)·화면 전환·상태 머신·키보드
│   ├── pick.js                     [순수] 후보 필터 + 출제 선택 (최근 제외·주제 3연속 회피)
│   ├── store.js                    [순수 가능] localStorage 래퍼 — 최근·음소거·오늘 푼 수
│   ├── sound.js                    Web Audio 합성 효과음 + 음소거 master gain
│   └── chain.js                    [순수] 끝말잇기 차례 진행 규칙
├── data/words.json                 단일 데이터 소스 (문항 400 + 시작단어 60 + 카드 100)
├── shared/jjam-switcher.js         ← 상류 jjam에서 동기화 (직접 수정 금지)
├── scripts/
│   ├── validate-data.mjs           CI 게이트 — 스키마·중복·분포·안전 기준
│   ├── check-font-coverage.mjs     ← 상류 동기화 (직접 수정 금지)
│   ├── sync-shared.mjs             상류 동기화 도구
│   ├── gen-icons.mjs               favicon.svg → PNG 4종
│   ├── pick.test.mjs               출제 로직 단위 테스트
│   ├── store.test.mjs              최근 기록·오늘 푼 수 단위 테스트
│   └── chain.test.mjs              끝말잇기 차례 규칙 단위 테스트
├── assets/fonts/                   ← 상류 동기화 (Pretendard 서브셋 + coverage.txt + LICENSE)
├── assets/icons/                   gen-icons 산출물 PNG 4종
├── .github/workflows/ci.yml        node --test + validate-data + check-font-coverage
├── .github/workflows/shared-sync.yml  상류 이탈 감지 (main push + 매일)
├── .claude/launch.json             로컬 미리보기 (http-server)
├── favicon.svg  manifest.json  sw.js  package.json  README.md  CLAUDE.md
└── 짬짬이_낱말_PRD.md              (이미 존재)
```

**파일 경계 원칙** — `pick.js` / `store.js` / `chain.js`는 DOM을 모른다. 그래야 `node --test`가 브라우저 없이 돌고, 출제 규칙이 화면 코드에 섞여 흐려지지 않는다. `app.js`만 DOM에 닿는다.

---

## Task 1: 저장소 뼈대 + 출제 로직 (TDD)

첫 태스크는 화면 없이 **출제 규칙**만 세운다. 이 규칙이 제품의 심장이고(PRD 8절), 화면보다 먼저 못 박아야 뒤 태스크가 흔들리지 않는다.

**Files:**
- Create: `package.json`, `.gitignore`, `.claude/launch.json`
- Create: `js/pick.js`
- Create: `data/words.json` (스키마 + 초성 30문항)
- Test: `scripts/pick.test.mjs`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `data/words.json` → `{ version: 1, items: Item[] }`
  - `pick.js` → `RECENT_LIMIT: number` (= 50)
  - `pick.js` → `candidates(items: Item[], opts: {type: string, level?: string, topic?: string}) => Item[]`
  - `pick.js` → `pickNext(pool: Item[], opts?: {recentIds?: string[], recentTopics?: (string|null)[], rng?: () => number}) => {item: Item, exhausted: boolean} | null`

- [ ] **Step 1: git 저장소 초기화와 뼈대 파일**

작업 폴더에 `짬짬이_낱말_PRD.md`만 있는 상태에서 시작한다.

```bash
git init -b main
```

`package.json` (jjam-rest의 scripts 구성 + jjam-stretch의 `node --test`를 합친 것):

```json
{
  "name": "jjam-word",
  "version": "1.0.0",
  "private": true,
  "description": "짬짬이 낱말 — 보기 없이 반 전체가 입으로 외치는 전자칠판용 말놀이",
  "type": "module",
  "scripts": {
    "verify": "node --test && node scripts/validate-data.mjs && node scripts/check-font-coverage.mjs",
    "test": "npm run verify",
    "sync:shared": "node scripts/sync-shared.mjs",
    "sync:check": "node scripts/sync-shared.mjs --check",
    "icons": "node scripts/gen-icons.mjs",
    "start": "npx http-server . -p 8379 -c-1"
  },
  "devDependencies": {
    "playwright": "^1.49.0"
  }
}
```

`.gitignore`:

```
node_modules/
.DS_Store
*.log
.claude/settings.local.json
```

`.claude/launch.json`:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "jjam-word",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["http-server", ".", "-p", "8379", "-c-1"],
      "port": 8379
    }
  ]
}
```

- [ ] **Step 2: 데이터 스키마 확정 + 초성 30문항 작성**

`data/words.json`. 최상위는 `{ version, items }`. `items`는 문항형·도구형이 한 배열에 섞여 있고 `type`으로 갈린다.

문항형 필수 필드: `id` `type` `level` `topic` `prompt` `hint` `answer` `also` `note`
도구형 필수 필드: `id` `type` `level` `word` (+ gesture는 `topic`)

```json
{
  "version": 1,
  "items": [
    {
      "id": "choseong-ani-001",
      "type": "choseong",
      "level": "easy",
      "topic": "동물",
      "prompt": "ㅋㅋㄹ",
      "hint": "코가 아주 길어요.",
      "answer": "코끼리",
      "also": [],
      "note": ""
    },
    {
      "id": "choseong-ani-002",
      "type": "choseong",
      "level": "easy",
      "topic": "동물",
      "prompt": "ㅎㄹㅇ",
      "hint": "산에 사는 줄무늬 임금님이에요.",
      "answer": "호랑이",
      "also": [],
      "note": ""
    }
  ]
}
```

이 단계에서는 **초성 30문항**만 채운다 (동물 10 / 음식 10 / 학교물건 10, 전부 `easy`). id 규칙: `choseong-<주제3글자약칭>-<3자리 일련번호>`. 주제 약칭 — 동물 `ani`, 음식 `food`, 학교물건 `sch`, 직업 `job`, 나라 `nat`, 자연 `nature`, 탈것 `ride`, 운동 `sport`.

`prompt`는 정답의 초성만 뽑은 문자열이다. 예: 코끼리 → `ㅋㄲㄹ`이 아니라 **`ㅋㅋㄹ`**. 겹자음 초성(ㄲㄸㅃㅆㅉ)은 홑자음으로 펴서 적는다 — 초성퀴즈 관례이고, 아이들이 ㄲ을 보면 답이 너무 좁혀진다.

> **이 결정은 나중에 뒤집혔다.** 겹자음을 그대로 적는다(코끼리 → `ㅋㄲㄹ`). 홑자음으로 펴면 화면이 아이들에게 틀린 초성을 가르치게 된다 — 초성은 국어 교육과정의 내용이다. 지금은 `validate-data.mjs` 가 정답에서 초성을 뽑아 대조한다.

- [ ] **Step 3: 실패하는 테스트 작성**

`scripts/pick.test.mjs`:

```js
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
```

- [ ] **Step 4: 테스트가 실패하는지 확인**

Run: `node --test scripts/pick.test.mjs`
Expected: FAIL — `Cannot find module '../js/pick.js'`

- [ ] **Step 5: pick.js 구현**

`js/pick.js`:

```js
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
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `node --test scripts/pick.test.mjs`
Expected: PASS (10 tests)

- [ ] **Step 7: 커밋**

```bash
git add package.json .gitignore .claude/launch.json js/pick.js data/words.json scripts/pick.test.mjs 짬짬이_낱말_PRD.md
git commit -m "$(cat <<'EOF'
feat: 출제 선택 로직과 데이터 스키마

PRD 8절 규칙(최근 50개 제외, 소진 시 초기화, 주제 3연속 회피)을
DOM을 모르는 순수 모듈로 세우고 node --test 로 고정했다.
초성퀴즈 30문항으로 스키마를 확정한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 최근 기록 저장소 (TDD)

**Files:**
- Create: `js/store.js`
- Test: `scripts/store.test.mjs`

**Interfaces:**
- Consumes: `pick.js` → `RECENT_LIMIT`
- Produces:
  - `store.js` → `createStore(backend: {getItem, setItem}) => Store` (테스트용 주입구)
  - `store.js` → 기본 인스턴스 `store: Store` (브라우저 localStorage 사용)
  - `Store` 메서드: `recentIds(type) => string[]`, `pushRecent(type, id) => void`, `clearRecent(type) => void`, `isMuted() => boolean`, `setMuted(v) => void`, `todayCount(today) => number`, `bumpToday(today) => number`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/store.test.mjs`:

```js
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node --test scripts/store.test.mjs`
Expected: FAIL — `Cannot find module '../js/store.js'`

- [ ] **Step 3: store.js 구현**

`js/store.js`:

```js
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

  function todayCount(today) {
    const v = readJSON('today', null);
    return v && v.date === today && Number.isInteger(v.n) ? v.n : 0;
  }

  function bumpToday(today) {
    const n = todayCount(today) + 1;
    write('today', JSON.stringify({ date: today, n }));
    return n;
  }

  return { recentIds, pushRecent, clearRecent, isMuted, setMuted, todayCount, bumpToday };
}

// 브라우저 기본 인스턴스. Node(테스트)에는 localStorage 가 없으므로 방어한다.
const browserBackend =
  typeof localStorage !== 'undefined'
    ? localStorage
    : { getItem: () => null, setItem: () => {} };

export const store = createStore(browserBackend);
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/store.test.mjs`
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/store.js scripts/store.test.mjs
git commit -m "$(cat <<'EOF'
feat: 최근 출제 기록·음소거·오늘 푼 수 저장소

유형별 최근 50개, 날짜가 바뀌면 리셋되는 오늘 푼 수.
backend 주입으로 브라우저 없이 시험하고, 저장 실패에도 수업이 멈추지 않게 삼켰다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 세로 관통 — 홈 → 조건 → 문제 → 힌트 → 정답 → 다음

여기서 처음으로 화면이 생긴다. 초성 30문항으로 **끝까지 도는 한 줄기**를 만든다. 나머지 유형·연출·도구는 이 줄기에 붙인다.

**Files:**
- Create: `index.html`, `css/style.css`, `js/app.js`

**Interfaces:**
- Consumes: `pick.js` → `candidates`, `pickNext` / `store.js` → `store`
- Produces (validate-data.mjs 가 정규식으로 읽어 갈 상수 — 이름·형태를 바꾸면 검증도 함께 고쳐야 한다):
  - `app.js` → `const TYPES = { choseong: {...}, proverb: {...}, idiom: {...}, riddle: {...}, chain: {...}, gesture: {...} }`
  - `app.js` → `const LEVELS = ['easy', 'normal', 'hard'];`
  - `app.js` → `const TOPICS = ['동물', '음식', '학교물건', '직업', '나라', '자연', '탈것', '운동'];`
  - `app.js` → `const STATES = ['HOME', 'SETUP', 'PROMPT', 'HINT', 'ANSWER', 'CHAIN', 'GESTURE', 'DONE'];`

- [ ] **Step 1: index.html — 화면 6개 섹션**

`<head>`는 jjam-rest와 같은 순서를 따른다(charset → viewport → title → description → theme-color → og → icon → manifest → apple-touch-icon → font preload → stylesheet). 상단바도 가족 공통 구조 그대로: 색 띠 + 로고 46px + 제목 + 부제, 오른쪽에 음소거 버튼과 `<div class="jjam-switch" data-site="word">`.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>짬짬이 낱말 — 보기 없이 반 전체가 외치는 말놀이</title>
  <meta name="description" content="초성퀴즈·속담·사자성어·수수께끼를 전자칠판에 크게 띄우고 반 전체가 입으로 외치는 말놀이. 교사는 딸깍 세 번이면 됩니다. 설치·로그인 없음.">
  <meta name="theme-color" content="#E4576E">
  <meta property="og:title" content="짬짬이 낱말">
  <meta property="og:description" content="문제 하나로 반 전체의 입을 엽니다.">
  <meta property="og:type" content="website">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
  <link rel="preload" href="assets/fonts/PretendardVariable.subset.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="#" id="brand-home">
      <span class="brand-icon"><img class="ic" src="favicon.svg" alt="" aria-hidden="true"></span>
      <span class="brand-text">
        <span class="brand-name">짬짬이 낱말</span>
        <span class="brand-sub">보기 없이, 반 전체가 외쳐요</span>
      </span>
    </a>
    <div class="topbar-actions">
      <button id="btn-mute" class="icon-btn" type="button" aria-label="소리 켜고 끄기" aria-pressed="false">
        <svg class="ic-line" viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M4 9.5v5h3.2L12 19V5L7.2 9.5H4z"/><path class="spk-wave" d="M15.5 9c1.6 1.7 1.6 4.3 0 6M18 6.8c2.8 2.9 2.8 7.5 0 10.4"/><path class="spk-x" d="M15.5 9.5l5 5M20.5 9.5l-5 5"/></svg>
      </button>
      <div class="jjam-switch" data-site="word"></div>
    </div>
  </header>

  <main id="app">
    <!-- 1. 홈 -->
    <section id="screen-home" class="screen">
      <div class="cta-strip">
        <p class="cta-copy"><b>보기가 없어요.</b> 문제만 크게 띄우면 반 전체가 <b>입으로</b> 외쳐요</p>
      </div>
      <h2 class="group-title">문제 내기</h2>
      <div class="type-grid" id="type-grid-quiz" aria-label="문항형 말놀이 선택"></div>
      <h2 class="group-title">진행 도우미</h2>
      <div class="type-grid" id="type-grid-tool" aria-label="도구형 말놀이 선택"></div>
      <footer class="site-footer">
        <p>Space = 다음 단계 · H = 힌트</p>
      </footer>
    </section>

    <!-- 2. 조건 선택 -->
    <section id="screen-setup" class="screen" hidden>
      <h1 class="setup-title" id="setup-title"></h1>
      <div class="setup-card">
        <div class="setup-group">
          <h2>난이도</h2>
          <div class="option-row" id="opt-level" role="radiogroup" aria-label="난이도 선택"></div>
        </div>
        <div class="setup-group" id="group-topic" hidden>
          <h2>주제</h2>
          <div class="option-row" id="opt-topic" role="radiogroup" aria-label="주제 선택"></div>
        </div>
        <p class="setup-count" id="setup-count"></p>
      </div>
      <div class="setup-actions">
        <button class="btn btn-ghost" id="btn-setup-back" type="button">← 유형 다시 고르기</button>
        <button class="btn btn-primary btn-big" id="btn-start" type="button">▶ 시작</button>
      </div>
    </section>

    <!-- 3. 출제 — 전자칠판 전면. 버튼은 힌트·정답·다음뿐. -->
    <section id="screen-quiz" class="screen quiz" hidden>
      <p class="quiz-topic" id="quiz-topic"></p>
      <p class="quiz-prompt" id="quiz-prompt"></p>
      <p class="quiz-hint" id="quiz-hint" hidden></p>
      <div class="quiz-answer" id="quiz-answer" hidden>
        <p class="answer-text" id="answer-text"></p>
        <p class="answer-also" id="answer-also" hidden></p>
        <p class="answer-note" id="answer-note" hidden></p>
      </div>
      <div class="quiz-actions">
        <button class="btn btn-ghost" id="btn-hint" type="button">💡 힌트 <kbd>H</kbd></button>
        <button class="btn btn-primary btn-big" id="btn-reveal" type="button">정답 보기 <kbd>Space</kbd></button>
        <button class="btn btn-primary btn-big" id="btn-next" type="button" hidden>다음 문제 → <kbd>Space</kbd></button>
      </div>
      <div class="quiz-corner">
        <span class="quiz-count" id="quiz-count" aria-label="오늘 푼 문항 수"></span>
        <button class="btn btn-ghost btn-sm" id="btn-skip" type="button">건너뛰기</button>
        <button class="btn btn-ghost btn-sm" id="btn-quit" type="button">마치기</button>
      </div>
    </section>

    <!-- 4. 끝말잇기 도우미 (Task 8) -->
    <section id="screen-chain" class="screen" hidden></section>

    <!-- 5. 몸으로 말해요 (Task 9) -->
    <section id="screen-gesture" class="screen" hidden></section>

    <!-- 6. 마무리 -->
    <section id="screen-done" class="screen done" hidden>
      <div class="done-emoji" aria-hidden="true">🎉</div>
      <h1 id="done-text"></h1>
      <div class="done-actions">
        <button class="btn btn-primary btn-big" id="btn-continue" type="button">계속하기</button>
        <button class="btn btn-ghost" id="btn-home" type="button">처음으로</button>
      </div>
    </section>
  </main>

  <script src="shared/jjam-switcher.js" defer></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: css/style.css — 코럴 디자인 시스템**

jjam-rest의 `css/style.css` 앞부분(@font-face → `:root` 토큰 → reset → `.topbar`/`.brand`)을 그대로 옮기고 색 토큰만 코럴로 바꾼다. 브랜드 색은 **`--accent` 한 곳**에만 원값을 적는다 (Task 10에서 시안 확정 후 1줄로 교체하기 위함).

```css
:root {
  --bg: #fff6f7;
  --card: #ffffff;
  --surface: #ffe9ec;
  --surface-high: #ffd9de;

  --ink: #3a1219;
  --ink-soft: #6f4a52;
  --outline-variant: #e8c6cc;

  --accent: #E4576E;          /* 브랜드 색 — 여기 한 곳만 바꾸면 전체가 따라온다 */
  --accent-deep: #b83a50;
  --accent-soft: #ffd9de;
  --on-accent: #ffffff;

  --radius: 20px;
  --radius-sm: 12px;
  --radius-pill: 9999px;
  --gutter: 32px;
  --maxw: 1180px;
}
```

출제 화면 타이포는 이 제품의 핵심이다 (PRD 1.3 "전자칠판 뒷자리에서도 읽히는 큰 글씨", 9절 "짧은 문제는 화면 폭에 맞춰 자동 확대"). 글자 수에 따라 크기가 달라지도록 `clamp()`와 데이터 속성을 쓴다:

```css
.quiz-prompt {
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: 0.02em;
  text-align: center;
  word-break: keep-all;
  font-size: clamp(3rem, 13vw, 11rem);
}
/* 긴 문제(속담·수수께끼)는 한 화면에 담기도록 단계적으로 줄인다 */
.quiz-prompt[data-len="mid"]  { font-size: clamp(2.4rem, 8vw, 7rem); }
.quiz-prompt[data-len="long"] { font-size: clamp(2rem, 5.5vw, 4.6rem); }
```

- [ ] **Step 3: js/app.js — 상수와 상태 머신**

```js
/* ── 짬짬이 낱말 ──
   화면에 닿는 코드는 전부 여기 있다. 출제 규칙(pick.js)·저장(store.js)은
   DOM을 모르는 모듈로 빼 두었다.

   검증 스크립트(scripts/validate-data.mjs)가 아래 TYPES·LEVELS·TOPICS 를
   정규식으로 읽어 간다. 상수 이름이나 형태를 바꾸면 그쪽도 함께 고쳐야 한다
   (안 고치면 검증이 통과하는 대신 실패한다 — 조용히 무력화되지 않도록). */

import { candidates, pickNext } from './pick.js';
import { store } from './store.js';

const TYPES = {
  choseong: { label: 'ㄱㄴㄷ 초성퀴즈', emoji: '🔤', kind: 'quiz', topics: true,
              blurb: '초성을 보고 낱말을 외쳐요' },
  proverb:  { label: '속담 이어말하기', emoji: '🗣', kind: 'quiz', topics: false,
              blurb: '앞부분을 보고 뒷부분을 외쳐요' },
  idiom:    { label: '사자성어',        emoji: '🀄', kind: 'quiz', topics: false,
              blurb: '뜻을 보고 사자성어를 외쳐요' },
  riddle:   { label: '수수께끼',        emoji: '❓', kind: 'quiz', topics: false,
              blurb: '수수께끼의 답을 외쳐요' },
  chain:    { label: '끝말잇기 도우미', emoji: '🔗', kind: 'tool', topics: false,
              blurb: '차례와 시간을 화면이 맡아요' },
  gesture:  { label: '몸으로 말해요',   emoji: '🎭', kind: 'tool', topics: true,
              blurb: '단어 카드를 크게 띄워요' },
};

const LEVELS = ['easy', 'normal', 'hard'];
const LEVEL_LABEL = { all: '전체', easy: '쉬움', normal: '보통', hard: '어려움' };
const TOPICS = ['동물', '음식', '학교물건', '직업', '나라', '자연', '탈것', '운동'];
const STATES = ['HOME', 'SETUP', 'PROMPT', 'HINT', 'ANSWER', 'CHAIN', 'GESTURE', 'DONE'];

// 문제 길이에 따라 글자 크기를 세 단계로 (CSS .quiz-prompt[data-len])
const LEN_MID = 8;
const LEN_LONG = 18;
function lenClass(text) {
  if (text.length > LEN_LONG) return 'long';
  if (text.length > LEN_MID) return 'mid';
  return 'short';
}

const state = {
  screen: 'HOME',
  type: null,
  level: 'all',
  topic: 'all',
  pool: [],
  item: null,
  recentTopics: [],
  items: [],
};
```

상태 전환 규칙 (PRD 8절):

| 지금 | 교사 조작 | 다음 |
|---|---|---|
| PROMPT | 정답 보기 / Space | ANSWER |
| PROMPT | 힌트 / H | HINT |
| HINT | 정답 보기 / Space | ANSWER |
| ANSWER | 다음 문제 / Space | PROMPT (새 문항) |
| PROMPT·HINT·ANSWER | 건너뛰기 | PROMPT (새 문항, 카운트 증가 없음) |
| PROMPT·HINT·ANSWER | 마치기 / Esc | DONE |

**핵심:** `ANSWER`에 처음 도달할 때만 `store.bumpToday()`를 부른다. 힌트를 두 번 눌러도 카운트가 늘면 안 된다.

- [ ] **Step 4: 브라우저에서 세로 관통 확인**

미리보기를 띄우고 실제로 돌려 본다.

```bash
npx http-server . -p 8379 -c-1
```

확인 항목 — 전부 눈으로 보고 통과해야 한다:
1. 홈에 유형 카드 6개가 문항형 4 / 도구형 2로 나뉘어 보인다
2. `ㄱㄴㄷ 초성퀴즈` → 난이도 `전체` → `시작` → 초성이 화면 가득 뜬다
3. `힌트` 한 번 → 힌트 줄이 뜬다 → `정답 보기` → 정답이 뜬다 → `다음 문제` → 새 문제 (딸깍 3번)
4. 힌트를 건너뛰고 `정답 보기`를 바로 눌러도 정답이 뜬다 (딸깍 2번)
5. Space/H 키로 3·4와 같은 진행이 된다
6. 새로고침 후에도 방금 본 문제가 바로 다시 나오지 않는다
7. `마치기` → 마무리 화면에 오늘 푼 수가 나온다

- [ ] **Step 5: 커밋**

```bash
git add index.html css/style.css js/app.js
git commit -m "$(cat <<'EOF'
feat: 홈→조건→문제→힌트→정답→다음 세로 관통

초성퀴즈 30문항으로 끝까지 도는 한 줄기를 세웠다.
문항당 딸깍 3회(힌트 생략 시 2회), Space/H 키보드 진행,
문제 길이에 따라 글자 크기 3단계.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 정답 연출 + Web Audio 효과음

**Files:**
- Create: `js/sound.js`
- Modify: `js/app.js` (정답 공개 시 `JjamWordSound.reveal()` 호출, 음소거 버튼 연결)
- Modify: `css/style.css` (정답 공개 애니메이션)

**Interfaces:**
- Consumes: `store.js` → `store.isMuted()`, `store.setMuted()`
- Produces: `sound.js` → `export const sound = { ensure(), hint(), reveal(), setMuted(v) }`

- [ ] **Step 1: sound.js 구현**

음원 파일 없이 합성한다 (PRD 10절). jjam-rest `js/sound.js`의 master gain 음소거 방식을 따르되, 이 제품에 필요한 소리는 두 개뿐이다.

```js
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

function setMuted(v) {
  muted = !!v;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
}

export const sound = { ensure, hint, reveal, setMuted };
```

- [ ] **Step 2: 정답 공개 연출 CSS**

`prefers-reduced-motion` 을 존중한다 — 전자칠판 앞에서 큰 움직임에 민감한 아이가 있다.

```css
@keyframes answer-pop {
  0%   { opacity: 0; transform: scale(0.86); }
  60%  { opacity: 1; transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1); }
}
.quiz-answer:not([hidden]) { animation: answer-pop 0.34s cubic-bezier(.2,.9,.3,1.2) both; }
@media (prefers-reduced-motion: reduce) {
  .quiz-answer:not([hidden]) { animation: none; }
}
```

- [ ] **Step 3: app.js에 연결**

- 상단바 음소거 버튼 → `store.setMuted()` + `sound.setMuted()` + `aria-pressed` 갱신
- 앱 부팅 시 `sound.setMuted(store.isMuted())`
- `HINT` 진입 시 `sound.hint()`, `ANSWER` 진입 시 `sound.reveal()`
- `시작` 버튼 클릭 핸들러에서 `sound.ensure()` — 첫 사용자 제스처를 잡는다

- [ ] **Step 4: 브라우저에서 확인**

1. 정답 공개 시 소리가 나고 정답이 튀어나오는 연출이 보인다
2. 음소거를 켜면 소리가 나지 않고, 새로고침해도 음소거가 유지된다
3. 음소거 상태에서도 문제→힌트→정답→다음이 전부 동작한다 (PRD 12절)

- [ ] **Step 5: 커밋**

```bash
git add js/sound.js js/app.js css/style.css
git commit -m "$(cat <<'EOF'
feat: 정답 공개 연출과 Web Audio 합성 효과음

음원 파일 없이 오실레이터로 힌트음·정답 아르페지오를 만든다.
음소거는 master gain 한 곳에서, 설정은 새로고침을 넘어 유지.
prefers-reduced-motion 존중.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 데이터 검증 게이트 (validate-data.mjs)

**문항 400개를 채우기 전에** 검증부터 만든다. 그래야 데이터를 쓰는 동안 게이트가 실시간으로 잡아 주고, 400개를 다 쓴 뒤에 규칙 위반을 발견해 갈아엎는 일이 없다.

**Files:**
- Create: `scripts/validate-data.mjs`

**Interfaces:**
- Consumes: `js/app.js` → `TYPES`, `LEVELS`, `TOPICS` (정규식 추출)
- Produces: 없음 (CLI 게이트). 종료 코드 0/1과 분포 집계 출력

- [ ] **Step 1: validate-data.mjs 구현**

jjam-rest `scripts/validate-data.mjs` 의 구조를 따른다: (1) app.js에서 상수 추출 — 못 찾으면 실패, (2) 스키마, (3) 안전 기준, (4) 분포 집계.

```js
/* ===================================================================
   data/words.json 정적 검증 — CI 게이트 (.github/workflows/ci.yml)
   ===================================================================
   빌드 단계가 없는 정적 사이트라, 잘못된 데이터는 배포된 뒤 교실 화면에서야
   드러난다. 여기서 "화면(js/app.js)이 실제로 소화할 수 있는 데이터인가"와
   "PRD 3절 안전 기준을 지켰는가"를 미리 확인한다.

   검증 기준(유형·난이도·주제)은 js/app.js 의 상수에서 직접 읽어 온다.
   → 화면 상수와 데이터가 따로 노는 상황을 잡는다(하드코딩 X).

   실행: node scripts/validate-data.mjs
   =================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ── app.js 에서 검증 기준 상수 추출 ──────────────────────────────
const APP = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf-8');

function extract(label, re, parse) {
  const m = APP.match(re);
  if (!m) {
    err(`js/app.js에서 ${label}를 찾지 못했습니다 — 상수 이름이 바뀌었다면 이 스크립트도 함께 고쳐야 합니다.`);
    return null;
  }
  return parse(m);
}

const TYPE_KEYS = extract('TYPES', /const TYPES = \{([\s\S]*?)\n\};/, (m) =>
  [...m[1].matchAll(/^\s*(\w+):\s*\{/gm)].map((x) => x[1]));

const TYPE_KINDS = extract('TYPES(kind)', /const TYPES = \{([\s\S]*?)\n\};/, (m) => {
  const out = {};
  for (const blk of m[1].split(/\n(?=\s*\w+:\s*\{)/)) {
    const k = blk.match(/^\s*(\w+):/);
    const kind = blk.match(/kind:\s*'(\w+)'/);
    if (k && kind) out[k[1]] = kind[1];
  }
  return out;
});

const LEVELS = extract('LEVELS', /const LEVELS = \[([^\]]*)\];/, (m) =>
  [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));

const TOPICS = extract('TOPICS', /const TOPICS = \[([^\]]*)\];/, (m) =>
  [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));

if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

// ── 목표 분포 (PRD 11절) ────────────────────────────────────────
// 합계 400. 난이도가 한쪽으로 쏠리면 "쉬움만 골랐더니 20문항뿐"이 되어
// 자투리 5분에 10~15개(PRD 1.3)를 소화할 수 없다.
const TARGET = {
  choseong: { easy: 45, normal: 45, hard: 30 },   // 120
  proverb:  { easy: 35, normal: 40, hard: 25 },   // 100
  idiom:    { easy: 25, normal: 35, hard: 30 },   //  90
  riddle:   { easy: 35, normal: 35, hard: 20 },   //  90
};
const TOOL_TARGET = { chain: 60, gesture: 100 };
const TOLERANCE = 0.15;   // 목표 대비 ±15%까지는 통과

// ── 안전 기준 (PRD 3절) ─────────────────────────────────────────
// 교실에서 한 번 나가면 되돌릴 수 없는 말들이다. 사람 검토에만 맡기지 않는다.
const BANNED = [
  { re: /병신|바보|멍청|미친|죽어|꺼져|짜증/, why: '비속어·모욕 표현 금지' },
  { re: /벙어리|귀머거리|장님|절름발이|불구|앉은뱅이/, why: '장애 비하 표현 금지 (속담 원문이라도 제외)' },
  { re: /뚱뚱|못생|살찐|키\s?작은|대머리/, why: '외모 소재 금지' },
  { re: /가난|거지|부잣집|형편|이혼|계모|의붓/, why: '가정 형편·가족 형태 소재 금지' },
  { re: /일등|꼴찌|성적|등수|시험\s?점수/, why: '성적·등수 소재 금지' },
  { re: /하나님|부처|예수|절에\s?가|교회|성경|불경|기도문/, why: '종교 소재 금지' },
  { re: /대통령|국회|정당|여당|야당|선거/, why: '정치 소재 금지' },
];

const QUIZ_REQUIRED = ['id', 'type', 'level', 'topic', 'prompt', 'hint', 'answer', 'also', 'note'];
const TOOL_REQUIRED = ['id', 'type', 'level', 'word'];
const PROMPT_MAX = 34;   // 전자칠판 한 화면에 읽히는 길이 (경고)
const ANSWER_MAX = 20;

const data = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'words.json'), 'utf-8'));
  } catch (e) {
    console.error(`  ✗ data/words.json 파싱 실패 — ${e.message}`);
    process.exit(1);
  }
})();

if (data.version === undefined) err('최상위 version 필드가 없습니다.');
if (!Array.isArray(data.items) || data.items.length === 0) {
  console.error('  ✗ items 는 비어 있지 않은 배열이어야 합니다.');
  process.exit(1);
}

const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const seenId = new Map();
const seenAnswer = new Map();   // `${type}\u0000${answer}` → index

function checkSafety(where, text) {
  for (const b of BANNED) {
    if (b.re.test(text)) err(`${where}: 안전 기준 위반 — ${b.why}\n      "${text}"`);
  }
}

data.items.forEach((it, i) => {
  const where = `items[${i}] (${it && it.id ? it.id : 'id 없음'})`;
  if (typeof it !== 'object' || it === null || Array.isArray(it)) {
    err(`${where}: 객체가 아닙니다.`);
    return;
  }

  if (!nonEmpty(it.id)) err(`${where}: id 는 비어 있지 않은 문자열이어야 합니다.`);
  else if (seenId.has(it.id)) err(`${where}: id '${it.id}' 중복 (items[${seenId.get(it.id)}]와 동일)`);
  else seenId.set(it.id, i);

  if (!TYPE_KEYS.includes(it.type)) {
    err(`${where}: 알 수 없는 유형 '${it.type}' (가능: ${TYPE_KEYS.join(', ')})`);
    return;
  }
  if (!LEVELS.includes(it.level)) {
    err(`${where}: 알 수 없는 난이도 '${it.level}' (가능: ${LEVELS.join(', ')})`);
  }

  const kind = TYPE_KINDS[it.type];
  const required = kind === 'quiz' ? QUIZ_REQUIRED : TOOL_REQUIRED;
  const allowed = new Set(kind === 'quiz' ? QUIZ_REQUIRED : [...TOOL_REQUIRED, 'topic']);

  for (const k of required) {
    if (it[k] === undefined) err(`${where}: 필수 필드 '${k}' 누락`);
  }
  for (const k of Object.keys(it)) {
    if (!allowed.has(k)) err(`${where}: 알 수 없는 필드 '${k}'`);
  }

  // 주제 — topics:true 인 유형만 값을 갖는다. 나머지는 반드시 null.
  const wantsTopic = /topics:\s*true/.test(
    (APP.match(new RegExp(`${it.type}:\\s*\\{[\\s\\S]*?\\}`)) || [''])[0]
  );
  if (wantsTopic) {
    if (!TOPICS.includes(it.topic)) {
      err(`${where}: 알 수 없는 주제 '${it.topic}' (가능: ${TOPICS.join(', ')})`);
    }
  } else if (kind === 'quiz' && it.topic !== null) {
    err(`${where}: 유형 '${it.type}' 은 주제를 갖지 않습니다 — topic 은 null 이어야 합니다.`);
  }

  if (kind === 'quiz') {
    for (const k of ['prompt', 'hint', 'answer']) {
      if (!nonEmpty(it[k])) err(`${where}: ${k} 가 비어 있습니다.`);
    }
    if (!Array.isArray(it.also)) err(`${where}: also 는 배열이어야 합니다 (없으면 []).`);
    if (typeof it.note !== 'string') err(`${where}: note 는 문자열이어야 합니다 (없으면 "").`);

    // 같은 유형 안에서 정답이 겹치면 사실상 같은 문제다.
    if (nonEmpty(it.answer)) {
      const key = `${it.type}\u0000${it.answer}`;
      if (seenAnswer.has(key)) {
        err(`${where}: 정답 '${it.answer}' 이 items[${seenAnswer.get(key)}] 와 같은 유형에서 중복됩니다.`);
      } else seenAnswer.set(key, i);
    }

    // 힌트가 정답을 통째로 담고 있으면 힌트가 아니라 정답이다.
    if (nonEmpty(it.hint) && nonEmpty(it.answer) && it.hint.includes(it.answer)) {
      err(`${where}: 힌트에 정답 '${it.answer}' 이 그대로 들어 있습니다.`);
    }

    // 초성 문제는 초성만 있어야 한다 (한글 음절이 섞이면 답이 보인다).
    if (it.type === 'choseong' && /[가-힣]/.test(it.prompt)) {
      err(`${where}: 초성퀴즈 prompt 에 완성형 한글이 섞였습니다 — 초성만 적어 주세요.`);
    }
    // 사자성어 정답은 네 글자.
    if (it.type === 'idiom' && nonEmpty(it.answer) && it.answer.replace(/\s/g, '').length !== 4) {
      err(`${where}: 사자성어 정답은 네 글자여야 합니다 — '${it.answer}'`);
    }

    if (it.prompt && it.prompt.length > PROMPT_MAX) {
      warn(`${where}: 문제가 ${it.prompt.length}자 — 전자칠판 한 화면에는 ${PROMPT_MAX}자 안팎이 읽기 좋습니다.`);
    }
    if (it.answer && it.answer.length > ANSWER_MAX) {
      warn(`${where}: 정답이 ${it.answer.length}자 — 한 줄에 들어가지 않을 수 있습니다.`);
    }

    for (const f of ['prompt', 'hint', 'answer', 'note']) {
      if (nonEmpty(it[f])) checkSafety(`${where} ${f}`, it[f]);
    }
    for (const a of Array.isArray(it.also) ? it.also : []) {
      if (nonEmpty(a)) checkSafety(`${where} also`, a);
    }
  } else {
    if (!nonEmpty(it.word)) err(`${where}: word 가 비어 있습니다.`);
    else checkSafety(`${where} word`, it.word);
    // 끝말잇기 시작 단어가 'ㄹ'로 끝나면 이을 말이 마땅치 않다.
    if (it.type === 'chain' && /[릴을를]$/.test(it.word)) {
      warn(`${where}: 시작 단어 '${it.word}' 는 이어 가기 어려운 끝 글자입니다.`);
    }
  }
});

// ── 분포 집계 (PRD 12절 완료 기준) ──────────────────────────────
const tally = {};
for (const it of data.items) {
  tally[it.type] = tally[it.type] || {};
  tally[it.type][it.level] = (tally[it.type][it.level] || 0) + 1;
}

console.log('\n  문항 분포');
let quizTotal = 0;
for (const [type, want] of Object.entries(TARGET)) {
  const got = tally[type] || {};
  const row = LEVELS.map((lv) => `${lv} ${String(got[lv] || 0).padStart(3)}/${want[lv]}`).join('  ');
  const sum = LEVELS.reduce((a, lv) => a + (got[lv] || 0), 0);
  quizTotal += sum;
  console.log(`    ${type.padEnd(9)} ${row}   합계 ${String(sum).padStart(3)}`);
  for (const lv of LEVELS) {
    const n = got[lv] || 0;
    const lo = Math.floor(want[lv] * (1 - TOLERANCE));
    const hi = Math.ceil(want[lv] * (1 + TOLERANCE));
    if (n < lo || n > hi) {
      err(`분포: ${type}/${lv} 이 ${n}개입니다 — 목표 ${want[lv]}개(허용 ${lo}~${hi}) 범위를 벗어났습니다.`);
    }
  }
}
console.log(`    ─ 문항형 합계 ${quizTotal} (목표 400)`);

for (const [type, want] of Object.entries(TOOL_TARGET)) {
  const n = data.items.filter((it) => it.type === type).length;
  console.log(`    ${type.padEnd(9)} ${n}/${want}`);
  if (n < want) err(`분포: ${type} 이 ${n}개입니다 — MVP 기준은 ${want}개입니다.`);
}

for (const w of warnings) console.log(`  ⚠ ${w}`);
for (const e of errors) console.error(`  ✗ ${e}`);

if (errors.length) {
  console.error(`\n❌ 낱말 데이터 검증 실패 — 오류 ${errors.length}건`);
  process.exit(1);
}
console.log(`\n✅ 낱말 데이터 검증 통과 — ${data.items.length}개${warnings.length ? ` (경고 ${warnings.length}건)` : ''}`);
```

- [ ] **Step 2: 지금은 실패하는 것이 정상임을 확인**

Run: `node scripts/validate-data.mjs`
Expected: FAIL — 분포 미달 (초성 easy 30/45, 나머지 유형 0개). 스키마 오류는 0건이어야 한다. 스키마 오류가 있으면 Task 1의 30문항을 고친다.

- [ ] **Step 3: 커밋**

```bash
git add scripts/validate-data.mjs
git commit -m "$(cat <<'EOF'
feat: 데이터 검증 게이트

스키마·id 중복·유형별 정답 중복·안전 기준 금칙어·난이도 분포를 검사한다.
검증 기준은 js/app.js 상수에서 읽어 와 화면과 데이터가 따로 노는 것을 막는다.
문항을 채우기 전에 게이트를 먼저 세워 400개를 쓰고 나서 갈아엎는 일을 없앤다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 초성퀴즈 120문항 완성

**Files:**
- Modify: `data/words.json`

**Interfaces:**
- Consumes: Task 5의 검증 게이트, Task 1의 스키마
- Produces: `choseong` 유형 120문항 (easy 45 / normal 45 / hard 30)

- [ ] **Step 1: 90문항 추가**

Task 1의 30문항(동물·음식·학교물건 각 10, 전부 easy)에 90개를 더해 120개로 만든다.

주제 8종에 고르게 배분한다 (주제당 15개 = 동물·음식·학교물건·직업·나라·자연·탈것·운동).

난이도 기준:
- `easy` — 2~3글자, 1학년도 아는 낱말 (코끼리, 사과, 지우개)
- `normal` — 3~4글자, 교과서에 나오는 수준 (소방관, 아르헨티나는 hard)
- `hard` — 4글자 이상이거나 덜 익숙한 낱말 (현미경, 오스트리아, 기린과 헷갈리는 것들)

작성 규칙:
- `prompt`는 정답의 초성만. 겹자음도 그대로 적는다 (까치 → `ㄲㅊ`) — 위 주석 참고
- `hint`는 정답을 반쯤만 연다. 정답 문자열을 그대로 포함하면 검증이 막는다
- 초성이 같은 다른 답이 자연스럽게 나올 수 있으면 `also`에 넣는다 (`ㅅㄱ` → 사과/수건 → 이 경우엔 초성이 다르므로 해당 없음. 실제로는 `ㄱㅈ` → 감자/과자 같은 사례)
- `note`는 선택. 아이들이 "아하" 할 한 줄이 있을 때만
- id: `choseong-<약칭>-<3자리>`

- [ ] **Step 2: 검증 통과 확인**

Run: `node scripts/validate-data.mjs`
Expected: `choseong easy 45/45  normal 45/45  hard 30/30   합계 120`, choseong 관련 오류 0건 (다른 유형 분포 오류는 아직 남아 있는 것이 정상)

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:8379` — 초성퀴즈에서 난이도 `쉬움`/`보통`/`어려움`, 주제 8종을 각각 골라 3문항씩 넘겨 본다. 조건에 맞는 문제만 나오는지, 같은 주제가 3연속 나오지 않는지 본다.

- [ ] **Step 4: 커밋**

```bash
git add data/words.json
git commit -m "$(cat <<'EOF'
data: 초성퀴즈 120문항 (easy 45 / normal 45 / hard 30)

주제 8종(동물·음식·학교물건·직업·나라·자연·탈것·운동)에 15개씩.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 속담 100 + 사자성어 90 + 수수께끼 90

세 유형을 한 태스크로 묶는다 — 셋 다 `topic: null`이고 작성 규칙이 같은 계열이라, 리뷰어가 따로 승인·반려할 이유가 없다.

**Files:**
- Modify: `data/words.json`

**Interfaces:**
- Consumes: Task 5 검증 게이트
- Produces: `proverb` 100 (35/40/25), `idiom` 90 (25/35/30), `riddle` 90 (35/35/20). 문항형 총 400

- [ ] **Step 1: 속담 100문항**

`prompt`는 앞부분 + 빈칸, `answer`는 뒷부분. `note`에 뜻을 한 줄로.

```json
{
  "id": "proverb-001",
  "type": "proverb",
  "level": "easy",
  "topic": null,
  "prompt": "가는 말이 고와야 ______",
  "hint": "첫 글자는 '오'",
  "answer": "오는 말이 곱다",
  "also": ["오는 말도 곱다"],
  "note": "말을 예쁘게 하자는 뜻이에요."
}
```

- 빈칸은 언더바 6개(`______`)로 통일한다
- 아이들이 여러 형태로 외칠 수 있으면 `also`에 담는다 (곱다/고와요/곱습니다는 같은 답으로 인정)
- **장애 비하가 섞인 속담은 통째로 제외한다** (PRD 3절). "벙어리 냉가슴", "장님 코끼리 만지듯" 등 — 검증 금칙어가 막지만 애초에 쓰지 않는다

- [ ] **Step 2: 사자성어 90문항**

`prompt`는 뜻이나 상황, `answer`는 네 글자 사자성어. `hint`는 초성 (PRD 3절 "초성 힌트").

```json
{
  "id": "idiom-001",
  "type": "idiom",
  "level": "easy",
  "topic": null,
  "prompt": "여러 번 하다 보면 잘하게 된다는 말",
  "hint": "ㅅㅅㅁㄷ",
  "answer": "숙수무단",
  "also": [],
  "note": ""
}
```

- 정답은 공백을 뺀 네 글자여야 한다 (검증이 막는다)
- `hint`는 초성 네 자
- `note`에 한자 뜻풀이를 넣되 한 줄을 넘기지 않는다

- [ ] **Step 3: 수수께끼 90문항**

`prompt`는 수수께끼 문장, `hint`는 한 단계 더 여는 단서.

```json
{
  "id": "riddle-001",
  "type": "riddle",
  "level": "easy",
  "topic": null,
  "prompt": "다리가 네 개인데 걷지 못하는 것은?",
  "hint": "교실에 서른 개쯤 있어요.",
  "answer": "책상",
  "also": ["의자"],
  "note": ""
}
```

- 답이 여러 개 성립하면 `also`에 담는다 (PRD 3절 "답이 여러 개여도 됩니다")
- 말장난 수수께끼는 `note`에 왜 그런지 한 줄 (예: "'말'이 두 가지 뜻이에요")

- [ ] **Step 4: 검증 통과 확인**

Run: `node scripts/validate-data.mjs`
Expected:
```
    choseong  easy  45/45  normal  45/45  hard  30/30   합계 120
    proverb   easy  35/35  normal  40/40  hard  25/25   합계 100
    idiom     easy  25/25  normal  35/35  hard  30/30   합계  90
    riddle    easy  35/35  normal  35/35  hard  20/20   합계  90
    ─ 문항형 합계 400 (목표 400)
```
도구형(`chain` 0/60, `gesture` 0/100) 오류는 Task 8·9에서 해결되므로 아직 남아 있는 것이 정상.

- [ ] **Step 5: 브라우저에서 세 유형 확인**

각 유형을 난이도별로 3문항씩 넘겨 본다. 특히 속담·수수께끼는 문장이 길어 `data-len="long"` 단계가 적용되는지, 한 화면에 잘리지 않고 들어가는지 본다.

- [ ] **Step 6: 커밋**

```bash
git add data/words.json
git commit -m "$(cat <<'EOF'
data: 속담 100 · 사자성어 90 · 수수께끼 90 (문항형 총 400)

PRD 11절 목표 분포를 채웠다. 장애 비하가 섞인 속담은 원문이라도 제외.
답이 여럿 성립하는 문항은 also 로 인정 답을 담았다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 끝말잇기 도우미 (TDD)

**Files:**
- Create: `js/chain.js`
- Test: `scripts/chain.test.mjs`
- Modify: `index.html` (`#screen-chain` 내용), `js/app.js`, `css/style.css`, `data/words.json` (시작 단어 60개)

**설계 판단** — PRD 5절이 "지나간 단어 목록(교사 입력 없이 딸깍 기록)"이라고 적었는데, 단어를 남기려면 타이핑이 필요해 서로 모순이다. **입력 없는 쪽**을 택해, 화면은 *차례*를 기록한다: `1번 ✓ 2번 ✓ 3번 ✗`. 교사는 성공/탈락 두 버튼만 누른다.

**Interfaces:**
- Consumes: `pick.js` → `candidates`, `pickNext` / `store.js` → `store`
- Produces:
  - `chain.js` → `createRound({word, groups, seconds}) => Round`
  - `chain.js` → `advance(round, result: 'ok'|'out'|'timeout') => Round` (새 객체 반환, 원본 불변)
  - `Round` 형태: `{ word, groups, seconds, turn: number, log: Array<{turn: number, result: string}>, done: boolean }`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/chain.test.mjs`:

```js
// chain.js — 끝말잇기 차례 진행 규칙 (순수 로직)
import test from 'node:test';
import assert from 'node:assert/strict';
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node --test scripts/chain.test.mjs`
Expected: FAIL — `Cannot find module '../js/chain.js'`

- [ ] **Step 3: chain.js 구현**

```js
/* ── 끝말잇기 도우미 — 차례 진행 규칙 ──
   화면은 단어를 모른다. 교사가 타이핑하지 않기 때문이다(PRD 5절).
   대신 "몇 번 차례가 성공했는가"만 기록한다: 1번 ✓ 2번 ✓ 3번 ✗

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

export function advance(round, result) {
  if (round.done) return round;
  const log = [...round.log, { turn: round.turn, result }];
  if (result !== 'ok') return { ...round, log, done: true };
  return { ...round, log, turn: (round.turn % round.groups) + 1 };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/chain.test.mjs`
Expected: PASS (8 tests)

- [ ] **Step 5: 시작 단어 60개 추가**

`data/words.json`에 `chain` 60개. 끝 글자로 이어 가기 쉬운 단어를 고른다 — `ㄹ`로 끝나거나 이을 말이 거의 없는 끝 글자(`늪`, `숲` 등)는 피한다. 검증이 경고로 잡는다.

```json
{ "id": "chain-001", "type": "chain", "level": "easy", "word": "기차" }
```

난이도: `easy` 30 / `normal` 20 / `hard` 10 (쉬울수록 흔한 2글자 명사).

- [ ] **Step 6: 화면 구현**

`index.html`의 `#screen-chain`:

```html
<section id="screen-chain" class="screen chain" hidden>
  <p class="chain-label">시작 단어</p>
  <p class="chain-word" id="chain-word"></p>
  <p class="chain-turn" id="chain-turn"></p>
  <div class="chain-timer" id="chain-timer" role="timer" aria-label="남은 시간">0</div>
  <div class="chain-log" id="chain-log" aria-label="지나간 차례"></div>
  <div class="chain-actions">
    <button class="btn btn-primary btn-big" id="btn-chain-ok" type="button">성공 <kbd>Space</kbd></button>
    <button class="btn btn-ghost btn-big" id="btn-chain-out" type="button">탈락</button>
  </div>
  <div class="chain-corner">
    <button class="btn btn-ghost btn-sm" id="btn-chain-new" type="button">새 단어로</button>
    <button class="btn btn-ghost btn-sm" id="btn-chain-quit" type="button">마치기</button>
  </div>
</section>
```

조건 선택 화면(`#screen-setup`)은 `chain` 유형일 때 난이도 대신 **모둠 수(2~8)**와 **제한 시간(5·10·15·20초)**을 묻도록 분기한다.

타이머는 `setInterval(…, 1000)`이 아니라 `Date.now()` 기준으로 남은 시간을 계산한다 — 탭이 백그라운드로 가면 인터벌이 느려져 시간이 어긋난다. 0에 닿으면 `advance(round, 'timeout')`.

- [ ] **Step 7: 브라우저에서 확인**

1. 끝말잇기 → 모둠 4, 10초 → 시작 → 시작 단어가 크게 뜨고 `1번 차례`, 타이머가 10부터 내려간다
2. `성공`을 누르면 2번 차례로 넘어가고 타이머가 다시 10부터, 기록에 `1번 ✓`가 쌓인다
3. 4번 다음은 1번으로 돌아온다
4. 시간이 0이 되면 스스로 멈추고 `시간 초과`가 뜬다
5. `탈락`을 누르면 판이 끝난다
6. `새 단어로`를 누르면 다른 시작 단어가 나온다 (최근 제외가 적용된다)

- [ ] **Step 8: 커밋**

```bash
git add js/chain.js scripts/chain.test.mjs index.html js/app.js css/style.css data/words.json
git commit -m "$(cat <<'EOF'
feat: 끝말잇기 도우미 (차례·타이머·기록)

PRD 5절의 "교사 입력 없이 딸깍 기록"을 따라 단어가 아닌 차례를 기록한다.
진행 규칙은 불변 객체 순수 함수로 두고 node --test 로 고정.
타이머는 Date.now 기준 — 탭이 백그라운드로 가도 시간이 어긋나지 않는다.
시작 단어 60개 추가.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 몸으로 말해요

**Files:**
- Modify: `index.html` (`#screen-gesture`), `js/app.js`, `css/style.css`, `data/words.json` (카드 100장)

**Interfaces:**
- Consumes: `pick.js` → `candidates`, `pickNext` / `store.js` → `store`
- Produces: `gesture` 유형 100개 (easy 40 / normal 40 / hard 20), 주제 8종 배분

- [ ] **Step 1: 카드 100장 추가**

```json
{ "id": "gesture-001", "type": "gesture", "level": "easy", "topic": "동물", "word": "펭귄" }
```

몸으로 표현할 수 있는 것만 고른다 — 동작·모양·소리가 있는 낱말. `나라`, `학교물건` 중 표현하기 어려운 것(예: `지우개`는 되지만 `아르헨티나`는 안 된다)은 빼고 주제를 채운다. 실제 배분: 동물 20 / 음식 15 / 학교물건 15 / 직업 20 / 자연 10 / 탈것 10 / 운동 10 (`나라`는 몸으로 표현이 어려워 제외).

- [ ] **Step 2: 화면 구현**

```html
<section id="screen-gesture" class="screen gesture" hidden>
  <p class="gesture-topic" id="gesture-topic"></p>
  <p class="gesture-word" id="gesture-word"></p>
  <div class="gesture-actions">
    <button class="btn btn-primary btn-big" id="btn-gesture-next" type="button">다음 카드 → <kbd>Space</kbd></button>
  </div>
  <div class="gesture-corner">
    <span class="gesture-count" id="gesture-count"></span>
    <button class="btn btn-ghost btn-sm" id="btn-gesture-quit" type="button">마치기</button>
  </div>
</section>
```

카드는 **한 명만 화면을 등지고 맞히는** 용도다 (PRD 3절). 단어가 화면 절반 이상을 차지하도록 `.gesture-word { font-size: clamp(4rem, 18vw, 14rem); }`.

- [ ] **Step 3: 검증 통과 확인 — 도구형까지 전부 채워진다**

Run: `node scripts/validate-data.mjs`
Expected: 오류 0건. `chain 60/60`, `gesture 100/100`, 문항형 합계 400.

- [ ] **Step 4: 브라우저에서 확인**

1. 몸으로 말해요 → 주제 `전체` → 시작 → 단어가 화면 가득 뜬다
2. `다음 카드`로 계속 넘어가고, 방금 본 단어가 바로 다시 나오지 않는다
3. 주제를 `동물`로 고르면 동물 단어만 나온다

- [ ] **Step 5: 커밋**

```bash
git add index.html js/app.js css/style.css data/words.json
git commit -m "$(cat <<'EOF'
feat: 몸으로 말해요 + 카드 100장

한 명만 화면을 등지고 맞히는 용도라 단어를 화면 절반 이상으로 띄운다.
몸으로 표현 가능한 낱말만 골라 주제 7종에 배분(나라는 제외).
이로써 데이터 검증이 전부 통과한다 — 문항 400 + 시작단어 60 + 카드 100.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 아이콘 확정 + 가족 공통 인프라 합류

**⚠️ 사용자 확인이 필요한 태스크다.** PRD 10절이 브랜드 색을 "제안 — 아이콘 시안 보고 확정"으로 남겼다. 시안을 만들어 보여 주고 답을 받은 뒤 진행한다.

**Files:**
- Create: `favicon.svg`, `manifest.json`, `scripts/sync-shared.mjs`, `scripts/gen-icons.mjs`, `README.md`, `CLAUDE.md`
- Create (동기화로 받음): `shared/jjam-switcher.js`, `scripts/check-font-coverage.mjs`, `assets/fonts/*`
- Create (생성): `assets/icons/*.png`
- Modify: `css/style.css` (확정 색으로 `--accent` 교체), `index.html` (theme-color)

- [ ] **Step 1: 아이콘 시안 만들기 — 같은 틀 + 다른 알맹이**

가족 규칙: 둥근 사각 타일(`rx="24"`) + 우상단 배지(흰 원 + 네이비 시계)는 **동일**, 바탕색과 가운데 심볼만 고유하다. 배지는 `shared/jjam-switcher.js`의 `BADGE` 상수와 글자 하나까지 같아야 한다.

`favicon.svg` 시안 (말풍선 + ㄱ):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="짬짬이 낱말">
  <rect width="100" height="100" rx="24" fill="#E4576E"/>
  <path d="M16 40a10 10 0 0 1 10-10h36a10 10 0 0 1 10 10v22a10 10 0 0 1-10 10H40L26 84V72h-0a10 10 0 0 1-10-10z" fill="#FFFFFF"/>
  <path d="M34 44h22v6H40v18h-6z" fill="#E4576E"/>
  <circle cx="76" cy="24" r="14" fill="#FFFFFF"/>
  <path d="M76 15.5 V24.5 L82.5 28.5" fill="none" stroke="#152447" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

시안을 만든 뒤 **사용자에게 보여 주고 색·심볼을 확정받는다.** 확정 전에는 다음 스텝으로 넘어가지 않는다. 색이 바뀌면 고칠 곳은 네 군데뿐이다: `favicon.svg`의 `rect fill`, `css/style.css`의 `--accent`(+ 파생 토큰), `index.html`의 `theme-color`, `manifest.json`의 `theme_color`.

- [ ] **Step 2: sync-shared.mjs 작성 후 상류에서 공통 파일 받기**

jjam-rest의 `scripts/sync-shared.mjs`를 그대로 가져오되 주석의 사이트 수만 이 저장소 기준으로 고친다 (다섯 → 여섯). `SHARED` 목록·`UPSTREAM`은 동일하다.

```bash
node scripts/sync-shared.mjs
```

Expected: `shared/jjam-switcher.js`, `scripts/check-font-coverage.mjs`, `assets/fonts/PretendardVariable.subset.woff2`, `coverage.txt`, `LICENSE.txt` 5개가 새로 받아진다.

- [ ] **Step 3: 웹폰트 커버리지 확인 — PRD가 지목한 최대 위험**

Run: `node scripts/check-font-coverage.mjs`

PRD 10절: "문항 400개라 서브셋에 없는 글자가 나올 가능성이 가족 중 가장 높음". 이 스크립트는 빠진 글자를 **경고만** 하고 종료 코드 0으로 끝난다(CI를 막지 않는다).

빠진 글자가 0자가 아니면 **그 목록을 사용자에게 보고한다.** 서브셋 재생성은 상류 `jjam` 저장소의 `assets/fonts/*`를 바꾸는 일이고, 그러면 자매 5개 사이트가 전부 `sync:shared`를 다시 돌려야 하므로 이 저장소 안에서 끝나지 않는다. 선택지는 두 가지다:
- (a) 빠진 글자를 쓰지 않는 낱말로 문항을 교체한다 — 몇 자 안 될 때
- (b) 상류에 서브셋 재생성 PR을 올리고 6개 저장소를 동기화한다 — 글자가 많을 때

어느 쪽이든 **사용자 판단을 받는다.**

- [ ] **Step 4: manifest.json**

```json
{
  "name": "짬짬이 낱말",
  "short_name": "짬짬이 낱말",
  "description": "보기 없이 반 전체가 입으로 외치는 전자칠판용 말놀이",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#FFF6F7",
  "theme_color": "#E4576E",
  "lang": "ko",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "assets/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

- [ ] **Step 5: 아이콘 PNG 생성**

`scripts/gen-icons.mjs`는 jjam-rest 것을 그대로 쓴다 (여백 비율 `MASKABLE_SCALE = 0.66`, `APPLE_SCALE = 0.80`은 안드로이드 안전 영역과 iOS 스퀘어클 마스크에서 나온 값이라 바꾸지 않는다).

```bash
npm install
node scripts/gen-icons.mjs
```

Expected: `assets/icons/` 에 PNG 4개 생성. 출력에 `바탕색 #E4576E`(또는 확정 색)가 찍힌다.

- [ ] **Step 6: README.md · CLAUDE.md**

`CLAUDE.md`는 jjam-stretch의 것을 본떠 구조·규칙을 적는다. 반드시 담을 규칙:
- `npm test` 필수 통과 (node --test + validate-data + check-font-coverage)
- 외부 이미지·영상·폰트·라이브러리 의존 금지
- `shared/`·`assets/fonts/`·`scripts/check-font-coverage.mjs`는 직접 고치지 않는다 (상류 jjam)
- 문항 추가 시 안전 기준(PRD 3절)과 분포 목표를 지킨다 — 검증이 강제한다
- 요구사항 원본 `짬짬이_낱말_PRD.md`, 계획 `docs/superpowers/plans/`

- [ ] **Step 7: 상단바에 자매 바로가기가 뜨는지 확인**

브라우저에서 상단바 오른쪽에 자매 사이트 5개(게임·퀴즈·영상·이야기·쉼) 아이콘이 보여야 한다. `data-site="word"`는 아직 상류 `SITES`에 없으므로 **낱말 자신은 목록에 없고 5개가 다 보이는 것이 정상**이다 (Task 12에서 상류에 추가하면 낱말만 빠지고 5개가 남는다 — 결과는 같다).

- [ ] **Step 8: 커밋**

```bash
git add favicon.svg manifest.json shared assets scripts/sync-shared.mjs scripts/gen-icons.mjs scripts/check-font-coverage.mjs README.md CLAUDE.md css/style.css index.html package-lock.json
git commit -m "$(cat <<'EOF'
feat: 아이콘·매니페스트·가족 공통 인프라 합류

favicon.svg 단일 소스에서 PNG 4종 생성. 둥근 타일 + 시계 배지는 가족 공통,
바탕색과 심볼만 낱말 고유. shared/jjam-switcher.js·Pretendard 서브셋은
상류 jjam 에서 동기화해 받았다(직접 수정 금지).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: 오프라인(SW) + 전자칠판 반응형 + CI

**Files:**
- Create: `sw.js`, `.github/workflows/ci.yml`, `.github/workflows/shared-sync.yml`
- Modify: `js/app.js` (SW 등록), `css/style.css` (반응형 점검)

- [ ] **Step 1: sw.js**

jjam-rest의 network-first 전략을 따른다 — 콘텐츠 갱신이 바로 반영되면서 오프라인에서도 돈다.

```js
/* 짬짬이 낱말 — 오프라인 캐시 (FR-09) */
var CACHE = 'jjam-word-v1';

var ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/pick.js',
  './js/store.js',
  './js/sound.js',
  './js/chain.js',
  './shared/jjam-switcher.js',
  './data/words.json',
  './favicon.svg',
  './manifest.json',
  './assets/fonts/PretendardVariable.subset.woff2'
];
```

install/activate/fetch 핸들러는 jjam-rest `sw.js`와 동일하다. `js/app.js` 말미에 등록:

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 오프라인만 안 될 뿐 */ });
  });
}
```

- [ ] **Step 2: CI 워크플로**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: 순수 로직 테스트
        run: node --test
      - name: 낱말 데이터 검증
        run: node scripts/validate-data.mjs
      - name: 웹폰트 글자 커버리지 검증
        run: node scripts/check-font-coverage.mjs
```

`.github/workflows/shared-sync.yml`은 jjam-rest 것을 그대로 (cron 시각도 동일하게 두면 6개 저장소가 같은 시각에 확인한다).

- [ ] **Step 3: 전체 검증 통과 확인**

Run: `npm test`
Expected: 전 테스트 PASS + 데이터 검증 통과 + 폰트 커버리지 출력. 오류 0건.

- [ ] **Step 4: 전자칠판 반응형·오프라인 점검**

브라우저 창을 다음 크기로 바꿔 가며 확인한다:
- **1920×1080** (전자칠판 기본) — 문제 글씨가 화면 폭을 충분히 쓴다
- **1280×800** (노트북) — 버튼이 겹치지 않는다
- **720px 이하** — 자매 바로가기가 아이콘만 남는다 (`jjam-switcher.js` 규칙)

오프라인 확인: DevTools → Network → Offline → 새로고침 → 앱이 뜨고 문제를 계속 낼 수 있다.

**뒷자리 가독성** (PRD 12절): 브라우저 확대를 50%로 낮춰 보면 교실 뒷자리에서 보는 크기와 비슷하다. 초성·정답이 읽히는지 본다.

- [ ] **Step 5: 커밋**

```bash
git add sw.js js/app.js css/style.css .github
git commit -m "$(cat <<'EOF'
feat: 오프라인 캐시와 CI 게이트

network-first 서비스워커로 콘텐츠 갱신과 오프라인을 함께 잡는다.
CI 는 순수 로직 테스트·데이터 검증·폰트 커버리지 세 관문.
상류 공통 파일 이탈은 매일 shared-sync 가 확인한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: 배포 — 저장소 생성, 상류 SITES 추가, GitHub Pages

**⚠️ 바깥으로 나가는 변경이 둘 있다. 실행 전 사용자 확인을 받는다.**
1. 공개 GitHub 저장소 `jjam-word` 생성
2. **상류 `jjam` 수정** — `shared/jjam-switcher.js`의 `SITES`에 낱말을 넣으면 이미 운영 중인 자매 사이트 5곳의 헤더가 전부 바뀐다 (바로가기가 4개 → 5개). 헤더 폭에 여유가 있는지도 함께 봐야 한다.

**Files:**
- Modify (상류 jjam): `shared/jjam-switcher.js`
- Modify (자매 5개 저장소): `shared/jjam-switcher.js` (sync 결과)

- [ ] **Step 1: 저장소 생성과 첫 푸시**

```bash
gh repo create jjam-word --public --description "짬짬이 낱말 — 보기 없이 반 전체가 입으로 외치는 전자칠판용 말놀이" --source=. --push
```

- [ ] **Step 2: GitHub Pages를 main 루트로 설정**

```bash
gh api -X POST repos/shway81-droid/jjam-word/pages -f "source[branch]=main" -f "source[path]=/"
```

- [ ] **Step 3: 상류 jjam에 낱말 추가 (사용자 확인 후)**

`jjam`을 클론해 `shared/jjam-switcher.js`를 고친다. 세 곳을 함께 바꾼다 — 하나라도 빠지면 아이콘이 비거나 이름이 안 나온다.

1. 파일 상단 주석의 "다섯" → "여섯", `data-site` 설명에 `| word` 추가
2. `SITES` 배열 말미에 추가:

```js
    { key: 'word',  label: '짬짬이낱말',   go: '짬짬이 낱말로 가기',
      url: 'https://shway81-droid.github.io/jjam-word/' }
```

3. `ART` 객체에 `word` 추가 — `favicon.svg`의 배경 `rect`와 심볼을 그대로 옮기고 배지는 `BADGE` 상수를 붙인다 (favicon과 그림이 어긋나면 안 된다):

```js
    word:
      '<rect width="100" height="100" rx="24" fill="#E4576E"/>' +
      '<path d="M16 40a10 10 0 0 1 10-10h36a10 10 0 0 1 10 10v22a10 10 0 0 1-10 10H40L26 84V72a10 10 0 0 1-10-10z" fill="#FFFFFF"/>' +
      '<path d="M34 44h22v6H40v18h-6z" fill="#E4576E"/>' + BADGE
```

브랜치 → PR → CI 통과 → squash 머지.

- [ ] **Step 4: 여섯 저장소 동기화**

상류 머지 후, 자매 5개(`jjam-quiz` `jjam-video` `jjam-story` `jjam-rest` `jjam-stretch`)와 이 저장소에서 각각:

```bash
node scripts/sync-shared.mjs
```

`jjam-stretch`에는 `scripts/sync-shared.mjs`가 없다 (구조가 이전 세대다). 그 저장소는 이번 동기화 대상에서 빼고, 사용자에게 별도 합류가 필요한지 확인한다.

각 저장소에서 브랜치 → PR → CI → squash 머지.

- [ ] **Step 5: 배포 확인**

`https://shway81-droid.github.io/jjam-word/` 에서:
1. 첫 화면이 2초 안에 뜬다 (PRD 9절)
2. 홈 → 초성퀴즈 → 시작까지 10초 안에 첫 문제 (PRD 12절)
3. 콘솔 오류 0건
4. 상단바 자매 바로가기 5개가 보이고 실제로 이동된다
5. 오프라인으로 전환 후 재방문해도 동작한다
6. 자매 사이트(예: 짬짬이 쉼)에 가면 헤더에 **짬짬이낱말**이 보인다

- [ ] **Step 6: 교실 테스트 안내**

PRD 13절의 마지막 단계는 교실 테스트다. 사용자에게 확인 요청 항목을 정리해 전달한다: 전자칠판 뒷자리 가독성, 자투리 5분에 10~15문항 소화 여부, 리모컨/키보드 Space·H 진행.

---

## Self-Review

**1. Spec coverage** — PRD 각 절을 태스크에 대응시킨 결과:

| PRD | 태스크 |
|---|---|
| 3절 유형 6종 | T1·T6(초성) T7(속담·사자성어·수수께끼) T8(끝말잇기) T9(몸으로) |
| 3절 난이도 3단계 | T1(스키마) T3(선택 화면) T5(분포 게이트) |
| 3절 안전 기준 | T5(금칙어 표) T7(속담 원문 제외 규칙) |
| 4절 핵심 흐름 | T3(상태 머신) |
| 5절 화면 6개 | T3(1·2·3·6) T8(4) T9(5) |
| 6절 FR-01~10 | FR-01·02 T3 / FR-03 T2 / FR-04 T4 / FR-05 T8 / FR-06 T9 / FR-07 T3 / FR-08 T2·T3 / FR-09 T11 / FR-10 T3·T11 |
| 7절 데이터 구조 | T1(스키마) T5(검증) |
| 8절 출제 로직 | T1(pick.js) T3(상태) |
| 9절 비기능 | T3(글씨·키보드) T11(2초·반응형) |
| 10절 기술 구성 | T4(Web Audio) T10(아이콘·폰트·switcher) T11(SW·CI) T12(Pages) |
| 11절 MVP 범위 | T6·T7·T8·T9 (400+60+100) |
| 12절 완료 기준 | T3·T11·T12 확인 스텝 |
| 13절 개발 순서 | T1~T12가 1:1 대응 (PRD 순서 1→T1·T3, 2→T3, 3→T4, 4→T6·T7, 5→T8·T9, 6→T5·T11, 7→T10, 8→T11, 9→T12, 10→T12) |

빠진 요구사항 없음. PRD 1.4 비목표(점수판·계정·받아쓰기·영어)는 어느 태스크에도 없다 — 의도한 대로다.

**2. Placeholder scan** — 코드 스텝은 전부 실제 코드를 담았다. 문항 데이터(T6·T7·T8·T9)는 개별 400개를 나열하는 대신 스키마·규칙·분포 목표와 이를 강제하는 검증 게이트(T5)로 완료를 정의했다. 게이트가 통과 여부를 판정하므로 "적당히"가 들어갈 자리가 없다.

**3. Type consistency** — 확인한 이름들:
- `candidates(items, {type, level, topic})` / `pickNext(pool, {recentIds, recentTopics, rng})` — T1 정의, T3·T8·T9에서 동일하게 호출
- `store.recentIds/pushRecent/clearRecent/isMuted/setMuted/todayCount/bumpToday` — T2 정의, T3·T4에서 동일
- `sound.ensure/hint/reveal/setMuted` — T4 정의, T3에서 호출하는 이름과 일치
- `createRound/advance` — T8 정의·사용
- `TYPES`/`LEVELS`/`TOPICS` — T3 정의, T5의 정규식(`const TYPES = {`, `const LEVELS = [`, `const TOPICS = [`)이 그 형태를 그대로 겨냥
- 유형 키 `choseong/proverb/idiom/riddle/chain/gesture` — T1 데이터, T3 상수, T5 TARGET, T6~T9 데이터에서 전부 동일

---

## 실행 전 사용자에게 확인받을 것

1. **브랜드 색 `#E4576E`** — T10에서 시안과 함께 확정 (PRD가 열어 둔 항목)
2. **웹폰트 서브셋** — T10 Step 3에서 빠진 글자가 나오면 (a) 문항 교체 / (b) 상류 서브셋 재생성 중 선택
3. **상류 `jjam` 수정** — T12 Step 3. 운영 중인 자매 5개 사이트의 헤더가 함께 바뀐다
4. **공개 저장소 생성·배포** — T12 Step 1·2
5. **`jjam-stretch` 합류 여부** — 그 저장소만 `sync-shared.mjs`가 없어 이번 동기화에서 빠진다

---

# 실행 결과 (2026-07-30)

## 사용자 결정

| 항목 | 결정 |
|---|---|
| 브랜드 색 | **`#E4576E` 코럴 확정** (제안값 그대로) |
| 배포 범위 | **저장소 생성·Pages 배포까지만.** 상류 `jjam` SITES 수정은 하지 않음 |

## 계획과 달라진 것

- **T10 폰트 서브셋** — 빠진 글자 17자 중 13자가 실제 문항 텍스트였고, 4자는 코드 주석에만
  있었다. 상류 서브셋을 바꾸면 자매 5개 저장소를 모두 재동기화해야 하므로 **13개 문구를
  뜻이 같은 표현으로 교체**했다(쪄→익혀, 뻥→크게, 엮어→이어, 뽐내는→자랑하는 등).
  주석에만 있는 4자(뀔·듈·뛴·뗀)는 화면에 렌더링되지 않아 그대로 두었다.
- **T5 금칙어 게이트** — 게이트를 실제로 돌리다 한국어 오탐을 발견했다(설거지→'거지',
  사장님→'장님', 계모임→'계모', 불이 꺼져요→'꺼져', 영향을 미친→'미친').
  금칙어 표를 `scripts/banned.mjs`로 분리하고 오탐 11개·진짜 위반 14개를
  `scripts/banned.test.mjs`로 고정했다 — 계획에 없던 파일 2개가 늘었다.
- **T11 반응형** — 375px에서 페이지가 105px 옆으로 밀리는 결함을 찾았다. 원인은 자매
  바로가기 5개(287px)이고 그 CSS는 상류 파일 안에 있어 줄일 수 없다. 720px 아래에서
  상단바를 두 줄로 접어 해결했다.
- **T12 CI 워크플로 미배포** — `gh` 토큰에 `workflow` 스코프가 없어
  `.github/workflows/*` push가 거부된다(`gh api` 우회도 404). 파일은 작업 폴더에
  준비돼 있고, 아래 둘 중 하나로 올리면 그대로 동작한다.
  - `gh auth login --hostname github.com --scopes "repo,read:org,gist,workflow" --web` 후 커밋·푸시
  - GitHub 웹 UI → Add file → Create new file 로 경로 직접 입력 (스코프 제약 없음)
- **T12 머지 방식** — 가족 공통 지시대로 squash 머지했다. 태스크별 상세 커밋 11개는
  `feat/mvp` 브랜치에 남겨 두었다(삭제하면 이력이 사라진다).
- **T3 favicon/manifest 선행 생성** — 계획은 T10에서 만들도록 했지만, T3의 헤더 로고가
  `favicon.svg`를 참조해 7개 태스크 동안 깨진 이미지가 보이게 된다. 제안값으로 먼저
  만들고 T10에서 확정했다.
- **`.gitattributes` 추가** — 계획에 없었다. `eol=lf`가 없으면 윈도우 체크아웃이 상류
  공통 파일을 CRLF로 바꿔 `sync:check`가 영구히 이탈을 보고한다(실제로 클론본과
  SHA256이 어긋나는 것을 확인했다).
- **`sync-shared.mjs`에 `gh api` 폴백** — 이 환경에서 `raw.githubusercontent.com`
  직접 연결이 ECONNRESET으로 끊긴다. 같은 증상으로 자매 저장소 작업이 여러 번 막힌
  이력이 있어 폴백을 넣었다(CI에서는 첫 경로가 통한다).

## 남은 일

- CI 워크플로 2개 올리기 (위 두 방법 중 하나)
- 상류 `jjam` SITES·ART에 낱말 추가 → 자매 저장소 `sync-shared` (사용자가 나중으로 미룸)
- 교실 테스트 (PRD 13절 10단계)
