export type PresetOption = {
  id: string;
  name: string;
  prompt: string;
};

export const stylePresets: PresetOption[] = [
  { id: "none", name: "默认风格", prompt: "" },
  { id: "dark", name: "暗黑奇幻", prompt: "dark fantasy, high contrast, dramatic lighting, arcane atmosphere" },
  { id: "pixel", name: "像素艺术", prompt: "pixel art style, retro game texture, crisp edges" },
  { id: "xianxia", name: "国风仙侠", prompt: "Chinese xianxia fantasy, elegant oriental style, mystical aura" },
  { id: "ink", name: "中式水墨", prompt: "Chinese ink wash, restrained colors, brush texture" },
  { id: "anime", name: "次元幻想", prompt: "anime fantasy style, cel shading, vivid magical effects" },
  { id: "scifi", name: "科幻未来", prompt: "futuristic sci-fi style, neon accents, advanced technology details, cinematic lighting" },
  { id: "mecha", name: "机甲工业", prompt: "mechanical industrial style, hard-surface design, metal texture, engineered structure" },
  { id: "magic", name: "魔法史诗", prompt: "epic magic fantasy style, spell effects, mystical runes, dramatic composition" },
  { id: "national", name: "国潮插画", prompt: "guochao illustration style, trendy Chinese aesthetics, bold colors, decorative pattern" },
  { id: "watercolor", name: "清新水彩", prompt: "fresh watercolor style, soft pigment bleeding, paper texture, airy atmosphere" },
  { id: "oilpaint", name: "厚涂手绘", prompt: "painterly hand-painted style, rich brushstrokes, layered color blocks, artistic texture" },
  { id: "minimal", name: "极简扁平", prompt: "minimal flat design style, simplified geometry, clean silhouette, clear visual hierarchy" },
  { id: "realism", name: "写实电影", prompt: "cinematic realism style, physically plausible lighting, filmic contrast, detailed textures" },
];

export const contentTypes: PresetOption[] = [
  { id: "icon", name: "图标", prompt: "icon-oriented composition, centered subject, clean silhouette, readable at small size" },
  { id: "poster", name: "宣传图", prompt: "promotional key visual, cinematic composition, strong atmosphere" },
  { id: "ui", name: "UI", prompt: "UI asset direction, clean hierarchy, production-ready interface component" },
  { id: "character", name: "角色立绘", prompt: "character illustration direction, clear silhouette, expressive pose, clean focal hierarchy" },
  { id: "scene", name: "场景概念", prompt: "environment concept art direction, depth layering, strong lighting mood, cinematic framing" },
  { id: "product", name: "产品渲染", prompt: "product rendering direction, material accuracy, controlled reflections, studio lighting setup" },
  { id: "cover", name: "封面主视觉", prompt: "cover key visual direction, strong center of interest, readable composition, brand-friendly style" },
  { id: "banner", name: "横幅海报", prompt: "banner poster direction, horizontal composition, headline-safe negative space, high visual impact" },
  { id: "social", name: "社媒配图", prompt: "social media artwork direction, eye-catching focal point, platform-friendly composition, clear contrast" },
  { id: "texture", name: "材质贴图", prompt: "texture map direction, tiling-friendly detail, controlled noise, consistent material pattern" },
  { id: "background", name: "背景壁纸", prompt: "wallpaper background direction, balanced composition, clean gradients or details, low visual clutter" },
];
