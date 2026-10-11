/**
 * MioOS V5 — Gate 1: YouTube supply census
 * DISPOSABLE RESEARCH INSTRUMENT. Not MioOS code. Delete after Gate 1.
 *
 * Reads YOUTUBE_API_KEY from the environment. Never prints it, never writes it to disk.
 * Usage:  node census.mjs            (writes census-output.json next to this file)
 *
 * Quota: ~2,200 units of the 10,000/day free allowance.
 */

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) {
  console.error("ERROR: YOUTUBE_API_KEY is not set in this shell.");
  console.error("PowerShell:  $env:YOUTUBE_API_KEY=\"...\"   then re-run in the SAME window");
  console.error("cmd.exe:     set YOUTUBE_API_KEY=...        then re-run in the SAME window");
  process.exit(1);
}

const API = "https://www.googleapis.com/youtube/v3";

// Multiple clusters, deliberately not pooled — we report per-cluster so we can see
// whether "thin supply" is real or just a query-matching artefact.
const CLUSTERS = {
  ci_explicit:      ["comprehensible input korean", "korean comprehensible input"],
  ci_descriptive:   ["korean listening practice for beginners", "easy korean listening beginner"],
  ci_slow:          ["slow korean for beginners", "천천히 한국어"],
  ci_story:         ["learn korean through stories", "korean story for beginners"],
  immersion:        ["korean immersion listening", "korean input beginner"],
  adjacent_topik:   ["topik 1 listening practice"],
  control_broad:    ["learn korean"],
};

let quota = 0;
async function api(path, params, cost) {
  const qs = new URLSearchParams({ ...params, key: KEY });
  const r = await fetch(`${API}/${path}?${qs}`);
  quota += cost;
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`${path} ${r.status}: ${body.slice(0, 400)}`);
  }
  return r.json();
}

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const daysSince = (d) => Math.round((Date.now() - new Date(d)) / 86400000);
const durSec = (p) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(p || "") || [];
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
};

const channelHits = new Map(); // channelId -> Set of clusters that surfaced it

async function discover() {
  for (const [cluster, queries] of Object.entries(CLUSTERS)) {
    for (const q of queries) {
      for (const type of ["channel", "video"]) {
        try {
          const res = await api("search", {
            part: "snippet", q, type, maxResults: "25",
            relevanceLanguage: "en", order: "relevance",
          }, 100);
          for (const it of res.items || []) {
            const id = type === "channel" ? it.id.channelId : it.snippet.channelId;
            if (!id) continue;
            if (!channelHits.has(id)) channelHits.set(id, new Set());
            channelHits.get(id).add(cluster);
          }
          console.error(`  [${cluster}/${type}] "${q}" -> ${(res.items || []).length}`);
        } catch (e) {
          console.error(`  [${cluster}/${type}] "${q}" FAILED: ${e.message}`);
        }
      }
    }
  }
}

async function profile(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const res = await api("channels", {
      part: "snippet,statistics,contentDetails", id: batch.join(","),
    }, 1);
    for (const c of res.items || []) {
      const uploads = c.contentDetails?.relatedPlaylists?.uploads;
      let vids = [];
      if (uploads) {
        try {
          const pl = await api("playlistItems", {
            part: "contentDetails", playlistId: uploads, maxResults: "20",
          }, 1);
          const vidIds = (pl.items || []).map((x) => x.contentDetails.videoId).filter(Boolean);
          if (vidIds.length) {
            const vr = await api("videos", {
              part: "statistics,contentDetails,snippet", id: vidIds.join(","),
            }, 1);
            vids = (vr.items || []).map((v) => ({
              title: v.snippet.title,
              published: iso(v.snippet.publishedAt),
              views: +(v.statistics?.viewCount ?? 0),
              seconds: durSec(v.contentDetails?.duration),
            }));
          }
        } catch (e) { /* channel may hide uploads */ }
      }
      const subs = +(c.statistics?.subscriberCount ?? 0);
      const views = vids.map((v) => v.views);
      const med = median(views);
      const last90 = vids.filter((v) => daysSince(v.published) <= 90).length;
      const shorts = vids.filter((v) => v.seconds > 0 && v.seconds <= 60).length;
      out.push({
        channelId: c.id,
        title: c.snippet.title,
        country: c.snippet.country ?? null,
        created: iso(c.snippet.publishedAt),
        ageDays: daysSince(c.snippet.publishedAt),
        subscribers: subs,
        subsHidden: c.statistics?.hiddenSubscriberCount === true,
        totalVideos: +(c.statistics?.videoCount ?? 0),
        sampled: vids.length,
        medianViews: med,
        medianViewsPerSub: subs > 0 && med != null ? +(med / subs).toFixed(4) : null,
        uploadsLast90d: last90,
        shortsInSample: shorts,
        longformInSample: vids.length - shorts,
        newestUpload: vids[0]?.published ?? null,
        clusters: [...(channelHits.get(c.id) || [])],
        recentTitles: vids.slice(0, 8).map((v) => v.title),
      });
    }
  }
  return out;
}

(async () => {
  console.error("Discovering channels across query clusters...");
  await discover();
  const ids = [...channelHits.keys()];
  console.error(`\nFound ${ids.length} distinct channels. Profiling...`);
  const channels = await profile(ids);
  channels.sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0));

  const result = {
    generated: new Date().toISOString(),
    pair: "Korean <- English",
    quotaUnitsUsed: quota,
    channelCount: channels.length,
    clusters: Object.keys(CLUSTERS),
    channels,
  };

  const fs = await import("node:fs");
  const path = new URL("./census-output.json", import.meta.url);
  fs.writeFileSync(path, JSON.stringify(result, null, 2));
  console.error(`\nDone. ${channels.length} channels. ~${quota} quota units used.`);
  console.error(`Written to: census-output.json`);
})();
