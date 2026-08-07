import { describe, it, expect, beforeEach } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  validateEmail,
} from "./auth";

describe("Authentication Utilities", () => {
  describe("Password Hashing", () => {
    it("should hash a password", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should verify a correct password", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword456!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });
  });

  describe("Password Strength Validation", () => {
    it("should accept a strong password", () => {
      const result = validatePasswordStrength("StrongPass123!");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject a password that is too short", () => {
      const result = validatePasswordStrength("Short1!");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject a password without uppercase", () => {
      const result = validatePasswordStrength("lowercase123!");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("mayúscula"))).toBe(true);
    });

    it("should reject a password without lowercase", () => {
      const result = validatePasswordStrength("UPPERCASE123!");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("minúscula"))).toBe(true);
    });

    it("should reject a password without numbers", () => {
      const result = validatePasswordStrength("NoNumbers!");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("número"))).toBe(true);
    });

    it("should reject a password without special characters", () => {
      const result = validatePasswordStrength("NoSpecial123");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("especial"))).toBe(true);
    });
  });

  describe("Email Validation", () => {
    it("should accept a valid email", () => {
      expect(validateEmail("user@example.com")).toBe(true);
      expect(validateEmail("test.email@domain.co.uk")).toBe(true);
      expect(validateEmail("user+tag@example.com")).toBe(true);
    });

    it("should reject an invalid email", () => {
      expect(validateEmail("invalid.email")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user @example.com")).toBe(false);
    });
  });
});
