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

export function SettingsModal(props: Props) {
  if (!props.open) return null;

  return (
    <>
      <div className="modal-backdrop" role="presentation">
        <div className="modal wide-modal" role="dialog" aria-modal="true">
          <div className="modal-header">
            <h2>设置</h2>
            <button className="ghost-button" onClick={props.onClose}>关闭</button>
          </div>
          <div className="api-settings">
            <div className="profile-list">
              <div className="section-title">API 配置</div>
              <div className="profile-scroll">
                {props.draftSettings.apiProfiles.map((profile) => (
                  <button key={profile.id} className={profile.id === props.editingProfileId ? "profile-item active" : "profile-item"} onClick={() => props.onSelectProfile(profile.id)}>
                    <strong>{profile.name}</strong>
                    <small>{profile.model}</small>
                  </button>
                ))}
              </div>
              <button className="ghost-button" onClick={props.onAddProfile}>新增 API</button>
            </div>
            <div className="profile-form">
              <label>配置名称<input value={props.editingProfile?.name ?? ""} onChange={(e) => props.onUpdateEditingProfile({ name: e.target.value })} /></label>
              <label>API Key<input type="password" value={props.editingProfile?.apiKey ?? ""} onChange={(e) => props.onUpdateEditingProfile({ apiKey: e.target.value })} /></label>
              <label>API 地址<input value={props.editingProfile?.apiBaseUrl ?? ""} onChange={(e) => props.onUpdateEditingProfile({ apiBaseUrl: e.target.value })} /></label>
              <label>模型名称<input value={props.editingProfile?.model ?? ""} onChange={(e) => props.onUpdateEditingProfile({ model: e.target.value })} /></label>
              <button className="danger-button" disabled={props.draftSettings.apiProfiles.length <= 1 || !props.editingProfile} onClick={() => props.editingProfile && props.onDeleteProfile(props.editingProfile.id)}>删除当前 API</button>
            </div>
          </div>
          <label>
            输出目录
            <div className="path-picker">
              <input value={props.draftSettings.outputDir} onChange={(e) => props.onDraftSettingsChange({ ...props.draftSettings, outputDir: e.target.value })} />
              <button type="button" className="ghost-button" onClick={props.onChooseOutputDir}>选择文件夹</button>
            </div>
          </label>
          <div className="modal-actions">
            <div className="modal-action-group">
              <button type="button" className="ghost-button" onClick={() => props.onSetApiSignupOpen(true)}>获取 API</button>
              <button type="button" className="ghost-button" onClick={() => props.onSetReleaseNotesOpen(true)}>更新提示</button>
              <button type="button" className="ghost-button" onClick={() => props.onSetAboutOpen(true)}>关于软件</button>
              <button type="button" className="ghost-button" onClick={() => props.onSetLocalModelOpen(true)}>接入本地模型</button>
            </div>
            <button onClick={props.onSaveAllSettings}>保存设置</button>
          </div>
        </div>
      </div>

      {props.apiSignupOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal api-signup-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>获取 API</h2>
              <button className="ghost-button" onClick={() => props.onSetApiSignupOpen(false)}>关闭</button>
            </div>
            <div className="api-provider-list">
              <button className="ghost-button" onClick={() => props.onOpenApiSignup("pptokens")}>
                <strong>PPtokens</strong>
                <span>https://www.pptoken.org/?promo=AFFNV</span>
              </button>
              <button className="ghost-button" onClick={() => props.onOpenApiSignup("aifast")}>
                <strong>速擎智能</strong>
                <span>https://aifast.site/register?aff=6fbi</span>
              </button>
              <button className="ghost-button" onClick={() => props.onOpenApiSignup("yunwu")}>
                <strong>云雾</strong>
                <span>https://yunwu.ai/register?aff=3QLV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {props.releaseNotesOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>更新提示</h2>
              <button className="ghost-button" onClick={() => props.onSetReleaseNotesOpen(false)}>关闭</button>
            </div>
            <div className="about-content">
              <strong>v1.1</strong>
              <p>新增本地模型接口（可在设置中接入本地模型配置）。</p>
              <strong>v1.2</strong>
              <p>保存图片默认尺寸改为原始生图尺寸，可再选择 64x64/128x128/256x256/512x512/自定义。</p>
            </div>
          </div>
        </div>
      )}

      {props.aboutOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal about-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>关于软件</h2>
              <button className="ghost-button" onClick={() => props.onSetAboutOpen(false)}>关闭</button>
            </div>
            <div className="about-content">
              <strong>Imagen</strong>
              <p>作者：睡不醒</p>
              <p>QQ：329209303</p>
              <p>本软件为免费软件，禁止倒卖、二次收费或用于任何非法用途。</p>
              <p>免责声明：本软件按“现状”提供，不对生成内容的合法性、准确性、适用性作任何明示或暗示担保。用户需自行承担因使用本软件产生的一切风险与责任，并确保其行为符合当地法律法规及第三方平台条款。</p>
            </div>
          </div>
        </div>
      )}

      {props.localModelOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal local-model-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>接入本地模型</h2>
              <button className="ghost-button" onClick={() => props.onSetLocalModelOpen(false)}>关闭</button>
            </div>
            <div className="local-model-form">
              <label>配置名称
                <input value={props.localModelName} onChange={(e) => props.onLocalModelNameChange(e.target.value)} />
              </label>
              <label>本地接口地址
                <input value={props.localModelBaseUrl} onChange={(e) => props.onLocalModelBaseUrlChange(e.target.value)} placeholder="例如：http://127.0.0.1:11434/v1" />
              </label>
              <label>模型名称
                <input value={props.localModelId} onChange={(e) => props.onLocalModelIdChange(e.target.value)} placeholder="例如：llava" />
              </label>
              <p>说明：接入后会新增一条 API 配置，保存设置后在生成时自动使用当前选中的配置。</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => props.onSetLocalModelOpen(false)}>取消</button>
              <button type="button" onClick={props.onConnectLocalModel}>确认接入</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

