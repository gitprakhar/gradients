import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  url && anonKey ? createClient(url, anonKey) : null

export interface GradientStopRow {
  color: string
  stop: number
}

/**
 * Logs a gradient generation to Supabase. Fire-and-forget: never throws, never affects UX.
 * Call without await. Errors are swallowed.
 */
export function logGradientGeneration(
  userQuery: string,
  gradientJson: GradientStopRow[] | Record<string, unknown>,
  gradientType: 'linear' | 'radial' = 'linear'
): void {
  if (!supabase) return
  if (!import.meta.env.PROD) return

  void supabase
    .from('gradient_generations')
    .insert({
      user_query: userQuery,
      gradient_json: gradientJson,
      gradient_type: gradientType
    })
    .then(
      (result) => console.log('Logged successfully:', result),
      (error) => console.error('Log error:', error)
    )
}
