import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  ResumeDocument,
  Section,
  SectionType,
} from "@/schema/resume";
import { createBlankResume } from "@/schema/factory";
import {
  saveDocument,
  loadMostRecent,
  loadDocument,
  deleteDocument,
  listDocuments,
  snapshot,
} from "./db";
import type { ResumeDocument as Doc } from "@/schema/resume";

type SaveState = "idle" | "saving" | "saved";

interface ResumeStore {
  doc: ResumeDocument;
  saveState: SaveState;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  /** Replace the whole document (e.g. after an import) and persist it. */
  loadDoc: (doc: ResumeDocument) => void;
  /** Apply a mutation to the document; bumps updatedAt and schedules a save. */
  mutate: (fn: (draft: ResumeDocument) => void) => void;

  // section ops (FULLY DYNAMIC SECTIONS)
  addSection: (type: SectionType, title: string) => void;
  removeSection: (id: string) => void;
  toggleSectionVisible: (id: string) => void;
  reorderSection: (id: string, dir: -1 | 1) => void;

  // item ops
  addItem: (sectionId: string) => void;
  removeItem: (sectionId: string, itemId: string) => void;

  // variants & version history (MULTIPLE VARIANTS & VERSION HISTORY)
  rename: (title: string) => void;
  newResume: () => Promise<void>;
  duplicateAsVariant: () => Promise<void>;
  switchDoc: (id: string) => Promise<void>;
  removeDoc: (id: string) => Promise<void>;
  saveVersion: (label?: string) => Promise<void>;
  restoreVersion: (snapshotDoc: Doc) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastAutoSnapshot = 0;
const AUTO_SNAPSHOT_MS = 3 * 60 * 1000; // at most one auto-version every 3 min

export const useResume = create<ResumeStore>((set, get) => {
  const scheduleSave = () => {
    set({ saveState: "saving" });
    if (saveTimer) clearTimeout(saveTimer);
    // ~300ms debounce: short enough that worst-case loss is trivial,
    // long enough that typing doesn't thrash IndexedDB.
    saveTimer = setTimeout(async () => {
      const doc = get().doc;
      await saveDocument(doc);
      // Throttled auto-snapshot builds a rollback timeline without spamming it.
      const t = Date.now();
      if (t - lastAutoSnapshot > AUTO_SNAPSHOT_MS) {
        lastAutoSnapshot = t;
        await snapshot(doc, "autosave");
      }
      set({ saveState: "saved" });
    }, 300);
  };

  const commit = (mutator: (draft: ResumeDocument) => void) => {
    const next = structuredClone(get().doc);
    mutator(next);
    next.meta.updatedAt = new Date().toISOString();
    set({ doc: next });
    scheduleSave();
  };

  return {
    doc: createBlankResume(),
    saveState: "idle",
    hydrated: false,

    hydrate: async () => {
      const existing = await loadMostRecent();
      if (existing) set({ doc: existing, hydrated: true, saveState: "saved" });
      else {
        const fresh = get().doc;
        await saveDocument(fresh);
        set({ hydrated: true, saveState: "saved" });
      }
    },

    loadDoc: (doc) => {
      doc.meta.updatedAt = new Date().toISOString();
      set({ doc });
      void saveDocument(doc).then(() => set({ saveState: "saved" }));
    },

    mutate: commit,

    addSection: (type, title) =>
      commit((d) => {
        const section: Section = {
          id: nanoid(),
          type,
          title,
          visible: true,
          locked: false,
          items: [{ id: nanoid(), fields: {}, bullets: [] }],
        };
        d.sections.push(section);
      }),

    removeSection: (id) =>
      commit((d) => {
        d.sections = d.sections.filter((s) => s.id !== id || s.locked);
      }),

    toggleSectionVisible: (id) =>
      commit((d) => {
        const s = d.sections.find((x) => x.id === id);
        if (s) s.visible = !s.visible;
      }),

    reorderSection: (id, dir) =>
      commit((d) => {
        const i = d.sections.findIndex((s) => s.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= d.sections.length) return;
        [d.sections[i], d.sections[j]] = [d.sections[j], d.sections[i]];
      }),

    addItem: (sectionId) =>
      commit((d) => {
        const s = d.sections.find((x) => x.id === sectionId);
        if (s) s.items.push({ id: nanoid(), fields: {}, bullets: [] });
      }),

    removeItem: (sectionId, itemId) =>
      commit((d) => {
        const s = d.sections.find((x) => x.id === sectionId);
        if (s) s.items = s.items.filter((it) => it.id !== itemId);
      }),

    rename: (title) => commit((d) => (d.meta.title = title)),

    newResume: async () => {
      const fresh = createBlankResume();
      await saveDocument(fresh);
      set({ doc: fresh, saveState: "saved" });
    },

    // A variant shares the same profileId (one profile → many tailored resumes)
    // and records its lineage via basedOnVariant.
    duplicateAsVariant: async () => {
      const src = get().doc;
      const variant = structuredClone(src);
      variant.id = nanoid();
      variant.profileId = src.profileId;
      variant.meta = {
        ...src.meta,
        title: `${src.meta.title} (variant)`,
        basedOnVariant: src.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveDocument(variant);
      set({ doc: variant, saveState: "saved" });
    },

    switchDoc: async (id) => {
      const target = await loadDocument(id);
      if (target) set({ doc: target, saveState: "saved" });
    },

    removeDoc: async (id) => {
      await deleteDocument(id);
      if (get().doc.id === id) {
        const next = (await listDocuments())[0] ?? createBlankResume();
        await saveDocument(next);
        set({ doc: next, saveState: "saved" });
      }
    },

    saveVersion: async (label = "manual save") => {
      await snapshot(get().doc, label);
    },

    // Restoring is non-destructive: snapshot the current state first, then load
    // the chosen snapshot (same doc id, so it overwrites the live document).
    restoreVersion: async (snapshotDoc) => {
      await snapshot(get().doc, "before restore");
      const restored = structuredClone(snapshotDoc);
      restored.meta.updatedAt = new Date().toISOString();
      await saveDocument(restored);
      set({ doc: restored, saveState: "saved" });
    },
  };
});
