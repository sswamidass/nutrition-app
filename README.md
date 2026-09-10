# Kids Birthday Party Planner

A pocket-sized planner for one kid's birthday party. Plain HTML, CSS and JavaScript —
no build step, no framework, no backend. Everything you tap is saved in the browser's
`localStorage`, so it survives a reload and stays on your own phone.

## Tabs

| Tab | What it does |
| --- | --- |
| **RSVPs** | Every invited family with an editable party size and a ✓ / ? / ✕ toggle. Filter by status, with live counts and a running confirmed-guest total. |
| **Kids & Adults** | Confirmed families broken into one chip per person. Tap a chip to flip it between kid 🧒 and adult 🧑. Totals update as you go, and chips follow party-size changes made on the RSVP tab. |
| **Shopping List** | Checkable list grouped by store (Costco, Target, Five Below) with a progress bar. The Five Below prize line shows how many prizes the Games tab currently needs. |
| **Pickup** | Two-line day-of checklist, dated to the coming Sunday. |
| **Games** | Pass-the-parcel parcel count at 10 prizes each, with the total worked out for you, plus a renameable piñata checklist. |

## Running it

Open `index.html` in a browser, or serve the folder with any static server:

```sh
python3 -m http.server 8000
```

## Data

The guest list is seeded on first load and then lives entirely in `localStorage`
under `bpp.*` keys. The link at the bottom of the page wipes those keys and
restores the original list.
