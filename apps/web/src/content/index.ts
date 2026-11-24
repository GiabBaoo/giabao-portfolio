import type { Locale } from "../i18n/index.ts";
import { enContent } from "./en.ts";
import type { PortfolioContent } from "./types.ts";
import { viContent } from "./vi.ts";

export type {
  Certification,
  DomainTerm,
  Education,
  Experience,
  ExperienceKind,
  PortfolioContent,
  Profile,
  Project,
  ProjectType,
  Skill,
  SkillCategory,
  SocialLink,
  SocialPlatform,
} from "./types.ts";

export const portfolioContent: Readonly<Record<Locale, PortfolioContent>> = {
  en: enContent,
  vi: viContent,
};

export function getPortfolioContent(locale: Locale): PortfolioContent {
  return portfolioContent[locale];
}
