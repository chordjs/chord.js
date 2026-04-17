# Chord.js 구현 로드맵

> 규칙: 아래 항목은 구현 완료 시 `[ ]` → `[x]`로 체크합니다.
> (필요하면 중간에 항목/순서 조정 가능)

## 0) 리포지토리/빌드 기반

- [x] Bun 워크스페이스 모노레포 스캐폴딩
- [x] 빌드 파이프라인 고속화 (`swc` + `tsc --emitDeclarationOnly`)
- [x] 패키지 버전/릴리즈 전략 정리 (changesets 등)

## 1) `@chord.js/types` (스키마/타입)

- [x] Gateway opcode / 기본 payload 타입
- [x] Identify presence 타입 추가
- [x] Discord REST 리소스 타입 최소셋 (User, Guild, Channel, Message)
- [x] Gateway DISPATCH 이벤트 타입 최소셋 (READY, RESUMED, MESSAGE_CREATE, INTERACTION_CREATE)
- [x] 타입 생성/동기화 전략 결정 (수기 vs 스키마 기반)

## 2) `@chord.js/gateway` (Gateway 구현)

- [x] HELLO → Heartbeat → Identify/Resume 상태머신
- [x] zlib-stream 수신/inflate 처리
- [x] 샤딩 (Shard/ShardManager + Identify 스케줄러)
- [x] 클러스터 (in-process)
- [x] 클러스터 (멀티프로세스 IPC: ProcessClusterManager + worker)
- [x] Close code/opcode별 재연결 정책 정교화 (RESUME/IDENTIFY 조건표)
- [x] 세션/Resume 강건성 (RESUMED 타임아웃, Resume 실패 시 폴백)
- [x] Dispatch 라우팅 레이어 (이벤트별 핸들러 등록, 타입 안전)
- [x] Voice gateway (선택)

## 3) `@chord.js/rest` (REST 구현)

- [x] 버킷 기반 rate-limit 큐잉(최소)
- [x] route 정규화(major parameter 일부 반영)
- [x] reset/reset-after 헤더 파싱 강화
- [x] Discord route 특례 정규화 보강 (webhooks/reactions 등)
- [x] rate-limit 동시성/경쟁 상태 강화 (공유 버킷/전역 락, 429 body 우선)
- [x] 에러 바디 파싱/구조화 (Discord API error JSON)
- [x] 파일 업로드(multipart) 지원

## 4) `@chord.js/core` (프레임워크: Sapphire 스타일)

- [x] Piece/Store/Container/Client 골격
- [x] Loader (commands/listeners 폴더 자동 로드)
- [x] Listener 바인딩 (gateway dispatch → listener 실행)
- [x] Command 시스템 1차 (prefix command)
- [x] Interaction(슬래시) 커맨드 1차 (REST 등록 + gateway 처리)
- [x] Precondition/Hook (권한/쿨다운/길드 제한 등)

## 5) DX/테스트/예제

- [x] `examples/basic-bot` 패키지 추가 (gateway+rest+core 연결 샘플)
- [x] 통합 테스트 최소셋 (mock gateway/rest)
- [x] 문서: 시작하기/아키텍처/샤딩-클러스터링 가이드

## 6) Command DX 고도화 (다음 우선순위)

- [x] `Command` alias를 core 기본 기능으로 승격 (`aliases: string[]`, 라우터 내장 해석)
- [x] Prefix 컨텍스트 강타입 보강 (`message/author/channel/guild/member` 접근 안정화)
- [x] Prefix `reply` payload 확장 (`tts`, `allowed_mentions`, `message_reference`, `flags`)
- [x] Prefix parser 옵션 추가 (mention prefix, dynamic prefix cache)

## 7) Interaction 응답 프레임워크

- [x] Interaction responder 유틸 추가 (`reply`, `deferReply`, `editReply`, `followUp`)
- [x] Ephemeral/flags 처리 일관화
- [x] slash command 실행 컨텍스트 표준화 (guild/member/resolved 데이터)
- [x] Interaction router 에러 응답 기본 정책 제공

## 8) 운영/스케일링 안정화

- [x] `GET /gateway/bot` 기반 자동 shard 수 결정 (`shardCount: "auto"`)
- [x] ProcessClusterManager 이벤트 스트림화 (ready/log/error/pong 외부 구독 API)
- [x] Worker 장애 시 재기동/백오프 전략
- [x] 샤드/클러스터 메트릭 훅 (`latency`, `lastHeartbeatAck`, `resumeCount`)

## 9) 기본 Precondition 팩 + 문서

- [x] 내장 precondition 제공 (`GuildOnly`, `OwnerOnly`, `Permissions`, `Cooldown`)
- [x] precondition 조합/우선순위 규칙 문서화
- [x] Production 가이드 문서 추가 (intents, privileged intents, sharding, failover)
- [x] 예제 보강: 폴더 라우팅 + alias + precondition 샘플

## 10) 후속 고도화 (Next Sprint)

- [x] Interaction 옵션 파서 고도화 (subcommand/subcommand-group/focused/resolved)
- [x] ProcessClusterManager 재시작 통계 API 추가 (`getRestartStats`)
- [x] ProcessClusterManager graceful shutdown 타임아웃 + 강제 종료 fallback
- [x] 메트릭 샘플링 주기 옵션 추가 (`onMetrics` interval)
- [x] 클러스터 집계 메트릭 제공 (평균 latency, resume rate)
- [x] 폴더 예제 README 추가 (env/mode/owner-only/alias 시나리오)
- [x] gateway/sharding/process-cluster 단위 테스트 확장
- [x] 릴리즈 준비 (changeset/changelog/docs 링크 최종 점검)

---

# Phase 2 — 품질 보강 및 기능 확장

> 코드 심층 분석 결과 발견된 미구현·보강 항목을 우선순위별로 정리합니다.

## 11) 테스트 보강 (최우선)

- [ ] `@chord.js/rest` 단위 테스트 신설 (`packages/rest/tests/`)
  - [ ] rate-limit 버킷 큐잉/동시성 테스트
  - [ ] 429 재시도 + global rate-limit 테스트
  - [ ] multipart 업로드 테스트
  - [ ] route 정규화 로직 테스트
  - [ ] `RestError` 구조화 에러 바디 테스트
- [ ] `GatewayClient` 단위 테스트 신설 (`packages/gateway/tests/gateway-client.test.ts`)
  - [ ] HELLO → Heartbeat → Identify 상태머신 테스트
  - [ ] zlib-stream inflate 테스트
  - [ ] 재연결 정책 (close code별 action) 테스트
  - [ ] Resume 타임아웃 → IDENTIFY 폴백 테스트
  - [ ] Dispatch 핸들러 등록/해제/once 테스트
- [ ] `VoiceGatewayClient` 단위 테스트 신설
  - [ ] Identify → Ready → SelectProtocol → SessionDescription 흐름
  - [ ] RTP 암호화 패킷 구조 검증
- [ ] `PieceLoader` 단위 테스트 (폴더 로딩, factory/class/instance 등)

## 12) `@chord.js/types` 확장

- [ ] Gateway DISPATCH 이벤트 타입 확장
  - [ ] Guild 이벤트 (`GUILD_CREATE`, `GUILD_UPDATE`, `GUILD_DELETE`)
  - [ ] GuildMember 이벤트 (`GUILD_MEMBER_ADD`, `GUILD_MEMBER_REMOVE`, `GUILD_MEMBER_UPDATE`)
  - [ ] Channel 이벤트 (`CHANNEL_CREATE`, `CHANNEL_UPDATE`, `CHANNEL_DELETE`)
  - [ ] Message 이벤트 (`MESSAGE_UPDATE`, `MESSAGE_DELETE`, `MESSAGE_DELETE_BULK`)
  - [ ] Reaction 이벤트 (`MESSAGE_REACTION_ADD`, `MESSAGE_REACTION_REMOVE`)
  - [ ] Voice 이벤트 (`VOICE_STATE_UPDATE`, `VOICE_SERVER_UPDATE`)
  - [ ] Presence/Typing (`PRESENCE_UPDATE`, `TYPING_START`)
- [ ] Discord REST 리소스 타입 확장
  - [ ] `GuildMember` 정식 타입 (`Record<string, unknown>` → 구체 타입)
  - [ ] `Role`, `Emoji`, `Sticker` 타입
  - [ ] `VoiceState`, `Presence` 타입
  - [ ] `ApplicationCommand` 응답 타입 (REST 등록 후 반환값)
  - [ ] `MessageComponent` 구체 타입 (`ActionRow`, `Button`, `SelectMenu`, `Modal`)
  - [ ] `Channel` 서브타입 (`TextChannel`, `VoiceChannel`, `CategoryChannel` 등)
- [x] `generated/` 코드젠 파이프라인 구현 또는 제거 결정
- [x] Phase 3 고수준 추상화 (완료)
  - [x] 통합 `ChordClient` (rest, gateway, cache 허브)
  - [x] 엔터티/매니저 패턴 (`User`, `Guild`, `Channel`, `Member`, `Message`)
  - [x] Argument Parser (`Args` 시스템)
  - [x] 고수준 API 기반 예제 리팩토링
## 13) 핵심 DX 보강

- [ ] `PieceLoader.loadInteractionsFrom()` 헬퍼 추가
- [ ] `folder-routing-sharding` 예제 커맨드/리스너 파일 추가
  - [ ] `commands/ping.ts` (alias + precondition 예시)
  - [ ] `commands/info.ts` (embed 응답 예시)
  - [ ] `listeners/ready.ts` (READY 이벤트 핸들러)
  - [ ] `listeners/error.ts` (에러 로깅 핸들러)
- [ ] `PrefixCommandRouter` 에러 응답 옵션 추가 (InteractionCommandRouter와 대칭)
- [ ] `GatewayClient` 이벤트 해제 메서드 (`off()`, `once()`, `removeAllListeners()`)
- [ ] `Store` API 보강 (`has()`, `keys()`, `entries()`, `[Symbol.iterator]`, `reload()`)
- [ ] REST 편의 메서드 (`get()`, `post()`, `put()`, `patch()`, `delete()` 숏컷)

## 14) 빌더/유틸리티

- [ ] `EmbedBuilder` — 타입 안전 Embed 빌더 (discord.js 스타일)
- [ ] `PermissionsBitField` — 권한 비트 유틸 (`has()`, `add()`, `remove()`, `toArray()`)
- [ ] REST API Routes 헬퍼 (`Routes.channelMessages(id)` 등 타입 안전 경로)
- [ ] 내장 Logger (`@chord.js/utils`) — 레벨/포맷/컬러 지원, `console.*` 대체
- [ ] `Collection` 클래스 (`Map` 확장, `filter()`, `find()`, `map()`, `sort()` 등)

## 15) 상호작용 확장

- [ ] Component Interaction 핸들러
  - [ ] Button 핸들러 (customId 기반 라우팅)
  - [ ] SelectMenu 핸들러
  - [ ] Modal Submit 핸들러
- [ ] Autocomplete 응답 지원 (`InteractionCommandRouter`에서 type=8 감지 → 별도 핸들러)
- [ ] Context Menu 커맨드 지원 (User/Message command, type=2/3)
- [ ] Event Collector 유틸 (`awaitMessages()`, `awaitReactions()`, `awaitComponents()`)

## 16) 캐시/상태 레이어

- [x] Guild/Channel/User/Member 인메모리 캐시 (`@chord.js/cache`)
  - [x] Dispatch 이벤트 기반 자동 갱신 (GUILD_CREATE → cache upsert)
  - [x] 캐시 옵션 (maxSize, sweepInterval, TTL)
  - [x] 캐시 비활성화 모드 (zero-cache for stateless workers)
- [x] `Container` DI 보강 (팩토리 등록, 토큰 생성 헬퍼, dead code 제거)

## 17) v1.0 릴리즈 준비

- [x] Voice Gateway UDP Discovery 순서 버그 수정 (`bind` 전 `listening` 이벤트 등록)
- [x] API 문서 기본 (README 및 JSDoc 정비)
- [x] 전체 패키지 publicAPI 리뷰 (불필요 export 정리, barrel 최적화)
- [x] CI/CD 파이프라인 (GitHub Actions 추가)
- [x] README 배지 (npm version, CI status, license)
- [x] npm 퍼블리시 드라이런 + 첫 릴리즈 완료 (로컬 빌드 검증)
