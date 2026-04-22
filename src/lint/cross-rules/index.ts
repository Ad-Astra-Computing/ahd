import { rule as noBrokenInternalLinks } from "./no-broken-internal-links.js";
import type { CrossFileRule } from "../types.js";

export const crossFileRules: CrossFileRule[] = [noBrokenInternalLinks];
