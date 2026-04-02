import { AuthenticatedChromeSkeleton } from "@/components/dataroom/route-loading";

export default function WorkspaceSettingsLoading() {
  return <AuthenticatedChromeSkeleton variant="settings" />;
}
