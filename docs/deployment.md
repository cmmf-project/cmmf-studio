# Studio hosting

CMMF Studio is a static Cloudflare Pages application, separate from the docs site.

| Setting | Value |
| --- | --- |
| Cloudflare account | CMMF Project |
| Pages project | `cmmf-project-studio` |
| Repository | `cmmf-project/cmmf-studio` |
| Production branch | `main` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Root directory | Repository root |
| Production domain | `studio.cmmf.dev` |
| Provider domain | `cmmf-project-studio.pages.dev` |

Cloudflare's Git integration builds production when `main` changes and preview deployments for other branches. No runtime secrets, server, database or paid bindings are required. Dependencies install from `package-lock.json` during the build. Local checks are `npm ci`, `npm run build`, `npm test`, and `npm run test:browser` against a running local preview.

## Domain setup

Register `studio.cmmf.dev` under the project's **Custom domains** before adding its DNS record. In the `cmmf.dev` Cloudflare DNS zone, use a proxied CNAME named `studio` targeting `cmmf-project-studio.pages.dev`, with automatic TTL. Preserve the docs apex, `www`, mail and other unrelated records.

Cloudflare must report the domain active and issue its HTTPS certificate before launch is complete. Verify the real custom domain, its assets and an import/export round trip; a successful Pages build alone does not establish this.

See [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Storage and recovery

Workspaces remain in each visitor's browser storage. Localhost, preview URLs, `pages.dev` and `studio.cmmf.dev` have separate storage. Before moving between them, use **Export → Save workspace**, then import the downloaded file at the new address with **Keep saved positions**. Hosting does not add cloud saves or accounts.

For a failed release, use the Pages deployment history to roll back to the previous successful production deployment. Then correct the source on a branch, verify it and merge the fix. Avoid deleting/recreating the project or changing DNS to roll back app code.

## Initial publication evidence

On 11 November 2026, the local production build, 145 unit tests and 41 browser tests passed. The first hosted build was requested from `b967729ef94ed40d3855ea4eb475af6319213437`. The Cloudflare build and deployment succeeded (deployment `24ef4de2-e8e1-417b-b20f-26cd9ea3bbc8`). The project is Git-connected, and the user added the subdomain CNAME.

Live verification: `https://studio.cmmf.dev` returned HTTP 200 with certificate verification enabled; HTTP redirected to HTTPS with 301. Linked scripts, styles, logos and icons returned 200 with appropriate content types. All 41 browser tests passed against the custom domain, including import/export, persistence and layouts; the rendered canvas was visually inspected. Public DNS returned Cloudflare addresses, while the local resolver retained a stale negative result. Verification used the public DNS address with curl `--resolve` and Chromium host resolver mapping; neither system DNS nor certificate verification was changed.

Cloudflare's final domain check reported domain, verification and validation all `active`.

The organisation cutover is recorded in [the current hosting record](https://github.com/cmmf-project/cmmf-studio/blob/main/docs/org-migration.md). The original account retains the independent Direct Upload project `cmmf-studio-recovery`; the superseded Git-linked projects were deleted after recovery verification. Their historical deployment URLs are no longer available. The current hosting record also documents the dedicated-account cutover.
