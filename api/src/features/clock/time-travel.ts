/**
 * Time travel is a development and demonstration tool. It is on outside
 * production and can be forced either way with `TIME_TRAVEL=true|false`.
 */
export function isTimeTravelEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.TIME_TRAVEL === 'true') return true;
  if (env.TIME_TRAVEL === 'false') return false;
  return env.NODE_ENV !== 'production';
}
