import { Button, TextInput } from "@mantine/core";

type Props = {
  referenceLibraryDir: string;
  noReferenceLibraryLabel: string;
  referenceLibraryLabel: string;
  chooseFolderLabel: string;
  randomReferenceLabel: string;
  clearLibraryLabel: string;
  onChooseReferenceLibraryDir: () => Promise<void>;
  onPickReferenceFromLibrary: () => Promise<void>;
  onClearReferenceLibraryDir: () => Promise<void>;
};

export function SingleGenerateReferenceLibrarySection(props: Props) {
  return (
    <section className="panel-section">
      <div className="path-picker path-picker-mantine">
        <TextInput
          label={props.referenceLibraryLabel}
          value={props.referenceLibraryDir || props.noReferenceLibraryLabel}
          readOnly
        />
        <Button type="button" className="ghost-button" onClick={props.onChooseReferenceLibraryDir}>{props.chooseFolderLabel}</Button>
      </div>
      <div className="style-library-actions">
        <Button type="button" className="ghost-button" disabled={!props.referenceLibraryDir} onClick={props.onPickReferenceFromLibrary}>
          {props.randomReferenceLabel}
        </Button>
        <Button type="button" className="ghost-button" disabled={!props.referenceLibraryDir} onClick={props.onClearReferenceLibraryDir}>
          {props.clearLibraryLabel}
        </Button>
      </div>
    </section>
  );
}
