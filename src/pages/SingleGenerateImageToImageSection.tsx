type Props = {
  referenceImagePath: string;
  maskImagePath: string;
  referencePreviewSrc: string;
  maskPreviewSrc: string;
  title: string;
  referenceLabel: string;
  referenceAlt: string;
  maskLabel: string;
  maskAlt: string;
  selectedClickClearLabel: string;
  clickToChooseLabel: string;
  onClearReferenceImage: () => void;
  onClearMaskImage: () => void;
  onChooseReferenceImage: () => Promise<void>;
  onChooseMaskImage: () => Promise<void>;
};

export function SingleGenerateImageToImageSection(props: Props) {
  return (
    <section className="panel-section image-to-image-section">
      <div className="panel-subtitle">{props.title}</div>
      <div className="image-picker-grid">
        <button
          className={props.referenceImagePath ? "thumb-box selected" : "thumb-box"}
          onClick={() => (props.referenceImagePath ? props.onClearReferenceImage() : props.onChooseReferenceImage())}
        >
          {props.referencePreviewSrc ? <img src={props.referencePreviewSrc} alt={props.referenceAlt} /> : null}
          <span>{props.referenceLabel}</span>
          <small>{props.referenceImagePath ? props.selectedClickClearLabel : props.clickToChooseLabel}</small>
        </button>
        <button
          className={props.maskImagePath ? "thumb-box selected" : "thumb-box"}
          onClick={() => (props.maskImagePath ? props.onClearMaskImage() : props.onChooseMaskImage())}
        >
          {props.maskPreviewSrc ? <img src={props.maskPreviewSrc} alt={props.maskAlt} /> : null}
          <span>{props.maskLabel}</span>
          <small>{props.maskImagePath ? props.selectedClickClearLabel : props.clickToChooseLabel}</small>
        </button>
      </div>
    </section>
  );
}
