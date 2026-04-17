import { z } from "zod";

const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number with country code");

export const examRegistrationSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().trim().min(1, "Name is required").max(120),
  mobileNumber: phoneNumberSchema,
  whatsappNumber: phoneNumberSchema,
});

export const verifyAccessSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(64),
});

export const saveResponseSchema = z.object({
  questionId: z.string().uuid(),
  optionIds: z.array(z.string().uuid()),
  isSkipped: z.boolean().default(false),
});

export const heartbeatSchema = z.object({
  event: z.enum(["tab_switch", "fullscreen_exit", "ping"]),
});
