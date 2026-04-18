import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

// 0바이트 DB 파일이 있으면 삭제 (컨테이너 재시작 시 libsql이 빈 파일을 남기는 문제 방지)
if (dbUrl.startsWith("file:")) {
  const dbPath = dbUrl.replace(/^file:\/\//, "").replace(/^file:/, "");
  const absPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
  try {
    if (fs.existsSync(absPath) && fs.statSync(absPath).size === 0) {
      fs.unlinkSync(absPath);
    }
  } catch { /* ignore — might be read-only or race condition */ }
}

const client = createClient({ url: dbUrl });

// SQLite writer/reader 동시성 확보 — 다운로드 progress가 사이트 접속을 막지 않도록.
if (dbUrl.startsWith("file:")) {
  client.execute("PRAGMA journal_mode=WAL").catch(() => {});
  client.execute("PRAGMA synchronous=NORMAL").catch(() => {});
  client.execute("PRAGMA busy_timeout=5000").catch(() => {});
}

export const db = drizzle(client, { schema });
export * from "./schema";
