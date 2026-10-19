# CMMF 1.3.0-beta.1 in Studio

Stable workspaces continue to use CMMF 1.2.0. Select **CMMF 1.3.0-beta.1 (beta)** in the sidebar to opt in. Studio saves the exact version in workspace JSON and writes it to `manifest.yaml` in CMMF ZIP exports. The earlier experimental Studio value `1.3.0-beta` resolves explicitly to this beta; bare `1.3`, `1.3.0`, and unsupported releases are rejected on import.

Open a content type's settings and choose **Validation hints**. Field-level validations remain in the field's **Rules** tab. Each document-level hint has an editable stable ID, a meaningful description, and an optional severity (error by default). Changing its description never regenerates its ID.

- **Structured** hints support an optional condition, recursive all/any/not groups, all predicate operators, and any combination of the five actions. Field choices refer to the current model. Typed operands preserve `null`, `false`, and `0`; no coercion is applied.
- **Expression** hints require an explicitly named dialect and a JSON rule. The rule can be any JSON value, including `null`. Studio preserves unknown dialects without interpreting or executing them. No dialect is preferred by default.
- **Prose** hints retain manual/editorial intent through ID, description, and severity.

Empty means absent, `null`, `""`, or `[]`. `false`, `0`, whitespace, and objects are non-empty. All presence actions and emptiness predicates use this meaning. Comparisons use singular scalar fields, never list membership inspection or nested/cross-document paths. An absent field makes comparisons false, including negative comparisons; `not` negates normally. `forbid` expresses expected emptiness and does not delete content.

## What is checked

Studio validates declaration shape using the exact release schema, then checks duplicate hint IDs, field resolution, operator/type compatibility, operand types, and regex syntax. The issues list and hint editor show declaration errors. Malformed declarations block CMMF export regardless of severity. Changing or deleting a field can make a hint invalid and will show an issue requiring repair.

Studio does **not** run content validations, execute expressions, or promise that a CMS can enforce a hint. Export is CMMF source, not translator output, so it does not claim `mapped`/`degraded`/`unmapped` dispositions. Translators consuming the export must record one disposition and reason for every hint, including prose and unknown dialects.

Imported model bundles without an explicit version use the selected workspace version. Explicit version declarations take precedence; incompatible or malformed beta declarations are rejected before replacing the board. Hints imported under stable 1.2 are preserved but flagged as unsupported, rather than silently treated as compatible. Switching a beta workspace to stable also preserves hints and blocks stable CMMF export until the mismatch is resolved. Workspace backup export remains available. If an older stable import preserved a malformed hint, switching to beta exposes a structured JSON repair editor rather than discarding unknown values or trying to force them into a guided form.

If a saved workspace cannot be opened (for example, it declares an unsupported release or contains an invalid beta declaration), Studio displays the example with a persistent explanation and pauses autosave. Download the untouched original or explicitly choose to save the current workspace instead. Importing a valid workspace or loading a sample also makes an explicit replacement.

The export ZIP contains `manifest.yaml` and `models/*.yaml`. The manifest uses the selected exact `specVersion`, `modelsPath: ./models`, and the sidebar's **Export namespace**. If no namespace is set, it derives `studio.<workspace-name>` from the workspace name. Workspace JSON retains version, namespace, hints, and layout for round trips.

## Pinned source and verification

Source: [v1.3.0-beta.1 adoption guide](https://github.com/headless-company/content-model-master-format/blob/v1.3.0-beta.1/docs/beta-testing.md), commit `a0c7a3d87fe46d74b5e78ac851e8b156201376a4`.

`vendor/cmmf/1.3.0-beta.1/` holds the unmodified tagged schema, normative spec, translation contract, guide, declaration checker, examples, tests, and Apache-2.0 licence. `source.json` records SHA-256 checksums and provenance. Builds use these local files and never fetch a moving branch. `src/beta-validation.ts` is a browser adaptation of the pinned checker's declaration semantics; `src/beta-validation.test.js` ports its declaration fixtures. The original upstream CLI suite is retained unchanged in the vendor directory.

```sh
npm run check:cmmf
npm test
npm run build
node --test vendor/cmmf/1.3.0-beta.1/test/validation-hints.test.mjs
npm run test:browser
```

The browser suite authors all three forms, edits nested conditions and typed operands, checks semantic feedback and downgrade behaviour, reloads workspaces, and validates a real beta ZIP export using the pinned upstream CLI. Do not refresh this snapshot without selecting a new immutable release and reviewing its schema/spec/checker changes together.
