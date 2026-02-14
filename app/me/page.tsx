import { getMyUploadedPhotos, getMyTaggedRuns } from "@/app/actions/users";
import { MeContent } from "@/app/me/me-content";
import { NavBar } from "@/app/components/nav-bar";

export default async function MePage() {
  const [uploadedPhotos, taggedRuns] = await Promise.all([
    getMyUploadedPhotos(),
    getMyTaggedRuns(),
  ]);

  return (
    <>
      <main className="max-w-xl mx-auto px-4 pt-4 md:pt-20 pb-20">
        <h1 className="text-2xl font-bold text-foreground mb-4">My Photos</h1>

        <MeContent uploadedPhotos={uploadedPhotos} taggedRuns={taggedRuns} />
      </main>

      <NavBar />
    </>
  );
}
