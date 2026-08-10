import { z } from "zod";

/**
 * Password policy, shared by every place that accepts a new password.
 *
 * Length does far more work than composition rules: the previous
 * `min(8) + a letter + a digit` happily accepted "password1". A 12-character
 * floor with no character-class demands is both stronger and easier to
 * satisfy with a memorable passphrase.
 *
 * Lives outside the `"use server"` action files because those may only export
 * async functions.
 */
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(200, "That password is too long")
  .refine((v) => !/^\s|\s$/.test(v), "Cannot start or end with a space");
