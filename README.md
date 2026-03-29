# ⚡ Tesla Great Ocean Road Trip Planner

An interactive single-page trip planner for a 4-day Tesla Model 3 road trip along Australia's Great Ocean Road and beyond.

**[View Live →](https://YOUR_USERNAME.github.io/tesla-trip-planner/)**

## Features

- 🗓️ **4-day itinerary** — Melbourne → Geelong → Great Ocean Road → Warrnambool → Mount Gambier → Naracoorte → Pink Lake → Home
- 🔋 **Dynamic battery simulation** — Real Tesla Model 3 LFP charging curve model (tapering from 150kW → 6kW based on SOC)
- ⚡ **7 Supercharger stops** — Strategically planned with charger kW, stall count, and addresses
- ⏱️ **Adjustable stay times** — Slider controls for every stop, with real-time schedule recalculation
- 🕐 **Adjustable departure times** — Set start time per day
- 💬 **Comments** — Add notes to any stop (saved in your browser's localStorage)
- 📱 **Responsive** — Works on desktop and mobile

## Tech

Zero dependencies. Single `index.html` file (~30KB) using:
- React 18 (CDN)
- Tailwind CSS (CDN)
- Babel standalone (CDN)
- localStorage for comment persistence

## Deploy to GitHub Pages

1. Fork or clone this repo
2. Go to **Settings → Pages**
3. Set Source to **Deploy from a branch**, branch: `main`, folder: `/ (root)`
4. Your site will be live at `https://<username>.github.io/tesla-trip-planner/`

## License

MIT
