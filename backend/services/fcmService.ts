import pool from '../config/db.js';

/**
 * Service to transmit push notifications to registered devices using Google Firebase Cloud Messaging (FCM).
 * This manages actual REST API calls to the FCM v1 HTTP Endpoint.
 */
export const sendPushNotification = async (userId: number, title: string, body: string, dataPayload: Record<string, string> = {}): Promise<boolean> => {
  try {
    // 1. Fetch user device FCM token from DB
    const res = await pool.query('SELECT fcm_token FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0 || !res.rows[0].fcm_token) {
      console.log(`[Push Notification Skipped]: No device FCM Token saved for User ID ${userId}`);
      return false;
    }

    const deviceToken = res.rows[0].fcm_token;
    const fcmServerKey = process.env.FCM_SERVER_KEY; // Legacy or service account credential check

    if (!fcmServerKey) {
      console.warn(`[Push Notification Fallback]: FCM_SERVER_KEY is undefined. Push trace skipped. details: Title="${title}" Body="${body}"`);
      return false;
    }

    // 2. Perform actual fetch request to the FCM endpoint
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`
      },
      body: JSON.stringify({
        to: deviceToken,
        notification: {
          title,
          body,
          sound: 'default'
        },
        data: dataPayload
      })
    });

    if (response.ok) {
      console.log(`Push notification sent successfully to User ID ${userId}`);
      return true;
    } else {
      const errText = await response.text();
      console.error(`FCM gateway returned error code ${response.status}: ${errText}`);
      return false;
    }
  } catch (err) {
    console.error('Failed pushing Firebase Cloud Message notification packet:', err);
    return false;
  }
};
