import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        /* Generate 6-digit OTP */
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

        /* Delete any existing OTPs for this email */
        await supabaseAdmin
            .from("email_otps")
            .delete()
            .eq("email", normalizedEmail);

        /* Store OTP */
        const { error: insertErr } = await supabaseAdmin
            .from("email_otps")
            .insert({ email: normalizedEmail, otp, expires_at: expiresAt });

        if (insertErr) {
            console.error("OTP insert error:", insertErr);
            return NextResponse.json(
                { error: "Failed to generate OTP" },
                { status: 500 }
            );
        }

        /* Send via Gmail */
        const gmailUser = process.env.GMAIL_USER;
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailAppPassword) {
            return NextResponse.json(
                { error: "Email service not configured" },
                { status: 500 }
            );
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: gmailUser, pass: gmailAppPassword },
        });

        await transporter.sendMail({
            from: `ProjectPulse <${gmailUser}>`,
            to: normalizedEmail,
            subject: "Your ProjectPulse Login Code",
            html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #6366F1; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 24px;">⚡</div>
            <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 16px 0 8px;">Your Login Code</h1>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Enter this code to sign in to ProjectPulse</p>
          </div>
          <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
            <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; margin: 0; font-family: monospace;">${otp}</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            This code expires in 5 minutes. If you didn't request this, you can ignore it.
          </p>
        </div>
      `,
        });

        return NextResponse.json({ message: "OTP sent successfully" });
    } catch (err) {
        console.error("Send OTP error:", err);
        return NextResponse.json(
            { error: "Failed to send OTP" },
            { status: 500 }
        );
    }
}
