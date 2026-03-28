/**
 * Single source of UI copy (English only). Bengali is generated via
 * /api/translate/bundle when GOOGLE_TRANSLATE_API_KEY is set, then cached in the browser.
 * Bump I18N_BUNDLE_VERSION in constants.ts after changing strings so clients refetch.
 */

export interface MessageTree {
  [key: string]: string | MessageTree;
}

/** Dot-path keys: shell.brand, login.title, … */
export const EN_UI: MessageTree = {
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
    usernameHelp:
      "Owners can use their username or email. Store and field staff use the username your owner gave you.",
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
};

/** Sidebar: lookup by exact href */
export const EN_NAV: Record<string, string> = {
  "/owner/dashboard": "Home",
  "/owner/catalog": "Stock",
  "/owner/shops": "Stores",
  "/owner/place-order": "Place order",
  "/owner/orders": "Orders",
  "/owner/orders/history": "Past orders",
  "/owner/analytics": "Analytics",
  "/owner/team": "Field team",
  "/owner/payments": "Approve pay",
  "/owner/summary": "Today",
  "/owner/transactions": "Activity",
  "/owner/account": "Profile",
  "/sr/dashboard": "Home",
  "/sr/to-deliver": "To deliver",
  "/sr/warehouse": "Warehouse",
  "/sr/office": "Office",
  "/sr/deliveries": "Shipments",
  "/retail": "Home",
  "/retail/place-order": "Order",
  "/retail/deliveries": "Receive",
  "/retail/orders": "Orders",
  "/retail/pay": "Pay due",
  "/retail/account": "Profile",
};
