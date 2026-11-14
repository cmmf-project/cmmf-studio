# Organisation and hosting migration

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
