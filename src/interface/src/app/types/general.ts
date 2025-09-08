export type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> | null : T[K] | null;
};

export interface IdNamePair {
  id: number;
  name: string;
}
