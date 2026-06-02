import Dexie, { type Table } from "dexie";
import type { ResumeDocument } from "@/schema/resume";

/**
 * Local-first persistence. Every document lives in IndexedDB so a tab close,
 * crash, offline period, or session timeout never loses work (Scenario D).
 * Server sync, if added later, is a background pusher on top of this — never
 * in the critical save path.
 */
export interface VersionSnapshot {
  id: string; // snapshot id
  docId: string;
  takenAt: string;
  label: string; // e.g. "autosnapshot", "before import", "rollback"
  doc: ResumeDocument;
}

class ResumeDB extends Dexie {
  documents!: Table<ResumeDocument, string>;
  versions!: Table<VersionSnapshot, string>;

  constructor() {
    super("resume-builder");
    this.version(1).stores({
      documents: "id, profileId, meta.updatedAt",
      versions: "id, docId, takenAt",
    });
  }
}

export const db = new ResumeDB();

export async function saveDocument(doc: ResumeDocument): Promise<void> {
  await db.documents.put(doc);
}

export async function loadDocument(id: string): Promise<ResumeDocument | undefined> {
  return db.documents.get(id);
}

export async function loadMostRecent(): Promise<ResumeDocument | undefined> {
  return db.documents.orderBy("meta.updatedAt").last();
}

export async function listDocuments(): Promise<ResumeDocument[]> {
  const all = await db.documents.toArray();
  return all.sort((a, b) => b.meta.updatedAt.localeCompare(a.meta.updatedAt));
}

export async function deleteDocument(id: string): Promise<void> {
  await db.documents.delete(id);
  await db.versions.where("docId").equals(id).delete();
}

export async function snapshot(doc: ResumeDocument, label: string): Promise<void> {
  await db.versions.put({
    // unique per (doc, instant, label) so rapid snapshots don't collide
    id: `${doc.id}:${doc.meta.updatedAt}:${label}`,
    docId: doc.id,
    takenAt: doc.meta.updatedAt,
    label,
    doc: structuredClone(doc),
  });
}

export async function listVersions(docId: string): Promise<VersionSnapshot[]> {
  const all = await db.versions.where("docId").equals(docId).toArray();
  return all.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}
