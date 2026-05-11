import { Button, Select, Textarea } from "@mantine/core";

type Props = {
  kind: "positive" | "negative";
  title: string;
  value: string;
  placeholder: string;
  minRows: number;
  library: string[];
  chooseHistoryLabel: string;
  saveLabel: string;
  deleteLabel: string;
  onChange: (value: string) => void;
  onChoosePrompt: (kind: "positive" | "negative", prompt: string) => Promise<void>;
  onSavePrompt: (kind: "positive" | "negative") => Promise<void>;
  onDeletePrompt: (kind: "positive" | "negative", prompt: string) => Promise<void>;
};

export function SingleGeneratePromptField(props: Props) {
  return (
    <div className="prompt-field">
      <div className="prompt-toolbar">
        <span>{props.title}</span>
        <div className="prompt-library-actions">
          <Select
            value={props.library.includes(props.value) ? props.value : null}
            data={[
              { value: "", label: props.chooseHistoryLabel },
              ...props.library.map((prompt: string) => ({ value: prompt, label: prompt.slice(0, 48) })),
            ]}
            onChange={(value) => props.onChoosePrompt(props.kind, value ?? "")}
            placeholder={props.chooseHistoryLabel}
          />
          <Button type="button" className="mini-button" onClick={() => props.onSavePrompt(props.kind)}>{props.saveLabel}</Button>
          <Button
            type="button"
            className="mini-button danger-mini"
            disabled={!props.library.includes(props.value)}
            onClick={() => props.onDeletePrompt(props.kind, props.value)}
          >
            {props.deleteLabel}
          </Button>
        </div>
      </div>
      <Textarea
        minRows={props.minRows}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}
