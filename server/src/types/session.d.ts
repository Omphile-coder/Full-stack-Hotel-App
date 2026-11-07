import "express-session";

declare module "express-session" {
  interface SessionData {
    setupCheckCount?: number;
    frontendReturnTo?: string;
  }
}
