# LustrePilot AI Deployment (Railway)

## 1) Push `lustrepilot-ai` (or your chosen repo name) to GitHub
Create a repo (or use existing), then push this folder.

## 2) Create Railway project
1. Go to Railway → **New Project** → **Deploy from GitHub repo**
2. Select your repo
3. If repo has multiple folders, set **Root Directory** = your app folder (e.g. `jewelpilot-ai` or `lustrepilot-ai`)

## 3) Add Environment Variables
In Railway service variables, add:

- `OPENAI_API_KEY` = your real key
- `OPENAI_MODEL_FAST` = `gpt-4o-mini`
- `OPENAI_MODEL_BALANCED` = `gpt-4o-mini`
- `OPENAI_MODEL_QUALITY` = `gpt-4o`
- `PORT` = `4300` (optional; Railway also injects `PORT`)

## 4) Deploy
Railway will build using `Dockerfile` and deploy automatically.

## 5) Verify
Open your Railway public URL and check:
- `/health` returns `{ "ok": true }`
- UI loads
- Generate Amazon works

---

## Notes
- Never commit `.env` with real keys.
- Keep `.env.example` as template only.
- If you see OpenAI errors, verify billing + API key permissions.
