# 🎬 Audio Image Sync Studio

> Create perfectly timed MP4 videos from audio, ordered images, and a timestamp CSV — all locally on your Mac, no internet required.

---

## 🧩 What does this app do?

You give it:
1. 🎵 An **audio file** (MP3, WAV, or M4A)
2. 🖼️ A **ZIP file** of images named `1.jpg`, `2.jpg`, `3.jpg`…
3. 📋 A **timestamp CSV file** that says when each image should appear

It generates a professional **MP4 video** where each image is shown at exactly the right time, synced to your audio.

---

## 💻 Requirements

Before you run this app, make sure you have these installed on your Mac:

| Tool | Why it's needed | How to check |
|------|----------------|--------------|
| **Python 3.9+** | Runs the backend server | `python3 --version` |
| **Node.js 18+ & npm** | Runs the frontend | `node --version` |
| **FFmpeg** | Encodes the video | `ffmpeg -version` |

### Install FFmpeg (required!)

FFmpeg is a free video tool. Install it with [Homebrew](https://brew.sh/):

```bash
# Step 1: Install Homebrew (if you don't have it yet)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Step 2: Install FFmpeg
brew install ffmpeg
```

---

## 🚀 Easiest Way to Run — Double Click!

1. Open the project folder in Finder
2. **Double-click `start_app.command`**
3. If macOS says "cannot be opened because it is from an unidentified developer":
   - Right-click the file → **Open** → click **Open** in the dialog
   - (You only need to do this once)
4. A terminal window opens and the app starts automatically
5. Your browser opens at **http://localhost:5173** ✨

That's it! The script handles everything:
- Creates the Python virtual environment
- Installs Python packages
- Installs npm packages
- Starts the backend and frontend
- Waits until both are ready
- Opens your browser

### To Stop the App

**Double-click `stop_app.command`** — it cleanly stops everything.

---

## 🔧 Manual Run (Advanced)

If you prefer to use the terminal yourself:

### Start the Backend

```bash
cd backend

# Create virtual environment (first time only)
python3 -m venv .venv
source .venv/bin/activate

# Install packages (first time only)
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Start the Frontend

Open a second terminal tab:

```bash
cd frontend

# Install packages (first time only)
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📋 How to Format Your CSV

Your timestamp CSV controls when each image appears. It must have these columns:

| Column  | Required | Description |
|---------|----------|-------------|
| `image` | ✅ Yes | Filename in the ZIP (e.g. `1.jpg`) |
| `start` | ✅ Yes | When the image appears |
| `end`   | ✅ Yes | When the image disappears |
| `text`  | ❌ No  | Optional label (shown in the report) |

### Example CSV

```
image,start,end,text
1.jpg,00:00,00:02,First line here
2.jpg,00:02,00:05,Second line here
3.jpg,00:05,00:08,Third line here
```

### Accepted Time Formats

| Format | Example |
|--------|---------|
| `MM:SS` | `00:02` |
| `MM:SS.mmm` | `00:01.500` |
| `HH:MM:SS` | `00:00:02` |
| `HH:MM:SS.mmm` | `00:00:02.500` |

---

## 🖼️ How to Name Your Images

- Images inside your ZIP must be named exactly as they appear in the CSV
- Recommended naming: `1.jpg`, `2.jpg`, `3.jpg`, etc.
- Supported formats: **JPG, JPEG, PNG, WEBP**
- Images should be at the **root level** of the ZIP, not inside sub-folders
- The CSV `image` column must match the filename exactly (including extension)

**Example ZIP contents:**
```
images.zip
├── 1.jpg
├── 2.jpg
└── 3.jpg
```

---

## 🎛️ Video Settings

| Setting | Options |
|---------|---------|
| **Video Format** | 16:9 YouTube (1920×1080) · 9:16 Shorts/TikTok (1080×1920) · 1:1 Square |
| **Image Fit Mode** | Cover/Crop (fills screen) · Contain/Fit (shows full image with blurred background) |
| **Transition** | None (direct cut) · Fade |
| **Zoom Effect** | None (static) · Slow Zoom In (Ken Burns effect) |

---

## ❗ Troubleshooting

### "Backend offline" shows in the app
→ The FastAPI backend isn't running. Run `start_app.command` or manually start it:
```bash
cd backend && source .venv/bin/activate && uvicorn main:app --host 127.0.0.1 --port 8000
```

### FFmpeg not found
→ Install it: `brew install ffmpeg`
→ If brew itself is missing: https://brew.sh/

### Port already in use
→ Run `stop_app.command` to kill existing processes, then try `start_app.command` again.
→ Or manually: `lsof -iTCP:8000 -sTCP:LISTEN` then `kill <PID>`

### `npm: command not found`
→ Install Node.js from https://nodejs.org/ (choose LTS version)

### `python3: command not found`
→ Install Python from https://www.python.org/downloads/

### pip install fails
→ Make sure you're inside the virtual environment: `source backend/.venv/bin/activate`
→ Check your internet connection

### Zoom effect error (fixed!)
→ This was a bug in MoviePy 1.0.3 where `ImageClip` was used instead of `VideoClip` for
  the Ken Burns effect. It has been fixed. If you still see errors, make sure you have
  the latest version of this project.

### Video has no audio
→ Make sure the audio file is a valid MP3/WAV/M4A (not corrupted or empty)

### ZIP extraction fails
→ Make sure images are at the root of the ZIP, not in a subfolder
→ Re-zip the images by selecting them all in Finder → right-click → Compress

---

## 📁 Project Structure

```
audio-image-sync-studio/
├── start_app.command        ← Double-click to start everything
├── stop_app.command         ← Double-click to stop everything
├── .gitignore
├── README.md
├── GITHUB_PUSH_GUIDE.md
│
├── frontend/                ← React + Vite + TypeScript + Tailwind UI
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── types/
│       └── utils/
│
├── backend/                 ← Python FastAPI server
│   ├── main.py              ← API routes
│   ├── video_generator.py   ← MoviePy video engine
│   ├── utils.py             ← CSV/ZIP/image helpers
│   ├── requirements.txt
│   ├── uploads/             ← Temp upload storage (auto-cleaned)
│   ├── outputs/             ← Generated MP4 files saved here
│   └── temp/                ← Working directory (auto-cleaned)
│
└── logs/                    ← Runtime logs (not pushed to GitHub)
    ├── backend.log
    └── frontend.log
```

---

## 👥 For Friends — Clone & Run

1. Clone the repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/audio-image-sync-studio.git
   cd audio-image-sync-studio
   ```

2. Install FFmpeg:
   ```bash
   brew install ffmpeg
   ```

3. Double-click `start_app.command` — it handles everything else!

> This is a **localhost app**. It runs on your own computer. You cannot share a link to it — your friends need to clone it and run it themselves.

---

## 🏗️ Built With

- [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [MoviePy 1.0.3](https://zulko.github.io/moviepy/)
- [Pillow](https://python-pillow.org/)
- [FFmpeg](https://ffmpeg.org/)
