import type { PortfolioContent, Skill } from "./types.ts";

const sharedSkills: readonly Skill[] = [
  // Databases
  { name: "Microsoft SQL Server", category: "databases" },
  { name: "T-SQL", category: "databases" },
  { name: "PostgreSQL", category: "databases" },
  { name: "MySQL", category: "databases" },
  { name: "Stored Procedures", category: "databases" },
  { name: "JOIN and UNION", category: "databases" },
  { name: "Database schema analysis", category: "databases" },
  { name: "Foreign key analysis", category: "databases" },
  // Backend
  { name: "ASP.NET Core MVC / Web API", category: "backend" },
  { name: "Node.js", category: "backend" },
  { name: "Express", category: "backend" },
  { name: "RESTful APIs", category: "backend" },
  { name: "C#", category: "backend" },
  { name: "JavaScript", category: "backend" },
  { name: "TypeScript", category: "backend" },
  // Other
  { name: "Flutter", category: "other" },
  { name: "Dart", category: "other" },
  { name: "Java", category: "other" },
  { name: "Python", category: "other" },
  { name: "Git/GitHub", category: "other" },
  { name: "Docker (basic)", category: "other" },
  { name: "Postman", category: "other" },
  { name: "SSMS 18", category: "other" },
  // Healthcare Domain
  { name: "HIS", category: "healthcare" },
  { name: "BHYT", category: "healthcare" },
  { name: "Billing", category: "healthcare" },
  { name: "LIS", category: "healthcare" },
  { name: "CDHA", category: "healthcare" },
  { name: "Pharmacy and Inventory", category: "healthcare" },
];

export const enContent: PortfolioContent = {
  profile: {
    name: "Nguyen Gia Bao",
    title: "Backend Developer | Database-focused Developer",
    location: "Ho Chi Minh City, Vietnam",
    email: "truyennguyen744@gmail.com",
    summary:
      "Information Systems undergraduate at HUFLIT and Database & Data Intern focused on SQL Server, T-SQL, Stored Procedures, relational database design, and backend web systems.",
    heroHighlights: [
      "SQL Server",
      "Database Design",
      "T-SQL",
      "Stored Procedures",
      "Backend Development",
    ],
    aboutParagraphs: [
      "I am an Information Systems undergraduate at Ho Chi Minh City University of Foreign Languages and Information Technology (HUFLIT), expected to graduate in June 2027 (GPA 3.2/4.0). My technical focus is on relational database engineering and backend software development.",
      "As a Database & Data Intern at WinSoft, I work with Microsoft SQL Server, T-SQL, and Stored Procedures to analyze database structures, validate datasets, and support hospital billing reporting workflows in the Hospital Information System (HIS) domain.",
      "Outside of database work, I build web and data-backed applications using ASP.NET Core, C#, Node.js, and TypeScript. My career goal is to contribute as a Backend Developer on production systems where data integrity, query performance, and clean schema design matter.",
    ],
    cvUrl: null,
    avatarUrl: null,
    socialLinks: [
      {
        platform: "github",
        label: "GitHub",
        url: "https://github.com/GiabBaoo",
      },
      {
        platform: "linkedin",
        label: "LinkedIn",
        url: "https://www.linkedin.com/in/b%E1%BA%A3o-nguy%E1%BB%85n-84405734b/",
      },
      {
        platform: "email",
        label: "Email",
        url: "mailto:truyennguyen744@gmail.com",
      },
    ],
  },
  education: {
    institution:
      "Ho Chi Minh City University of Foreign Languages and Information Technology (HUFLIT)",
    degree: "Bachelor of Information Technology — Information Systems",
    gpa: "3.2 / 4.0",
    period: "09/2023 – 06/2027 (Expected)",
  },
  experiences: [
    {
      id: "winsoft",
      company: "WinSoft",
      position: "Database & Data Intern",
      kind: "technical",
      startDate: "2026-10",
      endDate: null,
      description:
        "General experience working with SQL Server, T-SQL, Stored Procedures, data analysis, and hospital billing reports within the Hospital Information System (HIS) domain.",
      responsibilities: [
        "Analyze general database structures and relationships using SQL Server and SSMS.",
        "Work with data across core healthcare modules including Billing, BHYT, LIS, CDHA, and Inventory/Warehousing.",
        "Develop and optimize T-SQL Stored Procedures for reusable hospital billing report datasets.",
        "Handle report filtering conditions and combine datasets using JOIN and UNION operations.",
        "Implement general revenue aggregation logic, department mapping, and payment data tracing.",
        "Investigate duplicate or missing records, perform data validation, and reconcile report figures against Excel templates.",
        "Document query logic and reporting requirements.",
      ],
    },
    {
      id: "jen-and-co",
      company: "JEN&CO",
      position: "E-commerce Operations & Inventory Staff",
      kind: "non-technical",
      startDate: "2026-01",
      endDate: "2026-08",
      description:
        "Managed e-commerce fulfillment workflows, warehouse organization, and live commerce operational support.",
      responsibilities: [
        "Managed inbound and outbound order fulfillment workflows.",
        "Organized inventory by size and SKU.",
        "Performed quality control, packing, and shipping coordination.",
        "Maintained barcode labeling and warehouse organization.",
        "Supported TikTok and Shopee livestream operations.",
      ],
    },
    {
      id: "ar-group",
      company: "AR GROUP",
      position: "E-commerce Livestream Host",
      kind: "non-technical",
      startDate: "2025-01",
      endDate: "2025-07",
      description:
        "Hosted interactive e-commerce livestream sessions and communicated directly with customers in real time.",
      responsibilities: [
        "Hosted interactive live-selling sessions.",
        "Presented product features and highlights.",
        "Engaged and responded to customer questions in real time.",
        "Developed presentation and communication skills.",
      ],
    },
    {
      id: "zwilling",
      company: "Zwilling J.A. Henckels (Vietnam)",
      position: "Retail Sales & Inventory Operations Staff",
      kind: "non-technical",
      startDate: "2024-02",
      endDate: "2024-10",
      description:
        "Supported omnichannel retail operations, stock-in/stock-out tracking, and periodic inventory audits.",
      responsibilities: [
        "Tracked stock-in and stock-out inventory movements.",
        "Conducted periodic inventory counts and prepared replenishment requests.",
        "Supported omnichannel retail operations.",
        "Produced promotional product videos on TikTok.",
      ],
    },
  ],
  projects: [
    {
      id: "power-company-database",
      slug: "power-company-database",
      name: "Power Company Database",
      description:
        "Distributed database design spanning three regions and six servers using horizontal fragmentation to maintain data availability and consistency.",
      technologies: ["SQL Server", "PostgreSQL", "Node.js", "Supabase"],
      features: [
        "Distributed database architecture across 3 regions and 6 servers.",
        "Horizontal fragmentation strategy for data partitioning.",
        "Focus on data availability and consistency across distributed nodes.",
      ],
      role: null,
      imageUrl: null,
      repositoryUrl: null,
      demoUrl: null,
      projectType: null,
    },
    {
      id: "coffee-shop-ecommerce",
      slug: "coffee-shop-ecommerce",
      name: "Coffee Shop E-commerce",
      description:
        "Online beverage ordering web application featuring payment gateway sandbox integration, rule-based drink recommendations, and revenue reporting.",
      technologies: ["ASP.NET Core", "C#", "Bootstrap 5", "VNPay Sandbox", "Supabase"],
      features: [
        "Online beverage ordering workflow.",
        "VNPay Sandbox payment gateway integration.",
        "Rule-based beverage recommendation system.",
        "Daily and monthly revenue reporting.",
      ],
      role: null,
      imageUrl: null,
      repositoryUrl: null,
      demoUrl: null,
      projectType: null,
    },
    {
      id: "mono-app",
      slug: "mono-app",
      name: "MONO APP (App Money Tracker)",
      description:
        "Personal and group expense tracking mobile application supporting voice input and expense analytics charts.",
      technologies: ["Flutter", "Dart", "SQLite", "Firebase", "Supabase"],
      features: [
        "Personal and group expense tracking.",
        "Voice-assisted transaction input.",
        "Expense breakdown and analytics charts.",
      ],
      role: null,
      imageUrl: null,
      repositoryUrl: null,
      demoUrl: null,
      projectType: null,
    },
  ],
  skills: sharedSkills,
  healthcareGlossary: [
    { abbr: "HIS", meaning: "Hospital Information System" },
    { abbr: "BHYT", meaning: "Vietnamese National Health Insurance (Bảo hiểm Y tế)" },
    { abbr: "LIS", meaning: "Laboratory Information System" },
    { abbr: "CDHA", meaning: "Diagnostic Imaging (Chẩn đoán Hình ảnh)" },
  ],
  certifications: [
    {
      id: "ai-fundamentals",
      name: "AI Fundamentals",
      issuer: null,
      issueDate: null,
      credentialUrl: null,
    },
    {
      id: "design-prompts-everyday-work",
      name: "Design Prompts for Everyday Work Tasks",
      issuer: null,
      issueDate: null,
      credentialUrl: null,
    },
    {
      id: "start-writing-prompts-pro",
      name: "Start Writing Prompts like a Pro",
      issuer: null,
      issueDate: null,
      credentialUrl: null,
    },
  ],
};
