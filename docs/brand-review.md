# Naming and identity review

Prepared 15 November 2026. **No final name is selected. PyroBridge remains the provisional app and presentation name.** The visual comparison lives at `/brand/index.html`; all logos are editable SVGs under `web/public/brand/`.

## Six candidates

Pronunciations below are practical presentation guides, not claims that an invented name has a dictionary pronunciation. Existing-use research is a bounded public-web check, not trademark, domain or company-name clearance.

| Name | Say it | Meaning and second reading | Existing use / practical concern | Recommendation |
| --- | --- | --- | --- | --- |
| **Ashkey** | ASH-kee; Romanian approximation “aș-chi” | English ash + key suggests opening an overlooked record. Ash-tree fruits are also called keys: a real botanical second meaning. Romanian *așchii* means splinters; the sound is a loose association, not a translation of ash. | **ASHKEY OÜ** exists in Estonia with computer programming as its principal activity. The English vowel and Romanian ending are not identical. | Strongest story and symbol; develop for review, but do not adopt until the existing software use is considered. |
| **Ashchron** | ASH-kron | Invented blend: ash + the time-related *chron-* root. “Fire's chronology” is a product metaphor, not an ancient word. | Exact quoted-name searches returned no relevant established product in this check. That is weak negative evidence, not availability. The /sh-kr/ cluster is harder to say and spell. | Keep as an alternate if chronology matters more than immediate friendliness. |
| **Brasa** | BRAH-sah | Spanish *brasa* is glowing wood/coal. A remembered ember becomes a metaphor for reading traces over time. | Existing Brasa apps and many unrelated uses make search ownership difficult; *dar la brasa* also has an annoying/persistent idiomatic meaning in Spain. It is not a Romanian word for ash. | Best warm, approachable visual direction; keep the satellite descriptor prominent. |
| **Vestige** | VES-tij in English; agree one spoken form for the team | An English word for a surviving trace, with a documented Latin footprint/track root. Fits evidence and historical memory without promising prevention. | Vestige Digital Investigations and Vestige Forensics already use the name in evidence software/services. Romanian speakers may read three syllables. | Strongest scientific/editorial direction; existing evidence-sector use is a real drawback. |
| **Cinder** | SIN-der | A partly burned fragment; immediate fire association and a remaining trace. | OpenStack already uses Cinder for a major software service. Romanian spelling-to-sound can suggest “chin-der.” | Clear in English, but crowded and less distinctive internationally. |
| **Luma** | LOO-mah | A coined light cue and a short friendly sound. No claim that “Luma” itself is Latin for light. | Luma AI is an established visual-generation product; confusion is especially likely in an AI-assisted visualization project. | Pronounceable but reject as the lead candidate. |

Sources checked 15 Nov: [Woodland Trust, ash keys](https://www.woodlandtrust.org.uk/blog/tree-seed-identification/); [DEX '09 / DOOM entries via dexonline, așchie/așchii](https://dexonline.ro/definitie/a%C8%99chie); [Estonian official ASHKEY registry](https://ariregister.rik.ee/eng/company/17553944/ASHKEY-O%C3%9C); [Merriam-Webster, chrono-](https://www.merriam-webster.com/dictionary/chrono-); [RAE, brasa](https://dle.rae.es/brasa); [Brasa app's own terms](https://brasamood.com/termos?lang=en); [Merriam-Webster, vestige](https://www.merriam-webster.com/dictionary/vestige); [Vestige's own site](https://www.vestigeltd.com/); [Vestige Forensics](https://vestigeforensics.com/); [Merriam-Webster, cinder](https://www.merriam-webster.com/dictionary/cinder); [OpenStack Cinder](https://docs.openstack.org/cinder/latest/); [Luma](https://lumalabs.ai/). The Brasa home page timed out; its indexed first-party terms were available. No domain registration or trademark database clearance was performed. Exact-name search queries included `"Ashkey" company software`, `"Ashchron"`, `"Brasa" software company official`, and `"Vestige" digital forensics official`.

## Three developed directions

### Ashkey — a key to the record

**Tagline:** Read the signal. **Descriptor:** Satellite fire observations, in context.

The symbol joins a winged seed, an observation aperture and a key stem. A rounded lowercase wordmark makes a technical product easier to approach. Midnight ink with amber and soft sage connects fire and living landscapes. This has the most memorable double meaning, but the existing ASHKEY software company makes it a visual recommendation, not a cleared name.

Files: `ashkey/wordmark-{light,dark,mono}.svg`, `symbol-{light,dark,mono}.svg`, `favicon.svg`, `header-{light,dark}.svg`, `cover-{light,dark}.svg`. The favicon is simplified and uses a solid field to retain the aperture and key stem at 16px.

### Brasa — a field atlas

**Tagline:** See the season. **Descriptor:** An atlas of satellite fire observations.

A compact ember silhouette carries two cut lines like layers in an atlas. Warm paper, deep plum and vermilion support a calmer field-guide personality. The generous serif wordmark deliberately differs from Ashkey's instrument feel. Use a system Georgia serif in the previews; editable text remains text. Do not use its warmth to imply that an active fire is decorative or harmless.

Files follow the same pattern in `brasa/`. The 16px favicon removes the narrowest inner contour; larger symbols retain the layered cut. Search congestion and the Spanish idiom need consideration before choosing the name.

### Vestige — an evidence journal

**Tagline:** Follow what remains. **Descriptor:** A satellite record of burning activity.

Two offset angular tracks form a V, with one observed point at the opening. Cool blue and restrained rust suggest measurement rather than a flame icon. A widely spaced uppercase wordmark supports a quiet scientific publication style. This direction best complements provenance and the release-gate narrative, but the existing forensic brands reduce distinctiveness.

Files follow the same pattern in `vestige/`. At favicon scale, the two tracks merge into one heavy V with a separate point. Do not read the point as a forecast or trail of fire movement; it is a brand mark only.

## Recommendation and implementation contract

Recommend **Ashkey's visual language** for further user review, with Brasa as the warm atlas alternative and Vestige as the scientific editorial alternative. The existing-use finding prevents a confident recommendation to adopt Ashkey as the final name. Keep **PyroBridge** in the working application, deck and recordings so a name decision does not block delivery.

The app should own one small brand configuration (`name`, `descriptor`, `tagline`, `symbolPath`) and reference that in the header/title. This workstream does not change application branding. The comparison page is quiet and cannot automatically apply a choice; it links back to the app. Do not imply these concepts are NASA-endorsed.

## Files, editing and verification

`web/public/brand/index.html` provides all three directions, light/dark/monochrome variants, symbol tests at **16 / 24 / 32 / 64px**, header and 16:9 pitch-cover previews, and direct SVG downloads. The header preview uses the current product's five navigation labels and realistic header spacing; it is explicitly a brand mockup, not a screenshot of a shipped theme. A separate `brand.json` records tokens and provisional status. `generate-assets.mjs` reproduces the original SVG files without external assets or network access.

SVG wordmarks use editable text with system fallback fonts. For distribution on computers without the intended fonts, keep the SVG source and make a separate outlined export after the name choice; do not destructively outline the master. Color logos have dedicated dark/light backgrounds. Monochrome masters use one ink color; reverse them only on a suitable contrasting field. The chart sensor palette is not changed by brand selection.

Structural checks verify every SVG parses, all referenced preview files exist, no external image/font requests are embedded, and viewBoxes/dimensions are present. Visual QA results must be recorded after rendered inspection; structural checks alone do not prove small-size legibility or layout fit.

All marks are original vector concepts created with Codex assistance for this project. They contain no NASA insignia or copied reference artwork. NASA and third-party data/imagery attribution remains separate from identity artwork.

### Rendered vector QA, 15 November 2026

The bundled Sharp renderer produced all six header variants and six pitch-cover variants, plus 16px favicon rasters enlarged with nearest-neighbor sampling for inspection. All three light wordmarks, all six headers and the three dark covers were visually inspected. The first Ashkey render exposed an overlapping path that cancelled the seed silhouette; the editable source was corrected and re-rendered before delivery. The three directions now have distinct silhouettes and readable wordmarks. At 16px the simplified symbols retain the key aperture, ember cut and V; fine detail is intentionally removed. Header navigation fits without overlapping the name.

Calculated foreground/background contrast: Ashkey light text13.38:1/accent6.20:1, dark text15.22:1/accent8.75:1; Brasa12.30/5.56 and13.71/8.50; Vestige11.64/5.99 and14.09/9.61. This checks the chosen text/accent colors, not every app control or a complete accessibility audit. Actual comparison-page browser review is owned by the lead; this workstream did not control the desktop while UI QA was in progress.
