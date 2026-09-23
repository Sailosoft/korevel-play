export type AppStatus = "available" | "beta" | "coming-soon";

export interface PlayStoreApp {
  slug: string;
  name: string;
  description: string;
  href: string;
  tags: string[];
  status: AppStatus;
}
