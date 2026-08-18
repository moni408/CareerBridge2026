import emailjs from '@emailjs/browser';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// EmailJS keys - loaded from environment variables or configured default fallback
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_g9twfec';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_l4fjhg1';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'yiUQrPN9ZiXdhz3bl';

export const APP_BRAND_NAME = 'CareerBridge';
export const APP_LOGO_URL = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; // Professional CareerBridge icon

export interface EmailParams {
  to_name: string;
  to_email: string;
  from_name: string;
  session_type: string;
  topic: string;
  date_time: string;
  meeting_link?: string;
  message: string;
}

/**
 * Formats body text to include CareerBridge logo badge, site header, and official footer
 */
function formatBrandedEmailMessage(bodyText: string, actionUrl?: string): string {
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://careerbridge.app';
  const targetUrl = actionUrl || siteOrigin;

  return `💼 ${APP_BRAND_NAME} Platform Notification\n` +
    `----------------------------------------\n\n` +
    `${bodyText}\n\n` +
    `----------------------------------------\n` +
    `🌐 Website: ${APP_BRAND_NAME} (${targetUrl})\n` +
    `🏷️ Powered by ${APP_BRAND_NAME} Industry-Academia Career Network\n` +
    `📌 Logo: ${APP_LOGO_URL}`;
}

/**
 * Sends email alert via EmailJS with in-app notification backup
 */
export async function sendEmailAlert(params: {
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  senderName: string;
  subject: string;
  sessionType: string;
  topic: string;
  dateTime: string;
  meetingLink?: string;
  body: string;
}) {
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://careerbridge.app';
  const brandedMessage = formatBrandedEmailMessage(params.body, params.meetingLink);

  let targetEmail = params.recipientEmail?.trim();

  // 1. If recipientEmail is missing or empty, fetch from Firestore
  if (!targetEmail && params.recipientId) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      
      const userSnap = await getDoc(doc(db, 'users', params.recipientId));
      if (userSnap.exists()) {
        const u = userSnap.data();
        targetEmail = (u.email || u.studentEmail || u.userEmail || u.menteeEmail || u.mentorEmail || '').trim();
      }

      if (!targetEmail) {
        const studentSnap = await getDoc(doc(db, 'students', params.recipientId));
        if (studentSnap.exists()) {
          targetEmail = (studentSnap.data().email || '').trim();
        }
      }

      if (!targetEmail) {
        const mentorSnap = await getDoc(doc(db, 'mentors', params.recipientId));
        if (mentorSnap.exists()) {
          targetEmail = (mentorSnap.data().email || '').trim();
        }
      }
    } catch (err) {
      console.warn('Error resolving recipient email in sendEmailAlert:', err);
    }
  }

  // 2. Dispatch Firestore in-app notification (guaranteed delivery)
  try {
    await addDoc(collection(db, 'notifications'), {
      recipientId: params.recipientId,
      type: 'learning_session_alert',
      title: `[${APP_BRAND_NAME}] ${params.subject}`,
      body: params.body,
      sessionType: params.sessionType,
      dateTime: params.dateTime,
      meetingLink: params.meetingLink || '',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('In-app notification backup failed:', err);
  }

  // 3. Dispatch EmailJS email if targetEmail exists
  if (targetEmail) {
    try {
      const templateParams = {
        to_name: params.recipientName,
        to_email: targetEmail,
        from_name: `${params.senderName} via ${APP_BRAND_NAME}`,
        subject: `[${APP_BRAND_NAME}] ${params.subject}`,
        session_type: params.sessionType,
        topic: params.topic,
        date_time: params.dateTime,
        meeting_link: params.meetingLink || 'N/A',
        message: brandedMessage,
        site_name: APP_BRAND_NAME,
        app_name: APP_BRAND_NAME,
        site_logo: APP_LOGO_URL,
        logo_url: APP_LOGO_URL,
        site_url: siteOrigin,
        action_url: params.meetingLink || siteOrigin
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
      console.log('EmailJS alert dispatched successfully to', targetEmail);
    } catch (emailErr) {
      console.warn('EmailJS delivery fallback (using in-app system alert):', emailErr);
    }
  } else {
    console.warn('No target email found for recipientId:', params.recipientId);
  }
}

/**
 * Schedules pre-event reminder alert (triggered 2nd time before start time/deadline)
 */
export async function schedulePreEventAlert(params: {
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  senderName: string;
  sessionType: string;
  topic: string;
  dateTime: string;
  meetingLink?: string;
}) {
  const alertBody = `⏰ Upcoming Reminder: Your ${params.sessionType} on "${params.topic}" is scheduled for ${params.dateTime}. Please be ready!`;

  try {
    await addDoc(collection(db, 'notifications'), {
      recipientId: params.recipientId,
      type: 'upcoming_reminder_alert',
      title: `⏰ [${APP_BRAND_NAME}] Reminder: ${params.sessionType} Starting Soon`,
      body: alertBody,
      sessionType: params.sessionType,
      dateTime: params.dateTime,
      meetingLink: params.meetingLink || '',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to post pre-event alert:', err);
  }
}

/**
 * Sends a 2-step security verification message to student email via EmailJS
 */
export async function sendStudentVerificationEmail(params: {
  studentName: string;
  studentEmail: string;
  verificationCode: string;
  verificationLink: string;
}): Promise<{ success: boolean; message: string }> {
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://careerbridge.app';
  
  const templateParams = {
    to_name: params.studentName,
    to_email: params.studentEmail,
    from_name: `${APP_BRAND_NAME} Security Team`,
    subject: `[${APP_BRAND_NAME}] 2-Step Security Verification: Verify it is you`,
    verification_code: params.verificationCode,
    verification_link: params.verificationLink,
    message: formatBrandedEmailMessage(
      `Hello ${params.studentName},\n\nA registration attempt was made with your email address (${params.studentEmail}).\n\nVerify it is you to complete student registration on ${APP_BRAND_NAME}:\nSecurity Code: ${params.verificationCode}\nDirect Verification Link: ${params.verificationLink}`,
      params.verificationLink
    ),
    site_name: APP_BRAND_NAME,
    app_name: APP_BRAND_NAME,
    site_logo: APP_LOGO_URL,
    logo_url: APP_LOGO_URL,
    site_url: siteOrigin
  };

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    console.log('2-Step Security verification email dispatched via EmailJS to', params.studentEmail);
    return { success: true, message: 'Verification email sent via EmailJS.' };
  } catch (emailErr) {
    console.error('EmailJS delivery failed for verification email:', emailErr);
    return { success: false, message: `Email delivery failed: ${emailErr instanceof Error ? emailErr.message : 'Check EmailJS configuration'}` };
  }
}

export interface CrossRoleEmailParams {
  senderId?: string;
  senderName: string;
  senderRole: 'student' | 'mentor' | 'industry' | 'university' | string;
  senderEmail?: string;
  recipientId: string;
  recipientName: string;
  recipientRole: 'student' | 'mentor' | 'industry' | 'university' | string;
  recipientEmail?: string;
  subject: string;
  category: 'message' | 'mentorship' | 'application' | 'university' | 'collaboration' | 'endorsement' | 'session' | string;
  message: string;
  actionUrl?: string;
}

/**
 * Dispatches an email notification via EmailJS (with Firestore in-app backup & email audit log)
 * for all send-receive interactions between Student, Industry, University, and Mentor.
 */
export async function sendCrossRoleEmailNotification(params: CrossRoleEmailParams) {
  const {
    senderName,
    senderRole,
    senderEmail,
    recipientId,
    recipientName,
    recipientRole,
    subject,
    category,
    message,
    actionUrl
  } = params;

  let targetEmail = params.recipientEmail;
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://careerbridge.app';
  const targetActionUrl = actionUrl || siteOrigin;

  // 1. Fetch recipient email from Firestore if missing
  if (!targetEmail && recipientId) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const userDoc = await getDoc(doc(db, 'users', recipientId));
      if (userDoc.exists()) {
        targetEmail = userDoc.data().email;
      }
    } catch (e) {
      console.warn('Could not retrieve recipient email from Firestore:', e);
    }
  }

  // 2. Dispatch Firestore in-app notification
  try {
    await addDoc(collection(db, 'notifications'), {
      recipientId,
      senderName,
      senderRole,
      type: `email_notify_${category}`,
      title: subject,
      body: message,
      actionUrl: targetActionUrl,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('In-app notification backup failed:', err);
  }

  // 3. Log into sent_emails audit collection
  try {
    await addDoc(collection(db, 'sent_emails'), {
      recipientId,
      recipientName,
      recipientEmail: targetEmail || 'N/A',
      recipientRole,
      senderName,
      senderRole,
      senderEmail: senderEmail || 'N/A',
      subject: `[${APP_BRAND_NAME}] ${subject}`,
      category,
      message,
      siteName: APP_BRAND_NAME,
      sentAt: new Date().toISOString(),
      status: 'dispatched'
    });
  } catch (err) {
    console.warn('Audit email log error:', err);
  }

  // 4. Send via EmailJS if recipient email exists
  if (targetEmail) {
    try {
      const brandedMessage = formatBrandedEmailMessage(message, targetActionUrl);

      const templateParams = {
        to_name: recipientName,
        to_email: targetEmail,
        from_name: `${senderName} (${senderRole.toUpperCase()}) via ${APP_BRAND_NAME}`,
        from_role: senderRole,
        to_role: recipientRole,
        subject: `[${APP_BRAND_NAME}] ${subject}`,
        category: category,
        message: brandedMessage,
        site_name: APP_BRAND_NAME,
        app_name: APP_BRAND_NAME,
        site_logo: APP_LOGO_URL,
        logo_url: APP_LOGO_URL,
        site_url: siteOrigin,
        action_url: targetActionUrl
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
      console.log(`[EmailJS] Cross-role email notification dispatched to ${targetEmail} (${recipientRole}) from ${senderName} (${senderRole})`);
    } catch (emailErr) {
      console.warn('[EmailJS] Delivery fallback (in-app system notification logged):', emailErr);
    }
  } else {
    console.warn(`[EmailJS] Skipping cross-role email dispatch: No email found for recipientId '${recipientId}' (${recipientName})`);
  }
}


