/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_SITE_KEY: string;
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string;
}

declare const LanguageModel:
  | { availability(): Promise<"unavailable" | "downloadable" | "downloading" | "available"> }
  | undefined;
