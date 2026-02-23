export const cn = (...v: Array<string | undefined | false>) => v.filter(Boolean).join(" ");

export const normalizeFact = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
