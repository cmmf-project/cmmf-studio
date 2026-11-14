# Organisation and hosting migration

## Dedicated Cloudflare account: 14 November 2026

| Setting | Value |
| --- | --- |
| Cloudflare account | CMMF Project |
| Repository | `cmmf-project/cmmf-studio` |
| Pages project | `cmmf-project-studio` |
| Production branch | `main` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `22.23.3` |
| Production domain | `https://studio.cmmf.dev` |
| Provider domain | `https://cmmf-project-studio.pages.dev` |

The Git-connected build and deployment succeeded for `9a760decf11c2d3ddcc44055ad230e80dde2045b` (deployment `ac293285-6332-455c-9790-6af3aa1f9143`). Four targeted hosted browser tests passed: desktop/mobile New canvas, editing and export, and workspace import/persistence. Public HTTPS returns 200 and Pages reports the custom domain, verification and certificate validation active.

The zone was recreated in the dedicated account with all five DNS records and the www redirect; both TXT values were preserved exactly. Porkbun remains the registrar. Public DNS reports `aspen.ns.cloudflare.com` and `rustam.ns.cloudflare.com`. Zone activation status: **active**. The public Studio hostname is unchanged, preserving its browser-storage origin.

The original account retains `cmmf-studio-recovery` as an independent Direct Upload recovery project. The superseded Git-linked projects were deleted only after the public domain was active on recovery hosting and live HTML matched the static backup exactly. Configuration, deployment metadata and current static artifacts were backed up privately; deleted historical deployment URLs cannot be restored. Keep recovery hosting and the old zone until rollback retention is reviewed separately.

For app-code rollback use the current project's verified deployment history. A hosting rollback also needs custom-domain registration and DNS validation; changing a Git remote does not move hosting.

## Earlier GitHub organisation cutover

The following is historical evidence. Its project-retention statements describe the earlier cutover and are superseded by the dedicated-account record above.


Verified 14 November 2026.

| Setting | Value |
| --- | --- |
| Repository | `cmmf-project/cmmf-studio` |
| Pages project | `cmmf-studio-project` |
| Production branch | `main` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production domain | `https://studio.cmmf.dev` |
| Provider domain | `https://cmmf-studio-project.pages.dev` |

The transferred repository retains its history, branches, tags, open pull requests and collaborator access. Automatic preview and production deployments from GitHub pushes to the new organisation were verified. The application revision checked during the cutover is `5a144e491aa4514572c85b4a5be768922d3162e6`.

Cloudflare reports the production domain, verification and certificate validation all active. HTTPS returns 200. All 41 existing browser tests passed against the new hosted project, followed by four import/export, persistence and New canvas checks against `studio.cmmf.dev` after the domain cutover. The hostname is unchanged, so existing browser storage remains associated with the same origin.

The former `cmmf-studio` Pages project and deployment history remain intact for recovery. Automatic production and preview builds are disabled on that former project, and the custom domain is attached to the replacement project. Production changes belong in `cmmf-studio-project`.

To recover an application release, use the verified deployment history in the current project. A hosting cutover rollback additionally requires moving the custom-domain registration and restoring the DNS CNAME target; restoring a repository remote alone does not move hosting.

Provider-host verification used a public DNS address for the browser process when the local resolver cached NXDOMAIN. TLS validation remained enabled and system DNS was unchanged. Final custom-domain checks used normal resolution.
