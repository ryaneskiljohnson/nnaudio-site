/**
 * @fileoverview Zod schemas for API route input validation.
 * @module utils/apiSchemas
 */

import { z } from "zod";

/** Schema for POST /api/auth/register (formData: email, password, name). */
export const registerSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().max(256).optional(),
});

/** Schema for POST /api/contact (JSON body). */
export const contactSchema = z.object({
  name: z.string().max(256).optional(),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(500),
  message: z.string().min(1, "Message is required").max(10000),
  userId: z.string().uuid().nullable().optional(),
});

/** Schema for POST /api/chat (JSON body). */
export const chatSchema = z.object({
  message: z.string().min(1, "Message is required").max(4000),
  conversationHistory: z
    .array(
      z.object({
        id: z.string().max(128),
        text: z.string().max(4000),
        isUser: z.boolean(),
        timestamp: z.coerce.date(),
      })
    )
    .max(50)
    .optional()
    .default([]),
  language: z.string().max(10).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
