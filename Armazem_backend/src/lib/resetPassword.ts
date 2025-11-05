import crypto from 'crypto'
import nodemailer from 'nodemailer';

export function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
}

export function sha256(input: string) {
    return crypto.createHash('sha256').update(input).digest('hex')
}

// const port = Number(process.env.SMTP_PORT || 465);
// const secure = port === 465;

export const mailer = nodemailer.createTransport({
    service: process.env.SMTP_HOST,
    auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
    },
});

export async function sendEmail(to: string, resetLink: string) {
    await mailer.sendMail({
        from: process.env.MAIL_FROM || 'no-reply@armazem.com',
        to,
        subject: 'Resetar senha',
        text: `Para trocar sua senha, acesse: ${resetLink}`,
        html: `<p>Para trocar sua senha, clique</p>
               <p><a href="${resetLink}">${resetLink}</a></p>
               <p>Se você não solicitou, ignore este email.</p>`,
    });
}