export const ROUTES = {
  home: "/",
  newGame: "/new",
  settings: "/settings",
  tournament: (id: string) => `/tournament?id=${encodeURIComponent(id)}`,
} as const;
