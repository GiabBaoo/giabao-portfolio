import type {
  Experience,
  ExperienceKind,
  PortfolioContent,
  Skill,
  SkillCategory,
} from "../content/types.ts";

export interface LinkedInImportSummary {
  profileUpdated: boolean;
  educationUpdated: boolean;
  experiencesAdded: number;
  skillsAdded: number;
}

export interface LinkedInImportResult {
  content: PortfolioContent;
  summary: LinkedInImportSummary;
}

interface ParsedCsvTable {
  headers: string[];
  rows: Record<string, string>[];
}

const TECHNICAL_TITLE_PATTERN =
  /\b(it|data|developer|software|sql|intern|engineer|backend|frontend|fullstack|database|analyst|bi|etl|his)\b/i;

const DATABASE_SKILL_PATTERN =
  /(\bsql\b|t-sql|mssql|postgres|mysql|oracle|sqlite|mongodb|redis|database|csdl|etl|ssrs|ssis|ssas|power\s*bi|data\s*warehouse|indexing|query)/i;

const HEALTHCARE_SKILL_PATTERN =
  /(\bhis\b|\blis\b|\bris\b|\bpacs\b|\bemr\b|\behr\b|hl7|fhir|dicom|icd|bhyt|y\s*tế|bệnh\s*viện|healthcare|medical|clinical|hospital)/i;

const BACKEND_SKILL_PATTERN =
  /(\bnode\.?js\b|typescript|javascript|python|java\b|c#|\.net|golang|\bgo\b|rust|php|hono|express|nestjs|spring|fastapi|django|rest\s*api|graphql|backend|docker|cloudflare|api|microservice)/i;

export function parseCsv(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === undefined) continue;

    if (inQuotes) {
      if (ch === '"') {
        const nextChar = text[i + 1];
        if (nextChar === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      currentRow.push(currentField);
      currentField = "";
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") {
        i += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else if (ch === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
}

export function parseCsvRecords(rawText: string): ParsedCsvTable {
  const table = parseCsv(rawText);
  const headerRow = table[0];
  if (!headerRow) {
    return { headers: [], rows: [] };
  }

  const headers = headerRow.map((cell) => cell.trim());
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < table.length; r += 1) {
    const rawRow = table[r];
    if (!rawRow) continue;
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      record[header] = (rawRow[idx] ?? "").trim();
    });
    rows.push(record);
  }

  return { headers, rows };
}

export function classifyExperienceKind(title: string): ExperienceKind {
  return TECHNICAL_TITLE_PATTERN.test(title) ? "technical" : "non-technical";
}

export function classifySkillCategory(skillName: string): SkillCategory {
  if (DATABASE_SKILL_PATTERN.test(skillName)) return "databases";
  if (HEALTHCARE_SKILL_PATTERN.test(skillName)) return "healthcare";
  if (BACKEND_SKILL_PATTERN.test(skillName)) return "backend";
  return "other";
}

function parseResponsibilities(description: string, fallbackPosition: string): string[] {
  const lines = description
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*+]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 20);

  return lines.length > 0 ? lines : [fallbackPosition];
}

function formatPeriod(startDate: string, endDate: string): string {
  const start = startDate.trim();
  const end = endDate.trim();
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

export function applyLinkedInImportToContent(
  current: PortfolioContent,
  csvTexts: readonly string[],
): LinkedInImportResult {
  let nextProfile = { ...current.profile };
  let nextEducation = { ...current.education };
  const existingExperiences = [...current.experiences];
  const existingSkills = [...current.skills];

  let profileUpdated = false;
  let educationUpdated = false;
  let experiencesAdded = 0;
  let skillsAdded = 0;

  const seenExpKeys = new Set(
    existingExperiences.map(
      (exp) =>
        `${exp.company.trim().toLowerCase()}::${exp.position.trim().toLowerCase()}::${exp.startDate.trim().toLowerCase()}`,
    ),
  );
  const seenSkillNames = new Set(existingSkills.map((s) => s.name.trim().toLowerCase()));

  const importedExperiences: Experience[] = [];

  for (const csvText of csvTexts) {
    const { headers, rows } = parseCsvRecords(csvText);
    if (headers.length === 0 || rows.length === 0) continue;

    const headerSet = new Set(headers);

    // 1. Profile.csv
    if (headerSet.has("Headline") && headerSet.has("First Name")) {
      const row = rows[0];
      if (!row) continue;

      const fullName = [row["First Name"] ?? "", row["Last Name"] ?? ""]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" ");
      const headline = (row["Headline"] ?? "").trim();
      const summary = (row["Summary"] ?? "").trim();
      const location = (row["Geo Location"] ?? "").trim();

      if (fullName) {
        nextProfile = { ...nextProfile, name: fullName };
        profileUpdated = true;
      }
      if (headline) {
        nextProfile = { ...nextProfile, title: headline };
        profileUpdated = true;
      }
      if (summary) {
        nextProfile = {
          ...nextProfile,
          summary,
          aboutParagraphs:
            nextProfile.aboutParagraphs.length === 0 ? [summary] : nextProfile.aboutParagraphs,
        };
        profileUpdated = true;
      }
      if (location) {
        nextProfile = { ...nextProfile, location };
        profileUpdated = true;
      }
      continue;
    }

    // 2. Positions.csv
    if (headerSet.has("Company Name") && headerSet.has("Title")) {
      rows.forEach((row, index) => {
        const company = (row["Company Name"] ?? "").trim();
        const position = (row["Title"] ?? "").trim();
        if (!company && !position) return;

        const safeCompany = company || "Công ty";
        const safePosition = position || "Vị trí";
        const startDate = (row["Started On"] || row["Start Date"] || "").trim() || "N/A";
        const endDateRaw = (row["Finished On"] || row["End Date"] || "").trim();
        const description = (row["Description"] ?? "").trim();

        const key = `${safeCompany.toLowerCase()}::${safePosition.toLowerCase()}::${startDate.toLowerCase()}`;
        if (seenExpKeys.has(key)) return;

        seenExpKeys.add(key);
        experiencesAdded += 1;
        importedExperiences.push({
          id: `li-${index}`,
          company: safeCompany,
          position: safePosition,
          kind: classifyExperienceKind(safePosition),
          startDate,
          endDate: endDateRaw || null,
          responsibilities: parseResponsibilities(description, safePosition),
          description,
        });
      });
      continue;
    }

    // 3. Education.csv
    if (headerSet.has("School Name")) {
      const row = rows[0];
      if (!row) continue;

      const institution = (row["School Name"] ?? "").trim();
      const degreeName = (row["Degree Name"] ?? "").trim();
      const notes = (row["Notes"] ?? "").trim();
      const degree = [degreeName, notes].filter(Boolean).join(" — ") || degreeName;
      const period = formatPeriod(row["Start Date"] ?? "", row["End Date"] ?? "");

      if (institution) {
        nextEducation = { ...nextEducation, institution };
        educationUpdated = true;
      }
      if (degree) {
        nextEducation = { ...nextEducation, degree };
        educationUpdated = true;
      }
      if (period) {
        nextEducation = { ...nextEducation, period };
        educationUpdated = true;
      }
      continue;
    }

    // 4. Skills.csv
    if (headerSet.has("Name") && headers.length === 1) {
      for (const row of rows) {
        const skillName = (row["Name"] ?? "").trim();
        if (!skillName) continue;

        const key = skillName.toLowerCase();
        if (seenSkillNames.has(key)) continue;

        seenSkillNames.add(key);
        skillsAdded += 1;
        existingSkills.push({
          name: skillName,
          category: classifySkillCategory(skillName),
          proficiency: null,
        } satisfies Skill);
      }
    }
  }

  return {
    content: {
      ...current,
      profile: nextProfile,
      education: nextEducation,
      experiences: [...importedExperiences, ...existingExperiences].slice(0, 30),
      skills: existingSkills.slice(0, 60),
    },
    summary: {
      profileUpdated,
      educationUpdated,
      experiencesAdded,
      skillsAdded,
    },
  };
}
