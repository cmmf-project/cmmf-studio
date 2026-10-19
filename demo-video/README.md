# CMMF Studio demo — explore the estate

A silent **92-second** Remotion demo centred on ease of use and visualising a connected content estate. The previous four-minute cut remains available in the Archive folder.

Start the preview from this folder with `npm run studio`. Open `StudioDemo` for the complete cut, `EstateSample` for the 48-second exploration section, `FieldDetailsSample` for the restored inspector shot, or `Chapter-04-Closing` for the animated lockup.

| Chapter | Timeline | Duration |
| --- | --- | --- |
| Build simply | 0:00–0:22 | 22 seconds |
| Explore the connected estate | 0:22–1:10 | 48 seconds |
| Take the model with you | 1:10–1:26 | 16 seconds |
| CMMF Studio closing lockup | 1:26–1:32 | 6 seconds |

## Current scene order

1. **A familiar space to brainstorm ideas** — real drag-and-drop creation of Product, Product Variant and Category.
2. **Build out your model with typed fields** — add fields on the canvas.
3. **A large model stays easy to explore** — the complete 34-type, 201-field estate, with zoom, pan and a jump to Product.
4. **Structurally sound** — Product and its incoming/outgoing neighbours highlighted.
5. **Hover Categories → see Category** — isolate that reference field, its connection and its target.
6. **Get into the detail** — one click opens Product Name; show Intent, then Rules with required/localised options and character validation.
7. **One click returns to the whole estate** — Fit whole model clears focus.
8. **The decisions leave Studio** — actual ZIP export.
9. **Bring your own tools** — an excerpt of Product YAML from the actual export.
10. **CMMF Studio** — canonical animated logo entrance, followed by a still hold.

The main cut uses one reference-hover example to make room for details and the closing without adding much length. `HoverSample` retains the Variants/Categories comparison. The previous four-minute cut remains in Archive.

## Closing identity

`src/brand-motion.json` vendors the unchanged outlined Studio horizontal light SVG and motion tokens from `cmmf-branding/artifacts/cmmf-brand-kit/motion/`. `Closing.tsx` seeks the animation from the video frame: fixed-mask symbol rise, gradient drift, CMMF, then Studio. It follows the supplied timing/easing and ends on the exact static artwork. No external branding checkout is needed at runtime.

## Authentic capture and verification

The estate shots contain **all 34 models** throughout; they are not reduced example boards. Selection and hover colours come from Studio itself. An overlaid pointer follows real browser pointer events; no extra highlight effects were added in the edit.

Recordings are **1920 × 1080 at 25 fps**, and the presentation preview is 1920 × 1080 at 30 fps. Estate stills use a higher pixel density for clear holds. The video is silent for live presenter commentary.

`out/estate-highlight-checks.json` records the actual UI state. Capture checks that:

- every estate shot retains all 34 nodes;
- selecting Product highlights the exact incoming/outgoing neighbour set;
- each hovered field highlights exactly Product and its target;
- highlighted edges match the chosen reference;
- Fit whole model clears the muted/focused state;
- opening field details shows the expected validation settings without changing the model.

Encoded recording dimensions and durations are in `out/encoded-metadata.json`. The revised main timeline is checked at twenty points, including the restored details shot, logo entrance and final hold; chapter durations sum to **2,760 frames / 92 seconds**.

## Model and export

The unchanged `../examples/ecommerce.cmmf.json` is the reference. `public/final-workspace.cmmf.json` retains the completed board and its layout. `public/cmmf-models.zip` was downloaded through Studio’s Export action. Every exported model validates, all reference targets resolve, and the exported models match the final workspace.

The deliberate refinement from the storyboard remains `product.fields[variants].relation.minItems: 1`. Contained, required, repeatable variants; linked categories; and the localised Product name are preserved in the workspace and export.

This is an original CMMF ecommerce architecture informed by commercetools catalogue concepts, not an official vendor schema. Export produces YAML models; it does not deploy a CMS or connect to a commerce backend.

## Reproduce

Install this project’s dependencies with `npm install`, and install/start the parent Studio project on `http://127.0.0.1:5173`. Then:

```sh
npm run prepare
npm run capture
npm run capture:estate
npm run footage
npm run check
npm run qa
npm run studio
```

`CMMF_DEMO_URL` overrides the Studio URL. To re-record a single estate beat, use `node scripts/capture-estate.mjs --only=14-hover-categories`. The original capture script also supports `--only` and `--from`.

Scripts use the parent project’s Playwright, AJV, YAML and JSZip dependencies. The QA Chromium path and FFmpeg package path currently match this Mac’s installed tools and x64 Node. Generated recordings, workspaces, exports, fonts and QA output are ignored by Git. Sources, package lock and small metadata files remain reviewable.

Studio’s application code and original example are unchanged. The video is an independent project.
