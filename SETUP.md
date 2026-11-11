# Developer Setup (macOS / Linux / Windows)

## 1. Prerequisites
- Node.js LTS (20+) and git. On macOS: `brew install node git`

## 2. Get the code
```bash
git clone https://github.com/NayefNemernn/Nexora-BCS-Offline.git
cd Nexora-BCS-Offline
```

## 3. Install
```bash
npm install            # root: Electron + builder
npm run install:all    # backend deps + frontend build (also fetches the offline voice model)
```
MongoDB needs no setup in dev — `mongodb-memory-server` downloads the right
`mongod` for your OS on first run.

## 4. Run
```bash
npm run electron:dev   # desktop app
npm run dev:browser    # browser dev server (uses the real store data)
```

## 5. Test
```bash
cd backend && npm test
```

## Files NOT in git — copy them by hand
| Path | What | Needed for |
|------|------|------------|
| `tools/keys/private.pem`, `tools/keys/public.pem` | License signing keys | Generating licenses. **Never commit.** Copy via USB / password manager. |
| `build-resources/mongodb-binary/<os>/` | Bundled `mongod` | Packaging installers only |
| `backend/.env` | Env vars (optional) | Cloud/AI features only |

## Packaging
Only Windows (`npm run package:win`) and Linux (`npm run package:linux`) targets are
configured. Build the Windows installer on a Windows machine (it bundles
`build-resources/mongodb-binary/win/mongod.exe`).
