# BloodBridge — Emergency Blood Donation Network
## Project File Structure

```
bloodbridge/
├── frontend/
│   ├── index.html       ← Main HTML page (structure & markup only)
│   ├── style.css        ← All CSS styles (variables, layout, components)
│   └── app.js           ← All frontend JavaScript (UI logic, map, chatbot)
│
├── backend/
│   └── database.js      ← IndexedDB backend (CRUD API, schema, seed data)
│
└── README.md            ← This file
```

---

## How to Run

Open `frontend/index.html` directly in any modern browser.
No server or build step required — everything runs in the browser.

---

## File Responsibilities

### `frontend/index.html`
- Pure HTML structure — no inline styles, no inline scripts
- All sections: Hero, Donors, Dashboard, Map, Register, Cities, DB Panel, Modals
- Links to `style.css`, `../backend/database.js`, and `app.js`

### `frontend/style.css`
- CSS custom properties (design tokens)
- All component styles: navbar, hero, cards, map, forms, modals, FABs, toasts
- Animations: pulse, fadeUp, blink, ECG particles
- Responsive breakpoints

### `frontend/app.js`
- Leaflet.js map initialization (CartoDB Dark Matter tiles)
- Donor card rendering & blood-type filtering
- Live dashboard with request cards
- Donor registration form handler
- Emergency broadcast
- Messaging system
- Donor profile modal with 3 tabs
- Authentication (login / signup)
- BloodBot chatbot (keyword-based AI)
- Notifications panel
- ECG canvas animation + floating particles
- Counter animations
- Toast notification system
- Cities grid
- App initialization & lazy map loading

### `backend/database.js`
- Opens / upgrades the IndexedDB database (`BloodBridgeDB`)
- Defines 4 object stores with indexes:
  | Store    | Indexes                          |
  |----------|----------------------------------|
  | users    | email (unique), role             |
  | donors   | bloodGroup, city, userId         |
  | requests | status, bloodGroup, city         |
  | messages | fromId, toId, requestId          |
- Full CRUD API via `DB` object:
  - `DB.add(store, data)`
  - `DB.getAll(store)`
  - `DB.getById(store, id)`
  - `DB.byIndex(store, index, value)`
  - `DB.update(store, data)`
  - `DB.delete(store, id)`
  - `DB.count(store)`
  - `DB.clear(store)`
- Seeds 12 donors + 4 emergency requests on first load

---

## Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Markup    | HTML5                   |
| Styles    | CSS3 + Custom Properties|
| Frontend  | Vanilla JavaScript ES6+ |
| Map       | Leaflet.js v1.9.4       |
| Database  | IndexedDB (Browser)     |
| Tiles     | CartoDB Dark Matter     |
| Icons     | Font Awesome 6.5        |
| Fonts     | Syne + DM Sans          |

---

© 2026 BloodBridge Emergency Network
