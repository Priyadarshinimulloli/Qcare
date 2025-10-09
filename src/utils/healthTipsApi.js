import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";

// Fetch health tips optionally filtered by category
export async function fetchTips(category = null) {
  const coll = collection(db, "healthTips");
  if (!category) {
    const snapshot = await getDocs(coll);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const q = query(coll, where("category", "==", category));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// user habits documents are stored under `userHabits/{userId}_{YYYY-MM-DD}`
function userDocRef(userId, dateStr) {
  const id = `${userId}_${dateStr}`;
  return doc(db, "userHabits", id);
}

export async function fetchUserHabits(userId, date = null) {
  const dateStr = date || new Date().toISOString().split("T")[0];
  const ref = userDocRef(userId, dateStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { completedTips: [], date: dateStr };
  return { ...snap.data(), id: snap.id };
}

export async function toggleTipCompletion(userId, tipId, newCompletedTips = null) {
  const dateStr = new Date().toISOString().split("T")[0];
  const ref = userDocRef(userId, dateStr);

  // If caller provided the new array, just set it (idempotent)
  if (Array.isArray(newCompletedTips)) {
    await setDoc(ref, {
      completedTips: newCompletedTips,
      date: dateStr,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return;
  }

  // otherwise toggle single value atomically: read existing and update
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { completedTips: [tipId], date: dateStr, createdAt: serverTimestamp() });
    return;
  }

  const data = snap.data();
  const has = Array.isArray(data.completedTips) && data.completedTips.includes(tipId);
  if (has) {
    await updateDoc(ref, { completedTips: arrayRemove(tipId), updatedAt: serverTimestamp() });
  } else {
    await updateDoc(ref, { completedTips: arrayUnion(tipId), updatedAt: serverTimestamp() });
  }
}

// Optional: fetch a small streak summary for the last N days (counts of completed tips) - lightweight
export async function fetchStreakSummary(userId, days = 7) {
  const results = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const ref = userDocRef(userId, dateStr);
    const snap = await getDoc(ref);
    results.push({ date: dateStr, completed: snap.exists() ? (snap.data().completedTips || []).length : 0 });
  }
  return results.reverse();
}
