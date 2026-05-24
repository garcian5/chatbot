import type { SearchResult } from "../types.js";

export type SearchProvider = {
  name: string;
  search(query: string): Promise<SearchResult[]>;
};

export class NoopSearchProvider implements SearchProvider {
  readonly name = "none";

  async search(): Promise<SearchResult[]> {
    return [];
  }
}
