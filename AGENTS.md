<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Fluxo de Deploy e CI/CD (Cloudflare)
- O projeto está conectado diretamente à Cloudflare via repositório GitHub (`main`).
- **NUNCA executar deploy manual (`npm run deploy` / `wrangler deploy`).**
- Todo deploy deve ocorrer **exclusivamente via Git**: basta realizar `git push origin main`.
- A Cloudflare detecta o commit automaticamente, executa a compilação em ambiente isolado e publica a nova versão com rastreabilidade total (autor, hash e mensagem do commit).

