/** Skill model — placeholder for the Phase 10 Skill System. */
export type SkillType = "code-generation" | "code-review" | "security" | "documentation" | "refactoring" | "testing" | "devops" | "database" | "api";

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  version: string;
  description: string;
}
