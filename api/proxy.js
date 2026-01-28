// Mirror of serverless proxy for local/public directory (static copy)
// Note: On Vercel, the serverless function at /api/proxy.js will be used.
// This file is a static copy to keep repo structure consistent.

// Re-export same logic as the serverless handler for reference; not executed by static server.
export default async function handler(req, res) {
  try {
    const url = req.query.url || req.url && new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
    if (!url) {
      res.statusCode = 400;
      res.end('Missing url parameter');
      return;
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      res.statusCode = 400;
      res.end('Invalid url');
      return;
    }

    // Allowlist of hosts we will proxy
    const allowlist = [
      'api.open-meteo.com',
      'api.geonet.org.nz',
      'alerts.metservice.com',
      'api.metservice.com',
      'www.rnz.co.nz',
      'www.scoop.co.nz',
      'www.stuff.co.nz'
    ];

    const hostname = parsed.hostname;
    const allowed = allowlist.some(a => hostname === a || hostname.endsWith('.' + a));
    if (!allowed) {
      res.statusCode = 403;
      res.end('Forbidden host');
      return;
    }

    // Fetch the upstream resource
    const upstreamRes = await fetch(url);

    // Copy relevant headers
    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';

    // Set caching policy: encourage CDN caching (s-maxage)
    // Configure per-host cache durations
    let sMaxAge = 300; // default 5 minutes
    const cacheConfig = [
      { match: 'open-meteo', sMaxAge: 600 },     // weather: 10 minutes
      { match: 'geonet', sMaxAge: 120 },         // quakes: 2 minutes
      { match: 'alerts.metservice.com', sMaxAge: 300 }, // metservice alerts: 5 minutes
      { match: 'rnz.co.nz', sMaxAge: 600 },      // news feeds: 10 minutes
      { match: 'scoop.co.nz', sMaxAge: 600 },
      { match: 'stuff.co.nz', sMaxAge: 600 }
    ];

    for (const cfg of cacheConfig) {
      if (hostname.includes(cfg.match)) {
        sMaxAge = cfg.sMaxAge;
        break;
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', `public, max-age=60, s-maxage=${sMaxAge}, stale-while-revalidate=60`);

    const buffer = Buffer.from(await upstreamRes.arrayBuffer());
    res.statusCode = upstreamRes.status;
    res.end(buffer);
  } catch (err) {
    console.error('Proxy error', err);
    res.statusCode = 502;
    res.end('Proxy error');
  }
}
