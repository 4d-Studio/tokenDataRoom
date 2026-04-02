import { AuthenticatedChromeSkeleton } from "@/components/dataroom/route-loading";

export default function WorkspaceLoading() {
  return <AuthenticatedChromeSkeleton variant="workspace" />;
}
