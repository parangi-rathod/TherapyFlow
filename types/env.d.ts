declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    RESEND_REPLY_TO_EMAIL?: string;
    REMINDER_PROCESSING_SECRET?: string;
    MESSAGE_ENCRYPTION_KEY?: string;
  }
}

export {};
