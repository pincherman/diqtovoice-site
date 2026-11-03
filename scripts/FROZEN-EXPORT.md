# Frozen-export publication

Never run npm/build during publication. Keep the reviewed source commit and exported files unchanged.
Create a manifest `{"sourceSha":"<reviewed 40-hex SHA>","files":{"relative/path":"<SHA-256>",...}}` from the review's complete inventory, not from newly rebuilt files. Pin its raw SHA-256 and exact count.

Run `python3 scripts/frozen-export.py EXPORT MANIFEST MANIFEST_SHA256 SOURCE_SHA COUNT` immediately before any send. Any missing/extra/changed file blocks all sends.
Add `--snapshot-repo .` to freeze exactly those verified bytes in a data-only Git commit; the returned `payloadSha` has `site/` and `manifest.json` only. Publish that exact commit on an explicit payload branch (never replace source files). Recheck the reviewed export and the payload manifest immediately before pushing.

After the transport's independent review, install this dispatch-only workflow on the site's default branch. Its source delta must remain limited to publication; no push-triggered build or automatic IndexNow remains. Dispatch once on the exact reviewed transport ref with `payload_sha`, `manifest_sha256`, `source_sha`, `file_count`. Reconcile an uncertain dispatch by reading existing runs, never by blindly replaying it.
The runner verifies the complete manifest before Pages upload. No dependency installation or reconstruction is used. The same procedure applies to subsequent versions with their own reviewed manifest, source and count.

Before changing the live site, retain and authenticate the previous actual Pages artifact as a second frozen payload. After deployment, authenticate the Actions artifact, compare every served export member and the ten canonical public URLs, and verify the approved legal/privacy/robots/sitemap contract. At any mismatch, redeploy that retained previous payload without rebuilding. Notify IndexNow only after public checks pass, using the canonical URLs whose file bytes differ from that previous export, excluding unchanged URLs. Keep actual run, deployment, comparison and notification results in the publication report.
