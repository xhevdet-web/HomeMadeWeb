import { ButtonLink } from "../components/Button";
import { Page, PageHeader } from "../components/Page";

export default function NotFoundPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Page not found"
        title={
          <>
            Nothing here. <em className="font-normal text-primary">Yet.</em>
          </>
        }
        intro="This page doesn't exist, but your next idea could."
      />
      <ButtonLink href="#/" className="mt-10">
        Back to home
      </ButtonLink>
    </Page>
  );
}
