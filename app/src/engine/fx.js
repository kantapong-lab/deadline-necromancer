'use strict';
// Presentation events ("fx") for the 3D Moderator screen.
// The engine records WHAT happened (skills, curses, traps, events, boosters, votes) as plain data while it resolves;
// it never feeds into any view or snapshot — the server drains it after each action and sends it to Moderator sockets only
// (poc/DIRECTOR.md describes the payloads; public/mod3d.html plays them with the Director).

// kinds anybody on the shared screen may see (everything else is Moderator-secret: skills, curses, trap placement)
const PUBLIC_KINDS = new Set(['event', 'eventVote', 'booster', 'voteOut', 'burnout', 'trapTrigger']);

module.exports = {
  emit(kind, data) { (this.fx || (this.fx = [])).push({ kind, day: this.day, phase: this.phase, ...data }); },
  drainFx() { const out = this.fx || []; this.fx = []; return out; },
  // Secret details are stripped unless the Moderator turned Secrets on (same rule as modView(secrets)).
  redactFx(batch, secrets) {
    if (secrets) return batch;
    return batch.filter(f => PUBLIC_KINDS.has(f.kind)).map(f => {
      if (f.kind === 'trapTrigger') return { kind: f.kind, day: f.day, phase: f.phase, trap: f.trap, mana: f.trap === 'exit' ? f.mana : undefined };   // name only
      if (f.kind === 'event' && f.onCall !== undefined) { const { onCall, ...rest } = f; return rest; }
      return f;
    });
  },
};
