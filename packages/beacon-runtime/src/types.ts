export type BeaconFieldType = "text" | "html" | "image-src" | "href";

export type BeaconBlockOverrides = Record<string, string>;

export type BeaconBlock = {
  id: string;
  componentId: string;
  overrides: BeaconBlockOverrides;
};

export type BeaconComposition = {
  v: 1;
  slots: Record<string, BeaconBlock[]>;
};

export type RenderContext = {
  root: ParentNode;
  warn?: (msg: string) => void;
};
