/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_SITE_KEY: string;
}

declare const LanguageModel:
  | { availability(): Promise<"unavailable" | "downloadable" | "downloading" | "available"> }
  | undefined;
