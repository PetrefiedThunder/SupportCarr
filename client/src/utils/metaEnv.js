let metaEnv = {};

try {
  metaEnv = eval('import.meta');
} catch (error) {
  metaEnv = { env: {} };
}

export const env = metaEnv && metaEnv.env ? metaEnv.env : {};
