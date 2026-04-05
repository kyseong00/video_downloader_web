# video_downloader_web

Self-hosted YouTube downloader built with Next.js + yt-dlp.
셀프호스팅 YouTube 다운로더 (Next.js + yt-dlp 기반)

---

## 🇬🇧 English

### Features
- Download YouTube videos/audio (MP4, WEBM, MKV, MP3, M4A)
- Channel subscription with auto-download
- Playlist management
- Multi-user support with admin approval
- Per-user and global concurrent download / bandwidth limits
- Admin settings: cookies, custom yt-dlp args, site name customization
- Dark mode support

### Requirements
- Docker & Docker Compose
- Disk space for downloads

### Quick Start

**1. Clone the repository**
```bash
git clone https://github.com/kyseong00/video_downloader_web.git
cd video_downloader_web
```

**2. Create environment file**
```bash
cp .env.example .env
```

**3. Edit `.env` and set your values**
```bash
# Generate a secure secret
openssl rand -base64 32

# Check your user IDs
id -u   # PUID
id -g   # PGID
```
Edit `.env` and set `NEXTAUTH_SECRET`, `PUID`, `PGID`.

**4. Build and run**
```bash
docker compose up -d --build
```

**5. Open in browser**
```
http://localhost:3033
```

### First Use
1. Sign up with email/password
2. **The first registered user automatically becomes admin**
3. Subsequent users require admin approval
4. As admin, go to Admin → Settings to configure site name, cookies, download path, etc.

### Troubleshooting

**Database error (SQLite code 14)**
Volume permission issue. Fix:
```bash
# Check your user IDs and set them in .env
id -u && id -g

# Or change directory ownership
sudo chown -R 1000:1000 ./data/
```

**External drive warning**
NTFS/exFAT filesystems are NOT compatible with SQLite locking.
Use **ext4** or other Unix-compatible filesystems.

**View logs**
```bash
docker compose logs -f
```

**Stop / Restart**
```bash
docker compose down       # stop
docker compose up -d      # start
docker compose restart    # restart
```

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite via Drizzle ORM + libsql
- **Auth**: NextAuth v5
- **Downloader**: yt-dlp
- **UI**: Tailwind CSS + shadcn/ui
- **State**: Zustand + TanStack Query

---

## 🇰🇷 한국어

### 주요 기능
- YouTube 영상/오디오 다운로드 (MP4, WEBM, MKV, MP3, M4A)
- 채널 구독 및 자동 다운로드
- 플레이리스트 관리
- 다중 사용자 지원 (관리자 승인 방식)
- 사용자별/전체 동시 다운로드 및 대역폭 제한
- 관리자 설정: 쿠키, yt-dlp 커스텀 인자, 사이트 이름 커스텀
- 다크 모드 지원

### 요구사항
- Docker & Docker Compose
- 다운로드 저장용 디스크 공간

### 빠른 시작

**1. 저장소 클론**
```bash
git clone https://github.com/kyseong00/video_downloader_web.git
cd video_downloader_web
```

**2. 환경변수 파일 생성**
```bash
cp .env.example .env
```

**3. `.env` 편집 후 값 설정**
```bash
# 보안 키 생성
openssl rand -base64 32

# 본인 유저 ID 확인
id -u   # PUID
id -g   # PGID
```
`.env` 파일에서 `NEXTAUTH_SECRET`, `PUID`, `PGID` 값을 입력하세요.

**4. 빌드 및 실행**
```bash
docker compose up -d --build
```

**5. 브라우저에서 접속**
```
http://localhost:3033
```

### 첫 사용

1. 이메일/비밀번호로 회원가입
2. **가장 먼저 가입한 사용자가 자동으로 관리자**가 됩니다
3. 이후 가입자는 관리자 승인이 필요합니다
4. 관리자는 관리자 → 설정에서 사이트 이름, 쿠키, 다운로드 경로 등을 설정할 수 있습니다

### 문제 해결

**DB 에러 (SQLite code 14)**
볼륨 권한 문제입니다. 해결:
```bash
# 본인 유저 ID 확인 후 .env에 반영
id -u && id -g

# 또는 디렉토리 소유권 변경
sudo chown -R 1000:1000 ./data/
```

**외장 드라이브 주의**
NTFS/exFAT 파일시스템은 SQLite 락킹과 호환되지 않습니다.
**ext4** 또는 다른 유닉스 호환 파일시스템을 사용하세요.

**로그 확인**
```bash
docker compose logs -f
```

**중지 / 재시작**
```bash
docker compose down       # 중지
docker compose up -d      # 시작
docker compose restart    # 재시작
```

### 기술 스택
- **프레임워크**: Next.js 14 (App Router)
- **데이터베이스**: SQLite (Drizzle ORM + libsql)
- **인증**: NextAuth v5
- **다운로더**: yt-dlp
- **UI**: Tailwind CSS + shadcn/ui
- **상태관리**: Zustand + TanStack Query

---

## License
MIT
