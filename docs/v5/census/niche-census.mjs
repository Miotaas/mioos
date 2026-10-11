/**
 * MioOS V5 — Cross-niche entry-wave census
 * DISPOSABLE RESEARCH INSTRUMENT. Not MioOS code.
 *
 * Measures the ONE signature that killed Korean CI, across every candidate niche:
 *   how many channels entered in the last 90 days, and how badly are they doing?
 *
 * Reads YOUTUBE_API_KEY from env. Never prints or stores it.
 *   node niche-census.mjs                  -> all niches
 *   node niche-census.mjs ambient consumer -> only those keys
 *
 * Quota: ~300 units per niche discovery + profiling. All 13 ≈ 5,000-6,000 of 10,000/day.
 */

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.error("ERROR: YOUTUBE_API_KEY not set in this shell."); process.exit(1); }
const API = "https://www.googleapis.com/youtube/v3";

// Two queries per niche: [primary (channel+video), secondary (channel only)]
const NICHES = {
  language_ci:   ["comprehensible input language learning", "slow language listening practice"],
  ambient_sleep: ["sleep music 8 hours rain sounds", "focus study ambient music"],
  ai_tech:       ["ai tools tutorial workflow", "practical ai for work"],
  business_econ: ["business breakdown company analysis", "economics explained documentary"],
  automotive:    ["car buying advice reliability", "cost of ownership car analysis"],
  history_geo:   ["geopolitics explained map", "engineering disaster explained"],
  science:       ["science explained curiosity", "how it works science documentary"],
  storytelling:  ["true story documentary narration", "historical storytelling channel"],
  consumer_cost: ["what things actually cost breakdown", "is it worth buying analysis"],
  data_journal:  ["data analysis explained charts", "we analysed the data youtube"],
  transport_avn: ["aviation explained route economics", "why airlines fly this route"],
  price_transp:  ["cost of living comparison data", "how much does it really cost"],
  product_spec:  ["best laptop under comparison specs", "product comparison data driven"],
};

let quota = 0;
async function api(path, params, cost) {
  const r = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key: KEY })}`);
  quota += cost;
  if (!r.ok) throw new Error(`${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
const med = (a) => { if (!a.length) return null; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1;
  return s.length%2 ? s[m] : Math.round((s[m-1]+s[m])/2); };
const days = (d) => Math.round((Date.now() - new Date(d)) / 86400000);

async function niche(key, queries) {
  const ids = new Set();
  for (let i = 0; i < queries.length; i++) {
    const types = i === 0 ? ["channel", "video"] : ["channel"];
    for (const type of types) {
      try {
        const r = await api("search", { part:"snippet", q:queries[i], type, maxResults:"25", order:"relevance" }, 100);
        for (const it of r.items || []) {
          const id = type === "channel" ? it.id.channelId : it.snippet.channelId;
          if (id) ids.add(id);
        }
      } catch (e) { console.error(`  ${key} "${queries[i]}" ${type} FAILED: ${e.message}`); }
    }
  }
  const list = [...ids];
  const out = [];
  for (let i = 0; i < list.length; i += 50) {
    const r = await api("channels", { part:"snippet,statistics,contentDetails", id:list.slice(i,i+50).join(",") }, 1);
    for (const c of r.items || []) {
      const up = c.contentDetails?.relatedPlaylists?.uploads;
      let views = [], last90 = 0;
      if (up) try {
        const pl = await api("playlistItems", { part:"contentDetails", playlistId:up, maxResults:"20" }, 1);
        const vids = (pl.items||[]).map(x=>x.contentDetails.videoId).filter(Boolean);
        if (vids.length) {
          const vr = await api("videos", { part:"statistics,snippet", id:vids.join(",") }, 1);
          for (const v of vr.items||[]) {
            views.push(+(v.statistics?.viewCount ?? 0));
            if (days(v.snippet.publishedAt) <= 90) last90++;
          }
        }
      } catch {}
      const subs = +(c.statistics?.subscriberCount ?? 0);
      const m = med(views);
      out.push({ id:c.id, title:c.snippet.title, ageDays:days(c.snippet.publishedAt),
        subs, medianViews:m, vps: subs>0 && m!=null ? +(m/subs).toFixed(3) : null, uploads90d:last90 });
    }
  }
  return out;
}

(async () => {
  const only = process.argv.slice(2);
  const keys = only.length ? only.filter(k=>NICHES[k]) : Object.keys(NICHES);
  const report = {};
  for (const k of keys) {
    process.stderr.write(`${k} ... `);
    const ch = await niche(k, NICHES[k]);
    const withData = ch.filter(c=>c.medianViews!=null);
    const u90 = withData.filter(c=>c.ageDays<90);
    const u365 = withData.filter(c=>c.ageDays<365);
    const active90 = u90.filter(c=>c.uploads90d>=8);
    const est = withData.filter(c=>c.subs>=5000);
    report[k] = {
      channels: withData.length,
      // THE FLOOD SIGNATURE — compare directly against Korean CI
      newUnder90d: u90.length,
      newUnder90d_publishingHard: active90.length,
      newUnder90d_medianSubs: med(u90.map(c=>c.subs)),
      newUnder90d_medianViews: med(u90.map(c=>c.medianViews)),
      newUnder90d_above1000subs: u90.filter(c=>c.subs>=1000).length,
      pctUnder1yr: withData.length ? +(100*u365.length/withData.length).toFixed(0) : null,
      // established tier health
      established5k: est.length,
      established5k_medianVps: med(est.map(c=>Math.round((c.vps||0)*1000)))/1000,
      topChannels: withData.sort((a,b)=>b.subs-a.subs).slice(0,5)
        .map(c=>({t:c.title.slice(0,34), subs:c.subs, med:c.medianViews, vps:c.vps, age:c.ageDays})),
    };
    console.error(`${withData.length} ch | ${u90.length} new<90d`);
  }
  const fs = await import("node:fs");
  fs.writeFileSync(new URL("./niche-census-output.json", import.meta.url), JSON.stringify({
    generated:new Date().toISOString(), quotaUnitsUsed:quota,
    koreanBaseline:{ channels:160, newUnder90d:22, newUnder90d_publishingHard:12,
                     newUnder90d_medianSubs:9, newUnder90d_medianViews:73,
                     newUnder90d_above1000subs:2, pctUnder1yr:34 },
    niches:report }, null, 2));
  console.error(`\nDone. ~${quota} quota units. -> niche-census-output.json`);
})();
