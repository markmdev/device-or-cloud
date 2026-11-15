import { collection, doc, getDocs, getFirestore, serverTimestamp, setDoc } from "firebase/firestore/lite";
import { app } from "./firebase";
import { markKey, type Judged, type Mark } from "./results/judges";

const marks = collection(getFirestore(app), "labels");

/** Every person's mark so far, by what it belongs to. */
export async function readMarks(): Promise<Map<string, Mark>> {
  const all = await getDocs(marks);
  return new Map(all.docs.map((d) => [markKey(d.get("feature"), d.get("input"), d.get("answer")), { good: d.get("good"), by: d.get("by") }]));
}

/** Keeps a mark. An answer keeps its first one: the rules refuse a second, and this then fails. */
export async function saveMark({ feature, c, answer }: Judged, good: boolean, by: string): Promise<void> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(markKey(feature.id, c.id, answer)));
  const id = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  await setDoc(doc(marks, id), { feature: feature.id, input: c.id, answer, good, by, at: serverTimestamp() });
}
