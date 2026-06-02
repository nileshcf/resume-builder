import { nanoid } from "nanoid";
import { ResumeDocumentSchema, type ResumeDocument, type Section } from "./resume";

const now = () => new Date().toISOString();

/** A built-in section with sensible starter items, ready to edit. */
function starterSections(): Section[] {
  return [
    {
      id: nanoid(),
      type: "summary",
      title: "Professional Summary",
      visible: true,
      locked: false,
      items: [{ id: nanoid(), fields: { text: "" }, bullets: [] }],
    },
    {
      id: nanoid(),
      type: "experience",
      title: "Experience",
      visible: true,
      locked: false,
      items: [
        {
          id: nanoid(),
          fields: { role: "", org: "", location: "", start: "", end: "" },
          bullets: [{ id: nanoid(), text: "", tailoredFromJD: null }],
        },
      ],
    },
    {
      id: nanoid(),
      type: "education",
      title: "Education",
      visible: true,
      locked: false,
      items: [
        {
          id: nanoid(),
          fields: { degree: "", org: "", location: "", start: "", end: "" },
          bullets: [],
        },
      ],
    },
    {
      id: nanoid(),
      type: "skills",
      title: "Skills",
      visible: true,
      locked: false,
      items: [{ id: nanoid(), fields: { text: "" }, bullets: [] }],
    },
  ];
}

export function createBlankResume(): ResumeDocument {
  const doc = {
    schemaVersion: "1.0" as const,
    id: nanoid(),
    profileId: nanoid(),
    meta: {
      title: "Untitled Resume",
      templateId: "ats-classic",
      locale: "en-US",
      createdAt: now(),
      updatedAt: now(),
      basedOnVariant: null,
    },
    theme: {
      fontFamily: "Calibri" as const,
      baseSizePt: 10.5,
      lineHeight: 1.15,
      sectionGapPt: 8,
      margins: { top: 0.6, right: 0.6, bottom: 0.6, left: 0.6 },
      accentColor: "#1a1a1a",
      pageSize: "Letter" as const,
    },
    header: {
      name: "",
      headline: "",
      contacts: [
        { id: nanoid(), type: "email" as const, value: "", visible: true },
        { id: nanoid(), type: "phone" as const, value: "", visible: true },
        { id: nanoid(), type: "location" as const, value: "", visible: true },
      ],
    },
    sections: starterSections(),
    customSchemas: {},
  };
  // Validate against the canonical schema so we fail fast if drift creeps in.
  return ResumeDocumentSchema.parse(doc);
}
