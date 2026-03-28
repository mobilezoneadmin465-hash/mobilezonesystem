import type { Locale } from "./constants";
import { commonBn, commonEn, ownerBn, ownerEn, retailBn, retailEn } from "./extra-messages";

/** Nested string map for translations (interface avoids recursive type-alias issues). */
interface MessageTree {
  [key: string]: string | MessageTree;
}

const en: MessageTree = {
  shell: {
    brand: "Mobile Zone",
    signOut: "Sign out",
    language: "Language",
    english: "English",
    bangla: "Bangla",
  },
  role: {
    owner: "Owner",
    field: "Field",
    retail: "My store",
  },
  login: {
    title: "Sign in",
    registeredHint: "",
    usernameLabel: "Username or email",
    usernamePlaceholder: "",
    usernameHelp: "",
    continue: "Continue",
    checking: "Checking…",
    changeUser: "Back",
    signingInAs: "",
    pinLabel: "PIN",
    passwordLabel: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    newBusiness: "",
    registerOwner: "Create owner account",
    errEmptyUser: "Required.",
    errNotFound: "Not found.",
    errGeneric: "Error. Try again.",
    errWrongPin: "Wrong PIN.",
    errWrongPassword: "Wrong password.",
  },
  common: commonEn as MessageTree,
  retail: retailEn as MessageTree,
  owner: ownerEn as MessageTree,
};

const bn: MessageTree = {
  shell: {
    brand: "মোবাইল জোন",
    signOut: "সাইন আউট",
    language: "ভাষা",
    english: "ইংরেজি",
    bangla: "বাংলা",
  },
  role: {
    owner: "মালিক",
    field: "ফিল্ড",
    retail: "আমার দোকান",
  },
  login: {
    title: "সাইন ইন",
    registeredHint: "",
    usernameLabel: "ইউজারনেম বা ইমেইল",
    usernamePlaceholder: "",
    usernameHelp: "",
    continue: "এগিয়ে যান",
    checking: "যাচাই হচ্ছে…",
    changeUser: "পিছনে",
    signingInAs: "",
    pinLabel: "পিন",
    passwordLabel: "পাসওয়ার্ড",
    signIn: "সাইন ইন",
    signingIn: "সাইন ইন হচ্ছে…",
    newBusiness: "",
    registerOwner: "মালিক অ্যাকাউন্ট",
    errEmptyUser: "প্রয়োজন।",
    errNotFound: "পাওয়া যায়নি।",
    errGeneric: "ত্রুটি। আবার চেষ্টা করুন।",
    errWrongPin: "ভুল পিন।",
    errWrongPassword: "ভুল পাসওয়ার্ড।",
  },
  common: commonBn as MessageTree,
  retail: retailBn as MessageTree,
  owner: ownerBn as MessageTree,
};

const byLocale: Record<Locale, MessageTree> = { en, bn };

function getLeaf(dict: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || !(p in (cur as MessageTree))) return undefined;
    cur = (cur as MessageTree)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translatePath(locale: Locale, path: string): string {
  const fromLocale = getLeaf(byLocale[locale], path);
  if (fromLocale) return fromLocale;
  const fallback = getLeaf(byLocale.en, path);
  return fallback ?? path;
}
