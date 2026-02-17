/**
 * @fileoverview Type declaration for sns-validator (no @types package).
 * @module types/sns-validator
 */
declare module "sns-validator" {
  type ValidationCallback = (err: Error | null, message?: Record<string, unknown>) => void;

  class MessageValidator {
    validate(message: string | Record<string, unknown>, callback: ValidationCallback): void;
  }

  export = MessageValidator;
}
