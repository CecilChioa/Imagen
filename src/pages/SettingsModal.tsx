import {
  Button,
  Card,
  Divider,
  Group,
  Modal,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  apiSignupProviders,
  apiVersionByProvider,
  providerOptionKeys,
} from "../config/settings";
import type { ApiProfile, ApiProvider, ApiSignupProvider, Settings } from "../types/app";

type Props = {
  open: boolean;
  draftSettings: Settings;
  editingProfileId: string;
  editingProfile?: ApiProfile;
  localModelName: string;
  localModelBaseUrl: string;
  localModelId: string;
  apiSignupOpen: boolean;
  releaseNotesOpen: boolean;
  aboutOpen: boolean;
  localModelOpen: boolean;
  onClose: () => void;
  onSelectProfile: (id: string) => void;
  onDraftSettingsChange: (next: Settings) => void;
  onAddProfile: () => void;
  onUpdateEditingProfile: (patch: Partial<ApiProfile>) => void;
  onDeleteProfile: (id: string) => void;
  onChooseOutputDir: () => Promise<void>;
  onSaveAllSettings: () => Promise<void>;
  onSetApiSignupOpen: (open: boolean) => void;
  onSetReleaseNotesOpen: (open: boolean) => void;
  onSetAboutOpen: (open: boolean) => void;
  onSetLocalModelOpen: (open: boolean) => void;
  onOpenApiSignup: (provider: ApiSignupProvider) => Promise<void>;
  onLocalModelNameChange: (value: string) => void;
  onLocalModelBaseUrlChange: (value: string) => void;
  onLocalModelIdChange: (value: string) => void;
  onConnectLocalModel: () => void;
};

const releaseNotes = [
  { version: "v1.4", contentKey: "settings.releaseNote14" },
  { version: "v1.3", contentKey: "settings.releaseNote13" },
  { version: "v1.2", contentKey: "settings.releaseNote12" },
  { version: "v1.1", contentKey: "settings.releaseNote11" },
];

export function SettingsModal(props: Props) {
  const { t } = useTranslation();

  return (
    <>
      <Modal
        opened={props.open}
        onClose={props.onClose}
        title={<Title order={2}>{t("settings.title")}</Title>}
        size="xl"
        centered
        classNames={{ content: "settings-modal-content", body: "settings-modal-body" }}
      >
        <Stack gap="lg">
          <SimpleGrid className="settings-api-grid" cols={{ base: 1, sm: 2 }} spacing="lg">
            <Card className="settings-card settings-api-list-card" withBorder>
              <Stack className="settings-api-list-stack" gap="sm">
                <Group className="settings-api-header" justify="space-between" align="center" wrap="nowrap">
                  <Title className="settings-api-title" order={3}>{t("settings.apiConfig")}</Title>
                  <Group className="settings-api-actions" gap="xs" wrap="nowrap">
                    <Button
                      className="settings-api-action-button"
                      variant="light"
                      disabled={props.draftSettings.apiProfiles.length <= 1 || !props.editingProfile}
                      onClick={() => props.editingProfile && props.onDeleteProfile(props.editingProfile.id)}
                    >
                      {t("settings.deleteCurrentApi")}
                    </Button>
                    <Button className="settings-api-action-button" variant="light" onClick={props.onAddProfile}>{t("settings.addApi")}</Button>
                  </Group>
                </Group>
                <div className="settings-profile-scroll">
                  <Stack gap="xs">
                    {props.draftSettings.apiProfiles.map((profile) => (
                      <Button
                        key={profile.id}
                        className={profile.id === props.editingProfileId ? "settings-profile-item active" : "settings-profile-item"}
                        variant="subtle"
                        onClick={() => props.onSelectProfile(profile.id)}
                      >
                        <span className="settings-profile-name">{profile.name}</span>
                        <span className="settings-profile-model">{profile.model}</span>
                      </Button>
                    ))}
                  </Stack>
                </div>
              </Stack>
            </Card>

            <Card className="settings-card settings-current-card" withBorder>
              <Stack className="settings-current-form" gap="xs">
                <TextInput
                  className="settings-current-field"
                  label={t("settings.profileName")}
                  value={props.editingProfile?.name ?? ""}
                  onChange={(e) => props.onUpdateEditingProfile({ name: e.target.value })}
                />
                <PasswordInput
                  className="settings-current-field"
                  label={t("settings.apiKey")}
                  value={props.editingProfile?.apiKey ?? ""}
                  onChange={(e) => props.onUpdateEditingProfile({ apiKey: e.target.value })}
                />
                <TextInput
                  className="settings-current-field"
                  label={t("settings.apiUrl")}
                  value={props.editingProfile?.apiBaseUrl ?? ""}
                  onChange={(e) => props.onUpdateEditingProfile({ apiBaseUrl: e.target.value })}
                />
                <Select
                  className="settings-current-field"
                  label={t("settings.provider")}
                  value={props.editingProfile?.provider ?? "openai_compatible"}
                  data={providerOptionKeys.map((option) => ({
                    value: option.value,
                    label: `${t(option.labelKey)} (${apiVersionByProvider[option.value]})`,
                  }))}
                  onChange={(value) => {
                    if (!value) return;
                    const provider = value as ApiProvider;
                    props.onUpdateEditingProfile({
                      provider,
                      apiVersion: apiVersionByProvider[provider],
                    });
                  }}
                  allowDeselect={false}
                />
                <TextInput
                  className="settings-current-field settings-current-model-field"
                  label={t("settings.modelName")}
                  value={props.editingProfile?.model ?? ""}
                  onChange={(e) => props.onUpdateEditingProfile({ model: e.target.value })}
                />
              </Stack>
            </Card>
          </SimpleGrid>

          <Card className="settings-card settings-output-card" withBorder>
            <Stack gap="sm">
              <Select
                label={t("settings.language")}
                value={props.draftSettings.language}
                data={[
                  { value: "zh-CN", label: t("settings.languageZhCn") },
                  { value: "en-US", label: t("settings.languageEnUs") },
                ]}
                onChange={(value) =>
                  value && props.onDraftSettingsChange({ ...props.draftSettings, language: value as Settings["language"] })
                }
                allowDeselect={false}
              />
              <Group className="settings-output-row" align="end" grow>
                <TextInput
                  label={t("settings.outputDir")}
                  value={props.draftSettings.outputDir}
                  onChange={(e) => props.onDraftSettingsChange({ ...props.draftSettings, outputDir: e.target.value })}
                />
                <Button className="settings-output-picker" variant="light" onClick={props.onChooseOutputDir}>{t("settings.chooseFolder")}</Button>
              </Group>
            </Stack>
          </Card>

          <Group className="settings-footer" justify="space-between" align="center">
            <Group className="settings-footer-actions" gap="xs">
              <Button variant="subtle" onClick={() => props.onSetApiSignupOpen(true)}>{t("settings.getApi")}</Button>
              <Button variant="subtle" onClick={() => props.onSetReleaseNotesOpen(true)}>{t("settings.releaseNotes")}</Button>
              <Button variant="subtle" onClick={() => props.onSetAboutOpen(true)}>{t("settings.about")}</Button>
              <Button variant="subtle" onClick={() => props.onSetLocalModelOpen(true)}>{t("settings.localModel")}</Button>
            </Group>
            <Button className="settings-save-button" onClick={props.onSaveAllSettings}>{t("settings.save")}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={props.apiSignupOpen}
        onClose={() => props.onSetApiSignupOpen(false)}
        title={<Title order={2}>{t("settings.getApi")}</Title>}
        centered
      >
        <Stack gap="sm">
          {apiSignupProviders.map((provider) => (
            <Card
              key={provider.id}
              className="settings-action-card"
              withBorder
              component="button"
              onClick={() => props.onOpenApiSignup(provider.id)}
            >
              <Text fw={800}>{provider.name}</Text>
              <Text size="sm" c="dimmed">{provider.url}</Text>
            </Card>
          ))}
        </Stack>
      </Modal>

      <Modal
        opened={props.releaseNotesOpen}
        onClose={() => props.onSetReleaseNotesOpen(false)}
        title={<Title order={2}>{t("settings.releaseNotes")}</Title>}
        centered
      >
        <Stack gap="md">
          {releaseNotes.map((note, index) => (
            <Stack key={note.version} gap="xs">
              <Text fw={900}>{note.version}</Text>
              <Text c="dimmed">{t(note.contentKey)}</Text>
              {index < releaseNotes.length - 1 && <Divider />}
            </Stack>
          ))}
        </Stack>
      </Modal>

      <Modal
        opened={props.aboutOpen}
        onClose={() => props.onSetAboutOpen(false)}
        title={<Title order={2}>{t("settings.about")}</Title>}
        centered
      >
        <Stack gap="xs">
          <Text fw={900}>Imagen</Text>
          <Text>{t("settings.aboutAuthor")}</Text>
          <Text>{t("common.qq")}</Text>
          <Divider my="xs" />
          <Text c="dimmed">{t("settings.aboutCopyright")}</Text>
          <Text c="dimmed">{t("settings.aboutDisclaimer")}</Text>
        </Stack>
      </Modal>

      <Modal
        opened={props.localModelOpen}
        onClose={() => props.onSetLocalModelOpen(false)}
        title={<Title order={2}>{t("settings.localModel")}</Title>}
        centered
      >
        <Stack gap="sm">
          <TextInput
            label={t("settings.profileName")}
            value={props.localModelName}
            onChange={(e) => props.onLocalModelNameChange(e.target.value)}
          />
          <TextInput
            label={t("settings.localModelUrl")}
            value={props.localModelBaseUrl}
            onChange={(e) => props.onLocalModelBaseUrlChange(e.target.value)}
            placeholder={t("settings.localModelUrlPlaceholder")}
          />
          <TextInput
            label={t("settings.modelName")}
            value={props.localModelId}
            onChange={(e) => props.onLocalModelIdChange(e.target.value)}
            placeholder={t("settings.localModelIdPlaceholder")}
          />
          <Text size="sm" c="dimmed">{t("settings.localModelHint")}</Text>
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={() => props.onSetLocalModelOpen(false)}>{t("settings.cancel")}</Button>
            <Button onClick={props.onConnectLocalModel}>{t("settings.connect")}</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}