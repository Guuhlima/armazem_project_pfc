import crypto from 'crypto'
import nodemailer from 'nodemailer';

export function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
}

export function sha256(input: string) {
    return crypto.createHash('sha256').update(input).digest('hex')
}

export const mailer = nodemailer.createTransport({
    service: process.env.SMTP_HOST,
    auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
    },
});

export async function sendEmail(to: string, resetLink: string) {
  const from = process.env.MAIL_FROM || 'Armazem G3 <no-reply@armazem.com>';

  const htmlTemplate = `
  <div style="font-family: Arial, sans-serif; background-color: #f6f8fa; padding: 40px 0;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <div style="background-color: #004aad; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Armazém G3</h1>
      </div>

      <div style="padding: 30px;">
        <h2 style="color: #333333; font-size: 20px;">Redefinição de senha</h2>
        <p style="color: #555555; line-height: 1.6;">
          Recebemos uma solicitação para redefinir sua senha. 
          Clique no botão abaixo para criar uma nova senha:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #004aad; color: #ffffff; text-decoration: none;
                    padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
            Redefinir Senha
          </a>
        </div>

        <p style="color: #777777; font-size: 14px; line-height: 1.6;">
          Ou copie e cole o link no seu navegador:<br>
          <a href="${resetLink}" style="color: #004aad;">${resetLink}</a>
        </p>

        <p style="color: #999999; font-size: 12px; text-align: center; margin-top: 40px;">
          Se você não solicitou a redefinição de senha, ignore este e-mail.<br>
          Este link expira automaticamente após 24 horas.
        </p>
      </div>
    </div>
  </div>
  `;

  await mailer.sendMail({
    from,
    to,
    subject: '🔒 Redefinição de senha - Armazém G3',
    text: `Recebemos uma solicitação para redefinir sua senha. 
Acesse o link para continuar: ${resetLink}`,
    html: htmlTemplate,
  });
}
