import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useI18n } from "../app/providers/i18n-context.ts";
import { AboutSection } from "../components/sections/AboutSection.tsx";
import { EducationSection } from "../components/sections/EducationSection.tsx";
import { ExperienceSection } from "../components/sections/ExperienceSection.tsx";
import { HeroSection } from "../components/sections/HeroSection.tsx";
import { ProjectsSection } from "../components/sections/ProjectsSection.tsx";
import { SkillsSection } from "../components/sections/SkillsSection.tsx";
import { getPortfolioContent } from "../content/index.ts";

const ContactSection = lazy(() =>
  import("../components/sections/ContactSection.tsx").then((module) => ({
    default: module.ContactSection,
  })),
);

function ContactSectionFallback({ label }: { label: string }) {
  return (
    <section
      id="contact"
      aria-label={label}
      aria-busy="true"
      className="section-surface-contact border-border-subtle min-h-[540px] scroll-mt-20 border-t"
    />
  );
}

export function HomePage() {
  const { locale, messages } = useI18n();
  const location = useLocation();
  const content = getPortfolioContent(locale);
  const currentTechnicalRole = content.experiences.find((exp) => exp.kind === "technical");
  const currentRoleLabel = currentTechnicalRole
    ? `${currentTechnicalRole.position} @ ${currentTechnicalRole.company}`
    : content.profile.title;

  const contactTriggerRef = useRef<HTMLDivElement | null>(null);
  const [shouldMountContact, setShouldMountContact] = useState(
    () => location.hash === "#contact" || typeof IntersectionObserver === "undefined",
  );

  // Latch permanently when navigating to #contact so form state is never lost on hash changes
  if (location.hash === "#contact" && !shouldMountContact) {
    setShouldMountContact(true);
  }

  useEffect(() => {
    if (shouldMountContact) {
      return;
    }

    const handleHashChange = () => {
      if (window.location.hash === "#contact") {
        setShouldMountContact(true);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    const target = contactTriggerRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      return () => {
        window.removeEventListener("hashchange", handleHashChange);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldMountContact(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(target);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      observer.disconnect();
    };
  }, [shouldMountContact]);

  return (
    <>
      <HeroSection profile={content.profile} />
      <AboutSection
        profile={content.profile}
        education={content.education}
        currentRole={currentRoleLabel}
      />
      <SkillsSection skills={content.skills} healthcareGlossary={content.healthcareGlossary} />
      <ExperienceSection experiences={content.experiences} />
      <ProjectsSection projects={content.projects} />
      <EducationSection education={content.education} certifications={content.certifications} />
      <div ref={contactTriggerRef}>
        {shouldMountContact ? (
          <Suspense fallback={<ContactSectionFallback label={messages.nav.contact} />}>
            <ContactSection profile={content.profile} />
          </Suspense>
        ) : (
          <ContactSectionFallback label={messages.nav.contact} />
        )}
      </div>
    </>
  );
}
