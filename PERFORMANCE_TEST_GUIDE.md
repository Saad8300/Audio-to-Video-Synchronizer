# Performance Test Guide for Long Videos

This guide details the procedure for validating the performance and reliability of Audio Image Sync Studio when rendering long videos (up to 20 minutes).

## Prerequisites
1. **Audio File:** A `.mp3` or `.wav` file around 20 minutes in length.
2. **Images ZIP:** A `.zip` file containing 100–300 unique images.
3. **Timeline CSV:** A timeline CSV file containing rows spanning the full 20 minutes.

## Recommended Test Strategy

### Test 1: Fast Preview (The Baseline)
To quickly ensure the timeline is fully functional without waiting for a massive render, use the Fast Preview setting.
- **Resolution:** `720p — Fast`
- **Render Profile:** `Fast Preview`
- **Expected Results:**
  - Fast extraction and clip prep (images are preprocessed once and cached if repeated).
  - Rapid encoding (using `ultrafast` preset and low bitrate).
  - App UI should not lag; timeline report should remain collapsed and load instantly when expanded.

### Test 2: Balanced 1080p (Production Grade)
Once Fast Preview succeeds, test the final production quality.
- **Resolution:** `1080p — Standard`
- **Render Profile:** `Balanced`
- **Expected Results:**
  - Progress modal accurately reflects progress.
  - Slower encoding, but stable. 
  - Backend does not exceed memory limits.

### Test 3: High Resource Warning Check (Optional)
Test the UI warnings without completing the full render.
- **Settings:** `4K — Ultra HD`, `High Quality`, and enable `Slow Zoom In`.
- **Expected Results:** The UI displays a warning recommending Fast Preview and cautioning about slow rendering.

## Monitoring the Process
- Check `backend_server.log` to view detailed step timestamps.
- Ensure the progress modal updates gracefully and shows "Calculating..." if ETA is unavailable.
- Test the "Abort" button to confirm temp files are successfully deleted upon cancellation.

## Acceptable Performance
- **UI Responsiveness:** The browser should not freeze while the backend processes a 300-row CSV.
- **Memory Footprint:** Temp images are cleaned up reliably on job end (success, cancel, or failure).
- **Time Limits:** Fast Preview should complete substantially faster than real-time depending on the host machine. Balanced will be slower but steady.

## Effects & Processing Guide
The app provides **Style Presets** to quickly assign optimized effects:
- **Motion Effects:** (e.g., Ken Burns, Dynamic Shorts) add energy but require preprocessing overhead.
- **Transitions:** (e.g., Crossfade, Blur Crossfade) blend clips. Blur transitions take longer to compute.
- **Visual Style Filters:** (e.g., Cinematic, High Contrast) adjust colors and contrast before rendering. These run quickly but scale with the resolution (4K is much slower to process than 1080p).

> **Recommendation for Long Videos:**
> For long videos, use 720p Fast Preview first. Heavy motion, blur transitions, 4K, and High Quality exports can increase render time.
