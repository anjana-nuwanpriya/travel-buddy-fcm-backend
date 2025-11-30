# 🔔 Travel Buddy - Instant FCM Notifications Backend

Node.js backend for sending instant push notifications to Travel Buddy mobile app users.

---

## 📋 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
SUPABASE_URL=https://qgeefajkplektjzroxex.supabase.co
SUPABASE_SERVICE_KEY=your_actual_service_role_key_here
PORT=3000
NODE_ENV=development
```

**Where to find Service Role Key:**
1. Go to: https://supabase.com/dashboard/project/qgeefajkplektjzroxex/settings/api
2. Look for `service_role` key (it's marked as "secret")
3. Click "Reveal" and copy it

### 3. Add Firebase Service Account

Put your `firebase-service-account.json` file in this directory.

**Already downloaded:** `travel-buddy-e0d70-firebase-adminsdk-fbsvc-3f951fc8c0.json`

Rename it to:
```bash
mv travel-buddy-e0d70-firebase-adminsdk-fbsvc-3f951fc8c0.json firebase-service-account.json
```

### 4. Run Locally

```bash
npm start
```

You should see:
```
🚀 Travel Buddy FCM Notifications Backend
📡 Server running on port 3000
✅ Ready to send instant notifications!
```

### 5. Test Health Check

```bash
curl http://localhost:3000/health
```

---

## 🧪 Testing

### Test New Message Webhook

```bash
curl -X POST http://localhost:3000/webhook/new-message \
  -H "Content-Type: application/json" \
  -d '{
    "record": {
      "id": "test-message-id",
      "conversation_id": "your-real-conversation-id",
      "sender_id": "your-real-sender-id",
      "message": "Test notification from backend!"
    }
  }'
```

Replace `your-real-conversation-id` and `your-real-sender-id` with actual IDs from your database.

---

## 🚀 Deployment to Railway

### Option 1: Deploy via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Set environment variables
railway variables set SUPABASE_URL=https://qgeefajkplektjzroxex.supabase.co
railway variables set SUPABASE_SERVICE_KEY=your_service_role_key

# Get your public URL
railway domain
```

### Option 2: Deploy via GitHub

1. Push this code to GitHub
2. Go to https://railway.app
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Add environment variables in Railway dashboard
6. Done!

---

## 📡 Webhook Endpoints

Once deployed, configure these webhooks in Supabase:

### 1. New Message Webhook

**URL:** `https://your-backend.railway.app/webhook/new-message`

**Supabase Setup:**
1. Go to: https://supabase.com/dashboard/project/qgeefajkplektjzroxex/database/hooks
2. Click "Create a new hook" → "HTTP Webhook"
3. Settings:
   - Name: `notify_new_message`
   - Table: `messages`
   - Events: ✅ INSERT
   - HTTP Method: POST
   - URL: Your Railway URL + `/webhook/new-message`

### 2. New Booking Webhook

**URL:** `https://your-backend.railway.app/webhook/new-booking`

**Supabase Setup:**
- Name: `notify_new_booking`
- Table: `bookings`
- Events: ✅ INSERT
- HTTP Method: POST
- URL: Your Railway URL + `/webhook/new-booking`

---

## 🔍 Monitoring

### Check Logs (Railway)

```bash
railway logs
```

### Check Logs (Local)

Logs appear in your terminal when running `npm start`

---

## 📊 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/webhook/new-message` | POST | Message notifications |
| `/webhook/new-booking` | POST | Booking notifications |
| `/process-queue` | POST | Manual queue processing |

---

## 🆘 Troubleshooting

### "Cannot find module 'firebase-admin'"

```bash
npm install
```

### "SUPABASE_SERVICE_KEY is not defined"

Make sure `.env` file exists and has the correct values.

### "Invalid service account"

Make sure `firebase-service-account.json` is in the same directory as `server.js`.

### Notifications not sending

1. Check logs: `railway logs` or local terminal
2. Verify Supabase webhooks are configured
3. Test with `/health` endpoint
4. Check Firebase console for errors

---

## ✅ Checklist

Before deploying to production:

- [ ] `.env` file configured with real credentials
- [ ] `firebase-service-account.json` added
- [ ] Tested locally with `npm start`
- [ ] Deployed to Railway
- [ ] Supabase webhooks configured
- [ ] Sent test message and received notification
- [ ] `.gitignore` prevents committing secrets

---

## 📝 Files

```
nodejs-backend/
├── package.json              # Dependencies
├── server.js                 # Main server code
├── .env.example              # Environment template
├── .env                      # Your actual credentials (not in Git!)
├── .gitignore                # Security
├── firebase-service-account.json  # Firebase credentials (not in Git!)
└── README.md                 # This file
```

---

## 🎉 Success!

Once setup, notifications arrive in **1-2 seconds** after:
- Sending a message
- Making a booking
- Any other trigger you add

Enjoy instant notifications! 🚀
