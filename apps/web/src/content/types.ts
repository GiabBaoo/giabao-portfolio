export type SocialPlatform = "github" | "linkedin" | "email";

export interface SocialLink {
  readonly platform: SocialPlatform;
  readonly label: string;
  readonly url: string;
}

export interface Profile {
  readonly name: string;
  readonly title: string;
  readonly location: string;
  readonly email: string;
  readonly summary: string;
  readonly heroHighlights: readonly string[];
  readonly aboutParagraphs: readonly string[];
  readonly cvUrl: string | null;
  readonly avatarUrl: string | null;
  readonly socialLinks: readonly SocialLink[];
}

export interface Education {
  readonly institution: string;
  readonly degree: string;
  readonly gpa: string;
  readonly period: string;
}

export type ExperienceKind = "technical" | "non-technical";

export interface Experience {
  readonly id: string;
  readonly company: string;
  readonly position: string;
  readonly kind: ExperienceKind;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly responsibilities: readonly string[];
  readonly description: string;
}

export type ProjectType = "academic" | "personal" | null;

export interface Project {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly technologies: readonly string[];
  readonly features: readonly string[];
  readonly role: string | null;
  readonly imageUrl: string | null;
  readonly repositoryUrl: string | null;
  readonly demoUrl: string | null;
  readonly projectType: ProjectType;
}

export interface DomainTerm {
  readonly abbr: string;
  readonly meaning: string;
}

export type SkillCategory = "databases" | "backend" | "other" | "healthcare";

export interface Skill {
  readonly name: string;
  readonly category: SkillCategory;
  readonly proficiency?: string | null;
}

export interface Certification {
  readonly id: string;
  readonly name: string;
  readonly issuer: string | null;
  readonly issueDate: string | null;
  readonly credentialUrl: string | null;
}

export interface PortfolioContent {
  readonly profile: Profile;
  readonly education: Education;
  readonly experiences: readonly Experience[];
  readonly projects: readonly Project[];
  readonly skills: readonly Skill[];
  readonly healthcareGlossary: readonly DomainTerm[];
  readonly certifications: readonly Certification[];
}
