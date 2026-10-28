export const STAFF_ROLES = ["lister", "admin"];

// One entry per staff role. Nav reads everything role-specific from here:
// dashboard base path, default tab, drawer sublinks, account menu tabs.
export const ROLE_DASHBOARDS = {
  lister: {
    base: "/Lister",
    defaultTab: "listings",
    sublinks: [
      { id: "listings", label: "Listings" },
      { id: "add", label: "Add Listing" },
      { id: "analytics", label: "Analytics" },
      { id: "account", label: "Account" },
      { id: "pricing", label: "Pricing" },
      { id: "help", label: "Help" },
    ],
  },
  admin: {
    base: "/Admin",
    defaultTab: "overview",
    sublinks: [
      { id: "overview", label: "Overview" },
      { id: "transactions", label: "Transactions" },
      { id: "listings", label: "Listings" },
      { id: "Account", label: "Account" },
      { id: "Pricing", label: "Pricing" },
    ],
  },
};

// roleTabs maps role -> tab on that role's dashboard. A role absent from
// roleTabs does not see the item. Admin is deliberately absent everywhere
// until the alert channel and admin account page are decided.
const ACCOUNT_MENU_ITEMS = [
  {
    key: "insights",
    label: "Insights",
    icon: "insights",
    roleTabs: { lister: "help" },
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: "bell",
    showBadge: true,
    roleTabs: { lister: "account" },
  },
  {
    key: "profile",
    label: "Profile",
    icon: "user",
    roleTabs: { lister: "account" },
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    roleTabs: { lister: "account" },
  },
  {
    key: "support",
    label: "Help & Support",
    icon: "help",
    roleTabs: { lister: "help" },
  },
];
// Role absent from roleHrefs = item hidden for that role.
const STANDALONE_UTILITY_ITEMS = [
  {
    key: "boards",
    label: "Boards",
    icon: "boards",
    roleHrefs: { lister: "/boards", admin: "/Admin/boards" },
  },
];

export function resolveUtilityItems(role) {
  return STANDALONE_UTILITY_ITEMS.filter((i) => i.roleHrefs[role]).map(
    (i) => ({ ...i, href: i.roleHrefs[role] }),
  );
   }

export function resolveAccountItems(role) {
  const dashboard = ROLE_DASHBOARDS[role];
  if (!dashboard) return [];
  return ACCOUNT_MENU_ITEMS.filter((item) => item.roleTabs[role]).map(
    (item) => ({
      ...item,
      href: `${dashboard.base}?tab=${item.roleTabs[role]}`,
    }),
  );
}