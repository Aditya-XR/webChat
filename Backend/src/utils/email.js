import nodemailer from "nodemailer";

const normalizeBaseUrl = (value) =>
    typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";

const getFrontendUrl = () => {
    const configuredUrl = normalizeBaseUrl(process.env.FRONTEND_URL);

    if (configuredUrl) {
        return configuredUrl;
    }

    return "http://localhost:5173";
};

const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("Email service is not configured");
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

const buildVerificationUrl = (token) =>
    `${getFrontendUrl()}/verify-email?token=${encodeURIComponent(token)}`;

const sendEmail = async ({ to, subject, html }) => {
    const transporter = getTransporter();

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
    });
};

const sendVerificationEmail = async ({ to, token, fullName }) => {
    const verificationUrl = buildVerificationUrl(token);
    const safeName = typeof fullName === "string" && fullName.trim() ? fullName.trim() : "there";

    await sendEmail({
        to,
        subject: "Verify your WebChat email",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                <h2 style="margin-bottom: 16px;">Welcome to WebChat, ${safeName}!</h2>
                <p>Please verify your email address to activate your account.</p>
                <p>
                    <a href="${verificationUrl}" style="display: inline-block; padding: 12px 20px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px;">
                        Verify Email
                    </a>
                </p>
                <p>If the button does not work, open this link:</p>
                <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            </div>
        `,
    });
};

const sendEmailUpdateVerificationEmail = async ({ to, token, fullName }) => {
    const verificationUrl = buildVerificationUrl(token);
    const safeName = typeof fullName === "string" && fullName.trim() ? fullName.trim() : "there";

    await sendEmail({
        to,
        subject: "Confirm your new WebChat email",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                <h2 style="margin-bottom: 16px;">Hi ${safeName},</h2>
                <p>We received a request to update your WebChat email address.</p>
                <p>Confirm this new email by clicking the button below.</p>
                <p>
                    <a href="${verificationUrl}" style="display: inline-block; padding: 12px 20px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px;">
                        Confirm New Email
                    </a>
                </p>
                <p>If the button does not work, open this link:</p>
                <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            </div>
        `,
    });
};

export {
    sendVerificationEmail,
    sendEmailUpdateVerificationEmail,
};
