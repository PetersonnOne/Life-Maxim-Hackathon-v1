import { validateUsernameFormat } from "@convex-dev/auth-v2/username/validation";
import { validateNewPassword } from "@convex-dev/auth-v2/providers/password/validation";
// Preserve the existing input-validation policy during the credential migration.
export function normalizeUsername(value: string) { return value.toLowerCase().normalize("NFC"); }
export function validateUsername(value: unknown): string {
  if (typeof value !== "string" || value.length > 256 || validateUsernameFormat(value) !== null) throw new Error("Enter a valid username without surrounding spaces.");
  return value.normalize("NFC");
}
export function validatePassword(value: unknown, creating: boolean): string {
  if (typeof value !== "string" || value.length > 256 || value.length < (creating ? 12 : 1)) throw new Error("Use a password of 12–256 characters.");
  if (creating && validateNewPassword(value) !== null) throw new Error("Choose a unique password of 12–100 characters, without surrounding spaces.");
  return value.normalize("NFC");
}
