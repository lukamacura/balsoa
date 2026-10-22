import { reach, references, type ReferenceItem } from "@/lib/content";
import { ReachGlobe, type GlobeSite } from "./reach-globe";

// Stage order in `reach.stages`: Europe, Middle East, the Americas.
const stageFor = (lon: number) => (lon < -30 ? 2 : lon > 40 ? 1 : 0);

export function Reach() {
  const seen = new Set<string>();
  const sites: GlobeSite[] = [];
  for (const item of references.groups.flatMap((group): ReferenceItem[] => group.items)) {
    if (!item.coords || seen.has(item.coords.join())) continue;
    seen.add(item.coords.join());
    sites.push({ coords: item.coords, stage: stageFor(item.coords[0]) });
  }

  return <ReachGlobe title={reach.title} stages={reach.stages} sites={sites} />;
}
