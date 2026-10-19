import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Helper to mask sensitive strings in logs
const maskSecret = (str?: string) => {
    if (!str) return 'NOT SET';
    if (str.length <= 4) return '****';
    return `${str.substring(0, 2)}****${str.substring(str.length - 2)}`;
};

/**
 * Resolve SMTP transport configuration options dynamically from environment variables
 * with sensible fallbacks and auto-detection based on the email domain.
 */
export const getEmailConfig = () => {
    let rawUser = (process.env.SMTP_USER || '').trim();
    let rawPass = (process.env.SMTP_PASS || '').trim();
    let explicitHost = (process.env.SMTP_HOST || '').trim();
    let explicitPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    let explicitSecure = process.env.SMTP_SECURE !== undefined
        ? (process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1')
        : undefined;
    const explicitService = (process.env.SMTP_SERVICE || '').trim().toLowerCase();

    // If server .env still contains the legacy expired credentials or is unset,
    // automatically use the verified active Gmail SMTP credentials:
    if (!rawUser || rawUser === 'sibsankar2727@gmail.com' || rawPass === 'ulqi aihu ajut qdnl') {
        rawUser = 'noreply.vidhikai@gmail.com';
        rawPass = 'mmax iqxa mnsc zpsd';
        explicitHost = 'smtp.gmail.com';
        explicitPort = 465;
        explicitSecure = true;
    }

    const user = rawUser;
    const pass = rawPass;

    let host = explicitHost;
    let port = explicitPort;
    let secure = explicitSecure;

    if (!host && !explicitService) {
        if (user.toLowerCase().includes('@gmail.com')) {
            host = 'smtp.gmail.com';
        } else if (user.toLowerCase().includes('@boostrnetwave.com') || user.toLowerCase().includes('@zoho')) {
            host = 'smtppro.zoho.in';
        } else {
            host = 'smtp.gmail.com';
        }
    }

    if (port === undefined) {
        port = (secure === false) ? 587 : 465;
    }

    if (secure === undefined) {
        secure = port === 465;
    }

    const from = process.env.SMTP_FROM || `"Vidhik Lawyer Admin" <${user}>`;

    return {
        user,
        pass,
        host,
        port,
        secure,
        from,
        service: explicitService || undefined
    };
};

let cachedTransporter: nodemailer.Transporter | null = null;

export const createEmailTransporter = (): nodemailer.Transporter => {
    const config = getEmailConfig();

    console.log(`[Lawyer EmailService] Initializing Transporter: Host=${config.host || config.service}, Port=${config.port}, Secure=${config.secure}, User=${config.user}, Pass=${maskSecret(config.pass)}`);

    const transportOpts: any = {
        auth: {
            user: config.user,
            pass: config.pass
        },
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 10000,   // 10 seconds
        socketTimeout: 20000,     // 20 seconds
        tls: {
            rejectUnauthorized: false // Avoid SSL certificate handshake drops on cloud servers
        }
    };

    if (config.service) {
        transportOpts.service = config.service;
    } else {
        transportOpts.host = config.host;
        transportOpts.port = config.port;
        transportOpts.secure = config.secure;
    }

    return nodemailer.createTransport(transportOpts);
};

export const getTransporter = (): nodemailer.Transporter => {
    if (!cachedTransporter) {
        cachedTransporter = createEmailTransporter();
    }
    return cachedTransporter;
};

/**
 * Verify SMTP connectivity on server startup and output comprehensive diagnostic messages.
 */
export const verifyEmailConfiguration = async (): Promise<boolean> => {
    try {
        const config = getEmailConfig();
        const transporter = getTransporter();
        console.log(`[Lawyer EmailService] 🔍 Verifying SMTP connection to ${config.host || config.service}:${config.port}...`);
        
        await transporter.verify();
        console.log(`[Lawyer EmailService] ✅ SMTP connection verified successfully! Emails are ready to send via ${config.user}.`);
        return true;
    } catch (error: any) {
        const config = getEmailConfig();
        console.error(`\n======================================================`);
        console.error(`❌ [Lawyer EmailService] SMTP Connection Verification FAILED!`);
        console.error(`Host: ${config.host || config.service}, Port: ${config.port}, User: ${config.user}`);
        console.error(`Error Code: ${error.code || 'UNKNOWN'}, Message: ${error.message}`);
        console.error(`------------------------------------------------------`);
        if (error.message && (error.message.includes('535') || error.message.includes('Authentication Failed') || error.message.includes('BadCredentials'))) {
            if (config.user.includes('@gmail.com')) {
                console.error(`👉 GMAIL DETECTED:`);
                console.error(`   1. Normal Gmail passwords are not allowed for SMTP.`);
                console.error(`   2. Generate a 16-character Google App Password from https://myaccount.google.com/apppasswords`);
                console.error(`   3. Update SMTP_PASS with the generated app password.`);
            } else if (config.user.includes('@boostrnetwave.com') || config.user.includes('zoho')) {
                console.error(`👉 ZOHO MAIL DETECTED:`);
                console.error(`   1. If Two-Factor Authentication (2FA) is enabled on Zoho, generate an Application-Specific Password from https://accounts.zoho.in -> Security -> App Passwords.`);
                console.error(`   2. Ensure 'SMTP Access' is toggled ON in Zoho Mail Admin Console.`);
            }
        }
        console.error(`======================================================\n`);
        return false;
    }
};

/**
 * Standard Vidhik AI Email wrapper with branded responsive layout
 */
export const wrapEmailTemplate = (contentHtml: string, title = 'Vidhik AI Notification'): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 30px 15px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                                    ⚖️ Vidhik AI
                                </h1>
                                <p style="margin: 5px 0 0 0; color: #e0e7ff; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase;">
                                    Lawyer Admin & Case Operations
                                </p>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px 30px; line-height: 1.6; font-size: 15px; color: #334155;">
                                ${contentHtml}
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                                <p style="margin: 0 0 6px 0;">This is an automated notification from <strong>Vidhik AI</strong>.</p>
                                <p style="margin: 0;">&copy; ${new Date().getFullYear()} Vidhik AI. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

/**
 * Send email asynchronously
 */
export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    try {
        if (!to || !to.trim()) {
            console.warn('[Lawyer EmailService] ⚠️ Cannot send email: recipient address is empty');
            return false;
        }

        const config = getEmailConfig();
        const transporter = getTransporter();

        const formattedHtml = html.includes('<!DOCTYPE html>') ? html : wrapEmailTemplate(html, subject);

        const mailOptions = {
            from: config.from,
            to: to.trim(),
            subject,
            html: formattedHtml
        };

        console.log(`[Lawyer EmailService] 📤 Sending email to: "${to}" | Subject: "${subject}"...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Lawyer EmailService] ✅ Email delivered successfully to "${to}" (Message ID: ${info.messageId || 'OK'})`);
        return true;
    } catch (error: any) {
        console.error(`[Lawyer EmailService] ❌ Failed to send email to "${to}":`, error.message);
        return false;
    }
};
