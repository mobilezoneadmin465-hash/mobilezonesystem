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
};

/** Sidebar: lookup by exact href */
export const EN_NAV: Record<string, string> = {
  "/owner/dashboard": "Home",
  "/owner/catalog": "Stock",
  "/owner/shops": "Stores",
  "/owner/place-order": "New order",
  "/owner/orders": "Orders",
  "/owner/orders/history": "Past",
  "/owner/analytics": "Stats",
  "/owner/team": "Team",
  "/owner/payments": "Pay",
  "/owner/summary": "Today",
  "/owner/transactions": "Log",
  "/owner/account": "Profile",
  "/sr/dashboard": "Home",
  "/sr/to-deliver": "Deliver",
  "/sr/warehouse": "Warehouse",
  "/sr/office": "Office",
  "/sr/deliveries": "Shipments",
  "/retail": "Home",
  "/retail/place-order": "Order",
  "/retail/deliveries": "Receive",
  "/retail/orders": "Orders",
  "/retail/pay": "Pay",
  "/retail/account": "Profile",
};
