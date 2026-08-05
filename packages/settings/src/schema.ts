import { z } from "zod";

/**
 * Central configuration schema for Zentrail IDE.
 *
 * This is the single source of truth for user-facing settings. Main-process /
 * core services read and validate against {@link SettingsSchema}; {@link
 * DEFAULT_SETTINGS} is the fallback when storage is missing or invalid. Keep
 * ports, paths, and theme tokens out of app code — reference them through
 * `configs/` and this module instead.
 */

export const ThemeModeSchema = z.enum(["dark", "light"]).default("dark");

export const SettingsSchema = z
  .object({
    themeMode: ThemeModeSchema,
    accent: z.string().regex(/^#([0-9a-fA-F]{6})$/).default("#2f81f7"),
    defaultSkillTab: z.enum(["files", "info"]).default("files"),
    preferredTerminal: z.enum(["system", "powershell", "cmd", "git-bash"]).default("system"),
    windowBlur: z.boolean().default(true),
    goCoreUrl: z.string().url().default("http://127.0.0.1:7341"),
    pythonRtUrl: z.string().url().default("http://127.0.0.1:7342"),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
