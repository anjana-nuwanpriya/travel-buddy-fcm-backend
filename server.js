// ===============================================
// Load environment variables FIRST
// ===============================================
require('dotenv').config();

// Validate required env variables
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing!");
  process.exit(1);
}
if (!process.env.SUPABASE_URL) {
  console.error("❌ ERROR: SUPABASE_URL is missing!");
  process.exit(1);
}
if (!process.env.FIREBASE_PROJECT_ID) {
  console.error("❌ ERROR: FIREBASE_PROJECT_ID is missing!");
}
console.log("🔑 Environment loaded");

// ===============================================
// Imports
// ===============================================
const admin = require('firebase-admin');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

// ===============================================
// App configuration
// ===============================================
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ===============================================
// Firebase Configuration
// ===============================================
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

console.log('✅ Firebase Admin SDK initialized');
console.log(`   Project: ${serviceAccount.project_id}`);

// ===============================================
// Supabase Client Initialization
// ===============================================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('✅ Supabase client initialized');
console.log(`   URL: ${SUPABASE_URL}`);

// ===============================================
// Express App Setup
// ===============================================
const app = express();
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Travel Buddy FCM Notifications'
  });
});

// ===============================================
// QUEUE PROCESSOR
// ===============================================
async function processNotificationQueue() {
  console.log("⏳ Polling queue...");

  const { data: pending, error } = await supabase
    .from('fcm_notification_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error("🔥 Supabase Query Error:", error.message);
    return;
  }

  if (!pending || pending.length === 0) {
    console.log("📭 No pending notifications");
    return;
  }

  console.log(`📬 Processing ${pending.length} notifications...`);

  for (const n of pending) {
    try {
      console.log(`📤 Sending: ${n.title}`);

      await admin.messaging().send({
        token: n.fcm_token,
        notification: {
          title: n.title,
          body: n.body,
        },
        data: n.data || {},
        android: {
          priority: 'high',
          notification: {
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            sound: 'default',
            channelId:
              n.type === 'chat'
                ? 'travel_buddy_chat'
                : 'travel_buddy_rides',
          },
        },
      });

      // Mark as sent
      await supabase
        .from('fcm_notification_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', n.id);

      console.log("   ✅ Sent & updated");

    } catch (err) {
      console.error(`   ❌ Send failed: ${err.message}`);

      await supabase
        .from('fcm_notification_queue')
        .update({
          status: 'failed',
          attempts: (n.attempts || 0) + 1,
          error_message: err.message
        })
        .eq('id', n.id);
    }
  }
}

// Manual trigger
app.post('/process-queue', async (req, res) => {
  try {
    await processNotificationQueue();
    res.json({ success: true, message: "Queue processed" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===============================================
// START SERVER
// ===============================================
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Travel Buddy FCM Notifications Backend');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Manual trigger: POST http://localhost:${PORT}/process-queue`);
  console.log('');
  console.log('🔄 Polling queue every 2 seconds...');
  console.log('='.repeat(60));
  console.log('');

  setInterval(processNotificationQueue, 2000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log("👋 Shutting down gracefully...");
  process.exit(0);
});
