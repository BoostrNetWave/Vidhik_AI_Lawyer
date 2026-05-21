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
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    try {
        console.log(`[EmailService] Preparing to send email to ${to} using ${process.env.SMTP_USER}...`);

        const info = await transporter.sendMail({
            from: `"Vidhik Admin" <${process.env.SMTP_USER || 'sibsankar2727@gmail.com'}>`,
            to,
            subject,
            html,
        });

        console.log("[EmailService] Message sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("[EmailService] Error sending email:", error);
        return false;
    }
};
