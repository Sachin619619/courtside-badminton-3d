export type Fixture = {
  id: string;
  name: string;
  level: string;
  city: string;
  country: string;
  venue: string;
  prize: string;
  startISO: string;
  endISO: string;
  dateLabel: string;
};

export type FixturePayload = {
  fixtures: Fixture[];
  source: "wikipedia" | "fallback";
  season: number;
  fetchedAt: string;
};

export type TextureSet = {
  id: string;
  label: string;
  authors: string;
  maps: {
    diffuse: string;
    normal?: string;
    rough?: string;
    ao?: string;
  };
};

export type TexturePayload = {
  surfaces: TextureSet[];
  source: "polyhaven" | "fallback";
  fetchedAt: string;
};
