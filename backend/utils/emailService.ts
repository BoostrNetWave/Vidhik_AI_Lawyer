import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    try {
        console.log(`[EmailService] Attempting to send email to: ${to}`);

        const info = await transporter.sendMail({
            from: `"Vidhik Admin" <${process.env.SMTP_USER}>`,
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
