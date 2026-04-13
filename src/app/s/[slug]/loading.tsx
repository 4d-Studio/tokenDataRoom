import { SHARE_PAGE_MAIN_CLASS } from "@/app/s/share-page-shell";
import { ShareExperienceSkeleton } from "@/components/dataroom/route-loading";

export default function ShareLoading() {
  return (
    <main className={SHARE_PAGE_MAIN_CLASS}>
      <div className="pb-20">
        <ShareExperienceSkeleton />
      </div>
    </main>
  );
}
