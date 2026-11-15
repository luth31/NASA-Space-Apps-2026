# PyroBridge — 29-second short demo

`pyrobridge-29s.mp4` is a finished **29.0-second silent H.264 montage of actual application captures**, 1920×1080 at 30 fps. Captions are burned in, with an editable SRT alongside. It is labeled “capture montage” and “AI-assisted interface · Real NASA observations.” It is not a continuous screen recording and does not pretend that stills demonstrate motion.

The six scenes cover the globe, unfolded atlas, sensor comparison, the real 89% August concentration finding, the scoped scientific pilot and closing invitation. `storyboard-contact.png` is the visual fallback. `frames/` contains the exact full-resolution composed scenes, and `render-manifest.json` records source capture filenames, source dimensions, SHA-256 hashes, durations and the final video hash.

## Verified result — 15 November 2026

The lead ran `verify-video.swift` against the encoded file in the host environment. Observed metadata: **duration29.0s; dimensions1920×1080; nominalFrameRate30.0; one video track; zero audio tracks**. The verifier decoded the six scene-center frames at1,6,11,17,23 and27.5seconds. The lead visually reviewed all six decoded images: correct orientation, readable captions, correct study/sensor/date scope and no clipped caption text. The research/brand agent also reviewed the six-frame composition contact sheet before encoding.

The child sandbox could render frames but could not access macOS's video codec service (AVFoundation -11834 for encoding and -12911 while decoding). The lead's full-access run encoded and decoded successfully. This is an environment-specific reproduction requirement, not an unavailable final video. `ffmpeg` was not installed; no package installation was performed.

## Rebuild locally

From the integrated repository root, with the bundled Sharp module available:

```sh
node deliverables/demo/prepare-frames.mjs deliverables/captures explore-globe.png explore-atlas.png
swift -module-cache-path /tmp/nasa-swift-cache deliverables/demo/render-montage.swift deliverables/demo/frames /tmp/pyrobridge-29s-new.mp4
swift -module-cache-path /tmp/nasa-swift-cache deliverables/demo/verify-video.swift /tmp/pyrobridge-29s-new.mp4 /tmp/pyrobridge-video-review
```

`prepare-frames.mjs` defaults to the known bundled Sharp path on this Mac. Set `NASA_SHARP_ENTRY` to another installed Sharp entry when reproducing on another machine. The Swift encoder needs macOS AVFoundation/AppKit and permission to use the local codec service. It deliberately refuses to overwrite an existing output. The deprecated API warnings on this macOS version do not prevent the verified render; a future toolchain may require API modernization.

After editing captions in `prepare-frames.mjs`, also update `captions.srt` and `deliverables/scripts/short-demo-storyboard.md`. Rebuild, verify duration and inspect decoded frames again. Source images are the actual application captures in `deliverables/captures/`; do not substitute generated satellite imagery or invented scientific values.

## Usage and credits

The montage works without sound. Full sources and AI disclosure are in `docs/submission-copy.md`; source imagery dates/credits are in `web/public/assets/assets-manifest.json`. Data: NASA FIRMS. Regional image: NASA EOSDIS GIBS / Aqua MODIS. Atlas boundaries: Natural Earth. PyroBridge is provisional; brand alternatives remain separate.

The seven-slide editable deck/PDF is a separate valid-format alternative. Current NASA-hosted clarification says ≤30 seconds of video OR ≤7 slides including cover/closing; see `docs/competition-research.md` for the guide-access limit. No video, deck or project was published or submitted.
