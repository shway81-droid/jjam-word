# 짬짬이 낱말 (jjam-word)

보기 없이 반 전체가 입으로 외치는 전자칠판용 말놀이. 정적 SPA.
jjam(짬짬이 게임)의 자매 프로젝트 — 게임·퀴즈·영상·이야기·쉼에 이은 여섯 번째.

## 구조

- 빌드 도구 없음. Vanilla HTML/CSS/JS(ES modules). GitHub Pages(main 루트) 배포.
- `index.html` — 화면 6개를 섹션으로 두고 `js/app.js` 가 토글한다(해시 라우팅 없음)
- `js/app.js` — 부트스트랩·상수(TYPES/LEVELS/TOPICS)·상태 머신·키보드. **DOM 에 닿는 코드는 여기만**
- `js/pick.js` — [순수] 후보 필터 + 출제 선택 (최근 50개 제외, 소진 시 초기화, 주제 3연속 회피)
- `js/store.js` — localStorage (`jjam-word:recent:<type>`, `jjam-word:muted`, `jjam-word:today`)
- `js/sound.js` — Web Audio 합성 (음원 파일 0개). 음소거는 master gain 한 곳
- `js/chain.js` — [순수] 끝말잇기 차례 진행 규칙 (불변 객체)
- `js/clock.js` — [순수] 수업 타이머(상단바, 1~5분). 놀이에 속하지 않아 화면을 바꿔도
  이어서 흐른다. 끝말잇기 차례 타이머(`chain.js`)와는 다른 물건이다
- `data/words.json` — 단일 소스 560개: 문항 400 + 끝말잇기 시작단어 60 + 몸으로말해요 카드 100
- `sw.js` — network-first 서비스워커 (콘텐츠 갱신과 오프라인을 함께)

## 규칙

- `npm test` 필수 통과 = `node --test` + `validate-data` + `check-font-coverage`.
  PR·main 푸시마다 `.github/workflows/verify.yml` 이 같은 명령을 돌린다
- 외부 이미지·영상·폰트 CDN·JS 라이브러리 의존 금지 (오프라인·저작권)
- **상류에서 받아오는 파일은 직접 고치지 않는다** — `shared/jjam-switcher.js`,
  `scripts/check-font-coverage.mjs`, `assets/fonts/*`.
  고칠 일이 있으면 jjam 에서 고쳐 머지한 뒤 `npm run sync:shared`
- 브랜드 색 원값은 `css/style.css` 의 `--accent` **한 곳뿐**. 나머지는 `color-mix` 로 파생된다
- 아이콘 단일 소스는 `favicon.svg`. PNG 는 `npm run icons` 로 생성
- `js/app.js` 의 TYPES/LEVELS/TOPICS 는 `scripts/validate-data.mjs` 가 정규식으로 읽어 간다.
  상수 이름이나 형태를 바꾸면 검증도 함께 고쳐야 한다 (안 고치면 통과가 아니라 실패한다)
- 문항 추가 시 안전 기준(PRD 3절)과 난이도 분포를 지킨다 — 검증이 강제한다.
  금칙어 표는 `scripts/banned.mjs`, 오탐/탐지 사례는 `scripts/banned.test.mjs` 에 고정돼 있다
- 초성퀴즈 `prompt` 는 정답에서 기계적으로 나온 초성이어야 한다 — **겹자음 그대로**
  (토끼 → `ㅌㄲ`). 초기 계획은 홑자음으로 펴는 것이었으나 뒤집혔다: 화면이 아이들에게
  틀린 초성을 가르치면 안 된다. 초성이 욕설로 읽히는 낱말은 `CHOSEONG_BANNED` 로 막는다
- 문항당 교사 조작은 **최대 3회**(문제→힌트→정답). 자동 진행 없음 — 외침을 기다려야 한다
- PR 워크플로: 브랜치 → PR → CI 통과 → squash 머지

## 환경 주의

- 이 개발 환경에서 `raw.githubusercontent.com` 직접 연결이 ECONNRESET 으로 끊긴다.
  `scripts/sync-shared.mjs` 는 실패 시 `gh api` 로 우회한다 (CI 에서는 첫 경로가 통한다)
- 저장소 안 줄바꿈은 항상 LF(`.gitattributes`). 안 그러면 상류 공통 파일이 CRLF 로
  바뀌어 `sync:check` 가 영구히 이탈을 보고한다

## 원본 문서

- 요구사항: `짬짬이_낱말_PRD.md`
- 구현 계획: `docs/superpowers/plans/2026-07-29-jjam-word-mvp.md`
