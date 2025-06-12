declare interface Env {
  readonly NODE_ENV: string;

  [key: string]: any;
}

declare interface ImportMeta {
  readonly env: Env;
}
