// Copie de test de l'appli (APPLI_TEST=1, cf. scripts/dev-test.mjs) : elle tourne sur une
// copie de la base et ne touche jamais le monde réel — aucun mail ne part, le Drive, les
// tableurs Google et les notifications sont coupés.
export const estCopieDeTest = () => process.env.APPLI_TEST === "1";
