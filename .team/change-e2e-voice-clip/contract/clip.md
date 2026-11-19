# Recordings, ffmpeg grid, output tree (AC-6, AC-7)

Output root `app/e2e-out/voice/` = `path.join(__dirname, '..', 'e2e-out', 'voice')`. Wiped (`rmSync recursive`) and recreated at startup, only after the ffmpeg check passed. No `E2E_OUT` override (that env belongs to `e2e-pw.js` screenshots).

```
e2e-out/voice/
  voice-e2e.mp4          1920x1080 h264 + aac
  report.json            schemas.md
  raw/
    p01.webm .. p12.webm  Playwright video, one per phone
    mod3d.webm            Playwright video of the 3D screen
    mod3d-audio.webm      received audio mix on mod3d (opus)
    p01-audio.webm        received audio mix on P01 (opus)
    samples-mod3d.json, samples-p01.json   in-page samples (debug extra, not required by AC-6)
```

## Getting the data out of the pages
- Video: context option `recordVideo: {dir: raw/.pw, size: <viewport>}` (phones 390x844, mod3d 1440x900). `video = page.video()` is grabbed in `onPage` right after `newPage`; `t0` (taken just before `newPage`) is `videoStartMs[name]`. After all analysis is done: `await ctx.close()` for all 13 contexts, then `await video.path()`, `fs.renameSync` to `raw/pNN.webm` / `raw/mod3d.webm`, remove `raw/.pw`. Contexts are closed before ffmpeg runs.
- Audio: `await page.evaluate(() => window.__dn.stopRecorder())` while the page is still open; `Buffer.from(b64, 'base64')` -> `raw/<name>-audio.webm`. `startT` is kept as `audioStartMs`. Payload is a few hundred KB, no chunking needed.
- Order in `finally`: stop recorders and drain samples (best effort) -> evaluate checks -> close contexts -> save videos -> mux -> write report -> `browser.close()` -> `room.close()`. A thrown error in the middle still runs this block, prints `SCRIPT-ERR`, exit 1.

## Clip window and alignment
`tClipStart = (time of slot 1 start) - PREROLL_MS`; fallback when slot 1 was never reached: time of step 2. `tClipEnd` from timeline.md step 7 (fallback: now). `D = (tClipEnd - tClipStart) / 1000` s.
Per input `i`: `ss_i = max(0, (tClipStart - videoStartMs_i) / 1000)`. Audio: `ss_a = max(0, (tClipStart - audioStartMs) / 1000)` (recorders start at page init, always before `tClipStart`). Residual error is the gap between `newPage()` and the first screencast frame plus recorder start, expected < 0.3 s `[verify]`; it is recorded in `report.json clip`. Trimming is done in filters (`trim`), not `-ss`, because Playwright webm has no seek index.

## ffmpeg invocation (spec, one process)
```
ffmpeg -y -hide_banner -loglevel error
  -i raw/p01.webm ... -i raw/p12.webm          # inputs 0..11
  -i raw/mod3d.webm                             # input 12
  -i raw/mod3d-audio.webm                       # input 13 (omit and use anullsrc if the file is missing; the AC-6 check then FAILs)
  -filter_complex "
    color=c=0x0f0d1a:s=1920x1080:r=25:d=D[bg];
    [12:v]fps=25,trim=start=ss12:duration=D,setpts=PTS-STARTPTS,scale=1256:785[m];
    [i:v]fps=25,trim=start=ssi:duration=D,setpts=PTS-STARTPTS,scale=166:360[pi];   # i = 0..11
    [bg][m]overlay=0:0[l0]; [l0][p0]overlay=1256:0[l1]; ... [l11][p11]overlay=X:Y[vout];
    [13:a]atrim=start=ssa:duration=D,asetpts=PTS-STARTPTS,aresample=48000[aout]"
  -map [vout] -map [aout] -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -r 25
  -c:a aac -b:a 128k -t D -movflags +faststart voice-e2e.mp4
```
Layout: mod3d large at (0,0) 1256x785; the 12 phones fill the right 664 px as 4 columns x 3 rows of 166x360, phone `i` at `x = 1256 + (i % 4) * 166`, `y = floor(i / 4) * 360`; P01 top-left of the grid, P12 bottom-right. Remaining area under mod3d stays the background colour. `overlay` default `eof_action=repeat` holds the last frame of a shorter input. Soundtrack = mod3d's received mix only (all seats, raw, unpanned), so each turn is heard as its own pitch and AC-3 as a 12-tone chord. No subtitles, no `drawtext`.
- Run with `spawnSync(FFMPEG_BIN, args, {encoding: 'utf8'})`; non-zero exit -> check `clip voice-e2e.mp4 written` FAILs with the stderr tail, exit 1, `report.json` still written.
- Verify the clip: `spawnSync(FFMPEG_BIN, ['-hide_banner', '-i', mp4])`, parse stderr for `Video: h264` and `Audio: aac`; both present -> PASS (`ffprobe` not needed). Result goes to `report.json clip.streams`.

## ffmpeg discovery (AC-7, step 0 of the script, before server and browser)
`FFMPEG_BIN = process.env.FFMPEG || 'ffmpeg'` (if `FFMPEG` is set only that is tried, no fallback to PATH). `spawnSync(FFMPEG_BIN, ['-version'])` must exit 0 and print `ffmpeg version`; then `-encoders` must list `libx264` and `aac`. Otherwise print
`FAIL ffmpeg not found or unusable (<FFMPEG_BIN>): install it with "brew install ffmpeg" or set FFMPEG=/path/to/ffmpeg` and exit 1 immediately: no server, no browser, no output folder touched.
