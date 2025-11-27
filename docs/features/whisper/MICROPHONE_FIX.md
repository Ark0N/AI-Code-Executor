# Microphone Access Fix

## Problem
```
Error: Cannot read properties of undefined (reading 'getUserMedia')
```

This means `navigator.mediaDevices` is not available, which happens when:
1. Accessing via HTTP (not HTTPS) on non-localhost
2. Browser doesn't support getUserMedia
3. Insecure context

## Solution Options

### Option 1: Use localhost (Easiest)

Instead of accessing via IP address, use:
```
http://localhost:8000
```

Browsers allow microphone access on localhost even without HTTPS.

### Option 2: Enable HTTPS (Best for remote access)

```bash
cd /home/arkon/claude-coder

# 1. Generate self-signed certificate
./generate_ssl.sh

# 2. Stop current server
./stop.sh

# 3. Start with HTTPS
./start_https.sh
```

Then access via:
```
https://localhost:8000
or
https://192.168.x.x:8000
```

**Note:** Browser will show security warning. Click "Advanced" → "Proceed to localhost (unsafe)"

### Option 3: Update start.sh to use HTTPS by default

Edit `start.sh` and change the last line to:
```bash
python -m uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --ssl-keyfile=certs/key.pem \
    --ssl-certfile=certs/cert.pem \
    --reload
```

## Quick Test

After fixing, test in browser console (F12):
```javascript
console.log('navigator.mediaDevices:', navigator.mediaDevices);
console.log('Is secure context:', window.isSecureContext);

navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Microphone access granted!');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('❌ Error:', err));
```

## Browser Requirements

**Secure contexts required for:**
- Chrome/Edge: Yes (except localhost)
- Firefox: Yes (except localhost)
- Safari: Yes (no exception)

**Check if secure:**
```javascript
console.log('Secure:', window.isSecureContext);
console.log('Protocol:', window.location.protocol);
// Should show: Secure: true, Protocol: "https:"
```

## Current Access Methods

| URL | Microphone Works? |
|-----|-------------------|
| `http://localhost:8000` | ✅ Yes |
| `http://127.0.0.1:8000` | ✅ Yes |
| `http://192.168.x.x:8000` | ❌ No (needs HTTPS) |
| `https://localhost:8000` | ✅ Yes (after accepting cert) |
| `https://192.168.x.x:8000` | ✅ Yes (after accepting cert) |

## After Setup

1. Access via HTTPS
2. Click 🎤 microphone button
3. Browser prompts: "Allow microphone access?"
4. Click "Allow"
5. Speak and test!
