type RuntimeEnvironment = Record<string, unknown> & {
  sentry?: Record<string, unknown>;
};

declare global {
  interface Window {
    __PLANSCAPE_CONFIG__?: RuntimeEnvironment;
  }
}

export function applyRuntimeConfig<T extends RuntimeEnvironment>(base: T): T {
  const runtimeConfig = globalThis.window?.__PLANSCAPE_CONFIG__ ?? {};

  return {
    ...base,
    ...runtimeConfig,
    sentry: {
      ...base.sentry,
      ...runtimeConfig.sentry,
    },
  };
}
