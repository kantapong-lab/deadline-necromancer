# Researcher note: indie-solo-wins (L0)

- Engine has no timers; the 10-15 s delayed ghost chat needs a new server scheduler (rooms.js push model).
- Fizzle checks (NDA, Meeting Purge) are only knowable after phases.js closeNight L56/L75, so decide at delivery.
- Feed is shared across viewers (views.js common); faded flag must be added per viewer in viewFor, ghost metadata kept off the feed entry. Client index.html:168 marks target's own-name chat as `mine`.
- Release Alchemist is not nullified by Deploy on Friday in code (night-resolve.js:140); requirement assumes it is.
- Details: .worktrees/feature-indie-solo-wins/.team/indie-solo-wins/brief.md
