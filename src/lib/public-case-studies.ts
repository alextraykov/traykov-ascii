import type { CaseStudy } from "./content";

export const featuredCaseStudyIds = [
  "designing-pave",
  "designing-synapse-sys",
  "pipelines",
  "connection-central"
] as const;

export const supportingCaseStudyIds = ["pave-new-look", "pave-breathing-grids", "pave-loading-animation", "synapse-sys"] as const;

export const caseStudyParentIds: Readonly<Record<string, string>> = {
  "pave-new-look": "designing-pave",
  "pave-breathing-grids": "designing-pave",
  "pave-loading-animation": "designing-pave"
};

export const publicCaseStudyIds = [...featuredCaseStudyIds, ...supportingCaseStudyIds] as const;

const publicCaseStudyIdSet = new Set<string>(publicCaseStudyIds);

export function isPublicCaseStudy(id: string): boolean {
  return publicCaseStudyIdSet.has(id);
}

export function getCaseStudyParentId(id: string): string | undefined {
  return caseStudyParentIds[id];
}

export function getPublicCaseStudies(studies: CaseStudy[]): CaseStudy[] {
  return publicCaseStudyIds
    .map((id) => studies.find((study) => study.id === id))
    .filter((study): study is CaseStudy => study !== undefined);
}

function getStudiesById(studies: CaseStudy[], ids: readonly string[]): CaseStudy[] {
  return ids
    .map((id) => studies.find((study) => study.id === id))
    .filter((study): study is CaseStudy => study !== undefined);
}

export function getFeaturedCaseStudies(studies: CaseStudy[]): CaseStudy[] {
  return getStudiesById(studies, featuredCaseStudyIds);
}

export function getSupportingCaseStudies(studies: CaseStudy[]): CaseStudy[] {
  return getStudiesById(studies, supportingCaseStudyIds);
}
