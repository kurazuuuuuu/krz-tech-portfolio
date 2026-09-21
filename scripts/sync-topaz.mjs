/*
 * Topa'z (https://topaz.dev) の掲載作品を取り込むスナップショット生成スクリプト。
 *
 * Topa'z の API は CORS ヘッダーを返さないのでブラウザからは叩けない。
 * そのため、ここで取得した結果をリポジトリに同梱し、表示側はそれを import する。
 * 作品を追加・更新したら手で `pnpm run sync:topaz` を回して、生成物ごとコミットする。
 *
 * 生成物:
 * - src/data/topaz.json       … 表示に必要な最小限のメタデータ
 * - public/img/topaz/<id>.webp … サムネイル (長辺 960px 以内に縮小した webp)
 */
import { execFile } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

const USER_NAME = "kurazuuuuuu";
const API_URL = `https://topaz.dev/api/users/${USER_NAME}`;
const PROFILE_URL = `https://topaz.dev/${USER_NAME}`;
const PROJECT_URL_BASE = "https://topaz.dev/projects";
const ASSET_URL_BASE = "https://ptera-publish.topaz.dev";

// サムネイルはカード内で 16:9 にトリミングして出すだけなので、長辺はこれで足りる
const MAX_EDGE = 960;
const WEBP_QUALITY = 80;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "src/data/topaz.json");
const IMAGE_DIR = path.join(ROOT, "public/img/topaz");
const PUBLIC_IMAGE_BASE = "/img/topaz";

function fail(message) {
  console.error(`[sync-topaz] ${message}`);
  process.exit(1);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`${url} が ${response.status} ${response.statusText} を返しました`);
  }
  return response.json();
}

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} が ${response.status} ${response.statusText} を返しました`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** API のレスポンスが想定の形かを確かめる。壊れた入力で既存の生成物を上書きしないための番人 */
function validate(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("レスポンスが JSON オブジェクトではありません");
  }
  const list = payload.project_list;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("project_list が配列ではないか、空です");
  }
  list.forEach((project, index) => {
    const where = `project_list[${index}]`;
    if (typeof project?.id !== "string" || !project.id) {
      throw new Error(`${where}.id が文字列ではありません`);
    }
    // ファイル名に使うので、想定外の文字が混ざっていたら止める
    if (!/^[\w-]+$/.test(project.id)) {
      throw new Error(`${where}.id (${project.id}) に想定外の文字が含まれています`);
    }
    if (typeof project.title !== "string" || !project.title) {
      throw new Error(`${where}.title が文字列ではありません`);
    }
    if (typeof project.thumbnail_path !== "string" || !project.thumbnail_path) {
      throw new Error(`${where}.thumbnail_path が文字列ではありません`);
    }
    if (typeof project.created_at !== "string" || Number.isNaN(Date.parse(project.created_at))) {
      throw new Error(`${where}.created_at が日時として読めません`);
    }
    if (project.technology_tag_list != null && !Array.isArray(project.technology_tag_list)) {
      throw new Error(`${where}.technology_tag_list が配列ではありません`);
    }
    if (project.hackathon != null && typeof project.hackathon?.name !== "string") {
      throw new Error(`${where}.hackathon.name が文字列ではありません`);
    }
  });
  return list;
}

async function buildThumbnail(project) {
  const source = await fetchBuffer(`${ASSET_URL_BASE}/${project.thumbnail_path}`);
  // fit: "inside" で縦長でも長辺を抑える。withoutEnlargement で元より小さい画像は拡大しない
  const pipeline = sharp(source)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function main() {
  const payload = await fetchJson(API_URL);
  const rawProjects = validate(payload);

  // 新しい順。API の並びに依存しないよう created_at で明示的に並べ替える
  const sorted = [...rawProjects].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  const thumbnails = await Promise.all(sorted.map((project) => buildThumbnail(project)));

  const projects = sorted.map((project, index) => {
    const thumbnail = thumbnails[index];
    return {
      id: project.id,
      title: project.title,
      url: `${PROJECT_URL_BASE}/${project.id}`,
      createdAt: project.created_at,
      technologies: (project.technology_tag_list ?? [])
        .map((tag) => tag?.id)
        .filter((name) => typeof name === "string" && name.length > 0),
      hackathon: project.hackathon ? { name: project.hackathon.name } : null,
      thumbnail: `${PUBLIC_IMAGE_BASE}/${project.id}.webp`,
      thumbnailWidth: thumbnail.width,
      thumbnailHeight: thumbnail.height,
    };
  });

  // ここまで全部成功したので、生成物を書き出す
  await mkdir(IMAGE_DIR, { recursive: true });
  const keep = new Set(projects.map((project) => `${project.id}.webp`));
  const existing = await readdir(IMAGE_DIR).catch(() => []);
  await Promise.all(
    existing
      .filter((name) => name.endsWith(".webp") && !keep.has(name))
      .map((name) => rm(path.join(IMAGE_DIR, name))),
  );

  await Promise.all(
    projects.map((project, index) =>
      writeFile(path.join(IMAGE_DIR, `${project.id}.webp`), thumbnails[index].data),
    ),
  );

  const snapshot = {
    profileUrl: PROFILE_URL,
    syncedAt: new Date().toISOString(),
    projects,
  };
  await writeFile(DATA_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);

  // JSON.stringify の出し方は oxfmt と揃わない (短い配列は 1 行にまとめられる)。
  // ここで整形しておかないと、同期のたびに `vp check` が落ちる
  await execFileAsync(
    path.join(ROOT, "node_modules/.bin/vp"),
    ["check", "--fix", path.relative(ROOT, DATA_FILE)],
    { cwd: ROOT },
  ).catch(() => {
    throw new Error(
      `${path.relative(ROOT, DATA_FILE)} の整形に失敗しました。\`vp check --fix\` を手で実行してください`,
    );
  });

  console.log(`[sync-topaz] ${projects.length} 件を ${path.relative(ROOT, DATA_FILE)} に書き出し`);
  console.log(`[sync-topaz] サムネイル ${projects.length} 枚を ${PUBLIC_IMAGE_BASE}/ に保存`);
}

main().catch((error) => fail(error.message));
