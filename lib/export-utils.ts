import { GoogleAdsResult, MagicWandResult } from "../types";

export const downloadFile = (filename: string, content: string, contentType: string) => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const generateGoogleAdsCSV = (googleAds?: any, magic?: any): string => {
    const rows: string[][] = [];

    if (googleAds) {
        rows.push(["GOOGLE ADS STRATEGY REPORT"]);
        rows.push(["Generated at", new Date().toLocaleString()]);
        rows.push([]);

        const kw = googleAds.keywords;
        if (kw) {
            rows.push(["--- KEYWORD RESEARCH ---"]);
            rows.push(["Type", "Keyword", "CPC"]);
            if (Array.isArray(kw.primary)) kw.primary.forEach((k: any) => rows.push(["Primary", k.keyword, k.cpc || 'N/A']));
            if (Array.isArray(kw.longTail)) kw.longTail.forEach((k: any) => rows.push(["Long-tail", k.keyword, k.cpc || 'N/A']));
            if (Array.isArray(kw.negative)) kw.negative.forEach((k: any) => rows.push(["Negative", k.keyword, k.cpc || 'N/A']));
            rows.push([]);
        }

        const ads = googleAds.adCopies;
        if (Array.isArray(ads)) {
            rows.push(["--- AD COPY VARIATIONS ---"]);
            rows.push(["Variation", "Headlines", "Descriptions", "CTA"]);
            ads.forEach((ad: any, i: number) => {
                const hl = Array.isArray(ad.headlines) ? ad.headlines.join(' | ') : '';
                const ds = Array.isArray(ad.descriptions) ? ad.descriptions.join(' | ') : '';
                rows.push([`Variation ${i + 1}`, hl, ds, ad.callToAction || '']);
            });
            rows.push([]);
        }

        const camps = googleAds.campaigns;
        if (Array.isArray(camps)) {
            rows.push(["--- CAMPAIGN STRUCTURE ---"]);
            rows.push(["Name", "Type", "Daily Budget", "Locations", "Schedule"]);
            camps.forEach((c: any) => {
                const targeting = c.targeting;
                const locs = (targeting && Array.isArray(targeting.locations)) ? targeting.locations.join('; ') : 'All';
                const sched = (targeting && Array.isArray(targeting.schedule)) ? targeting.schedule.join('; ') : 'All';
                rows.push([
                    c.name || 'Campaign',
                    c.type || 'Search',
                    `${c.budget?.daily || 0} ${c.budget?.currency || 'USD'}`,
                    locs,
                    sched
                ]);
            });
            rows.push([]);
        }
    }

    if (magic) {
        rows.push(["--- MARKET INTELLIGENCE ---"]);
        const ma = magic.marketAnalysis;
        if (ma) {
            rows.push(["Growth Rate", ma.growthRate || 'N/A']);
            const comps = ma.topCompetitors;
            rows.push(["Top Competitors", Array.isArray(comps) ? comps.join('; ') : 'N/A']);
            const trends = ma.marketTrends;
            rows.push(["Market Trends", Array.isArray(trends) ? trends.join('; ') : 'N/A']);
        }
        const rationale = magic.rationale;
        if (rationale) {
            rows.push(["Strategy Rationale", rationale]);
        }
    }

    return rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");
};

export const generateGoogleAdsHTML = (googleAds?: any, magic?: any): string => {
    const parts: string[] = [];
    parts.push(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Ads Report</title>`);
    parts.push(`<style>
        :root { --bg: #0f172a; --card: #1e293b; --text: #e2e8f0; --accent: #6366f1; }
        body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 40px; margin: 0; }
        .container { max-width: 1000px; margin: 0 auto; }
        .section { background: var(--card); border-radius: 16px; padding: 32px; margin-bottom: 32px; border: 1px solid rgba(255,255,255,0.1); }
        h1 { font-size: 2.5rem; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0 0 1rem 0; }
        h2 { font-size: 1.25rem; color: #818cf8; margin-top: 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }
        .tag { display: inline-block; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #c3dafe; padding: 6px 14px; border-radius: 99px; font-size: 0.85rem; margin: 0 8px 8px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .metric { font-size: 1.5rem; font-weight: 700; color: #4ade80; }
        .label { font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 600; }
    </style></head><body><div class="container">`);

    parts.push(`<h1>Google Ads Strategy Report</h1><p style="color:#94a3b8; margin-bottom: 40px">Generated on ${new Date().toLocaleDateString()}</p>`);

    if (googleAds) {
        parts.push(`<div class="section"><h2>🎯 Keyword Intelligence</h2>`);
        const kw = googleAds.keywords;
        if (kw) {
            const primary = kw.primary;
            if (Array.isArray(primary)) {
                parts.push(`<div style="margin-bottom:20px"><div class="label">Primary Keywords</div>`);
                primary.forEach((k: any) => parts.push(`<span class="tag">${k.keyword} <small>(${k.cpc || 'N/A'})</small></span>`));
                parts.push(`</div>`);
            }
            const longTail = kw.longTail;
            if (Array.isArray(longTail)) {
                parts.push(`<div style="margin-bottom:20px"><div class="label">Long-tail Opportunities</div>`);
                longTail.forEach((k: any) => parts.push(`<span class="tag">${k.keyword}</span>`));
                parts.push(`</div>`);
            }
        }
        parts.push(`</div>`);

        const ads = googleAds.adCopies;
        if (Array.isArray(ads)) {
            parts.push(`<div class="section"><h2>✍️ Ad Copy Variations</h2><div class="grid">`);
            ads.forEach((ad: any, i: number) => {
                parts.push(`<div class="card"><div class="label">Variation ${i + 1}</div>`);
                const headlines = ad.headlines;
                if (Array.isArray(headlines)) headlines.forEach(h => parts.push(`<div style="font-weight:700; color:#f1f5f9; margin-top:4px">${h}</div>`));
                const descriptions = ad.descriptions;
                if (Array.isArray(descriptions)) descriptions.forEach(d => parts.push(`<div style="margin-top:12px; font-size:0.9rem; color:#cbd5e1">${d}</div>`));
                if (ad.callToAction) parts.push(`<div style="margin-top:16px; font-weight:700; color:#818cf8">${ad.callToAction}</div>`);
                parts.push(`</div>`);
            });
            parts.push(`</div></div>`);
        }

        const camps = googleAds.campaigns;
        if (Array.isArray(camps)) {
            parts.push(`<div class="section"><h2>🏗️ Campaign Architecture</h2><div class="grid">`);
            camps.forEach((c: any) => {
                parts.push(`<div class="card"><b>${c.name || 'Campaign'}</b><br><small>${c.type || 'Search'}</small>`);
                parts.push(`<div style="margin-top:10px; color:#4ade80; font-weight:bold">${c.budget?.daily || 0} ${c.budget?.currency || 'USD'}/day</div></div>`);
            });
            parts.push(`</div></div>`);
        }
    }

    if (magic) {
        parts.push(`<div class="section"><h2>🧠 Market Intelligence</h2>`);
        const ma = magic.marketAnalysis;
        if (ma) {
            parts.push(`<p><b>Market Growth:</b> ${ma.growthRate || 'Stable'}</p>`);
            const comps = ma.topCompetitors;
            if (Array.isArray(comps)) {
                parts.push(`<div class="label">Key Competitors</div>`);
                comps.forEach(c => parts.push(`<div style="margin:4px 0">${c}</div>`));
            }
        }
        const rationale = magic.rationale;
        if (rationale) {
            parts.push(`<div style="margin-top:20px"><b>Strategy:</b><p>${rationale}</p></div>`);
        }
        parts.push(`</div>`);
    }

    parts.push(`</div></body></html>`);
    return parts.join('');
};
