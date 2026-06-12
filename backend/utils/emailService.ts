import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter using Gmail
console.log(`[EmailService] Initializing with User: ${process.env.SMTP_USER ? 'SET' : 'MISSING'}, Pass: ${process.env.SMTP_PASS ? 'SET' : 'MISSING'}`);

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'sibsankar2727@gmail.com',
        pass: process.env.SMTP_PASS || 'ulqi aihu ajut qdnl',
    },
    connectionTimeout: 5000 // 5 seconds connection timeout
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    try {
        console.log(`[EmailService] Preparing to send email to ${to} using ${process.env.SMTP_USER}...`);

        // Fire-and-forget email sending in the background to prevent blocking HTTP requests.
        // This resolves hanging requests caused by AWS port 25 blocking.
        transporter.sendMail({
            from: `"Vidhik Admin" <${process.env.SMTP_USER || 'sibsankar2727@gmail.com'}>`,
            to,
            subject,
            html,
        })
        .then((info) => {
            console.log("[EmailService] Message sent successfully: %s", info.messageId);
        })
        .catch((error) => {
            console.error("[EmailService] Async email sending failed:", error);
        });

        return true;
    } catch (error) {
        console.error("[EmailService] Error initiating email send:", error);
        return false;
    }
};
