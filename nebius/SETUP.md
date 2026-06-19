# Person C setup — complete beginner guide

## What you're doing (one sentence)

You log into Nebius, copy an API key, paste it into a file, run a Python script, and it analyzes accident photos.

---

## Part 1: Get your API key (5 minutes)

### 1. Open the website

Go to: **https://tokenfactory.nebius.com**

(This is Nebius Token Factory — the hackathon sponsor giving you $100 LLM credits.)

### 2. Create an account

- Click **Sign up** or **Get started**
- Log in with **Google** or **GitHub** (easiest)

### 3. Find API keys

In the dashboard, look for one of these in the left menu or top nav:

- **API keys**
- **Settings → API keys**

Direct docs: https://docs.tokenfactory.nebius.com/api-reference/introduction

### 4. Create a key

1. Click **Create API key**
2. Name it anything (e.g. `evidenceline-hackathon`)
3. Click **Create**
4. **COPY THE KEY IMMEDIATELY** — you cannot see it again after you close the popup

The key looks something like: `eyJ...` or a long random string. That's normal.

### 5. Hackathon credits

If the event gave you a promo / credits link, redeem it in the Nebius dashboard (Billing or Credits). Without credits, API calls may fail with "insufficient balance."

Ask Aditya or check the hackathon Slack if you're not sure where the $100 Nebius credits are.

---

## Part 2: Put the key in your project (2 minutes)

### 1. Open the folder in terminal

```powershell
cd d:\Hackathons\multimodal\nebius
```

### 2. Create your `.env` file

```powershell
copy .env.example .env
```

### 3. Edit `.env`

Open `d:\Hackathons\multimodal\nebius\.env` in Cursor.

Replace `your_key_here` with your real key. **No quotes needed:**

```
NEBIUS_API_KEY=paste_your_actual_key_here
```

Save the file.

**Never commit `.env` to GitHub** — it contains your secret key.

---

## Part 3: Is the URL right?

**Yes.** Our code uses the official Nebius URL:

```
https://api.tokenfactory.nebius.com/v1/
```

This is from [Nebius official docs](https://docs.tokenfactory.nebius.com/quickstart). You don't need to change it.

---

## Part 4: Test step by step

### Test A — Key works (text only, easiest)

```powershell
cd d:\Hackathons\multimodal\nebius
python verify_key.py
```

**Good output:** `SUCCESS! Nebius answered: -> OK`

**Bad output:** Read the error message — usually wrong key or no credits.

### Test B — Vision works (photo analysis)

```powershell
python test_smoke.py
```

**Good output:** JSON with `hazard_evidence`, `severity`, etc.

### Test C — Your own photo

```powershell
python analyze_incident.py --image-path "C:\Users\kenil\Pictures\your_photo.jpg"
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `No API key found` | Create `.env` and paste key |
| `401` / `Unauthorized` | Key wrong or expired — create new key |
| `402` / `insufficient` | Add credits in Nebius dashboard |
| `Model not found` | Tell Kenil — we'll switch model name |
| JSON parse error | Run again; we can tighten prompt |

---

## What to tell Shresth when tests pass

> "Nebius works. Contract is in `nebius/contract.json`. Model: `Qwen/Qwen2-VL-72B-Instruct`. Base URL: `https://api.tokenfactory.nebius.com/v1/`. Send me photo URL + transcript fields and I'll confirm output."
