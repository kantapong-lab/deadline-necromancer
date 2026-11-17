# Deadline Necromancer

เกม Social Deduction (แนว Werewolf) เล่นหลายคนผ่านเว็บ ธีมบริษัทเอเจนซีเวทมนตร์ที่ต้องปั่นโปรเจกต์ให้เสร็จทัน Deadline ภายใน 5 วันทำงาน
แต่มี "ลัทธิอู้งาน" และ "แก๊งล่าซองขาว" แฝงตัวอยู่ — 6–12 ผู้เล่น + Moderator 1 คน (ไม่ได้เล่น คุมจังหวะเกม) จบเกมใน ~15–20 นาที

A multiplayer web social-deduction game (Node.js + Socket.IO) with a Moderator screen. Roles, traps, event cards and sprint boosters are server-authoritative.

## Quick start

```bash
cd app
npm install
npm start          # http://localhost:3000
npm test           # golden-master + HTTP parity + moderator actions + simulation
```

- **Moderator:** `http://<host>:3000/mod` → create a room (4-letter code)
- **Players:** `http://<host>:3000/` → enter the room code and a name (or use `/?room=ABCD`)
- **Card gallery:** `http://<host>:3000/gallery`

Players on the same LAN/Wi-Fi use the host machine's IP instead of `localhost`. Set `PORT` to change the port.

## Repository layout

| Path | What |
| :--- | :--- |
| `app/` | The game: Node server, engine, browser client, tests ([app/README.md](app/README.md)) |
| `app/src/engine/` | Game rules (`Game` class split into modules: votes, night resolution, events, views…) |
| `app/src/server/` | HTTP + Socket.IO: `index.js` bootstrap, `rooms.js`, `http.js`, `handlers/` |
| `app/src/shared/data.js` | Role/card data shared by server and browser (served at `/data.js`) |
| `app/public/` | Player, Moderator and gallery pages, styles, card thumbnails |
| `app/test/` | `golden/` (seeded engine snapshot), `http-parity.js`, `mod-actions.js`, `simulate.js` |
| `docs/` | Game design, player rules, event cards and the original card artwork |
| `poc/` | Experimental prototypes (office 3D/desk/director demos) — not part of the shipped game |
| `.team/` | Agent-team working notes: research, tasks and per-role briefs for each change |
| `.spright/` | Spright requirement/research/journey/deck workspace for pitch material |

## Documentation

- [Player rules](docs/deadline_necromancer_player_rules.md) — goals of the three factions, turn order
- [Game design & architecture](docs/deadline_necromancer_design.md) — roles, skills, technical design (some file paths there predate the `app/src/` restructure)
- [Event cards](docs/deadline_necromancer_event_cards.md)
- [Strategy](docs/deadline_necromancer_strategy.md)
- [Daily rule ideas](docs/deadline_necromancer_daily_rule_ideas.md)
- Card sheets: [role cards](docs/deadline_necromancer_role_cards/), [trap cards](docs/deadline_necromancer_trap_cards/), [booster cards](docs/booster_cards/), [event cards (art)](docs/event_cards/)
- Architecture decisions: [ADRs](docs/adr/) · [architecture](docs/architecture/) · [plan](docs/plan/)
