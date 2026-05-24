import { AppError } from "./AppError";

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>, message = "Validation failed") {
    super(message, 400);
    this.errors = errors;
  }
}
