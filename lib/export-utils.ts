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
        rows.push(["Website", googleAds.websiteUrl || 'N/A']);
        rows.push([]);

        const kw = googleAds.keywords;
        if (kw) {
            rows.push(["KEYWORD RESEARCH"]);
            rows.push(["Type", "Keyword", "CPC"]);
            if (Array.isArray(kw.primary)) kw.primary.forEach((k: any) => rows.push(["Primary", String(k?.keyword || ''), String(k?.cpc || '')]));
            if (Array.isArray(kw.longTail)) kw.longTail.forEach((k: any) => rows.push(["Long-tail", String(k?.keyword || ''), String(k?.cpc || '')]));
            if (Array.isArray(kw.negative)) kw.negative.forEach((k: any) => rows.push(["Negative", String(k?.keyword || ''), String(k?.cpc || '')]));
            rows.push([]);
        }

        const ads = googleAds.adCopies;
        if (Array.isArray(ads)) {
            rows.push(["AD COPIES"]);
            rows.push(["Variation", "Headlines", "Descriptions", "CTA"]);
            ads.forEach((ad: any, i: number) => {
                const hl = Array.isArray(ad.headlines) ? ad.headlines.join(' | ') : '';
                const ds = Array.isArray(ad.descriptions) ? ad.descriptions.join(' | ') : '';
                rows.push([`Var ${i + 1}`, hl, ds, String(ad?.callToAction || '')]);
            });
            rows.push([]);
        }

        const camps = googleAds.campaigns;
        if (Array.isArray(camps)) {
            rows.push(["CAMPAIGN STRUCTURE"]);
            rows.push(["Name", "Type", "Budget", "Locations", "Schedule"]);
            camps.forEach((c: any) => {
                const t = c.targeting;
                const locs = (t && Array.isArray(t.locations)) ? t.locations.join('; ') : 'All';
                const sched = (t && Array.isArray(t.schedule)) ? t.schedule.join('; ') : 'All';
                rows.push([String(c.name || ''), String(c.type || ''), `${c?.budget?.daily || 0} ${c?.budget?.currency || ''}`, locs, sched]);
            });
            rows.push([]);
        }

        const impl = googleAds.implementation;
        if (impl) {
            rows.push(["IMPLEMENTATION"]);
            if (Array.isArray(impl.setupSteps)) impl.setupSteps.forEach((s: any) => rows.push(["Setup", String(s)]));
            if (Array.isArray(impl.qualityScoreTips)) impl.qualityScoreTips.forEach((s: any) => rows.push(["QS Tip", String(s)]));
            rows.push([]);
        }
    }

    if (magic) {
        rows.push(["MARKET INTELLIGENCE"]);
        const ma = magic.marketAnalysis;
        if (ma) {
            rows.push(["Size", String(ma.industrySize || '')]);
            rows.push(["Growth", String(ma.growthRate || '')]);
            rows.push(["Trends", Array.isArray(ma.marketTrends) ? ma.marketTrends.join('; ') : '']);
            rows.push(["Competitors", Array.isArray(ma.topCompetitors) ? ma.topCompetitors.join('; ') : '']);
            rows.push([]);
        }

        const strats = magic.strategies;
        if (Array.isArray(strats)) {
            rows.push(["STRATEGIES"]);
            strats.forEach((s: any) => {
                rows.push(["Direction", String(s.direction || '')]);
                rows.push(["Target", String(s.targetAudience || '')]);
                rows.push(["Rationale", String(s.rationale || '')]);
                rows.push(["ROI", String(s.expectedROI || '')]);
                rows.push([]);
            });
        }
    }

    return rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(",")).join("\n");
};

export const generateGoogleAdsHTML = (googleAds?: any, magic?: any): string => {
    const parts: string[] = [];
    parts.push(`<!DOCTYPE html><html><head><title>Report</title><style>
        body { font-family: sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px; }
        .section { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1); }
        h1 { color: #818cf8; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; }
    </style></head><body>`);

    parts.push(`<h1>Marketing Strategy</h1>`);

    if (googleAds) {
        parts.push(`<div class="section"><h2>Keywords</h2>`);
        const kw = googleAds.keywords;
        if (kw && Array.isArray(kw.primary)) {
            parts.push(`<h3>Primary</h3>`);
            kw.primary.forEach((k: any) => parts.push(`<span>${k.keyword}</span> `));
        }
        parts.push(`</div>`);

        const ads = googleAds.adCopies;
        if (Array.isArray(ads)) {
            parts.push(`<div class="section"><h2>Ads</h2><div class="grid">`);
            ads.forEach((ad: any) => {
                parts.push(`<div class="card"><b>${(ad.headlines || [])[0] || ''}</b><p>${(ad.descriptions || [])[0] || ''}</p></div>`);
            });
            parts.push(`</div></div>`);
        }
    }

    if (magic) {
        parts.push(`<div class="section"><h2>Market</h2>`);
        const ma = magic.marketAnalysis;
        if (ma) {
            parts.push(`<p>Size: ${ma.industrySize || 'N/A'}</p>`);
            parts.push(`<p>Growth: ${ma.growthRate || 'N/A'}</p>`);
        }
        const strats = magic.strategies;
        if (Array.isArray(strats)) {
            parts.push(`<h2>Strategies</h2>`);
            strats.forEach((s: any) => {
                parts.push(`<div class="card"><h3>${s.direction}</h3><p>${s.rationale}</p></div>`);
            });
        }
        parts.push(`</div>`);
    }

    parts.push(`</body></html>`);
    return parts.join('');
};
