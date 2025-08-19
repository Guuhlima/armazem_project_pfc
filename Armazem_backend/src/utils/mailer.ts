import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
    const appName = process.env.APP_NAME || 'Armazem Fast';
    await transporter.sendMail({
        from: `${appName} <no-reply@minhaapp.com>`,
        to,
        subject: `${appName} – Redefinição de senha`,
        html: `
        <p>Você solicitou redefinição de senha.</p>
        <p>Use o link abaixo (válido por 15 minutos):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Se você não solicitou, ignore este e-mail.</p>
        `,
    })
}