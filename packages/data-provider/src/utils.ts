export const envVarRegex = /^\${(.+)}$/;

/** Extracts the environment variable name from a template literal string */
export function extractVariableName(value: string): string | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(envVarRegex);
  return match ? match[1] : null;
}

/** Extracts the value of an environment variable from a string. */
export function extractEnvVariable(value: string) {
  if (!value) {
    return value;
  }

  // Trim the input
  const trimmed = value.trim();

  // Special case: if it's just a single environment variable
  const singleMatch = trimmed.match(envVarRegex);
  if (singleMatch) {
    const varName = singleMatch[1];
    return process.env[varName] || trimmed;
  }

  // For multiple variables, process them using a regex loop
  const regex = /\${([^}]+)}/g;
  let result = trimmed;

  // First collect all matches and their positions
  const matches = [];
  let match;
  while ((match = regex.exec(trimmed)) !== null) {
    matches.push({
      fullMatch: match[0],
      varName: match[1],
      index: match.index,
    });
  }

  // Process matches in reverse order to avoid position shifts
  for (let i = matches.length - 1; i >= 0; i--) {
    const { fullMatch, varName, index } = matches[i];
    const envValue = process.env[varName] || fullMatch;

    // Replace at exact position
    result = result.substring(0, index) + envValue + result.substring(index + fullMatch.length);
  }

  return result;
}

/**
 * List of allowed user fields that can be used in placeholder substitution.
 * These are non-sensitive string/boolean fields from the user object.
 */
export const ALLOWED_USER_FIELDS = [
  'name',
  'username', 
  'email',
  'provider',
  'role',
  'googleId',
  'facebookId',
  'openidId',
  'samlId',
  'ldapId',
  'githubId',
  'discordId',
  'appleId',
  'emailVerified',
  'twoFactorEnabled',
  'termsAccepted',
] as const;

/**
 * Processes a string value to replace user field placeholders
 * @param value - The string value to process
 * @param user - The user object
 * @returns The processed string with placeholders replaced
 */
export function processUserPlaceholders(value: string, user?: any): string {
  if (!user || typeof value !== 'string') {
    return value;
  }

  // Handle special case for user ID
  if (value === '{{LIBRECHAT_USER_ID}}' && user?.id != null) {
    return String(user.id);
  }

  for (const field of ALLOWED_USER_FIELDS) {
    const placeholder = `{{LIBRECHAT_USER_${field.toUpperCase()}}}`;
    if (value.includes(placeholder)) {
      const fieldValue = user[field];
      const replacementValue = fieldValue != null ? String(fieldValue) : '';
      value = value.replace(new RegExp(placeholder, 'g'), replacementValue);
    }
  }

  return value;
}

/**
 * Processes an object's string values to replace environment variables and user placeholders
 * @param obj - The object to process (e.g., headers, env vars)
 * @param user - The user object containing user fields
 * @returns The processed object with variables replaced
 */
export function processConfigObject(obj: Record<string, string>, user?: any): Record<string, string> {
  const processed: Record<string, string> = {};
  
  if (obj && typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      try {
        let processedValue = extractEnvVariable(value);
        processedValue = processUserPlaceholders(processedValue, user);
        processed[key] = processedValue;
      } catch {
        processed[key] = 'null';
      }
    });
  }
  
  return processed;
}
