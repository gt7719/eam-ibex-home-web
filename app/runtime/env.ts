/**
 * Application runtime boundary.
 *
 * Business modules import environment bindings only from this file. The
 * Cloudflare implementation stays here until the VPS build selects the Node
 * provider at build time. Keeping the boundary explicit prevents application
 * routes from depending directly on a provider-specific module scheme.
 */
import { env as cloudflareEnv } from "cloudflare:workers";
import type { RuntimeEnv } from "./contracts";

export const env = cloudflareEnv as RuntimeEnv;
