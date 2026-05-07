import {
  Button,
  Card,
  Divider,
  Group,
  Modal,
  PasswordInput,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { ApiProfile, Settings } from "../types/app";

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
  onOpenApiSignup: (provider: "pptokens" | "aifast" | "yunwu") => Promise<void>;
  onLocalModelNameChange: (value: string) => void;
  onLocalModelBaseUrlChange: (value: string) => void;
  onLocalModelIdChange: (value: string) => void;
  onConnectLocalModel: () => void;
};

const releaseNotes = [
  {
    version: "v1.3",
    content: "新增批量图片转换，支持 PNG/TGA/BLP 互转，可递归子目录并保持目录结构。",
  },
  {
    version: "v1.2",
    content: "保存图片默认尺寸改为原始生图尺寸，可再选择 64x64/128x128/256x256/512x512/自定义。",
  },
  {
    version: "v1.1",
    content: "新增本地模型接口（可在设置中接入本地模型配置）。",
  },
];

export function SettingsModal(props: Props) {
  const providerCards = [
    {
      id: "pptokens" as const,
      name: "PPtokens",
      url: "https://www.pptoken.org/?promo=AFFNV",
    },
    {
      id: "aifast" as const,
      name: "速擎智能",
      url: "https://aifast.site/register?aff=6fbi",
    },
    {
      id: "yunwu" as const,
      name: "云雾",
      url: "https://yunwu.ai/register?aff=3QLV",
    },
  ];

  return (
    <>
      <Modal
        opened={props.open}
        onClose={props.onClose}
        title={<Title order={2}>设置</Title>}
        size="xl"
        centered
        scrollAreaComponent={ScrollArea.Autosize}
        classNames={{ content: "settings-modal-content", body: "settings-modal-body" }}
      >
        <Stack gap="lg">
          <SimpleGrid className="settings-api-grid" cols={{ base: 1, sm: 2 }} spacing="lg">
            <Card className="settings-card settings-api-list-card" withBorder>
              <Stack className="settings-api-list-stack" gap="sm">
                <Group justify="space-between" align="center">
                  <Title order={3}>API 配置</Title>
                  <Button variant="light" onClick={props.onAddProfile}>新增 API</Button>
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
                <Title order={3}>当前配置</Title>
                <TextInput
                  className="settings-current-field"
                  label="配置名称"
                  value={props.editingProfile?.name ?? ""}
                  onChange={(e) => props.onUpdateEditingProfile({ name: e.target.value })}
                />
                <PasswordInput
                  className="settings-current-field"
                  label="API Key"
                  value={props.editingProfile?.apiKey ?? ""}
                  onChange={(e) => props.onUpdateEditingProfile({ apiKey: e.target.value })}
                />
                <TextInput
                  className="settings-current-field"
                  label="API 地址"
                  value={props.editingProfile?.apiBaseUrl ?? ""}
                  onChange={(e) => props.onUpdateEditingProfile({ apiBaseUrl: e.target.value })}
                />
                <TextInput
                  className="settings-current-field settings-current-model-field"
                  label="模型名称"
                  value={props.editingProfile?.model ?? ""}
                  onChange={(e) => props.onUpdateEditingProfile({ model: e.target.value })}
                />
                <Button
                  className="settings-delete-api-button"
                  color="red"
                  variant="light"
                  disabled={props.draftSettings.apiProfiles.length <= 1 || !props.editingProfile}
                  onClick={() => props.editingProfile && props.onDeleteProfile(props.editingProfile.id)}
                >
                  删除当前 API
                </Button>
              </Stack>
            </Card>
          </SimpleGrid>

          <Card className="settings-card settings-output-card" withBorder>
            <Group className="settings-output-row" align="end" grow>
              <TextInput
                label="输出目录"
                value={props.draftSettings.outputDir}
                onChange={(e) => props.onDraftSettingsChange({ ...props.draftSettings, outputDir: e.target.value })}
              />
              <Button className="settings-output-picker" variant="light" onClick={props.onChooseOutputDir}>选择文件夹</Button>
            </Group>
          </Card>

          <Group className="settings-footer" justify="space-between" align="center">
            <Group className="settings-footer-actions" gap="xs">
              <Button variant="subtle" onClick={() => props.onSetApiSignupOpen(true)}>获取 API</Button>
              <Button variant="subtle" onClick={() => props.onSetReleaseNotesOpen(true)}>更新提示</Button>
              <Button variant="subtle" onClick={() => props.onSetAboutOpen(true)}>关于软件</Button>
              <Button variant="subtle" onClick={() => props.onSetLocalModelOpen(true)}>接入本地模型</Button>
            </Group>
            <Button className="settings-save-button" onClick={props.onSaveAllSettings}>保存设置</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={props.apiSignupOpen}
        onClose={() => props.onSetApiSignupOpen(false)}
        title={<Title order={2}>获取 API</Title>}
        centered
      >
        <Stack gap="sm">
          {providerCards.map((provider) => (
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
        title={<Title order={2}>更新提示</Title>}
        centered
      >
        <Stack gap="md">
          {releaseNotes.map((note, index) => (
            <Stack key={note.version} gap="xs">
              <Text fw={900}>{note.version}</Text>
              <Text c="dimmed">{note.content}</Text>
              {index < releaseNotes.length - 1 && <Divider />}
            </Stack>
          ))}
        </Stack>
      </Modal>

      <Modal
        opened={props.aboutOpen}
        onClose={() => props.onSetAboutOpen(false)}
        title={<Title order={2}>关于软件</Title>}
        centered
      >
        <Stack gap="xs">
          <Text fw={900}>Imagen</Text>
          <Text>作者：睡不醒</Text>
          <Text>QQ：329209303</Text>
          <Divider my="xs" />
          <Text c="dimmed">本软件为免费软件，禁止倒卖、二次收费或用于任何非法用途。</Text>
          <Text c="dimmed">免责声明：本软件按“现状”提供，不对生成内容的合法性、准确性、适用性作任何明示或暗示担保。用户需自行承担因使用本软件产生的一切风险与责任，并确保其行为符合当地法律法规及第三方平台条款。</Text>
        </Stack>
      </Modal>

      <Modal
        opened={props.localModelOpen}
        onClose={() => props.onSetLocalModelOpen(false)}
        title={<Title order={2}>接入本地模型</Title>}
        centered
      >
        <Stack gap="sm">
          <TextInput
            label="配置名称"
            value={props.localModelName}
            onChange={(e) => props.onLocalModelNameChange(e.target.value)}
          />
          <TextInput
            label="本地接口地址"
            value={props.localModelBaseUrl}
            onChange={(e) => props.onLocalModelBaseUrlChange(e.target.value)}
            placeholder="例如：http://127.0.0.1:11434/v1"
          />
          <TextInput
            label="模型名称"
            value={props.localModelId}
            onChange={(e) => props.onLocalModelIdChange(e.target.value)}
            placeholder="例如：llava"
          />
          <Text size="sm" c="dimmed">说明：接入后会新增一条 API 配置，保存设置后在生成时自动使用当前选中的配置。</Text>
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={() => props.onSetLocalModelOpen(false)}>取消</Button>
            <Button onClick={props.onConnectLocalModel}>确认接入</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}