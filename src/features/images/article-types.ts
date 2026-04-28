import articleTypes from "./article-types.jsonc";

export interface ArticleTypeDefinition {
  type: string;
  name: string;
  signals: string;
  scenarios: string[];
}

export interface ArticleTypesFile {
  article_types: ArticleTypeDefinition[];
}

export function readArticleTypes(): ArticleTypesFile {
  return articleTypes as ArticleTypesFile;
}
