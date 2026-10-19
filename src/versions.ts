export const betaCmmfVersion = "1.3.0-beta.1" as const;
export type CmmfVersion = "1.2.0" | typeof betaCmmfVersion;
export const defaultCmmfVersion: CmmfVersion = "1.2.0";
export const CMMF_VERSIONS: CmmfVersion[] = [
  defaultCmmfVersion,
  betaCmmfVersion,
];
export const CMMF_VERSION_INFO: Record<
  CmmfVersion,
  { label: string; status: "stable" | "beta"; description: string }
> = {
  "1.2.0": {
    label: "CMMF 1.2.0",
    status: "stable",
    description: "Current stable CMMF release",
  },
  "1.3.0-beta.1": {
    label: "CMMF 1.3.0-beta.1",
    status: "beta",
    description: "Document-level validation hints — experimental",
  },
};
export function isCmmfVersion(value: unknown): value is CmmfVersion {
  return (
    typeof value === "string" && (CMMF_VERSIONS as string[]).includes(value)
  );
}
export function resolveCmmfVersion(value: unknown): CmmfVersion {
  // Resolve the earlier Studio shorthand explicitly, then save the exact release.
  if (value === "1.3.0-beta") return betaCmmfVersion;
  if (isCmmfVersion(value)) return value;
  throw Error(
    `Unsupported CMMF version: ${String(value)}. Choose 1.2.0 or ${betaCmmfVersion}.`,
  );
}
