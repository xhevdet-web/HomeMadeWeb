import { getModel } from "../../data/studioCatalog";
import { useDesignActions, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell } from "../../studio/StudioShell";
import { CaseThumb } from "./CaseCanvas";
import { caseImage, caseInfo, casePrice, designLabel, designPrice } from "./logic";

export function CasePreview() {
  const d = useStudio().drafts.cases;
  const actions = useDesignActions("cases", caseInfo(d));
  const model = getModel(d.modelId)!;
  const image = caseImage(d);
  const title = (
    <>
      Your <em className="font-normal text-primary">case.</em>
    </>
  );

  if (!image) {
    return (
      <StudioShell slug="cases" step={2} title={title}>
        <NothingToPreview slug="cases" message="Add a photo or one of our designs." />
      </StudioShell>
    );
  }

  return (
    <StudioShell slug="cases" step={2} title={title} intro="This is how your case will look. We print it by hand once you order.">
      <PreviewLayout
        visual={
          <div className="[perspective:1000px]">
            <div className="h-[420px] drop-shadow-[0_30px_40px_oklch(0_0_0/0.5)] transition-transform duration-700 hover:[transform:rotateY(-14deg)_rotateX(6deg)] motion-reduce:transition-none sm:h-[480px]">
              <CaseThumb draft={d} />
            </div>
          </div>
        }
      >
        <DetailRows
          rows={[
            ["Phone", model.name],
            ["Design", designLabel(image)],
          ]}
        />
        <PriceLines
          lines={[
            [`${model.name} case`, model.price],
            ...(designPrice(image) ? [[image.uploaded ? "Your photo" : "Design extra", designPrice(image)] as [string, number]] : []),
          ]}
          total={casePrice(d)}
        />
        <PreviewActions
          slug="cases"
          onSave={actions.save}
          onOrder={actions.order}
          orderBlocked={model.soldOut ? "This phone model is no longer available. Choose another one; your image stays." : null}
        />
      </PreviewLayout>
    </StudioShell>
  );
}
