// RSS Feed integration for NZ emergency incidents
const Feeds = {
    // Multiple CORS proxies to try (fallback chain)
    corsProxies: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy/?quest=',
        'https://thingproxy.freeboard.io/fetch/'
    ],

    // NZ RSS feed sources
    sources: {
        scoop: 'https://www.scoop.co.nz/rss/top-stories.xml',
        metserviceCAP: 'https://alerts.metservice.com/cap/rss',
        rnz: 'https://www.rnz.co.nz/rss/national.xml',
        stuff: 'https://www.stuff.co.nz/rss'
    },

    // Fetch with proxy fallback and timeout
    async fetchWithProxy(url) {
        for (const proxy of this.corsProxies) {
            try {
                // Build proxy URL based on proxy type
                let proxyUrl;
                if (proxy.includes('codetabs')) {
                    proxyUrl = proxy + url;
                } else if (proxy.includes('corsproxy.io')) {
                    proxyUrl = proxy + encodeURIComponent(url);
                } else if (proxy.includes('thingproxy')) {
                    proxyUrl = proxy + url;
                } else {
                    proxyUrl = proxy + encodeURIComponent(url);
                }

                // Add timeout using AbortController
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const response = await fetch(proxyUrl, {
                    headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const text = await response.text();
                    if (text && (text.includes('<item>') || text.includes('<entry>'))) {
                        console.log(`Feed fetched successfully via ${proxy}`);
                        return text;
                    }
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    console.log(`Proxy ${proxy} timed out, trying next...`);
                } else {
                    console.log(`Proxy ${proxy} failed: ${e.message}, trying next...`);
                }
            }
        }
        return null;
    },

    // Fetch and parse RSS feed
    async fetchFeed(url) {
        try {
            const text = await this.fetchWithProxy(url);
            if (text) {
                return this.parseRSS(text);
            }
            return [];
        } catch (error) {
            console.error('Error fetching feed:', error);
            return [];
        }
    },

    // Parse RSS/Atom XML to items
    parseRSS(xml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'text/xml');

            // Try RSS format first (item tags), then Atom format (entry tags)
            let items = doc.querySelectorAll('item');
            const isAtom = items.length === 0;
            if (isAtom) {
                items = doc.querySelectorAll('entry');
            }

            return Array.from(items).map(item => {
                // Handle both RSS and Atom link formats
                let link = '#';
                if (isAtom) {
                    // Atom uses <link href="..."> attribute
                    const linkEl = item.querySelector('link');
                    link = linkEl?.getAttribute('href') || linkEl?.textContent || '#';
                } else {
                    link = item.querySelector('link')?.textContent || '#';
                }

                return {
                    title: item.querySelector('title')?.textContent || 'No title',
                    link: link,
                    description: this.stripHtml(
                        item.querySelector('description')?.textContent ||
                        item.querySelector('summary')?.textContent ||
                        item.querySelector('content')?.textContent || ''
                    ),
                    pubDate: item.querySelector('pubDate')?.textContent ||
                             item.querySelector('published')?.textContent ||
                             item.querySelector('updated')?.textContent || '',
                    category: item.querySelector('category')?.textContent || ''
                };
            });
        } catch (error) {
            console.error('Error parsing RSS:', error);
            return [];
        }
    },

    // Strip HTML tags and clean up text for readability
    stripHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        let text = tmp.textContent || tmp.innerText || '';

        // Clean up XML/HTML entities that might remain
        text = text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')           // Collapse multiple whitespace
            .replace(/\n\s*\n/g, '\n')      // Remove empty lines
            .trim();

        return text;
    },

    // Format date for display
    formatDateReadable(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';

        return date.toLocaleDateString('en-NZ', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // NZ location keywords for filtering
    nzKeywords: [
        'new zealand', 'nz', 'aotearoa',
        'auckland', 'wellington', 'christchurch', 'hamilton', 'tauranga',
        'dunedin', 'palmerston north', 'napier', 'nelson', 'rotorua',
        'new plymouth', 'whangarei', 'invercargill', 'whanganui', 'gisborne',
        'hastings', 'timaru', 'blenheim', 'greymouth', 'queenstown',
        'northland', 'waikato', 'bay of plenty', 'hawkes bay', "hawke's bay",
        'taranaki', 'manawatu', 'wairarapa', 'marlborough', 'canterbury',
        'otago', 'southland', 'west coast', 'fiordland', 'coromandel',
        'mount maunganui', 'papamoa', 'tairua', 'thames', 'whitianga',
        'hauraki gulf', 'hauraki', 'waiheke', 'great barrier', 'rangitoto',
        'taupo', 'masterton', 'lower hutt', 'upper hutt', 'porirua',
        'kapiti', 'levin', 'feilding', 'whakatane', 'opotiki', 'kawerau',
        'te puke', 'katikati', 'oamaru', 'ashburton', 'rangiora', 'kaikoura',
        'picton', 'motueka', 'richmond', 'westport', 'hokitika', 'reefton',
        'waimate', 'gore', 'balclutha', 'alexandra', 'cromwell', 'wanaka',
        'te anau', 'kaikohe', 'kerikeri', 'paihia', 'dargaville', 'kaitaia',
        'state highway', 'sh1', 'sh2', 'sh3', 'sh4', 'sh5', 'sh6',
        'north island', 'south island', 'stewart island',
        'kiwi', 'maori', 'māori', 'iwi', 'te reo','waiheke'
    ],

    // Check if item is NZ-related
    isNZRelated(item) {
        const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
        return this.nzKeywords.some(keyword => text.includes(keyword));
    },

    // Exclusion keywords - filter out sports, entertainment, lifestyle content
    exclusionKeywords: [
        // Sports
        'rugby', 'cricket', 'netball', 'basketball', 'football', 'soccer',
        'all blacks', 'black caps', 'silver ferns', 'breakers', 'warriors',
        'nbl', 'super rugby', 'anb', 'phoenix', 'chiefs', 'blues', 'hurricanes',
        'crusaders', 'highlanders', 'sport', 'match', 'game', 'tournament',
        'championship', 'league', 'cup final', 'semifinal', 'quarter-final',
        'played', 'scored', 'goal', 'try', 'wicket', 'batting', 'bowling',
        'coach', 'player', 'team', 'fixture', 'season', 'halftime', 'overtime',
        '36ers', 'nba', 'afl', 'nrl', 'a-league',
        // Entertainment
        'movie', 'film', 'album', 'concert', 'tour', 'festival', 'music',
        'celebrity', 'actor', 'actress', 'singer', 'band', 'award',
        'grammy', 'oscar', 'emmy', 'tv show', 'reality tv', 'streaming',
        // Lifestyle/Business
        'recipe', 'restaurant', 'review', 'travel', 'holiday', 'vacation',
        'stock market', 'shares', 'investment', 'property market', 'real estate',
        'fashion', 'beauty', 'wellness', 'fitness', 'diet',
        // Politics (unless emergency)
        'election', 'poll', 'campaign', 'candidate', 'parliament', 'mp ',
        'minister', 'coalition', 'opposition', 'policy', 'bill passed'
    ],

    // Check if content should be excluded
    shouldExclude(text) {
        const lowerText = text.toLowerCase();
        return this.exclusionKeywords.some(keyword => lowerText.includes(keyword));
    },

    // Filter for emergency/incident related content
    filterIncidents(items) {
        const keywords = [
            'incident', 'emergency', 'crash', 'accident',
            'police', 'rescue', 'storm', 'flood', 'warning',
            'alert', 'earthquake', 'tsunami', 'weather', 'road closure',
            'missing', 'serious', 'death', 'fatality', 'injury',
            'landslide', 'slip', 'landslip', 'evacuate', 'evacuation',
            'cyclone', 'tornado', 'severe', 'damage', 'power outage',
            'road closed', 'highway closed', 'state highway', 'trapped',
            'civil defence', 'search and rescue', 'metservice','outbreak','disease','pandemic','epidemic','virus','covid','measles',
            'flooding', 'heavy rain', 'strong wind', 'snowstorm', 'blizzard',
            'hailstorm', 'thunderstorm', 'lightning strike', 'wild weather',
            // Fire-related
            'fire', 'blaze', 'wildfire', 'bushfire', 'scrub fire', 'house fire',
            'structure fire', 'vegetation fire', 'forest fire', 'firefighters',
            'fenz', 'fire and emergency', 'arson', 'flames', 'burning',
            'fire crews', 'fire brigade', 'inferno'

        ];

        return items.filter(item => {
            const text = (item.title + ' ' + item.description).toLowerCase();
            const hasKeyword = keywords.some(keyword => text.includes(keyword));
            const isNZ = this.isNZRelated(item);
            const excluded = this.shouldExclude(text);
            return hasKeyword && isNZ && !excluded;
        });
    },

    // Fetch GeoNet alerts (CAP feed) - has CORS enabled
    async getGeoNetAlerts() {
        try {
            const response = await fetch('https://api.geonet.org.nz/news/geonet');
            if (!response.ok) return [];
            const data = await response.json();

            return (data.feed || []).map(item => ({
                title: item.title,
                link: item.link,
                description: item.summary || '',
                pubDate: item.published,
                source: 'GeoNet',
                sourceIcon: '🌋'
            }));
        } catch (error) {
            console.error('Error fetching GeoNet news:', error);
            return [];
        }
    },

    // Fetch MetService weather warnings (CAP format)
    async getWeatherWarnings() {
        try {
            const text = await this.fetchWithProxy(this.sources.metserviceCAP);
            if (text) {
                // If the response is raw XML and not RSS, parse manually
                if (text.trim().startsWith('<alert')) {
                    return Feeds.parseCAPAlertXML(text);
                }
                return this.parseCAP(text);
            }
            // Fallback: try to scrape warnings page or return static link
            return this.getWeatherWarningsFallback();
        } catch (error) {
            console.error('Error fetching MetService warnings:', error);
            return this.getWeatherWarningsFallback();
        }
    },

    // Parse raw CAP <alert> XML into readable warning objects
    parseCAPAlertXML(xml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'text/xml');
            const alert = doc.querySelector('alert');
            if (!alert) return Feeds.getWeatherWarningsFallback();

            const info = alert.querySelector('info');
            const event = info?.querySelector('event')?.textContent || 'Weather Alert';
            const severity = (info?.querySelector('severity')?.textContent || 'Unknown').toLowerCase();
            const urgency = info?.querySelector('urgency')?.textContent || '';
            const certainty = info?.querySelector('certainty')?.textContent || '';
            const onset = info?.querySelector('onset')?.textContent || '';
            const expires = info?.querySelector('expires')?.textContent || '';
            const sender = alert.querySelector('senderName')?.textContent || alert.querySelector('sender')?.textContent || '';
            const sent = alert.querySelector('sent')?.textContent || '';
            const identifier = alert.querySelector('identifier')?.textContent || '';
            const headline = info?.querySelector('headline')?.textContent || '';
            const description = info?.querySelector('description')?.textContent || '';

            // Compose readable summary, headline first if present
            const readable = {
                title: `${headline ? headline : event} (${severity.charAt(0).toUpperCase() + severity.slice(1)})`,
                description: [
                    description,
                    `Urgency: ${urgency}`,
                    `Certainty: ${certainty}`,
                    onset ? `Onset: ${onset}` : '',
                    expires ? `Expires: ${expires}` : '',
                    sender ? `Issued by: ${sender}` : '',
                    identifier ? `ID: ${identifier}` : ''
                ].filter(Boolean).join(' | '),
                link: 'https://www.metservice.com/warnings/home',
                pubDate: sent,
                severity: severity.includes('high') ? 'high' : (severity.includes('moderate') ? 'medium' : 'low'),
                eventType: event,
                source: 'MetService'
            };
            return [readable];
        } catch (error) {
            console.error('Error parsing CAP alert XML:', error);
            return Feeds.getWeatherWarningsFallback();
        }
    },

    // Parse CAP (Common Alerting Protocol) RSS feed
    parseCAP(xml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'text/xml');
            const entries = doc.querySelectorAll('entry, item');

            return Array.from(entries).map(entry => {
                // CAP format fields
                const title = entry.querySelector('title')?.textContent || '';
                const summary = entry.querySelector('summary, description')?.textContent || '';
                const updated = entry.querySelector('updated, pubDate')?.textContent || '';

                // Try to extract severity from title or content
                let severity = 'low';
                const text = (title + summary).toLowerCase();
                if (text.includes('red') || text.includes('warning') || text.includes('severe')) {
                    severity = 'high';
                } else if (text.includes('orange') || text.includes('watch')) {
                    severity = 'medium';
                }

                // Extract event type
                let eventType = 'Weather Alert';
                if (text.includes('rain')) eventType = 'Heavy Rain';
                else if (text.includes('wind')) eventType = 'Strong Wind';
                else if (text.includes('snow')) eventType = 'Snow';
                else if (text.includes('thunder')) eventType = 'Thunderstorm';
                else if (text.includes('flood')) eventType = 'Flood';
                else if (text.includes('fire')) eventType = 'Fire Weather';
                else if (text.includes('cyclone')) eventType = 'Cyclone';

                // Always use human-readable MetService page instead of XML feed link
                const humanLink = 'https://www.metservice.com/warnings/home';

                return {
                    title: title,
                    description: this.stripHtml(summary),
                    link: humanLink,
                    pubDate: updated,
                    severity: severity,
                    eventType: eventType,
                    source: 'MetService'
                };
            }).filter(item => item.title); // Filter out empty items
        } catch (error) {
            console.error('Error parsing CAP feed:', error);
            return [];
        }
    },

    // Fallback when CAP feed unavailable
    getWeatherWarningsFallback() {
        return [{
            title: 'View Current Weather Warnings',
            description: 'Click to see all active MetService warnings, watches and advisories for New Zealand',
            link: 'https://www.metservice.com/warnings/home',
            pubDate: new Date().toISOString(),
            severity: 'medium',
            eventType: 'Weather Warnings',
            source: 'MetService',
            isFallback: true
        }];
    },

    // Render weather warnings to sidebar
    renderWeatherWarnings(warnings, containerId) {
        const container = document.getElementById(containerId);
        const countEl = document.getElementById('warning-count');

        // Defensive: If warnings is a string (XML), show fallback
        if (!Array.isArray(warnings)) {
            container.innerHTML = `
                <div class="error">Weather warning data is unavailable or in an unexpected format.<br>
                <a href='https://www.metservice.com/warnings/home' target='_blank'>View current warnings</a></div>
            `;
            if (countEl) countEl.textContent = '?';
            return;
        }

        if (!warnings || warnings.length === 0) {
            container.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: #6bcf63;">
                    ✓ No active weather warnings
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }

        const isFallback = warnings[0]?.isFallback;
        if (countEl) countEl.textContent = isFallback ? '?' : warnings.length;

        container.innerHTML = warnings.map(warning => {
            const time = this.formatTime(warning.pubDate);
            const severityClass = `severity-${warning.severity}`;

            // Icons for event types
            const icons = {
                'Heavy Rain': '🌧️',
                'Strong Wind': '💨',
                'Snow': '❄️',
                'Thunderstorm': '⛈️',
                'Flood': '🌊',
                'Fire Weather': '🔥',
                'Cyclone': '🌀',
                'Weather Alert': '⚠️',
                'Weather Warnings': '⚠️'
            };
            const icon = icons[warning.eventType] || '⚠️';

            // Clean up title and description
            const title = this.stripHtml(warning.title || '').replace(/\s+/g, ' ').trim();
            let description = this.stripHtml(warning.description || '');
            // If description looks like XML, replace with fallback
            if (/<[a-z][\s\S]*>/i.test(description)) {
                description = 'See details via the link.';
            } else if (description.length > 150) {
                description = description.substring(0, 150).trim() + '...';
            }

            return `
                <div class="alert-item ${severityClass}" onclick="window.open('${warning.link || 'https://www.metservice.com/warnings/home'}', '_blank')">
                    <div class="title">${icon} ${title}</div>
                    ${!isFallback ? `<div class="meta"><span>${warning.eventType}</span><span>${time}</span></div>` : ''}
                    ${description ? `<div class="description">${description}</div>` : ''}
                </div>
            `;
        }).join('');
    },

    // Fetch all incident feeds
    async getAllIncidents() {
        const allIncidents = [];

        // Try GeoNet news first (no CORS issues)
        const geonetItems = await this.getGeoNetAlerts();
        allIncidents.push(...geonetItems);

        // Try RNZ National news and filter for incidents
        const rnzItems = await this.fetchFeed(this.sources.rnz);
        const filteredRnz = this.filterIncidents(rnzItems);
        filteredRnz.forEach(item => {
            item.source = 'RNZ';
            item.sourceIcon = '📻';
        });
        allIncidents.push(...filteredRnz);

        // Try Stuff news and filter for incidents
        const stuffItems = await this.fetchFeed(this.sources.stuff);
        const filteredStuff = this.filterIncidents(stuffItems);
        filteredStuff.forEach(item => {
            item.source = 'Stuff';
            item.sourceIcon = '📰';
        });
        allIncidents.push(...filteredStuff);

        // Try Scoop news and filter for incidents
        const scoopItems = await this.fetchFeed(this.sources.scoop);
        const filteredScoop = this.filterIncidents(scoopItems);
        filteredScoop.forEach(item => {
            item.source = 'Scoop';
            item.sourceIcon = '📰';
        });
        allIncidents.push(...filteredScoop);

        // If we got nothing from RSS, show GeoNet data or helpful message
        if (allIncidents.length === 0) {
            // Return placeholder with links to live sources
            return this.getDirectLinks();
        }

        // Sort by date (newest first)
        allIncidents.sort((a, b) => {
            const dateA = new Date(a.pubDate);
            const dateB = new Date(b.pubDate);
            return dateB - dateA;
        });

        return allIncidents.slice(0, 20);
    },

    // Filter for crime and civil unrest content (NZ only)
    filterCrime(items) {
        const keywords = [
            'crime', 'criminal', 'arrest', 'arrested', 'charged', 'court',
            'police', 'robbery', 'burglary', 'theft', 'stolen', 'steal',
            'assault', 'attack', 'violent', 'violence', 'stabbing', 'stabbed',
            'shooting', 'shot', 'gunshot', 'firearm', 'weapon',
            'homicide', 'murder', 'manslaughter', 'death', 'killed', 'killing',
            'drugs', 'meth', 'methamphetamine', 'cannabis', 'cocaine', 'drug bust',
            'fraud', 'scam', 'scammer', 'swindle', 'money laundering',
            'gang', 'gangs', 'organised crime', 'syndicate',
            'protest', 'protests', 'protester', 'protesters', 'demonstration',
            'riot', 'rioting', 'unrest', 'civil unrest',
            'occupation', 'blockade', 'disruption',
            'threatening', 'threat', 'intimidation', 'harassment',
            'kidnapping', 'abduction', 'hostage',
            'arson', 'vandalism', 'graffiti', 'property damage',
            'domestic violence', 'family harm', 'restraining order',
            'sexual assault', 'indecent', 'offending',
            'wanted', 'fugitive', 'manhunt', 'on the run'
        ];

        return items.filter(item => {
            const text = (item.title + ' ' + item.description).toLowerCase();
            const hasKeyword = keywords.some(keyword => text.includes(keyword));
            const isNZ = this.isNZRelated(item);
            const excluded = this.shouldExclude(text);
            return hasKeyword && isNZ && !excluded;
        });
    },

    // Fetch all crime/civil unrest items
    async getAllCrimeItems() {
        const allCrime = [];

        // Try RNZ and filter for crime (primary source - more reliable)
        const rnzItems = await this.fetchFeed(this.sources.rnz);
        const filteredRnz = this.filterCrime(rnzItems);
        filteredRnz.forEach(item => {
            item.source = 'RNZ';
            item.sourceIcon = '📻';
        });
        allCrime.push(...filteredRnz);

        // Try Stuff and filter for crime
        const stuffItems = await this.fetchFeed(this.sources.stuff);
        const filteredStuff = this.filterCrime(stuffItems);
        filteredStuff.forEach(item => {
            item.source = 'Stuff';
            item.sourceIcon = '📰';
        });
        allCrime.push(...filteredStuff);

        // Try Scoop for crime
        const scoopItems = await this.fetchFeed(this.sources.scoop);
        const filteredScoop = this.filterCrime(scoopItems);
        filteredScoop.forEach(item => {
            item.source = 'Scoop';
            item.sourceIcon = '📰';
        });
        allCrime.push(...filteredScoop);

        // If we got nothing, return direct links
        if (allCrime.length === 0) {
            return this.getCrimeDirectLinks();
        }

        // Sort by date (newest first)
        allCrime.sort((a, b) => {
            const dateA = new Date(a.pubDate);
            const dateB = new Date(b.pubDate);
            return dateB - dateA;
        });

        return allCrime.slice(0, 25);
    },

    // Direct links for crime data
    getCrimeDirectLinks() {
        return [
            {
                title: 'NZ Police News',
                link: 'https://www.police.govt.nz/news',
                description: 'Latest news and crime reports from NZ Police',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '👮'
            },
            {
                title: 'Stuff Crime News',
                link: 'https://www.stuff.co.nz/national/crime',
                description: 'Crime news from across New Zealand',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '📰'
            },
            {
                title: 'RNZ Crime & Courts',
                link: 'https://www.rnz.co.nz/news/crime',
                description: 'Crime and court news from RNZ',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '📻'
            }
        ];
    },

    // Render crime items to sidebar
    renderCrime(crimeItems, containerId) {
        const container = document.getElementById(containerId);
        const countEl = document.getElementById('crime-count');

        if (!crimeItems || crimeItems.length === 0) {
            container.innerHTML = `
                <div class="error">
                    Unable to load crime data.<br>
                    <small style="color: #666">RSS feeds may be blocked.</small>
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }

        const isDirectLinks = crimeItems[0]?.source === 'Direct Link';
        if (countEl) countEl.textContent = isDirectLinks ? '?' : crimeItems.length;

        container.innerHTML = crimeItems.map(item => {
            const readableDate = this.formatDateReadable(item.pubDate);
            const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();

            // Determine icon based on content
            let icon = '🚨';
            if (text.includes('protest') || text.includes('demonstration') || text.includes('rally')) {
                icon = '✊';
            } else if (text.includes('robbery') || text.includes('burglary') || text.includes('theft')) {
                icon = '💰';
            } else if (text.includes('assault') || text.includes('attack') || text.includes('violent')) {
                icon = '⚠️';
            } else if (text.includes('homicide') || text.includes('murder') || text.includes('death')) {
                icon = '💀';
            } else if (text.includes('drugs') || text.includes('meth')) {
                icon = '💊';
            } else if (text.includes('fraud') || text.includes('scam')) {
                icon = '🎭';
            } else if (text.includes('arrest') || text.includes('charged') || text.includes('court') || text.includes('police')) {
                icon = '👮';
            }

            // Clean up description
            let description = this.stripHtml(item.description);
            if (description.length > 150) {
                description = description.substring(0, 150).trim() + '...';
            }

            const title = (item.title || 'No title').replace(/\s+/g, ' ').trim();

            return `
                <div class="incident-item" onclick="window.open('${item.link}', '_blank')">
                    <div class="title">${icon} ${title}</div>
                    ${!isDirectLinks && readableDate ? `<div class="time" style="color: #888; font-size: 0.75rem;">${readableDate}</div>` : ''}
                    ${description ? `<div class="description" style="color: #aaa; font-size: 0.85rem; line-height: 1.4; margin-top: 0.25rem;">${description}</div>` : ''}
                    <div class="source" style="color: #666; font-size: 0.7rem; margin-top: 0.5rem;">${item.source}</div>
                </div>
            `;
        }).join('');

        if (isDirectLinks) {
            container.innerHTML = `
                <div style="padding: 0.5rem; color: #888; font-size: 0.8rem; text-align: center;">
                    RSS feeds blocked - click links below to view live data
                </div>
            ` + container.innerHTML;
        }
    },

    // Direct links to NZ emergency sources when RSS fails
    getDirectLinks() {
        return [
            {
                title: 'NZ Police News',
                link: 'https://www.police.govt.nz/news',
                description: 'Latest news and incident reports from NZ Police',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '👮'
            },
            {
                title: 'Fire and Emergency NZ',
                link: 'https://www.fireandemergency.nz/incidents-and-news/',
                description: 'Current fire incidents and emergency callouts',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '🚒'
            },
            {
                title: 'MetService Warnings',
                link: 'https://www.metservice.com/warnings/home',
                description: 'Current weather warnings for New Zealand',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '⚠️'
            },
            {
                title: 'NZTA Traffic Updates',
                link: 'https://www.journeys.nzta.govt.nz/',
                description: 'Road closures and traffic incidents',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '🚗'
            },
            {
                title: 'GeoNet Recent Quakes',
                link: 'https://www.geonet.org.nz/earthquake/weak',
                description: 'Latest earthquake activity in New Zealand',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '🌋'
            }
        ];
    },

    // Render incidents to sidebar
    renderIncidents(incidents, containerId) {
        const container = document.getElementById(containerId);
        const countEl = document.getElementById('incidents-count');

        if (!incidents || incidents.length === 0) {
            container.innerHTML = `
                <div class="error">
                    Unable to load incident data.<br>
                    <small style="color: #666">RSS feeds may be blocked by CORS policy.</small>
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }

        const isDirectLinks = incidents[0]?.source === 'Direct Link';
        if (countEl) countEl.textContent = isDirectLinks ? '?' : incidents.length;

        container.innerHTML = incidents.map(incident => {
            const readableDate = this.formatDateReadable(incident.pubDate);

            // Clean up and format description
            let description = this.stripHtml(incident.description);
            if (description.length > 150) {
                description = description.substring(0, 150).trim() + '...';
            }

            // Clean up title - remove extra whitespace and newlines
            const title = (incident.title || 'No title')
                .replace(/\s+/g, ' ')
                .trim();

            return `
                <div class="incident-item" onclick="window.open('${incident.link}', '_blank')">
                    <div class="title">${incident.sourceIcon || '📰'} ${title}</div>
                    ${!isDirectLinks && readableDate ? `<div class="time" style="color: #888; font-size: 0.75rem;">${readableDate}</div>` : ''}
                    ${description ? `<div class="description" style="color: #aaa; font-size: 0.85rem; line-height: 1.4; margin-top: 0.25rem;">${description}</div>` : ''}
                    <div class="source" style="color: #666; font-size: 0.7rem; margin-top: 0.5rem;">${incident.source}</div>
                </div>
            `;
        }).join('');

        if (isDirectLinks) {
            container.innerHTML = `
                <div style="padding: 0.5rem; color: #888; font-size: 0.8rem; text-align: center;">
                    RSS feeds blocked - click links below to view live data
                </div>
            ` + container.innerHTML;
        }
    },

    // Filter for fire-related content (NZ only)
    filterFire(items) {
        const keywords = [
            'fire', 'fires', 'blaze', 'blazing', 'burning', 'burnt', 'burned',
            'wildfire', 'wildfires', 'bushfire', 'bush fire', 'scrub fire',
            'house fire', 'building fire', 'structure fire', 'factory fire',
            'car fire', 'vehicle fire', 'truck fire',
            'forest fire', 'grass fire', 'vegetation fire',
            'flames', 'inferno', 'engulfed', 'gutted',
            'fire crews', 'firefighters', 'fire brigade', 'fire service',
            'fire emergency', 'fenz', 'fire and emergency',
            'smoke', 'evacuation', 'evacuated',
            'arson', 'deliberately lit', 'suspicious fire'
        ];

        return items.filter(item => {
            const text = (item.title + ' ' + item.description).toLowerCase();
            const hasKeyword = keywords.some(keyword => text.includes(keyword));
            const isNZ = this.isNZRelated(item);
            const excluded = this.shouldExclude(text);
            return hasKeyword && isNZ && !excluded;
        });
    },

    // Fetch all fire incidents
    async getAllFireItems() {
        const allFire = [];

        // Try RNZ and filter for fire (primary source - more reliable)
        const rnzItems = await this.fetchFeed(this.sources.rnz);
        const filteredRnz = this.filterFire(rnzItems);
        filteredRnz.forEach(item => {
            item.source = 'RNZ';
            item.sourceIcon = '📻';
        });
        allFire.push(...filteredRnz);

        // Try Stuff and filter for fire
        const stuffItems = await this.fetchFeed(this.sources.stuff);
        const filteredStuff = this.filterFire(stuffItems);
        filteredStuff.forEach(item => {
            item.source = 'Stuff';
            item.sourceIcon = '📰';
        });
        allFire.push(...filteredStuff);

        // Try Scoop for fire
        const scoopItems = await this.fetchFeed(this.sources.scoop);
        const filteredScoop = this.filterFire(scoopItems);
        filteredScoop.forEach(item => {
            item.source = 'Scoop';
            item.sourceIcon = '📰';
        });
        allFire.push(...filteredScoop);

        // If we got nothing, return direct links
        if (allFire.length === 0) {
            return this.getFireDirectLinks();
        }

        // Sort by date (newest first)
        allFire.sort((a, b) => {
            const dateA = new Date(a.pubDate);
            const dateB = new Date(b.pubDate);
            return dateB - dateA;
        });

        return allFire.slice(0, 20);
    },

    // Direct links for fire data
    getFireDirectLinks() {
        return [
            {
                title: 'Fire and Emergency NZ Incidents',
                link: 'https://www.fireandemergency.nz/incidents-and-news/incident-reports/',
                description: 'Current fire incidents and emergency callouts across New Zealand',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '🚒'
            },
            {
                title: 'FENZ News & Updates',
                link: 'https://www.fireandemergency.nz/incidents-and-news/',
                description: 'Latest news from Fire and Emergency New Zealand',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '🔥'
            },
            {
                title: 'Stuff Fire News',
                link: 'https://www.stuff.co.nz/national',
                description: 'Fire news from across New Zealand',
                pubDate: new Date().toISOString(),
                source: 'Direct Link',
                sourceIcon: '📰'
            }
        ];
    },

    // Render fire items to sidebar
    renderFire(fireItems, containerId) {
        const container = document.getElementById(containerId);
        const countEl = document.getElementById('fire-count');

        if (!fireItems || fireItems.length === 0) {
            container.innerHTML = `
                <div class="error">
                    Unable to load fire data.<br>
                    <small style="color: #666">RSS feeds may be blocked.</small>
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }

        const isDirectLinks = fireItems[0]?.source === 'Direct Link';
        if (countEl) countEl.textContent = isDirectLinks ? '?' : fireItems.length;

        container.innerHTML = fireItems.map(item => {
            const readableDate = this.formatDateReadable(item.pubDate);
            const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();

            // Determine icon based on fire type
            let icon = '🔥';
            if (text.includes('wildfire') || text.includes('bush fire') || text.includes('bushfire') || text.includes('scrub fire') || text.includes('forest fire')) {
                icon = '🌲🔥';
            } else if (text.includes('house fire') || text.includes('building fire') || text.includes('structure fire')) {
                icon = '🏠🔥';
            } else if (text.includes('car fire') || text.includes('vehicle fire')) {
                icon = '🚗🔥';
            }

            // Clean up description
            let description = this.stripHtml(item.description);
            if (description.length > 150) {
                description = description.substring(0, 150).trim() + '...';
            }

            const title = (item.title || 'No title').replace(/\s+/g, ' ').trim();

            return `
                <div class="incident-item" onclick="window.open('${item.link}', '_blank')">
                    <div class="title">${icon} ${title}</div>
                    ${!isDirectLinks && readableDate ? `<div class="time" style="color: #888; font-size: 0.75rem;">${readableDate}</div>` : ''}
                    ${description ? `<div class="description" style="color: #aaa; font-size: 0.85rem; line-height: 1.4; margin-top: 0.25rem;">${description}</div>` : ''}
                    <div class="source" style="color: #666; font-size: 0.7rem; margin-top: 0.5rem;">${item.source}</div>
                </div>
            `;
        }).join('');

        if (isDirectLinks) {
            container.innerHTML = `
                <div style="padding: 0.5rem; color: #888; font-size: 0.8rem; text-align: center;">
                    RSS feeds blocked - click links below to view live data
                </div>
            ` + container.innerHTML;
        }
    },

    // NZTA Road Events API
    nztaApiUrl: 'https://services.arcgis.com/CXBb7LAjgIIdcsPt/arcgis/rest/services/NZTA_Highway_Information/FeatureServer/0/query',

    // Fetch road events from NZTA (unplanned only)
    async getRoadEvents() {
        try {
            const params = new URLSearchParams({
                where: "planned = 'False'",
                outFields: '*',
                f: 'geojson',
                resultRecordCount: 100
            });

            const response = await fetch(`${this.nztaApiUrl}?${params}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            return data.features || [];
        } catch (error) {
            console.error('Error fetching road events:', error);
            return [];
        }
    },

    // Render road events to sidebar
    renderRoadEvents(roadEvents, containerId) {
        const container = document.getElementById(containerId);
        const countEl = document.getElementById('roads-count');

        if (!roadEvents || roadEvents.length === 0) {
            container.innerHTML = `
                <div class="error">
                    No active road events.<br>
                    <small style="color: #666">Check <a href="https://www.journeys.nzta.govt.nz/traffic" target="_blank" style="color: #4a90d9;">NZTA Journey Planner</a></small>
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }

        if (countEl) countEl.textContent = roadEvents.length;

        container.innerHTML = roadEvents.map(event => {
            const props = event.properties || {};
            const eventType = props.eventType || 'Road Event';
            const desc = props.eventDescription || '';
            const impact = props.impact || '';
            const location = props.locationArea || '';
            const status = props.status || '';

            // Determine icon based on event type
            let icon = '🚧';
            const typeL = eventType.toLowerCase();
            const impactL = impact.toLowerCase();

            if (typeL.includes('closure') || impactL.includes('closed')) {
                icon = '⛔';
            } else if (impactL.includes('delays') || impactL.includes('delay')) {
                icon = '⚠️';
            } else if (typeL.includes('weather') || typeL.includes('flooding')) {
                icon = '🌧️';
            } else if (typeL.includes('crash') || typeL.includes('accident')) {
                icon = '🚗';
            }

            // Severity class based on impact
            let severityClass = '';
            if (impactL.includes('closed') || impactL.includes('major')) {
                severityClass = 'severity-high';
            } else if (impactL.includes('delays')) {
                severityClass = 'severity-medium';
            }

            return `
                <div class="alert-item ${severityClass}">
                    <div class="title">${icon} ${eventType}</div>
                    <div class="description">${desc}</div>
                    ${location ? `<div class="meta"><span>${location}</span></div>` : ''}
                    ${impact ? `<div class="meta"><span style="color: ${impactL.includes('closed') ? '#cf222e' : '#bf8700'}">${impact}</span></div>` : ''}
                </div>
            `;
        }).join('');
    },

    // Format time relative
    formatTime(dateStr) {
        if (!dateStr) return '';

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-NZ', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
};
