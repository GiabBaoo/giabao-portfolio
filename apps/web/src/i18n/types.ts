export type Locale = "en" | "vi";

export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "vi"] as const;
export const LOCALE_STORAGE_KEY = "giabao-portfolio-locale";

export interface Messages {
  readonly meta: {
    readonly siteTitle: string;
    readonly siteDescription: string;
  };
  readonly nav: {
    readonly primaryLabel: string;
    readonly skipToContent: string;
    readonly home: string;
    readonly about: string;
    readonly skills: string;
    readonly experience: string;
    readonly projects: string;
    readonly education: string;
    readonly contact: string;
    readonly menuOpen: string;
    readonly menuClose: string;
  };
  readonly theme: {
    readonly groupLabel: string;
    readonly light: string;
    readonly dark: string;
    readonly system: string;
  };
  readonly language: {
    readonly groupLabel: string;
    readonly switchToEn: string;
    readonly switchToVi: string;
  };
  readonly hero: {
    readonly eyebrow: string;
    readonly coreFocusLabel: string;
    readonly viewProjectsCta: string;
    readonly downloadCvCta: string;
    readonly contactCta: string;
    readonly socialLinksLabel: string;
    readonly snapshotTitle: string;
    readonly snapshotRoleLabel: string;
    readonly snapshotRoleValue: string;
    readonly snapshotUniversityLabel: string;
    readonly snapshotUniversityValue: string;
    readonly snapshotPrimaryStackLabel: string;
    readonly snapshotPrimaryStackValue: string;
    readonly snapshotLocationLabel: string;
    readonly decorativeQueryLabel: string;
  };
  readonly about: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly quickFactsTitle: string;
    readonly locationLabel: string;
    readonly educationLabel: string;
    readonly currentRoleLabel: string;
    readonly focusLabel: string;
    readonly focusValue: string;
  };
  readonly skills: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly subtitle: string;
    readonly glossaryHeading: string;
    readonly glossaryDescription: string;
  };
  readonly experience: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly subtitle: string;
    readonly technicalHeading: string;
    readonly technicalBadge: string;
    readonly otherHeading: string;
    readonly otherDescription: string;
    readonly showOtherLabel: string;
    readonly hideOtherLabel: string;
    readonly confidentialityNote: string;
  };
  readonly projects: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly subtitle: string;
    readonly filterGroupLabel: string;
    readonly filterAll: string;
    readonly filterPersonal: string;
    readonly filterAcademic: string;
    readonly typePersonal: string;
    readonly typeAcademic: string;
    readonly keyFeaturesLabel: string;
    readonly technologiesLabel: string;
    readonly roleLabel: string;
    readonly viewGithub: string;
    readonly viewDemo: string;
    readonly viewDetails: string;
    readonly backToProjects: string;
    readonly notFoundTitle: string;
    readonly notFoundDescription: string;
    readonly linksPendingNote: string;
    readonly emptyFilterState: string;
    readonly mockupBadge: string;
  };
  readonly education: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly gpaLabel: string;
    readonly periodLabel: string;
    readonly certificationsHeading: string;
    readonly certificationsSubtitle: string;
    readonly viewCredential: string;
  };
  readonly contact: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly subtitle: string;
    readonly directChannelsTitle: string;
    readonly emailLabel: string;
    readonly githubLabel: string;
    readonly linkedinLabel: string;
    readonly copyEmail: string;
    readonly emailCopied: string;
    readonly copyEmailFailed: string;
    readonly formTitle: string;
    readonly nameLabel: string;
    readonly namePlaceholder: string;
    readonly emailInputLabel: string;
    readonly emailPlaceholder: string;
    readonly subjectLabel: string;
    readonly subjectPlaceholder: string;
    readonly messageLabel: string;
    readonly messagePlaceholder: string;
    readonly submitLabel: string;
    readonly submittingLabel: string;
    readonly successMessage: string;
    readonly turnstile: {
      readonly label: string;
      readonly loading: string;
      readonly expired: string;
      readonly error: string;
      readonly loadError: string;
      readonly retry: string;
      readonly missingSiteKey: string;
    };
    readonly validation: {
      readonly nameRequired: string;
      readonly nameTooLong: string;
      readonly emailRequired: string;
      readonly emailTooLong: string;
      readonly emailInvalid: string;
      readonly subjectTooLong: string;
      readonly messageRequired: string;
      readonly messageTooShort: string;
      readonly messageTooLong: string;
      readonly turnstileRequired: string;
      readonly turnstileInvalid: string;
      readonly fieldInvalid: string;
      readonly payloadTooLarge: string;
    };
    readonly errors: {
      readonly validationError: string;
      readonly turnstileFailed: string;
      readonly turnstileUnavailable: string;
      readonly rateLimited: string;
      readonly payloadTooLarge: string;
      readonly unsupportedMediaType: string;
      readonly serviceUnavailable: string;
      readonly internalError: string;
      readonly networkError: string;
      readonly timeoutError: string;
    };
  };
  readonly common: {
    readonly present: string;
    readonly pendingConfirmation: string;
    readonly backToTop: string;
    readonly footerCopyright: string;
    readonly footerBuiltWith: string;
  };
  readonly skillCategories: {
    readonly databases: string;
    readonly backend: string;
    readonly other: string;
    readonly healthcare: string;
  };
  readonly notFound: {
    readonly badge: string;
    readonly title: string;
    readonly description: string;
    readonly backHome: string;
  };
  readonly errorBoundary: {
    readonly badge: string;
    readonly title: string;
    readonly description: string;
    readonly chunkErrorDescription: string;
    readonly reload: string;
    readonly backHome: string;
  };
}
