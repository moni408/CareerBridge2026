import emailjs from '@emailjs/browser';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// EmailJS keys - loaded from environment variables, localStorage, or configured default fallback
export function getEmailJsConfig() {
  const localServiceId = typeof window !== 'undefined' ? localStorage.getItem('careerbridge_emailjs_service_id') : null;
  const localTemplateId = typeof window !== 'undefined' ? localStorage.getItem('careerbridge_emailjs_template_id') : null;
  const localPublicKey = typeof window !== 'undefined' ? localStorage.getItem('careerbridge_emailjs_public_key') : null;

  const serviceId = (localServiceId || import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_9w5waba').trim();
  const templateId = (localTemplateId || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_8rzmow8').trim();
  const publicKey = (localPublicKey || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'yiUQrPN9ZiXdhz3bl').trim();

  return { serviceId, templateId, publicKey };
}

export function saveEmailJsConfig(serviceId: string, templateId?: string, publicKey?: string) {
  if (typeof window !== 'undefined') {
    if (serviceId) localStorage.setItem('careerbridge_emailjs_service_id', serviceId.trim());
    if (templateId) localStorage.setItem('careerbridge_emailjs_template_id', templateId.trim());
    if (publicKey) localStorage.setItem('careerbridge_emailjs_public_key', publicKey.trim());
    try {
      emailjs.init(publicKey || getEmailJsConfig().publicKey);
    } catch (_) {}
  }
}

export function resetEmailJsConfigToDefault() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('careerbridge_emailjs_service_id');
    localStorage.removeItem('careerbridge_emailjs_template_id');
    localStorage.removeItem('careerbridge_emailjs_public_key');
    try {
      emailjs.init('yiUQrPN9ZiXdhz3bl');
    } catch (_) {}
  }
}

// Initialize EmailJS with Public Key
try {
  const config = getEmailJsConfig();
  if (config.publicKey) {
    emailjs.init(config.publicKey);
  }
} catch (initErr) {
  console.warn('EmailJS initialization warning:', initErr);
}

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

      const { serviceId, templateId, publicKey } = getEmailJsConfig();
      await emailjs.send(
        serviceId,
        templateId,
        templateParams,
        publicKey
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
    // Recipient aliases
    to_name: params.studentName,
    user_name: params.studentName,
    name: params.studentName,
    to_email: params.studentEmail,
    user_email: params.studentEmail,
    email: params.studentEmail,
    recipient_email: params.studentEmail,
    reply_to: params.studentEmail,

    // Sender details
    from_name: `${APP_BRAND_NAME} Security Team`,
    subject: `[${APP_BRAND_NAME}] 2-Step Security Verification: Verify it is you`,
    title: `2-Step Security Verification`,

    // Content variables
    verification_code: params.verificationCode,
    code: params.verificationCode,
    otp: params.verificationCode,
    verification_link: params.verificationLink,
    link: params.verificationLink,
    message: formatBrandedEmailMessage(
      `Hello ${params.studentName},\n\nA registration attempt was made with your email address (${params.studentEmail}).\n\nVerify it is you to complete student registration on ${APP_BRAND_NAME}:\nSecurity Code: ${params.verificationCode}\nDirect Verification Link: ${params.verificationLink}`,
      params.verificationLink
    ),
    body: `Your ${APP_BRAND_NAME} 6-digit verification code is: ${params.verificationCode}`,

    // Branding and metadata
    site_name: APP_BRAND_NAME,
    app_name: APP_BRAND_NAME,
    site_logo: APP_LOGO_URL,
    logo_url: APP_LOGO_URL,
    site_url: siteOrigin
  };

  try {
    const { serviceId, templateId, publicKey } = getEmailJsConfig();
    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      publicKey
    );
    console.log('2-Step Security verification email dispatched via EmailJS to', params.studentEmail, response);
    return { success: true, message: 'Verification email sent via EmailJS.' };
  } catch (emailErr: any) {
    console.error('EmailJS delivery failed for verification email:', emailErr);
    const detail = emailErr?.text || emailErr?.message || (typeof emailErr === 'string' ? emailErr : JSON.stringify(emailErr));
    const status = emailErr?.status ? `[Status ${emailErr.status}] ` : '';
    return { success: false, message: `${status}${detail}` };
  }
}

/**
 * Sends a corporate / work email verification code via EmailJS for Mentor auto-verification
 */
export async function sendCorporateVerificationEmail(params: {
  mentorName: string;
  companyName: string;
  corporateEmail: string;
  verificationCode: string;
  verificationLink?: string;
}): Promise<{ success: boolean; message: string }> {
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://careerbridge.app';
  const directLink = params.verificationLink || `${siteOrigin}?verify_code=${params.verificationCode}&corporate_email=${encodeURIComponent(params.corporateEmail)}`;

  const templateParams = {
    // Recipient fields
    to_name: params.mentorName,
    user_name: params.mentorName,
    name: params.mentorName,
    to_email: params.corporateEmail,
    user_email: params.corporateEmail,
    email: params.corporateEmail,
    recipient_email: params.corporateEmail,
    reply_to: params.corporateEmail,

    // Subject and sender
    from_name: `${APP_BRAND_NAME} Mentor Verification`,
    subject: `[${APP_BRAND_NAME}] Corporate Email Verification: Verify your standing at ${params.companyName || 'your organization'}`,
    title: `Corporate Email Verification`,

    // Content
    company_name: params.companyName || 'Organization',
    verification_code: params.verificationCode,
    code: params.verificationCode,
    otp: params.verificationCode,
    verification_link: directLink,
    link: directLink,
    message: formatBrandedEmailMessage(
      `Hello ${params.mentorName},\n\nPlease confirm your corporate email address (${params.corporateEmail}) to instantly authenticate your Mentor credentials for ${params.companyName || 'your organization'}.\n\nYour 6-digit corporate verification code is: ${params.verificationCode}\n\nVerifying this code completes your authentication immediately with direct workspace access (no admin wait required).`,
      directLink
    ),
    body: `Your 6-digit corporate verification code is: ${params.verificationCode}`,

    // Platform metadata
    site_name: APP_BRAND_NAME,
    app_name: APP_BRAND_NAME,
    site_logo: APP_LOGO_URL,
    logo_url: APP_LOGO_URL,
    site_url: siteOrigin
  };

  try {
    const { serviceId, templateId, publicKey } = getEmailJsConfig();
    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      publicKey
    );
    console.log('Corporate verification email dispatched via EmailJS to', params.corporateEmail, response);
    return { success: true, message: 'Corporate verification email dispatched.' };
  } catch (emailErr: any) {
    console.error('EmailJS delivery failed for corporate verification email:', emailErr);
    const detail = emailErr?.text || emailErr?.message || (typeof emailErr === 'string' ? emailErr : JSON.stringify(emailErr));
    const status = emailErr?.status ? `[Status ${emailErr.status}] ` : '';
    return { success: false, message: `${status}${detail}` };
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

      const { serviceId, templateId, publicKey } = getEmailJsConfig();
      await emailjs.send(
        serviceId,
        templateId,
        templateParams,
        publicKey
      );
      console.log(`[EmailJS] Cross-role email notification dispatched to ${targetEmail} (${recipientRole}) from ${senderName} (${senderRole})`);
    } catch (emailErr) {
      console.warn('[EmailJS] Delivery fallback (in-app system notification logged):', emailErr);
    }
  } else {
    console.warn(`[EmailJS] Skipping cross-role email dispatch: No email found for recipientId '${recipientId}' (${recipientName})`);
  }
}


