# Schemas: `report.json` and in-page samples

No database, no migration. Two JSON shapes, both written by the runner. Times are epoch ms.

## `report.json` (`JSON.stringify(report, null, 2)`, written even when checks fail)
```
{
  "task": "change-e2e-voice-clip",
  "generatedAt": "<ISO>",
  "ok": bool,                          // every check ok
  "room": "<code>", "port": 3341,
  "params": { SR, FFT, binHz, TICK_MS, TONE_GAIN, SLOT_MS, SETTLE_MS, ALL_MS, ALL_SETTLE_MS, T_ON, T_OFF, FLOOR_DB, BIN_TOL, MIN_SAMPLES },
  "seats": [ { "seat": 0, "name": "P01", "pid": <engine id>, "freqHz": 220, "bin": 38 } ... 12 rows ],
  "checks": [ { "name": "AC-2 slot 03 ...", "ok": bool, "detail": "<string>" } ... ],   // same order as the PASS/FAIL lines
  "timeline": [ Entry ... ],
  "pageErrors": [ "<tag>: <message>" ],
  "clip": { "path": "voice-e2e.mp4", "ok": bool, "startMs": n, "endMs": n, "durationS": n,
            "audioOffsetS": n, "videoOffsetsS": { "p01": n, ..., "mod3d": n },
            "streams": ["video","audio"], "ffmpeg": "<first line of -version>", "error": "<stderr tail, only on failure>" }
}
```
`Entry` (one per slot/window, steps 3-7):
```
{ "phase": "turn" | "all" | "silenced" | "unsilenced" | "toVote",
  "slot": 1..12 | null,              // only for phase "turn"
  "talkers": [seat...],              // "turn": 1 seat; "all"/"toVote": 0..11; "silenced"/"unsilenced": [4]
  "freqHz": [..],                    // f(seat) per talker
  "tStart": n, "tEnd": n,            // slot bounds
  "window": [n, n],                  // analysis window
  "rx": { "mod3d": Rx, "p01": Rx } }
Rx = { "ok": bool,
       "skipped": "own slot"?,       // P01 heard-check skipped when P01 talks
       "heard": [ { "seat": n, "rms": n, "peakHz": n, "bin": n, "expectedBin": n, "ok": bool, "samples": n } ],
       "quiet": { "ok": bool, "maxRms": n, "loudestSeat": n | null },
       "mixRms": n,                  // max over the window
       "mixToneDb": n | null,        // max mixTone[k] for k = the checked seat (AC-4)
       "marker": bool | null }       // null = not applicable (P01 own slot, phases without marker rule)
```
`rx.p01` of phase `toVote` and `all` also follow `Rx` (`heard` empty for `toVote`).

## In-page sample (hooks.md section 4; `raw/samples-*.json` is the array of these)
```
{ "t": n, "per": { "<streamId>": { "rms": n, "bin": n } }, "mixRms": n, "mixTone": [dB x12], "mk": [pid...] }
```
`per` keys are MediaStream ids; the runner maps them to seats and may write `samples-*.json` with the mapped seat attached as `seatOf: {<sid>: seat}`.
