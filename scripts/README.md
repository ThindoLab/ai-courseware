# scripts/

| 脚本 | 用途 |
|------|------|
| `rerun-create.mjs` | `CREATE_FORCE_LLM=1` 重跑主题并覆盖 `samples/<slug>.html`，同时打版本号入库 |
| `aid-version-seed.mjs` | 把已有备份收成 `samples/versions/<slug>/vN.html` |
| `sample-detect.mjs` / `sample-qa-batch.mjs` | 样例检测与批 QA（`npm run qa-all`） |
| `sample-smoke-http.mjs` | 样例 HTTP 烟测 |
| `teams-run.mjs` / `evolve-run.mjs` | 离线编制脚手架（岗位在 `pi/角色/`） |
| `ima-sync-catalog.mjs` | 同步 ima 知识库目录（`npm run ima:sync`） |
| `ima-sync-hourly.sh` | 安装本机每小时 launchd（`npm run ima:sync:hourly`） |
