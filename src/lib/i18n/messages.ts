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
    registeredHint: "Account ready — sign in below.",
    usernameLabel: "Username or email",
    usernamePlaceholder: "e.g. ali.rep or you@company.com",
    usernameHelp: "Owners can use their username or email. Store and field staff use the username your owner gave you.",
    continue: "Continue",
    checking: "Checking…",
    changeUser: "← Change username",
    signingInAs: "Signing in as",
    pinLabel: "6-digit PIN",
    passwordLabel: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    newBusiness: "New business?",
    registerOwner: "Register owner",
    errEmptyUser: "Enter your username or email.",
    errNotFound: "We couldn’t find that username. Check spelling or ask your owner.",
    errGeneric: "Something went wrong. Try again.",
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
    registeredHint: "অ্যাকাউন্ট তৈরি — নিচে সাইন ইন করুন।",
    usernameLabel: "ইউজারনেম বা ইমেইল",
    usernamePlaceholder: "যেমন ali.rep বা you@company.com",
    usernameHelp:
      "মালিকরা ইউজারনেম বা ইমেইল ব্যবহার করতে পারেন। দোকান ও ফিল্ড স্টাফ মালিক দেওয়া ইউজারনেম ব্যবহার করবেন।",
    continue: "এগিয়ে যান",
    checking: "যাচাই হচ্ছে…",
    changeUser: "← ইউজারনেম বদলান",
    signingInAs: "সাইন ইন করছেন",
    pinLabel: "৬ সংখ্যার পিন",
    passwordLabel: "পাসওয়ার্ড",
    signIn: "সাইন ইন",
    signingIn: "সাইন ইন হচ্ছে…",
    newBusiness: "নতুন ব্যবসা?",
    registerOwner: "মালিক রেজিস্টার",
    errEmptyUser: "ইউজারনেম বা ইমেইল লিখুন।",
    errNotFound: "এই ইউজারনেম পাওয়া যায়নি। বানান দেখুন বা মালিককে জিজ্ঞেস করুন।",
    errGeneric: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।",
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
