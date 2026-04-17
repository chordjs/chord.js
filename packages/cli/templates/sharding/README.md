# folder-routing-sharding 예제

폴더 기반 라우팅 + 샤딩/클러스터링(단일/샤드/클러스터/멀티프로세스/멀티머신 분산) 예제입니다.

## Quick start

```bash
DISCORD_TOKEN="..." bun run dev
```

## 환경변수

- **`DISCORD_TOKEN`** (필수): 봇 토큰
- **`MODE`**: `"single" | "shard" | "cluster" | "cluster-distributed" | "process"` (기본: `"single"`)
- **`SHARD_COUNT`**: 양의 정수 또는 `"auto"` (기본: `2`)
- **`CLUSTER_COUNT`**: 양의 정수 (기본: `2`)
- **`SHARD_IDS`**: 샤드 ID 목록(쉼표 구분). `MODE="shard"`에서 선택 실행용 (옵션)
- **`CLUSTER_IDS`**: 클러스터 ID 목록(쉼표 구분). `MODE="cluster-distributed"`에서 **필수**
- **`OWNER_IDS`**: 오너 유저 ID 목록(쉼표 구분). 설정 시 커맨드가 **owner-only**로 동작 (옵션)

## 실행

레포 루트에서:

```bash
bun run --cwd examples/folder-routing-sharding dev
```

또는 이 폴더에서:

```bash
bun run dev
```

### MODE: single (기본)

```bash
DISCORD_TOKEN="..." MODE="single" bun run dev
```

### MODE: shard

```bash
DISCORD_TOKEN="..." MODE="shard" SHARD_COUNT="auto" bun run dev
```

특정 샤드만 띄우기:

```bash
DISCORD_TOKEN="..." MODE="shard" SHARD_COUNT="8" SHARD_IDS="0,1,2,3" bun run dev
```

### MODE: cluster (in-process)

```bash
DISCORD_TOKEN="..." MODE="cluster" SHARD_COUNT="auto" CLUSTER_COUNT="2" bun run dev
```

### MODE: cluster-distributed (멀티머신 분산)

여러 컴퓨터에 클러스터를 나눠 띄우는 모드입니다. **모든 머신이 동일한 `SHARD_COUNT` / `CLUSTER_COUNT`**를 써야 합니다.

예시(클러스터 4개: 0~3):

- **PC1**: 클러스터 `0,1`

```bash
DISCORD_TOKEN="..." MODE="cluster-distributed" SHARD_COUNT="auto" CLUSTER_COUNT="4" CLUSTER_IDS="0,1" bun run dev
```

- **PC2**: 클러스터 `2,3`

```bash
DISCORD_TOKEN="..." MODE="cluster-distributed" SHARD_COUNT="auto" CLUSTER_COUNT="4" CLUSTER_IDS="2,3" bun run dev
```

### MODE: process (멀티프로세스)

```bash
DISCORD_TOKEN="..." MODE="process" SHARD_COUNT="auto" CLUSTER_COUNT="2" bun run dev
```

## 커맨드 시나리오

이 예제는 prefix를 이렇게 잡아둡니다:

- 메시지가 `!`로 시작하면 prefix는 `!`
- 아니면 prefix는 빈 문자열(무접두사)

그래서 아래 둘 다 동작합니다:

- `!ping`
- `ping`

### ping + args

- `!ping hello world` → `pong hello world`

### alias

`src/commands/ping.ts`의 `ping` 커맨드는 alias가 있습니다:

- `p`
- `admin:ping`

예:

- `!p`
- `!admin:ping`

### owner-only

```bash
DISCORD_TOKEN="..." OWNER_IDS="123456789012345678" bun run dev
```

`OWNER_IDS`가 설정돼 있고 목록에 없으면 커맨드 실행이 막힙니다.

