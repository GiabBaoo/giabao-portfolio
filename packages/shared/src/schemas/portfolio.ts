import { z } from "zod";

export const socialLinkSchema = z.object({
    platform: z.enum(["github", "linkedin", "email"]),
    label: z.string().trim().min(1).max(100),
    url: z.string().trim().min(1).max(500),
});

export const profileSchema = z.object({
    name: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(200),
    location: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(200),
    summary: z.string().trim().min(1).max(2000),
    heroHighlights: z.array(z.string().trim().min(1).max(300)).max(10),
    aboutParagraphs: z.array(z.string().trim().min(1).max(3000)).max(10),
    cvUrl: z.string().trim().max(500).nullable(),
    avatarUrl: z.string().trim().max(500).nullable(),
    socialLinks: z.array(socialLinkSchema).max(10),
});

export const educationSchema = z.object({
    institution: z.string().trim().min(1).max(200),
    degree: z.string().trim().min(1).max(200),
    gpa: z.string().trim().min(1).max(50),
    period: z.string().trim().min(1).max(100),
});

export const experienceSchema = z.object({
    id: z.string().trim().min(1).max(100),
    company: z.string().trim().min(1).max(200),
    position: z.string().trim().min(1).max(200),
    kind: z.enum(["technical", "non-technical"]),
    startDate: z.string().trim().min(1).max(50),
    endDate: z.string().trim().max(50).nullable(),
    responsibilities: z.array(z.string().trim().min(1).max(1000)).max(20),
    description: z.string().trim().max(2000),
});

export const projectSchema = z.object({
    id: z.string().trim().min(1).max(100),
    slug: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(3000),
    technologies: z.array(z.string().trim().min(1).max(80)).max(30),
    features: z.array(z.string().trim().min(1).max(1000)).max(20),
    role: z.string().trim().max(200).nullable(),
    imageUrl: z.string().trim().max(500).nullable(),
    repositoryUrl: z.string().trim().max(500).nullable(),
    demoUrl: z.string().trim().max(500).nullable(),
    projectType: z.enum(["academic", "personal"]).nullable(),
});

export const domainTermSchema = z.object({
    abbr: z.string().trim().min(1).max(50),
    meaning: z.string().trim().min(1).max(500),
});

export const skillSchema = z.object({
    name: z.string().trim().min(1).max(100),
    category: z.enum(["databases", "backend", "other", "healthcare"]),
    proficiency: z.string().trim().max(100).nullable().default(null),
});

export const certificationSchema = z.object({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    issuer: z.string().trim().max(200).nullable(),
    issueDate: z.string().trim().max(50).nullable(),
    credentialUrl: z.string().trim().max(500).nullable(),
});

export const portfolioContentSchema = z.object({
    profile: profileSchema,
    education: educationSchema,
    experiences: z.array(experienceSchema).max(30),
    projects: z.array(projectSchema).max(30),
    skills: z.array(skillSchema).max(60),
    healthcareGlossary: z.array(domainTermSchema).max(40),
    certifications: z.array(certificationSchema).max(30),
});

export type PortfolioContentDTO = z.infer<typeof portfolioContentSchema>;

export interface MediaAssetInfo {
    assetType: "avatar" | "cv";
    url: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    updatedAt: string;
}

export interface PortfolioPublicResponse {
    ok: true;
    contentByLocale: {
        vi: PortfolioContentDTO | null;
        en: PortfolioContentDTO | null;
    };
    media: {
        avatar: MediaAssetInfo | null;
        cv: MediaAssetInfo | null;
    };
}