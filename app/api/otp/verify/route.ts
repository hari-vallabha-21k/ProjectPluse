import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json(
                { error: "Email and OTP are required" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        /* Look up the OTP */
        const { data: otpRow, error: fetchErr } = await supabaseAdmin
            .from("email_otps")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("otp", otp)
            .maybeSingle();

        if (fetchErr || !otpRow) {
            return NextResponse.json(
                { error: "Invalid code. Please check and try again." },
                { status: 400 }
            );
        }

        /* Check expiry */
        if (new Date(otpRow.expires_at) < new Date()) {
            /* Clean up the expired OTP */
            await supabaseAdmin.from("email_otps").delete().eq("id", otpRow.id);
            return NextResponse.json(
                { error: "Code has expired. Please request a new one." },
                { status: 400 }
            );
        }

        /* OTP is valid — delete it (single use) */
        await supabaseAdmin.from("email_otps").delete().eq("id", otpRow.id);

        /* Check if user exists in Supabase Auth */
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
            (u) => u.email === normalizedEmail
        );

        if (!existingUser) {
            return NextResponse.json(
                { error: "No account found with this email. Please sign up first." },
                { status: 400 }
            );
        }

        /* Generate a magic link for this user (server-side) */
        const { data: linkData, error: linkErr } =
            await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: normalizedEmail,
            });

        if (linkErr || !linkData) {
            console.error("Generate link error:", linkErr);
            return NextResponse.json(
                { error: "Failed to create session" },
                { status: 500 }
            );
        }

        /* Return the hashed token so the client can verify it */
        const hashedToken = linkData.properties?.hashed_token;

        return NextResponse.json({
            message: "OTP verified",
            token_hash: hashedToken,
        });
    } catch (err) {
        console.error("Verify OTP error:", err);
        return NextResponse.json(
            { error: "Verification failed" },
            { status: 500 }
        );
    }
}
