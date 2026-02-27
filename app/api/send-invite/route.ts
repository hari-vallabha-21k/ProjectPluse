import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      console.warn("GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping email send");
      return NextResponse.json({ message: "Invite saved (email skipped — no Gmail credentials)" });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `ProjectPulse <${gmailUser}>`,
      to: email,
      subject: "You've been invited to join a workspace on ProjectPulse",
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #6366F1; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 24px;">⚡</div>
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 16px 0 8px;">You're Invited!</h1>
            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0;">
              A manager has invited you to join their workspace on <strong>ProjectPulse</strong>.
            </p>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="color: #475569; font-size: 14px; margin: 0 0 16px;">
              Sign up (or log in) and click <strong>"Join Workspace"</strong> on the onboarding page to accept.
            </p>
            <a href="${appUrl}/onboarding" style="display: inline-block; background: #6366F1; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 700; font-size: 14px;">
              Join Workspace
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ message: "Invite email sent" });
  } catch (err) {
    console.error("Send invite error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
