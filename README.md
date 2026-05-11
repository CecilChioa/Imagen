# Imagen

Imagen 是一个基于 **Tauri + React + TypeScript + Rust** 的桌面工具，面向 AI 生图与 Warcraft III 贴图工作流。

## 功能概览

- 单图生成（文生图 / 图生图）
- 批量生成（队列 / 并发）
- 批量格式转换（PNG / TGA / BLP）
- 批量图片合成（上层 / 下层叠加）
- 多 API 配置管理（可切换不同服务端与模型）
- 生成历史与提示词库

## 技术栈

- 前端：React 19、TypeScript、Vite、Mantine、i18next
- 桌面壳：Tauri 2
- 后端：Rust（reqwest、image、image-blp）

## 目录结构

```text
src/                 前端页面与业务逻辑
src-tauri/           Rust 后端与 Tauri 配置
outputs/             默认输出目录（按日期分文件夹）
```

## 开发环境要求

- Node.js 18+
- Rust stable（建议安装完整 toolchain）
- Tauri 2 构建环境

## 本地开发

```bash
npm install
npm run tauri:dev
```

## 构建与检查

```bash
npm run check         # TypeScript + cargo check
npm run build         # 前端构建
npm run tauri:build   # 桌面应用构建
```

## 使用说明

### 1) 设置 API

在设置面板中配置：

- API Key
- API Base URL
- 模型名

> 需兼容 OpenAI Images 风格接口（`/images/generations` 与 `/images/edits`）。

### 2) 单图生成

- 填写正向/负向提示词
- 可选：参考图、蒙版
- 点击“生成图片”
- 支持停止生成

### 3) 批量生成

- 每行一个提示词
- 选择队列或并发模式
- 可中途停止

### 4) 批量转换

支持 PNG / TGA / BLP 互转，可设置：

- 递归子目录
- 保持目录结构
- BLP 编码、Alpha、Mipmap、滤镜
- PNG 压缩与滤波

### 5) 批量合成

- 选择原图目录
- 可选上层叠加图与下层叠加图
- 输出统一 PNG

## 配置与数据存储

应用设置文件默认在系统配置目录：

- Windows: `%APPDATA%/com.imagen.app/settings.json`
- macOS: `~/Library/Application Support/com.imagen.app/settings.json`
- Linux: `~/.config/com.imagen.app/settings.json`

兼容旧路径（若新路径不存在会回退读取）：

- `~/.imagen/settings.json`

输出目录默认是项目下的 `outputs/`，并按日期创建子目录。
