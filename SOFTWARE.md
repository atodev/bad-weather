# Bad Weather

## Software Description

**Overview:**  
Bad Weather is a web application that provides real-time weather information, earthquake feeds, and map visualizations. It fetches data from external APIs, processes it, and displays it interactively using a modern JavaScript frontend.

**Key Features:**
- Real-time weather data display
- Earthquake feed integration (GeoNet)
- Interactive map visualization
- Proxy API for secure data fetching

**Main Technologies & Libraries:**
- **Frontend:**  
  - HTML5, CSS3 (custom styles in css/styles.css)
  - JavaScript (modularized in js/app.js, feeds.js, geonet.js, map.js, weather.js)
  - [Leaflet.js](https://leafletjs.com/) (for interactive maps)
  - [Axios](https://axios-http.com/) (for HTTP requests, if used)
- **Backend/API Proxy:**  
  - Node.js (api/proxy.js)
  - [Express.js](https://expressjs.com/) (for proxy server, if used)
  - [dotenv](https://www.npmjs.com/package/dotenv) (for environment variables, if used)
- **External APIs:**  
  - GeoNet (earthquake data)
  - OpenWeatherMap or similar (weather data)
- **Deployment:**  
  - [Vercel](https://vercel.com/) (for serverless deployment and hosting)

---

## Flow Diagram

```mermaid
flowchart TD
    A[User] -->|Requests page| B[Frontend (index.html, js/app.js)]
    B --> C[Weather Module (js/weather.js)]
    B --> D[Earthquake Feed (js/feeds.js, js/geonet.js)]
    B --> E[Map Module (js/map.js)]
    C -->|Fetches weather data| F[Proxy API (api/proxy.js)]
    D -->|Fetches earthquake data| F
    F -->|Requests| G[External APIs (Weather, GeoNet)]
    G -->|Responses| F
    F -->|Returns data| B
    E -->|Displays data| B
    B -->|Updates UI| A
```

---

## Vercel Setup Summary

1. **Project Structure:**  
   - Place all frontend files (HTML, CSS, JS) in the root or appropriate folders.
   - Place serverless functions (API proxy) in the `api/` directory.

2. **Vercel Configuration:**
   - No special configuration needed for static frontend.
   - Vercel automatically treats files in `api/` as serverless functions.

3. **Deployment Steps:**
   - Push your code to a GitHub/GitLab/Bitbucket repository.
   - Connect the repository to Vercel.
   - Vercel auto-detects the project and deploys it.
   - Environment variables (if needed) can be set in the Vercel dashboard.

4. **External Libraries:**
   - Add any npm dependencies (e.g., express, dotenv) to a `package.json` in the `api/` folder if required.
   - For frontend libraries (e.g., Leaflet), use CDN links in `index.html` or install via npm and bundle.

---
