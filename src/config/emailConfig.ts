/**
 * Email Configuration Settings
 * Centralized email setup for production and development environments
 */

export interface EmailProvider {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailTemplate {
  subject: string;
  type: 'confirmation' | 'password_reset' | 'magic_link' | 'change_email' | 'invite';
  requiresCustomization?: boolean;
}

/**
 * Email configuration for different environments
 */
export const emailConfig = {
  // Production Configuration (Use Brevo/Sendinblue)
  production: {
    provider: 'brevo',
    smtp: {
      host: process.env.VITE_BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.VITE_BREVO_SMTP_USER || '',
        pass: process.env.VITE_BREVO_SMTP_PASSWORD || '',
      },
    },
    from: process.env.VITE_EMAIL_FROM || 'noreply@turuturustars.co.ke',
    fromName: 'Turuturu Stars',
    replyTo: process.env.VITE_EMAIL_REPLY_TO || 'support@turuturustars.co.ke',
  },

  // Development Configuration (Use Supabase or test service)
  development: {
    provider: 'supabase',
    smtp: {
      host: 'localhost',
      port: 54324,
      secure: false,
      auth: {
        user: '',
        pass: '',
      },
    },
    from: 'no-reply@turuturustars.local',
    fromName: 'Turuturu Stars (Dev)',
    replyTo: 'dev@turuturustars.local',
  },

  // Test Configuration (In-memory, no actual emails sent)
  test: {
    provider: 'test',
    smtp: {
      host: 'test',
      port: 0,
      secure: false,
      auth: {
        user: 'test',
        pass: 'test',
      },
    },
    from: 'test@turuturustars.local',
    fromName: 'Turuturu Stars (Test)',
    replyTo: 'test@turuturustars.local',
  },
};

/**
 * Email templates configuration
 */
export const emailTemplates: Record<string, EmailTemplate> = {
  signup_confirmation: {
    subject: 'Confirm your email - Turuturu Stars',
    type: 'confirmation',
    requiresCustomization: true,
  },
  password_reset: {
    subject: 'Reset your password - Turuturu Stars',
    type: 'password_reset',
    requiresCustomization: true,
  },
  email_change_confirmation: {
    subject: 'Confirm your new email - Turuturu Stars',
    type: 'change_email',
    requiresCustomization: true,
  },
  magic_link: {
    subject: 'Your magic sign-in link - Turuturu Stars',
    type: 'magic_link',
    requiresCustomization: true,
  },
  invite: {
    subject: 'You are invited to join Turuturu Stars',
    type: 'invite',
    requiresCustomization: true,
  },
};

/**
 * Get current environment config
 */
export function getEmailConfig() {
  const env = import.meta.env.MODE;
  
  if (env === 'production') {
    return emailConfig.production;
  } else if (env === 'test') {
    return emailConfig.test;
  }
  
  return emailConfig.development;
}

/**
 * Supabase-specific email configuration
 * Used when Supabase is the email provider
 */
export const supabaseEmailConfig = {
  // Email confirmation
  signup: {
    enabled: true,
    template: 'confirm_signup',
    autoConfirm: false, // Require email verification
  },
  
  // Password reset
  passwordReset: {
    enabled: true,
    template: 'reset_password',
    expiresIn: 24 * 60 * 60, // 24 hours in seconds
  },
  
  // Magic link (passwordless)
  magicLink: {
    enabled: true,
    template: 'magic_link',
    expiresIn: 24 * 60 * 60, // 24 hours in seconds
  },
  
  // Email change verification
  emailChange: {
    enabled: true,
    template: 'confirm_email_change',
  },
};

/**
 * Email verification settings
 */
export const emailVerificationConfig = {
  // Time to verify email (in hours)
  expirationTime: 24,
  
  // Maximum resend attempts
  maxResendAttempts: 5,
  
  // Resend cooldown (in minutes)
  resendCooldown: 5,
  
  // Auto-confirm after verification
  autoConfirmProfile: true,
};

/**
 * Supported email providers
 */
export const SUPPORTED_EMAIL_PROVIDERS = {
  SUPABASE: 'supabase',
  BREVO: 'brevo',
  SENDGRID: 'sendgrid',
  MAILGUN: 'mailgun',
  AWS_SES: 'aws_ses',
  SMTP: 'smtp',
} as const;

/**
 * Email validation rules
 */
export const emailValidation = {
  minLength: 5,
  maxLength: 254,
  // RFC 5322 simplified pattern
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Disposable email domains to block (optional)
  blockedDomains: [
    'tempmail.com',
    'temp-mail.org',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
  ],
};

export default emailConfig;
