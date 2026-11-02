import { useTranslation } from "react-i18next";
import { ButtonLink } from "../components/Button";
import { Page, PageHeader } from "../components/Page";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader
        eyebrow={t("notFound.eyebrow")}
        title={
          <>
            {t("notFound.title")} <em className="font-normal text-primary">{t("notFound.titleAccent")}</em>
          </>
        }
        intro={t("notFound.intro")}
      />
      <ButtonLink href="#/" className="mt-10">
        {t("common.backHome")}
      </ButtonLink>
    </Page>
  );
}
