import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import { adjacencyGraphs, dictionary as commonWords } from "@zxcvbn-ts/language-common";
import { dictionary as englishWords } from "@zxcvbn-ts/language-en";

const strength = new ZxcvbnFactory({
  graphs: adjacencyGraphs,
  dictionary: { ...commonWords, ...englishWords },
  maxLength: 128,
});

/** Accept both generated passwords and passphrases, and reject guessable patterns. */
export function isStrongPassword(password: string, name: string, email: string) {
  const words = password
    .replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
    .trim()
    .split(/\s+/u);
  const isPassphrase =
    words.length >= 4 &&
    words.length <= 7 &&
    words.every((word) => /^\p{L}[\p{L}\p{M}]*$/u.test(word)) &&
    new Set(words.map((word) => word.toLowerCase())).size === words.length;
  const hasMixedCharacters =
    /\p{Lu}/u.test(password) &&
    /\p{Ll}/u.test(password) &&
    /\p{Nd}/u.test(password) &&
    /[\p{P}\p{S}]/u.test(password);

  if (!isPassphrase && !hasMixedCharacters) return false;

  const nameParts = name.toLowerCase().split(/\s+/u);
  const userInputs = [
    "blackclover",
    "blackcloverhotels",
    ...nameParts,
    nameParts.join(""),
    email.split("@")[0],
  ].filter((part) => part.length >= 4);

  // Spaces alone should not turn a predictable phrase into a strong password.
  const candidate = isPassphrase ? words.join("") : password;
  return strength.check(candidate, userInputs).score === 4;
}
