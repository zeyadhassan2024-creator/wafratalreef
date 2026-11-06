import { z } from "zod";

export const businessTypes = ["Restaurant", "Hotel", "Supermarket", "Wholesaler", "Catering / Foodservice", "Other"] as const;
export const meetingStatuses = ["New", "Contacted", "Meeting Scheduled", "In Progress", "Completed", "Cancelled"] as const;
export const productOptions = ["Frozen Whole Chicken", "Chicken Breast", "Chicken Tender", "Table Eggs", "Special Cuts"] as const;

const qatarPhone = /^\+?974[\s-]?[0-9]{8}$/;
const cleanText = (max: number) => z.string().trim().max(max);

export const meetingRequestSchema = z.object({
  fullName: cleanText(120).min(2),
  jobTitle: cleanText(120).min(2),
  companyName: cleanText(160).min(2),
  email: z.email().max(254),
  phone: z.string().trim().regex(qatarPhone),
  businessType: z.enum(businessTypes),
  interestedProducts: z.array(z.enum(productOptions)).max(5),
  otherProduct: cleanText(160).optional().default(""),
  estimatedMonthlyQuantity: cleanText(100).optional().default(""),
  preferredMeetingAt: cleanText(80).optional().default(""),
  additionalNotes: cleanText(2000).optional().default(""),
  locale: z.enum(["en", "ar"]).default("en"),
}).refine((value) => value.interestedProducts.length > 0 || value.otherProduct.trim().length > 0, {
  path: ["interestedProducts"], message: "Select at least one product or specify another product.",
}).refine((value) => !value.otherProduct || value.otherProduct.trim().length > 0, {
  path: ["otherProduct"], message: "Please specify the other product.",
});

export const contactSchema = z.object({
  fullName: cleanText(120).min(2),
  companyName: cleanText(160).optional().default(""),
  email: z.email().max(254),
  phone: z.string().trim().max(32).optional().default(""),
  message: cleanText(3000).min(10),
  locale: z.enum(["en", "ar"]).default("en"),
});

export const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) });
export const setupSchema = z.object({
  setupKey: z.string().min(16).max(256),
  email: z.email().max(254),
  password: z.string().min(12).max(128),
  confirmPassword: z.string().min(12).max(128),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
