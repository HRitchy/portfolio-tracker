/**
 * Variables d'environnement centralisées avec avertissement au démarrage.
 * Importer ce module côté serveur à la place de process.env direct.
 */

export const env = {
  FRED_API_KEY: process.env.FRED_API_KEY ?? null,
} as const;

if (typeof window === 'undefined' && !env.FRED_API_KEY) {
  console.warn(
    "[env] FRED_API_KEY non définie. /api/fred utilisera le CSV public (données limitées)."
  );
}
