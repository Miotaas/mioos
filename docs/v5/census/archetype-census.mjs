/**
 * MioOS V5 — Gate 2: content-archetype census
 * DISPOSABLE RESEARCH INSTRUMENT. Not MioOS code.
 *
 * Answers: are data-driven consumer-cost or automotive-economics videos underserved
 * enough for a new automated property to enter in 2026?
 *
 * The script GATHERS EVIDENCE ONLY. It does not classify DIRECT/ADJACENT/IRRELEVANT —
 * that is judgement on titles and is done by hand afterwards. The script's job is to
 * preserve everything needed to make that call and to audit query quality.
 *
 * Reads YOUTUBE_API_KEY from env. Never prints or stores it.
 *   node archetype-census.mjs                -> both niches
 *   node archetype-census.mjs consumer_cost  -> one niche
 *
 * Quota: ~2,600 units per niche (12 clusters x 2 search types x 100, + profiling).
 *        Both niches ≈ 5,200 of the 10,000/day free allowance.
 */

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.error("ERROR: YOUTUBE_API_KEY not set in this shell."); process.exit(1); }
const API = "https://www.googleapis.com/youtube/v3";

const NICHES = {
  consumer_cost: {
    label: "Data-driven consumer cost & value analysis",
    clusters: {
      tco:                ["true cost of ownership breakdown", "total cost of ownership calculated"],
      did_the_math:       ["we did the math on the price", "the math on whether it's worth it"],
      hidden_costs:       ["hidden costs nobody tells you", "the real cost nobody mentions"],
      worth_it:           ["is it actually worth the money analysis", "worth it or not the numbers"],
      price_compare:      ["price comparison across providers data", "we compared every price"],
      payback:            ["how long until it pays for itself", "payback period calculation"],
      subscription_audit: ["how much your subscriptions actually cost", "annual cost of subscriptions"],
      cost_per_use:       ["cost per use analysis", "cost per year breakdown"],
      price_history:      ["how much prices have actually risen data", "price history analysis"],
      where_money_goes:   ["where the money actually goes breakdown"],
      cheap_vs_expensive: ["does paying more actually get you more", "cheap vs expensive tested"],
      running_costs:      ["monthly cost breakdown real numbers", "cost of running a home data"],
    },
  },
  automotive: {
    label: "Data-driven automotive economics",
    clusters: {
      car_tco:         ["true cost of owning a car breakdown", "total cost of car ownership calculated"],
      depreciation:    ["car depreciation data which cars hold value", "worst depreciating cars data"],
      reliability_data:["most reliable cars data analysis", "car reliability statistics by brand"],
      running_cost:    ["cost of running a car per year", "annual running cost comparison cars"],
      ev_vs_ice:       ["electric vs petrol cost comparison real numbers"],
      repair_cost:     ["most expensive cars to repair data", "average repair cost by brand"],
      longevity:       ["which cars last 300000 miles data", "engine longevity data cars"],
      insurance_cost:  ["car insurance cost by model data"],
      lease_vs_buy:    ["lease vs buy the math", "buying vs leasing calculation"],
      used_market:     ["used car price trends data", "best time to buy a used car data"],
      recall_data:     ["car recall data analysis by brand"],
      real_mpg:        ["real world mpg vs claimed data", "actual fuel economy tested data"],
    },
  },
};

// Tokens used ONLY for an auto-flag that focuses human scrutiny. Not a classifier.
const COST_TOKENS = ["cost","price","priced","$","€","£","cheap","expensive","worth","value",
  "data","analysis","analyz","analys","math","numbers","breakdown","compare","comparison",
  "per year","per month","depreciat","reliab","budget","spend","save","%"];

let quota = 0;
async function api(path, params, cost) {
  const r = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key: KEY })}`);
  quota += cost;
  if (!r.ok) throw new Error(`${path} ${r.status}: ${(await r.text()).slice(0,200)}`);
  return r.json();
}
const med = a => { if(!a.length) return null; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1;
  return s.length%2 ? s[m] : Math.round((s[m-1]+s[m])/2); };
const days = d => Math.round((Date.now()-new Date(d))/86400000);
const iso  = d => new Date(d).toISOString().slice(0,10);

async function run(nicheKey) {
  const { label, clusters } = NICHES[nicheKey];
  // channelId -> { clusters:Set, matchedVideos:[{title,cluster,views,published}] }
  const hits = new Map();
  const touch = id => { if(!hits.has(id)) hits.set(id,{clusters:new Set(),matchedVideos:[]}); return hits.get(id); };

  for (const [cluster, queries] of Object.entries(clusters)) {
    for (const q of queries) {
      for (const type of ["channel","video"]) {
        try {
          const r = await api("search", { part:"snippet", q, type, maxResults:"25", order:"relevance" }, 100);
          for (const it of r.items||[]) {
            const id = type==="channel" ? it.id.channelId : it.snippet.channelId;
            if (!id) continue;
            const h = touch(id);
            h.clusters.add(cluster);
            if (type==="video") h.matchedVideos.push({ title:it.snippet.title, cluster,
              published: iso(it.snippet.publishedAt) });
          }
          console.error(`  [${cluster}/${type}] "${q}" -> ${(r.items||[]).length}`);
        } catch(e) { console.error(`  [${cluster}/${type}] "${q}" FAILED: ${e.message}`); }
      }
    }
  }

  const ids = [...hits.keys()];
  console.error(`  profiling ${ids.length} channels...`);
  const channels = [];
  for (let i=0;i<ids.length;i+=50) {
    const r = await api("channels", { part:"snippet,statistics,contentDetails", id:ids.slice(i,i+50).join(",") }, 1);
    for (const c of r.items||[]) {
      const up = c.contentDetails?.relatedPlaylists?.uploads;
      let vids=[];
      if (up) try {
        const pl = await api("playlistItems", { part:"contentDetails", playlistId:up, maxResults:"20" },1);
        const vIds = (pl.items||[]).map(x=>x.contentDetails.videoId).filter(Boolean);
        if (vIds.length) {
          const vr = await api("videos", { part:"statistics,contentDetails,snippet", id:vIds.join(",") },1);
          vids = (vr.items||[]).map(v=>({
            title:v.snippet.title, published:iso(v.snippet.publishedAt),
            views:+(v.statistics?.viewCount??0),
            seconds:(()=>{const m=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(v.contentDetails?.duration||"")||[];
              return (+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0);})(),
          }));
        }
      } catch {}
      const h = hits.get(c.id);
      const subs = +(c.statistics?.subscriberCount??0);
      const views = vids.map(v=>v.views);
      const m = med(views);
      const age = days(c.snippet.publishedAt);
      const tokenHits = vids.filter(v=>{
        const t=v.title.toLowerCase(); return COST_TOKENS.some(k=>t.includes(k));
      }).length;
      channels.push({
        channelId:c.id, title:c.snippet.title, created:iso(c.snippet.publishedAt), ageDays:age,
        subscribers:subs, totalVideos:+(c.statistics?.videoCount??0),
        sampled:vids.length, medianViews:m,
        medianViewsPerSub: subs>0&&m!=null ? +(m/subs).toFixed(4) : null,
        uploadsLast90d: vids.filter(v=>days(v.published)<=90).length,
        shortsInSample: vids.filter(v=>v.seconds>0&&v.seconds<=60).length,
        longformInSample: vids.filter(v=>v.seconds>60).length,
        // QUERY AUDIT — which clusters surfaced this channel
        foundByClusters:[...h.clusters].sort(),
        clusterCount:h.clusters.size,
        // EVIDENCE for hand classification
        matchedVideoTitles:h.matchedVideos.slice(0,8),
        recentUploadTitles:vids.slice(0,20).map(v=>v.title),
        // AUTO-FLAGS (focus scrutiny, do NOT classify)
        flag_generalist_suspect: subs>1_000_000 && age>1825,
        flag_archetype_suspect: vids.length>=5 && tokenHits<3,
        titleTokenHitRate: vids.length ? +(tokenHits/vids.length).toFixed(2) : null,
        classification:null,   // <- filled in by hand: DIRECT | ADJACENT | IRRELEVANT
      });
    }
  }
  channels.sort((a,b)=>b.subscribers-a.subscribers);

  // Per-cluster audit: how many channels each cluster surfaced, and how distinctive it was
  const clusterAudit={};
  for (const k of Object.keys(clusters)) {
    const found = channels.filter(c=>c.foundByClusters.includes(k));
    clusterAudit[k] = {
      channelsFound: found.length,
      uniqueToThisCluster: found.filter(c=>c.clusterCount===1).length,
      medianTitleTokenHitRate: med(found.map(c=>Math.round((c.titleTokenHitRate||0)*100)))/100,
      generalistSuspects: found.filter(c=>c.flag_generalist_suspect).length,
    };
  }
  return { label, channelCount: channels.length, clusterAudit, channels };
}

(async () => {
  const only = process.argv.slice(2).filter(k=>NICHES[k]);
  const keys = only.length ? only : Object.keys(NICHES);
  const out = { generated:new Date().toISOString(), quotaUnitsUsed:0, niches:{},
    koreanBaseline:{ channels:160, newUnder90d:22, newUnder90d_medianSubs:9,
                     newUnder90d_medianViews:73, newUnder90d_above1000subs:2, pctUnder1yr:34 },
    thresholds:{
      FLOODED_KILL:"DIRECT channels <90d >= 15 AND that cohort median subs < 100",
      HEALTHY_GO:"DIRECT channels <90d < 8 AND >=2 DIRECT channels <365d above 10000 subs",
      NO_MARKET:"fewer than 5 DIRECT channels at any age above 10000 subs",
      OTHERWISE:"INCONCLUSIVE — archetype lacks a search vocabulary this instrument can resolve",
    },
    note:"classification field is null by design. DIRECT/ADJACENT/IRRELEVANT is assigned by hand from recentUploadTitles + matchedVideoTitles. Flood signature is computed on DIRECT only, after classification." };
  for (const k of keys) { console.error(`\n=== ${k} ===`); out.niches[k] = await run(k); }
  out.quotaUnitsUsed = quota;
  const fs = await import("node:fs");
  fs.writeFileSync(new URL("./archetype-census-output.json", import.meta.url), JSON.stringify(out,null,2));
  console.error(`\nDone. ~${quota} quota units. -> archetype-census-output.json`);
})();
