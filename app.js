/* Birthday Party Planner — plain JS, everything lives in localStorage. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Seed data
     ------------------------------------------------------------------ */

  const seedGuests = [
    { name: "Nana", size: 2, status: "yes", adults: 2, kids: 0 },
    { name: "Thath-", size: 2, status: "yes", adults: 2, kids: 0 },
    { name: "Conlin", size: 3, status: "yes", adults: 2, kids: 1 },
    { name: "Izzy", size: 5, status: "no" },
    { name: "Leo", size: 3, status: "no" },
    { name: "Tito & Melissa", size: 4, status: "no" },
    { name: "Lee", size: 3, status: "yes", adults: 2, kids: 1 },
    { name: "Hazel", size: 3, status: "yes", adults: 2, kids: 1 },
    { name: "Calvin", size: 4, status: "yes", adults: 2, kids: 2 },
    { name: "Chloe", size: 3, status: "yes", adults: 2, kids: 1 },
    { name: "Sara & Sanjay", size: 4, status: "yes", adults: 2, kids: 2 },
    { name: "Gemma", size: 4, status: "yes", adults: 2, kids: 2 },
    { name: "Bailey", size: 4, status: "no" },
    { name: "Evelyn", size: 6, status: "yes", adults: 2, kids: 4 },
    { name: "Evelyn", size: 2, status: "no" },
    { name: "Casey", size: 2, status: "yes", adults: 1, kids: 1 },
    { name: "Hannah & Mason", size: 3, status: "yes", adults: 1, kids: 2 },
    { name: "Adeline", size: 2, status: "yes", adults: 1, kids: 1 },
    { name: "Addy", size: 2, status: "yes", adults: 1, kids: 1 },
    { name: "Declan", size: 1, status: "no" },
    { name: "Riley", size: 4, status: "yes", adults: 2, kids: 2 },
    { name: "Gracie", size: 1, status: "no" },
    { name: "Camden", size: 1, status: "no" },
    { name: "Emma", size: 4, status: "yes", adults: 2, kids: 2 },
    { name: "Hailey-Ann", size: 1, status: "no" },
    { name: "Elsie + sister", size: 4, status: "yes", adults: 2, kids: 2 },
    { name: "Jabrom and Iniya", size: 4, status: "yes", adults: 2, kids: 2 },
    { name: "Lila", size: 3, status: "yes", adults: 2, kids: 1 },
    { name: "Ava", size: 2, status: "yes", adults: 1, kids: 1 },
    { name: "Aiden", size: 2, status: "yes", adults: 1, kids: 1 },
    { name: "Ryker", size: 2, status: "yes", adults: 1, kids: 1 },
    { name: "Antonia", size: 2, status: "yes", adults: 1, kids: 1 },
    { name: "Izzy, Penelope, Luca", size: 5, status: "yes", adults: 2, kids: 3 },
    { name: "Charlotte", size: 2, status: "yes", adults: 1, kids: 1 },
    { name: "Anthony & Gracie", size: 2, status: "pending", adults: 0, kids: 2 },
    { name: "Natasha, Jessalyn", size: 4, status: "yes", adults: 3, kids: 1 },
    { name: "Jordan", size: 2, status: "yes", adults: 1, kids: 1 },
    { name: "Charlotte", size: 2, status: "yes", adults: 1, kids: 1 }
  ];

  // Bumped whenever seedGuests above changes, so a browser that already saved
  // an older list catches up without losing what was edited on that device.
  const SEED_VERSION = 3;

  // How long seedGuests was before each version. An upgrade only adds entries
  // past that mark, so a family deleted by hand is never resurrected.
  const SEED_ADDED_FROM = { 2: 30, 3: 35 };

  // Families whose size, split or status was corrected in a given version.
  // These are re-applied over the stored copy, because a correction comes from
  // an updated headcount that should win over older saved numbers.
  const SEED_REVISED = {
    3: ['g12', 'g14', 'g17', 'g35']   // Gemma, Evelyn, Hannah & Mason, Anthony & Gracie
  };

  const STORES = [
    {
      name: 'Costco', dot: 'dot-rasp', items: [
        'Toilet paper', 'Dishwasher detergent', 'Eggs', 'Egg whites', 'Cottage cheese',
        'Blueberries', 'Milk', 'Bread', 'Bananas', 'Juice for kids', 'Drinks for adults',
        'Costco pizza', 'Veggie tray', 'Fruit snacks', 'Apple pie', 'Popcorn', 'Soap',
        'Comforter', 'Light bulbs', 'Eye patches', 'Yogurt', 'Frozen blueberries',
        'Love Crunch red berries and chocolate'
      ]
    },
    {
      name: 'Target', dot: 'dot-sky', items: [
        'Decorations', 'Balloons', 'Streamers', 'Marshmallows', 'Dinosaur cookies'
      ]
    },
    {
      name: 'Five Below', dot: 'dot-sun', items: [
        { label: 'Pass-the-parcel prizes', dynamic: 'prizes' }
      ]
    }
  ];

  const PICKUP_ITEMS = [
    { id: 'pizza', label: 'Pick up pizza' },
    { id: 'cakes', label: 'Pick up cakes' }
  ];

  const DEFAULT_PINATA = [
    { id: 'p1', label: 'Piñata bought', done: false },
    { id: 'p2', label: 'Candy/prizes to fill it', done: false },
    { id: 'p3', label: 'Bat or stick', done: false },
    { id: 'p4', label: 'Blindfold', done: false }
  ];

  const PRIZES_PER_PARCEL = 10;

  /* ------------------------------------------------------------------
     Storage
     ------------------------------------------------------------------ */

  const KEYS = {
    guests: 'bpp.guests.v1',
    shopping: 'bpp.shopping.v1',
    pickup: 'bpp.pickup.v1',
    games: 'bpp.games.v1',
    seedVersion: 'bpp.seedVersion.v1',
    tab: 'bpp.tab.v1'
  };

  function read(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return (parsed === null || parsed === undefined) ? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }

  function write(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode, full disk */ }
  }

  /* ------------------------------------------------------------------
     State
     ------------------------------------------------------------------ */

  const freshSeed = () => seedGuests.map((g, i) => Object.assign({ id: 'g' + (i + 1) }, g));

  let guests = read(KEYS.guests, null);
  let seedVersion = read(KEYS.seedVersion, 0);

  if (!Array.isArray(guests) || !guests.length) {
    guests = freshSeed();
    write(KEYS.guests, guests);
    write(KEYS.seedVersion, SEED_VERSION);
  } else if (seedVersion < SEED_VERSION) {
    // Walk each seed version this browser has not seen yet, re-applying that
    // version's corrections and adding only the families it introduced.
    const seed = freshSeed();
    const seedById = {};
    seed.forEach(g => { seedById[g.id] = g; });
    const known = {};
    guests.forEach(g => { known[g.id] = true; });

    for (let v = seedVersion + 1; v <= SEED_VERSION; v++) {
      (SEED_REVISED[v] || []).forEach(id => {
        const stored = guests.filter(g => g.id === id)[0];
        const fresh = seedById[id];
        if (!stored || !fresh) return;
        stored.name = fresh.name;
        stored.size = fresh.size;
        stored.status = fresh.status;
        stored.adults = fresh.adults;
        stored.kids = fresh.kids;
        delete stored.people;          // chips rebuild from the corrected split
      });
      const addedFrom = SEED_ADDED_FROM[v];
      if (typeof addedFrom === 'number') {
        seed.slice(addedFrom).forEach(g => {
          if (!known[g.id]) { guests.push(g); known[g.id] = true; }
        });
      }
    }
    write(KEYS.guests, guests);
    write(KEYS.seedVersion, SEED_VERSION);
  }
  guests.forEach((g, i) => {
    if (!g.id) g.id = 'g' + (i + 1) + '-' + Math.random().toString(36).slice(2, 7);
    g.size = Math.max(1, parseInt(g.size, 10) || 1);
    if (['yes', 'pending', 'no'].indexOf(g.status) === -1) g.status = 'pending';
  });

  let shopping = read(KEYS.shopping, {});
  let pickup = read(KEYS.pickup, {});
  let games = read(KEYS.games, null);
  if (!games || typeof games !== 'object') games = {};
  if (!Number.isFinite(games.parcels)) games.parcels = 1;
  if (typeof games.prizesBought !== 'boolean') games.prizesBought = false;
  if (!Array.isArray(games.pinata) || !games.pinata.length) {
    games.pinata = DEFAULT_PINATA.map(item => Object.assign({}, item));
  }

  const saveGuests = () => write(KEYS.guests, guests);
  const saveShopping = () => write(KEYS.shopping, shopping);
  const savePickup = () => write(KEYS.pickup, pickup);
  const saveGames = () => write(KEYS.games, games);

  /* ------------------------------------------------------------------
     People helpers — one chip per human
     ------------------------------------------------------------------ */

  const SEP_SPLIT = /\s*(?:,|&|\+|\band\b)\s*/i;

  function splitName(name) {
    const match = String(name).match(/\s*(,|&|\+|\band\b)\s*/i);
    if (!match) return { parts: [String(name).trim()], sep: null };
    const parts = String(name).split(SEP_SPLIT).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) return { parts: [String(name).trim()], sep: null };
    return { parts: parts, sep: match[1].toLowerCase() };
  }

  // First guess at who is a kid and who is an adult.
  function buildPeople(guest) {
    const size = Math.max(0, guest.size | 0);
    const info = splitName(guest.name);
    const isCouple = info.sep === '&' || info.sep === 'and';

    let kids = Number.isFinite(guest.kids) ? guest.kids : null;
    let adults = Number.isFinite(guest.adults) ? guest.adults : null;

    if (kids === null || adults === null) {
      // No confirmed split yet: assume the invited kid(s) are the named ones,
      // unless the name reads like a couple ("Tito & Melissa").
      kids = isCouple ? 0 : Math.min(info.parts.length, size);
      adults = size - kids;
    }
    kids = Math.min(Math.max(0, kids), size);
    adults = size - kids;

    let namedType;
    if (info.parts.length > 1 && isCouple && adults >= info.parts.length) namedType = 'adult';
    else if (kids >= info.parts.length) namedType = 'kid';
    else namedType = 'adult';

    let kidsLeft = kids;
    let adultsLeft = adults;
    const people = [];

    info.parts.slice(0, size).forEach(label => {
      let type;
      if (namedType === 'kid' && kidsLeft > 0) { type = 'kid'; kidsLeft--; }
      else if (adultsLeft > 0) { type = 'adult'; adultsLeft--; }
      else if (kidsLeft > 0) { type = 'kid'; kidsLeft--; }
      else { type = 'adult'; }
      people.push({ label: label, type: type, named: true });
    });

    let extra = 1;
    while (people.length < size) {
      let type = 'adult';
      if (kidsLeft > 0) { type = 'kid'; kidsLeft--; }
      else { adultsLeft--; }
      people.push({ label: '+' + extra, type: type, named: false });
      extra++;
    }
    return people;
  }

  // Keep the chip list the same length as the party size.
  function syncPeople(guest) {
    if (!Array.isArray(guest.people) || !guest.people.length) {
      guest.people = buildPeople(guest);
      return;
    }
    const size = Math.max(0, guest.size | 0);
    while (guest.people.length > size) guest.people.pop();
    const used = {};
    guest.people.forEach(p => { if (!p.named) used[p.label] = true; });
    let extra = 1;
    while (guest.people.length < size) {
      while (used['+' + extra]) extra++;
      used['+' + extra] = true;
      guest.people.push({ label: '+' + extra, type: 'adult', named: false });
      extra++;
    }
  }

  /* ------------------------------------------------------------------
     Small utilities
     ------------------------------------------------------------------ */

  const $ = sel => document.querySelector(sel);

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const comingCount = () => guests.reduce((n, g) => g.status === 'yes' ? n + g.size : n, 0);

  function headcount() {
    let kids = 0, adults = 0;
    guests.forEach(g => {
      if (g.status !== 'yes') return;
      syncPeople(g);
      g.people.forEach(p => { if (p.type === 'kid') kids++; else adults++; });
    });
    return { kids: kids, adults: adults };
  }

  const prizesNeeded = () => Math.max(0, games.parcels | 0) * PRIZES_PER_PARCEL;

  function comingSunday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    return d;
  }

  function slug(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */

  let activeFilter = 'all';

  function renderBrand() {
    const hc = headcount();
    $('#brandSub').textContent =
      comingCount() + ' coming · ' + hc.kids + ' kids · ' + hc.adults + ' adults';
  }

  const STATUS_META = [
    { key: 'yes', cls: 's-yes', glyph: '✓', title: 'Coming' },
    { key: 'pending', cls: 's-pending', glyph: '?', title: 'Pending' },
    { key: 'no', cls: 's-no', glyph: '✕', title: 'Not coming' }
  ];

  function renderRSVP() {
    const counts = { all: guests.length, yes: 0, pending: 0, no: 0 };
    guests.forEach(g => { counts[g.status]++; });
    Object.keys(counts).forEach(k => {
      const el = document.getElementById('cnt-' + k);
      if (el) el.textContent = counts[k];
    });

    $('#rsvpTotal').textContent = comingCount();
    $('#rsvpFamilies').textContent = counts.yes + (counts.yes === 1 ? ' family coming' : ' families coming');

    const shown = guests.filter(g => activeFilter === 'all' || g.status === activeFilter);
    const list = $('#guestList');

    if (!shown.length) {
      list.innerHTML = '<li class="empty">Nobody in this pile yet.</li>';
    } else {
      list.innerHTML = shown.map(g => {
        const buttons = STATUS_META.map(s =>
          '<button type="button" class="' + s.cls + '" data-status="' + s.key + '"' +
          ' aria-pressed="' + (g.status === s.key) + '" title="' + s.title + '"' +
          ' aria-label="' + s.title + '">' + s.glyph + '</button>'
        ).join('');
        return '' +
          '<li class="row' + (g.status === 'no' ? ' is-out' : '') + '" data-id="' + esc(g.id) + '">' +
            '<span class="row-name">' + esc(g.name) + '</span>' +
            '<div class="stepper">' +
              '<button type="button" class="step" data-act="dec" aria-label="Smaller party for ' + esc(g.name) + '"' +
                (g.size <= 1 ? ' disabled' : '') + '>&minus;</button>' +
              '<span class="size-num">' + g.size + '</span>' +
              '<button type="button" class="step" data-act="inc" aria-label="Bigger party for ' + esc(g.name) + '">+</button>' +
            '</div>' +
            '<div class="status" role="group" aria-label="RSVP for ' + esc(g.name) + '">' + buttons + '</div>' +
            (g.custom ? '<button type="button" class="row-del" data-act="del" aria-label="Remove ' + esc(g.name) + '">×</button>' : '') +
          '</li>';
      }).join('');
    }
    renderBrand();
  }

  function renderPeople() {
    const coming = guests.filter(g => g.status === 'yes');
    coming.forEach(syncPeople);

    const hc = headcount();
    $('#kidTotal').textContent = hc.kids;
    $('#adultTotal').textContent = hc.adults;

    const host = $('#familyList');
    if (!coming.length) {
      host.innerHTML = '<p class="empty">No confirmed families yet — say yes to someone on the RSVP tab.</p>';
      return;
    }

    host.innerHTML = coming.map(g => {
      const kids = g.people.filter(p => p.type === 'kid').length;
      const adults = g.people.length - kids;
      const chips = g.people.map((p, i) =>
        '<button type="button" class="chip chip-' + p.type + '" data-id="' + esc(g.id) + '" data-idx="' + i + '"' +
        ' aria-label="' + esc(p.label) + ' is currently ' + (p.type === 'kid' ? 'a kid' : 'an adult') + ', tap to flip">' +
          '<span class="face" aria-hidden="true">' + (p.type === 'kid' ? '🧒' : '🧑') + '</span>' + esc(p.label) +
        '</button>'
      ).join('');
      return '' +
        '<div class="family">' +
          '<div class="family-head">' +
            '<span class="family-name">' + esc(g.name) + '</span>' +
            '<span class="family-mix">' + kids + ' kid' + (kids === 1 ? '' : 's') + ' · ' + adults + ' adult' + (adults === 1 ? '' : 's') + '</span>' +
          '</div>' +
          '<div class="chips">' + chips + '</div>' +
        '</div>';
    }).join('');

    renderBrand();
  }

  function renderShopping() {
    let total = 0, done = 0;
    const html = STORES.map(store => {
      const rows = store.items.map(raw => {
        const item = (typeof raw === 'string') ? { label: raw } : raw;
        const id = slug(store.name) + '::' + slug(item.label);
        const checked = !!shopping[id];
        total++; if (checked) done++;
        const note = item.dynamic === 'prizes'
          ? '<span class="note">' + prizesNeeded() + ' needed</span>' : '';
        return '' +
          '<li class="row check-row' + (checked ? ' is-done' : '') + '" data-shop="' + esc(id) + '">' +
            '<button type="button" class="checkbox" aria-pressed="' + checked + '" aria-label="' + esc(item.label) + '"><span class="tick">✓</span></button>' +
            '<span class="check-label">' + esc(item.label) + '</span>' + note +
          '</li>';
      }).join('');
      const storeTotal = store.items.length;
      const storeDone = store.items.filter(raw => {
        const label = (typeof raw === 'string') ? raw : raw.label;
        return !!shopping[slug(store.name) + '::' + slug(label)];
      }).length;
      return '' +
        '<h2 class="store-head"><span class="dot ' + store.dot + '"></span>' + esc(store.name) +
          '<span class="store-count">' + storeDone + '/' + storeTotal + '</span></h2>' +
        '<ul class="rows">' + rows + '</ul>';
    }).join('');

    $('#shoppingList').innerHTML = html;
    $('#shopProgressText').textContent = done + ' of ' + total + ' picked up';
    $('#shopBar').style.width = (total ? Math.round((done / total) * 100) : 0) + '%';
  }

  function renderPickup() {
    const due = comingSunday();
    $('#dueDate').textContent = due.toLocaleDateString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric'
    });

    $('#pickupList').innerHTML = PICKUP_ITEMS.map(item => {
      const checked = !!pickup[item.id];
      return '' +
        '<li class="row check-row' + (checked ? ' is-done' : '') + '" data-pickup="' + item.id + '">' +
          '<button type="button" class="checkbox" aria-pressed="' + checked + '" aria-label="' + esc(item.label) + '"><span class="tick">✓</span></button>' +
          '<span class="check-label">' + esc(item.label) + '</span>' +
        '</li>';
    }).join('');
  }

  function renderGames() {
    const parcelInput = $('#parcelCount');
    if (document.activeElement !== parcelInput) parcelInput.value = games.parcels;
    $('#prizeTotal').textContent = prizesNeeded();
    $('#parcelMinus').disabled = games.parcels <= 0;

    const prizeBtn = document.querySelector('[data-games-check="prizesBought"]');
    prizeBtn.classList.toggle('is-done', games.prizesBought);
    prizeBtn.querySelector('.checkbox').setAttribute('aria-pressed', String(games.prizesBought));

    $('#pinataList').innerHTML = games.pinata.map(item =>
      '<li class="row' + (item.done ? ' is-done' : '') + ' check-row" data-pinata="' + esc(item.id) + '">' +
        '<button type="button" class="checkbox" aria-pressed="' + !!item.done + '" aria-label="Done: ' + esc(item.label) + '"><span class="tick">✓</span></button>' +
        '<input class="editable check-label" type="text" value="' + esc(item.label) + '" aria-label="Rename item" maxlength="60">' +
        '<button type="button" class="row-del" data-act="del-pinata" aria-label="Remove ' + esc(item.label) + '">×</button>' +
      '</li>'
    ).join('');
  }

  /* ------------------------------------------------------------------
     Tabs
     ------------------------------------------------------------------ */

  const RENDERERS = {
    rsvp: renderRSVP,
    people: renderPeople,
    shopping: renderShopping,
    pickup: renderPickup,
    games: renderGames
  };

  let currentTab = read(KEYS.tab, 'rsvp');
  if (!RENDERERS[currentTab]) currentTab = 'rsvp';

  function showTab(name) {
    if (!RENDERERS[name]) name = 'rsvp';
    currentTab = name;
    write(KEYS.tab, name);
    document.querySelectorAll('.tab').forEach(btn => {
      const on = btn.dataset.tab === name;
      btn.setAttribute('aria-current', on ? 'true' : 'false');
    });
    document.querySelectorAll('.panel').forEach(panel => {
      panel.hidden = panel.id !== 'panel-' + name;
    });
    RENDERERS[name]();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  $('#tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (btn) showTab(btn.dataset.tab);
  });

  /* ------------------------------------------------------------------
     RSVP interactions
     ------------------------------------------------------------------ */

  const findGuest = id => guests.filter(g => g.id === id)[0];

  $('#guestList').addEventListener('click', e => {
    const row = e.target.closest('.row[data-id]');
    if (!row) return;
    const guest = findGuest(row.dataset.id);
    if (!guest) return;

    const stepBtn = e.target.closest('.step');
    if (stepBtn) {
      guest.size = Math.max(1, guest.size + (stepBtn.dataset.act === 'inc' ? 1 : -1));
      if (Array.isArray(guest.people) && guest.people.length) syncPeople(guest);
      saveGuests();
      renderRSVP();
      return;
    }

    const statusBtn = e.target.closest('[data-status]');
    if (statusBtn) {
      guest.status = statusBtn.dataset.status;
      if (guest.status === 'yes') syncPeople(guest);
      saveGuests();
      renderRSVP();
      return;
    }

    if (e.target.closest('[data-act="del"]')) {
      guests = guests.filter(g => g.id !== guest.id);
      saveGuests();
      renderRSVP();
    }
  });

  $('#addGuestForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#addGuestName');
    const name = input.value.trim();
    if (!name) return;
    guests.push({
      id: 'g-' + Date.now().toString(36),
      name: name, size: 1, status: 'pending', custom: true
    });
    saveGuests();
    input.value = '';
    renderRSVP();
  });

  $('#rsvpFilters').addEventListener('click', e => {
    const btn = e.target.closest('.chip-filter');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    document.querySelectorAll('#rsvpFilters .chip-filter').forEach(b => {
      b.classList.toggle('is-active', b === btn);
    });
    renderRSVP();
  });

  /* ------------------------------------------------------------------
     Kids & Adults interactions
     ------------------------------------------------------------------ */

  $('#familyList').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const guest = findGuest(chip.dataset.id);
    if (!guest || !Array.isArray(guest.people)) return;
    const person = guest.people[parseInt(chip.dataset.idx, 10)];
    if (!person) return;
    person.type = person.type === 'kid' ? 'adult' : 'kid';
    saveGuests();
    renderPeople();
  });

  /* ------------------------------------------------------------------
     Shopping + pickup interactions
     ------------------------------------------------------------------ */

  $('#shoppingList').addEventListener('click', e => {
    const row = e.target.closest('[data-shop]');
    if (!row) return;
    const id = row.dataset.shop;
    shopping[id] = !shopping[id];
    saveShopping();
    renderShopping();
  });

  $('#pickupList').addEventListener('click', e => {
    const row = e.target.closest('[data-pickup]');
    if (!row) return;
    const id = row.dataset.pickup;
    pickup[id] = !pickup[id];
    savePickup();
    renderPickup();
  });

  /* ------------------------------------------------------------------
     Games interactions
     ------------------------------------------------------------------ */

  function setParcels(n) {
    games.parcels = Math.min(99, Math.max(0, n | 0));
    saveGames();
    renderGames();
    if (currentTab === 'shopping') renderShopping();
  }

  $('#parcelMinus').addEventListener('click', () => setParcels(games.parcels - 1));
  $('#parcelPlus').addEventListener('click', () => setParcels(games.parcels + 1));
  $('#parcelCount').addEventListener('input', e => {
    const n = parseInt(e.target.value, 10);
    if (!Number.isFinite(n)) return;
    setParcels(n);
  });
  $('#parcelCount').addEventListener('blur', e => {
    e.target.value = games.parcels;
  });

  document.querySelector('[data-games-check="prizesBought"]').addEventListener('click', () => {
    games.prizesBought = !games.prizesBought;
    saveGames();
    renderGames();
  });

  $('#pinataList').addEventListener('click', e => {
    const row = e.target.closest('[data-pinata]');
    if (!row) return;
    const item = games.pinata.filter(p => p.id === row.dataset.pinata)[0];
    if (!item) return;

    if (e.target.closest('[data-act="del-pinata"]')) {
      games.pinata = games.pinata.filter(p => p.id !== item.id);
      saveGames();
      renderGames();
      return;
    }
    if (e.target.closest('.editable')) return; // typing, not toggling
    item.done = !item.done;
    saveGames();
    renderGames();
  });

  $('#pinataList').addEventListener('input', e => {
    if (!e.target.classList.contains('editable')) return;
    const row = e.target.closest('[data-pinata]');
    const item = games.pinata.filter(p => p.id === row.dataset.pinata)[0];
    if (!item) return;
    item.label = e.target.value;
    saveGames();
  });

  $('#pinataList').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList.contains('editable')) {
      e.preventDefault();
      e.target.blur();
    }
  });

  $('#addPinataForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#addPinataText');
    const label = input.value.trim();
    if (!label) return;
    games.pinata.push({ id: 'p-' + Date.now().toString(36), label: label, done: false });
    saveGames();
    input.value = '';
    renderGames();
  });

  /* ------------------------------------------------------------------
     Export — hand the live list to someone else
     ------------------------------------------------------------------ */

  const STATUS_HEADING = [
    { key: 'yes', label: 'COMING' },
    { key: 'pending', label: 'PENDING' },
    { key: 'no', label: 'NOT COMING' }
  ];

  function guestListText() {
    const hc = headcount();
    const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
    const lines = ['Party guest list'];
    lines.push(plural(comingCount(), 'guest') + ' confirmed: ' +
               plural(hc.kids, 'kid') + ' and ' + plural(hc.adults, 'adult'));

    STATUS_HEADING.forEach(group => {
      const rows = guests.filter(g => g.status === group.key);
      if (!rows.length) return;
      lines.push('');
      lines.push(group.label + ' (' + rows.length + ')');
      rows.forEach(g => {
        if (group.key !== 'yes') {
          lines.push('- ' + g.name + ': ' + g.size);
          return;
        }
        syncPeople(g);
        const kids = g.people.filter(p => p.type === 'kid').length;
        const adults = g.people.length - kids;
        lines.push('- ' + g.name + ': ' + g.size +
                   ' (' + plural(adults, 'adult') + ', ' + plural(kids, 'kid') + ')');
      });
    });
    return lines.join('\n');
  }

  const copyBtn = $('#copyBtn');
  const exportBox = $('#exportBox');
  let copyResetTimer = null;

  function showExportBox(text) {
    exportBox.value = text;
    exportBox.hidden = false;
    exportBox.focus();
    exportBox.setSelectionRange(0, text.length);
    exportBox.scrollTop = 0;   // selecting to the end scrolls it there
  }

  function flashCopied(message) {
    copyBtn.textContent = message;
    window.clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      copyBtn.textContent = 'Copy the guest list as text';
    }, 2600);
  }

  copyBtn.addEventListener('click', () => {
    const text = guestListText();
    // The clipboard is blocked in some embedded and older browsers, so fall
    // back to showing the text already selected for a manual copy.
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => { exportBox.hidden = true; flashCopied('Copied to the clipboard'); },
        () => { showExportBox(text); flashCopied('Select the text below to copy'); }
      );
    } else {
      showExportBox(text);
      flashCopied('Select the text below to copy');
    }
  });

  /* ------------------------------------------------------------------
     Reset
     ------------------------------------------------------------------ */

  $('#resetBtn').addEventListener('click', () => {
    if (!window.confirm('Wipe every change and go back to the original guest list?')) return;
    try {
      Object.keys(KEYS).forEach(k => window.localStorage.removeItem(KEYS[k]));
    } catch (err) { /* ignore */ }
    window.location.reload();
  });

  /* ------------------------------------------------------------------
     Go
     ------------------------------------------------------------------ */

  showTab(currentTab);
  renderBrand();
  saveGuests(); // persist any ids/people filled in above
})();
