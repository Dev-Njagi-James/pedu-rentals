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
      { id: "help", label: "Documentation" },
      { id: "inbox", label: "Inbox"},
    ],
  },
  admin: {
    base: "/Admin",
    defaultTab: "overview",
    sublinks: [
      { id: "overview", label: "Overview" },
      { id: "transactions", label: "Transactions" },
      { id: "listings", label: "Listings" },
      { id: "account", label: "Account" },
      { id: "pricing", label: "Pricing" },
      { id: "inbox", label: "Inbox" },
      { id: "help", label: "Documentation" },
    ],
  },
};
