import { downloadVideo } from "./ytdlp";

// 진행 중인 다운로드 프로세스 추적 (서버 메모리, 재시작 시 초기화됨)
export const activeDownloads = new Map<string, ReturnType<typeof downloadVideo>>();
