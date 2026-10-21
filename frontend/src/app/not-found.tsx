import { ButtonLink, PageShell } from "@/components/ui";

export default function NotFound() {
  return (
    <PageShell title="Page not found" intro="The page you are looking for does not exist." narrow>
      <ButtonLink href="/">Back to home</ButtonLink>
    </PageShell>
  );
}
