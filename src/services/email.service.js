const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

/**
 * Create reusable transporter (SMTP or Ethereal for dev)
 */
const createTransporter = () => {
  if (process.env.NODE_ENV === "production") {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development: log emails to console (or use Ethereal)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Core send function
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Auth System"}" <${
      process.env.EMAIL_FROM || "noreply@example.com"
    }>`,
    to,
    subject,
    text,
    html,
  });

  logger.info(`Email sent to ${to}: ${info.messageId}`);
  return info;
};

// ─── Email Templates ──────────────────────────────────────────────────────────

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset Your Password (valid 10 minutes)",
    text: `Hi ${user.name},\n\nTo reset your password, visit:\n${resetURL}\n\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>You requested to reset your password. Click the button below:</p>
        <a href="${resetURL}" 
           style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">
          Reset Password
        </a>
        <p>This link expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr/>
        <small style="color:#999;">For security, never share this link with anyone.</small>
      </div>
    `,
  });
};

const sendEmailVerificationEmail = async (user, verifyToken) => {
  const verifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verifyToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify Your Email Address",
    text: `Hi ${user.name},\n\nVerify your email:\n${verifyURL}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p>Hi <strong>${user.name}</strong>, welcome!</p>
        <p>Please verify your email address to activate your account:</p>
        <a href="${verifyURL}"
           style="display:inline-block;padding:12px 24px;background:#10B981;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">
          Verify Email
        </a>
        <p>This link expires in <strong>24 hours</strong>.</p>
      </div>
    `,
  });
};

const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: "Welcome aboard! 🎉",
    text: `Hi ${user.name}, your account is ready!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome, ${user.name}! 🎉</h2>
        <p>Your account has been verified and is ready to use.</p>
        <a href="${process.env.CLIENT_URL}"
           style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:bold;">
          Go to App
        </a>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendWelcomeEmail,
};
