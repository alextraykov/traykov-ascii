export type IdentityArticle = "a" | "an" | "";

export type IdentityEntry = {
  english: string;
  bulgarian: string;
  article: IdentityArticle;
};

export const identityEntries: IdentityEntry[] = [
  { english: "father", bulgarian: "баща", article: "a" },
  { english: "husband", bulgarian: "съпруг", article: "a" },
  { english: "designer", bulgarian: "дизайнер", article: "a" },
  { english: "animator", bulgarian: "аниматор", article: "an" },
  { english: "thinker", bulgarian: "мислител", article: "a" },
  { english: "teammate", bulgarian: "съратник", article: "a" },
  { english: "fighter", bulgarian: "боец", article: "a" },
  { english: "grappler", bulgarian: "граплър", article: "a" },
  { english: "brother", bulgarian: "брат", article: "a" },
  { english: "son", bulgarian: "син", article: "a" },
  { english: "writer", bulgarian: "писател", article: "a" },
  { english: "friend", bulgarian: "приятел", article: "a" },
  { english: "believer", bulgarian: "вярващ", article: "a" },
  { english: "yapper", bulgarian: "бърборив", article: "a" },
  { english: "cyclist", bulgarian: "колоездач", article: "a" },
  { english: "tall", bulgarian: "висок", article: "" },
  { english: "Bulgarian", bulgarian: "българин", article: "a" },
  { english: "honest", bulgarian: "честен", article: "" }
];

export const identityWords = identityEntries.map(({ english }) => english);

export const identityTranslations: Record<string, string> = Object.fromEntries(
  identityEntries.map(({ english, bulgarian }) => [english, bulgarian])
);
