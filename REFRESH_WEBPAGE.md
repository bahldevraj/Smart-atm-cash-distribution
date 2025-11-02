# How to See Updated ATMs and Vaults on the Webpage

## Current Status:
✅ **Database has:**
- 6 ATMs (Mall Plaza, University, Airport, Hospital, Railway, DownTown)
- 2 Vaults (Central Vault A, Central Vault B)

✅ **Backend API is working correctly** - returns all 6 ATMs and 2 Vaults

✅ **Frontend code is correct** - dynamically loads ATMs and Vaults from API

## Issue:
The webpage may be showing cached data (only 4 ATMs) from before we added ATMs 5 and 6.

## Solution - Refresh the Browser:

### Option 1: Hard Refresh (Recommended)
1. Open the webpage at `http://localhost:3000`
2. Press **Ctrl + Shift + R** (or **Ctrl + F5** on Windows)
3. This clears the cache and forces a fresh load

### Option 2: Clear Cache and Reload
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Option 3: Close and Reopen
1. Close all browser tabs with `localhost:3000`
2. Clear browser cache (Ctrl + Shift + Delete)
3. Open `http://localhost:3000` again

## What You Should See After Refresh:

### Dashboard Tab:
- **ATMs Section:** 6 ATMs displayed in a table
  - ATM Mall Plaza - Shopping Mall
  - ATM University - University Campus
  - ATM Airport - International Airport
  - ATM Hospital - General Hospital
  - ATM Railway - Railway Junction ⭐ NEW
  - ATM DownTown - DownTown City ⭐ NEW

### ML Forecast Tab:
- **ATM Dropdown:** All 6 ATMs available for selection
- Each ATM can generate forecasts

### Optimization Tab:
- All 6 ATMs included in optimization calculations
- 2 Vaults displayed

## Verify API is Working:
You can test the API directly in a new terminal:

```bash
# Test ATMs endpoint
python -c "import requests; atms = requests.get('http://localhost:5000/api/atms').json(); print(f'ATMs: {len(atms)}'); [print(f'{a[\"id\"]}. {a[\"name\"]}') for a in atms]"

# Test Vaults endpoint  
python -c "import requests; vaults = requests.get('http://localhost:5000/api/vaults').json(); print(f'Vaults: {len(vaults)}'); [print(f'{v[\"id\"]}. {v[\"name\"]}') for v in vaults]"
```

Expected output:
- ATMs: 6
- Vaults: 2

## If Still Not Working:

1. **Check both servers are running:**
   - Backend: `http://localhost:5000` (Flask)
   - Frontend: `http://localhost:3000` (React)

2. **Restart React Dev Server:**
   - Stop the frontend server (Ctrl+C in the terminal)
   - Run: `npm start` in the frontend directory
   - Wait for it to compile and open browser

3. **Check browser console:**
   - Open DevTools (F12)
   - Check Console tab for any API errors
   - Check Network tab to see if API calls are succeeding

---

**Note:** The frontend code is already correct and will automatically show all 6 ATMs once the browser cache is cleared!
