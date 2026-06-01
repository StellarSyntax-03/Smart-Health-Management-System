import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: env.SMTP_EMAIL,
    pass: env.SMTP_PASSWORD,
  },
});

interface DoctorEmailData {
  id: string;
  user: {
    name: string;
    email: string;
  };
  specialization?: string | null;
  licenseNumber?: string | null;
  qualification?: string | null;
  experience?: number | null;
  clinicName?: string | null;
  clinicAddress?: string | null;
  bio?: string | null;
}

export async function sendDoctorApprovalEmail(doctor: DoctorEmailData) {
  const approveUrl = `${env.APP_URL}/api/doctor/approve/${doctor.id}?secret=${encodeURIComponent(env.JWT_SECRET)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">New Doctor Registration</h2>
      <p>A new doctor has registered and is awaiting approval.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #374151;">Name</td>
          <td style="padding: 10px;">${doctor.user.name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #374151;">Email</td>
          <td style="padding: 10px;">${doctor.user.email}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #374151;">Specialization</td>
          <td style="padding: 10px;">${doctor.specialization || "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #374151;">Qualification</td>
          <td style="padding: 10px;">${doctor.qualification || "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #374151;">Experience</td>
          <td style="padding: 10px;">${doctor.experience != null ? doctor.experience + " years" : "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #374151;">License Number</td>
          <td style="padding: 10px;">${doctor.licenseNumber || "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #374151;">Clinic Name</td>
          <td style="padding: 10px;">${doctor.clinicName || "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #374151;">Clinic Address</td>
          <td style="padding: 10px;">${doctor.clinicAddress || "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #374151;">Bio</td>
          <td style="padding: 10px;">${doctor.bio || "N/A"}</td>
        </tr>
      </table>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${approveUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Approve Doctor</a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: env.SMTP_EMAIL,
    to: "meetdomadia789@gmail.com",
    subject: `New Doctor Registration - ${doctor.user.name}`,
    html,
  });
}
