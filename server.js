// ===============================================
// Load environment variables FIRST
// ===============================================
require('dotenv').config();

// Validate env
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing!");
  console.error("➡️  Fix: Add SUPABASE_SERVICE_ROLE_KEY to your .env file");
  process.exit(1);
}
if (!process.env.SUPABASE_URL) {
  console.error("❌ ERROR: SUPABASE_URL is missing!");
  process.exit(1);
}

console.log("🔑 Environment loaded:");
console.log("   SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING");
console.log("   SUPABASE_URL:", process.env.SUPABASE_URL);

// ===============================================
// Imports
// ===============================================
const admin = require('firebase-admin');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

// ===============================================
// Configuration
// ===============================================
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ===============================================
// Firebase Configuration
// ===============================================
const serviceAccount = require('./firebase-service-account.json');

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
// QUEUE PROCESSOR (with improved logging)
// ===============================================
async function processNotificationQueue() {
  console.log("⏳ Polling queue...");

  try {
    const { data: pending, error } = await supabase
      .from('fcm_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    // Log raw error if exists
    if (error) {
      console.error("🔥 Supabase Query Error:", error);
      return;
    }

    console.log("📦 Query result:", pending);

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

        // Update status
        const { error: updateError } = await supabase
          .from('fcm_notification_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', n.id);

        if (updateError) {
          console.error("❌ DB update error:", updateError);
        } else {
          console.log("   ✅ Sent and updated");
        }

      } catch (err) {
        console.error(`   ❌ Send failed: ${err.message}`);

        await supabase
          .from('fcm_notification_queue')
          .update({
            status: 'failed',
            attempts: n.attempts + 1,
            error_message: err.message
          })
          .eq('id', n.id);
      }
    }

  } catch (error) {
    console.error("❌ Queue processing error:", error.message);
  }
}

// Manual trigger (POST)
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
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 Travel Buddy FCM Notifications Backend');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Manual trigger: POST http://localhost:${PORT}/process-queue`);
  console.log('');
  console.log('🔄 Starting notification queue polling (every 2s)...');
  console.log('='.repeat(60));
  console.log('');

  // Start polling
  setInterval(processNotificationQueue, 2000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log("👋 Shutting down gracefully...");
  process.exit(0);
});
