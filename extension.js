const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const START = "/* KURUKURU_START */";
const END = "/* KURUKURU_END */";

const KURUKURU_WORKBENCH_COLORS = {
  "editor.background": "#0B1026",
  "editor.foreground": "#E6E1EC",
  "sideBar.background": "#11162F",
  "sideBar.foreground": "#D8D2E8",
  "sideBarTitle.foreground": "#A99AD6",
  "activityBar.background": "#0B1026",
  "activityBar.foreground": "#BFA8FF",
  "activityBar.inactiveForeground": "#7D7892",
  "statusBar.background": "#2B214A",
  "statusBar.foreground": "#E6E1EC",
  "statusBar.debuggingBackground": "#6D5AAE",
  "statusBar.debuggingForeground": "#FFFFFF",
  "titleBar.activeBackground": "#0B1026",
  "titleBar.activeForeground": "#E6E1EC",
  "titleBar.inactiveBackground": "#11162F",
  "titleBar.inactiveForeground": "#7D7892",
  "tab.activeBackground": "#181D3A",
  "tab.activeForeground": "#FFFFFF",
  "tab.inactiveBackground": "#11162F",
  "tab.inactiveForeground": "#A8A3B3",
  "tab.border": "#2B214A",
  "tab.activeBorderTop": "#BFA8FF",
  "editorCursor.foreground": "#BFA8FF",
  "editor.lineHighlightBackground": "#181D3A88",
  "editor.selectionBackground": "#6D5AAE66",
  "editor.inactiveSelectionBackground": "#2B214A66",
  "editorLineNumber.foreground": "#55506A",
  "editorLineNumber.activeForeground": "#A99AD6",
  "editorIndentGuide.background1": "#2B214A",
  "editorIndentGuide.activeBackground1": "#6D5AAE",
  "panel.background": "#0F1430",
  "panel.border": "#2B214A",
  "terminal.background": "#0B1026",
  "terminal.foreground": "#E6E1EC",
  "button.background": "#6D5AAE",
  "button.foreground": "#FFFFFF",
  "button.hoverBackground": "#7AA2FF",
  "input.background": "#11162F",
  "input.foreground": "#E6E1EC",
  "input.border": "#2B214A",
  "dropdown.background": "#11162F",
  "dropdown.foreground": "#E6E1EC",
  "dropdown.border": "#2B214A",
  "list.activeSelectionBackground": "#2B214A",
  "list.activeSelectionForeground": "#FFFFFF",
  "list.hoverBackground": "#181D3A",
  "list.hoverForeground": "#E6E1EC"
};

const KURUKURU_TOKEN_COLORS = {
  comments: "#7D7892",
  strings: "#9DD6B5",
  keywords: "#BFA8FF",
  functions: "#C8A96A",
  variables: "#E6E1EC",
  numbers: "#F0A6CA",
  types: "#A99AD6",
  textMateRules: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#7D7892",
        fontStyle: "italic"
      }
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier", "keyword.control"],
      settings: {
        foreground: "#BFA8FF"
      }
    },
    {
      scope: ["string", "constant.other.symbol"],
      settings: {
        foreground: "#9DD6B5"
      }
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: {
        foreground: "#C8A96A"
      }
    },
    {
      scope: ["entity.name.type", "entity.name.class", "support.class", "support.type"],
      settings: {
        foreground: "#A99AD6"
      }
    },
    {
      scope: ["constant.numeric", "constant.language", "constant.character"],
      settings: {
        foreground: "#F0A6CA"
      }
    },
    {
      scope: ["variable.parameter", "meta.function.parameters"],
      settings: {
        foreground: "#7AA2FF"
      }
    },
    {
      scope: ["punctuation", "meta.brace", "meta.delimiter"],
      settings: {
        foreground: "#A8A3B3"
      }
    }
  ]
};

const KURUKURU_SEMANTIC_COLORS = {
  enabled: true,
  rules: {
    class: "#BFA8FF",
    interface: "#A99AD6",
    enum: "#F0A6CA",
    function: "#C8A96A",
    method: "#C8A96A",
    variable: "#E6E1EC",
    parameter: "#7AA2FF",
    property: "#D8D2E8",
    keyword: "#BFA8FF",
    string: "#9DD6B5",
    number: "#F0A6CA"
  }
};

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("kuruKuru.install", () => installKuruKuru(context)),
    vscode.commands.registerCommand("kuruKuru.remove", removeKuruKuru)
  );
}

function deactivate() {}

function getWorkbenchCssPath() {
  const appRoot = vscode.env.appRoot;

  const possiblePaths = [
    path.join(appRoot, "out", "vs", "workbench", "workbench.desktop.main.css"),
    path.join(appRoot, "out", "vs", "workbench", "workbench.web.main.css")
  ];

  const cssPath = possiblePaths.find((candidatePath) => fs.existsSync(candidatePath));

  if (!cssPath) {
    throw new Error("Cannot find VS Code workbench CSS file.");
  }

  return cssPath;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeOldBlock(css) {
  const pattern = new RegExp(
    `${escapeRegExp(START)}[\\s\\S]*?${escapeRegExp(END)}`,
    "g"
  );

  return css.replace(pattern, "").trimEnd();
}

function imageToDataUri(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif"
  };

  const mime = mimeTypes[ext];

  if (!mime) {
    throw new Error(`Unsupported image type: ${ext}`);
  }

  const base64 = fs.readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${base64}`;
}

function clampOpacity(value, fallback) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, numberValue));
}

function buildCssBlock({
  stickerPath,
  backgroundPath,
  stickerSize,
  stickerOpacity,
  backgroundOpacity
}) {
  const stickerDataUri = imageToDataUri(stickerPath);
  const backgroundDataUri = imageToDataUri(backgroundPath);

  const overlayOpacity = clampOpacity(backgroundOpacity, 0.86);

  return `

${START}

/* KuruKuru global background: visible behind normal code editors too */
body::before {
  content: "";
  position: fixed !important;
  inset: 0 !important;
  background-image:
    linear-gradient(rgba(11, 16, 38, ${overlayOpacity}), rgba(11, 16, 38, ${overlayOpacity})),
    url("${backgroundDataUri}") !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  pointer-events: none !important;
  z-index: 0 !important;
}

.monaco-workbench {
  position: relative !important;
  background: transparent !important;
}

/* KuruKuru sticker */
body::after {
  content: "";
  position: fixed !important;
  right: 18px !important;
  bottom: 16px !important;
  width: ${stickerSize} !important;
  height: min(58vh, 560px) !important;
  background-image: url("${stickerDataUri}") !important;
  background-size: contain !important;
  background-repeat: no-repeat !important;
  background-position: right bottom !important;
  opacity: ${stickerOpacity} !important;
  pointer-events: none !important;
  z-index: 2147483647 !important;
}

/* Force VS Code editor surfaces to become translucent */
.monaco-workbench .part.editor,
.monaco-workbench .part.editor > .content,
.monaco-workbench .part.editor .split-view-view,
.monaco-workbench .part.editor .editor-group-container,
.monaco-workbench .part.editor .editor-container,
.monaco-workbench .part.editor .editor-instance,
.monaco-workbench .part.editor .monaco-editor,
.monaco-workbench .part.editor .monaco-editor-background,
.monaco-workbench .part.editor .monaco-editor .overflow-guard,
.monaco-workbench .part.editor .monaco-editor .margin,
.monaco-workbench .part.editor .monaco-editor .margin-view-overlays,
.monaco-workbench .part.editor .monaco-editor .lines-content,
.monaco-workbench .part.editor .monaco-editor .view-lines,
.monaco-workbench .part.editor .monaco-editor .view-overlays,
.monaco-workbench .part.editor .monaco-editor .scroll-decoration,
.monaco-workbench .part.editor .editor-group-watermark,
.monaco-workbench .part.editor .welcomePage,
.monaco-workbench .part.editor .gettingStartedContainer,
.monaco-workbench .part.editor .gettingStartedEditor {
  background: transparent !important;
  background-color: transparent !important;
}

.monaco-workbench .part.editor .monaco-editor {
  background-image:
    linear-gradient(rgba(11, 16, 38, ${overlayOpacity}), rgba(11, 16, 38, ${overlayOpacity})),
    url("${backgroundDataUri}") !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
}

/* Keep tabs/sidebar/panels readable */
.monaco-workbench .part.sidebar,
.monaco-workbench .part.panel,
.monaco-workbench .part.auxiliarybar,
.monaco-workbench .part.activitybar,
.monaco-workbench .part.statusbar,
.monaco-workbench .part.titlebar {
  position: relative !important;
  z-index: 2 !important;
}

${END}
`;
}

async function applyKuruKuruThemeColors() {
  const target = vscode.ConfigurationTarget.Global;

  const workbenchConfig = vscode.workspace.getConfiguration("workbench");
  const editorConfig = vscode.workspace.getConfiguration("editor");

  const currentWorkbenchColors = workbenchConfig.get("colorCustomizations") || {};
  const currentTokenColors = editorConfig.get("tokenColorCustomizations") || {};
  const currentSemanticColors =
    editorConfig.get("semanticTokenColorCustomizations") || {};

  await workbenchConfig.update(
    "colorCustomizations",
    {
      ...currentWorkbenchColors,
      ...KURUKURU_WORKBENCH_COLORS
    },
    target
  );

  await editorConfig.update(
    "tokenColorCustomizations",
    {
      ...currentTokenColors,
      ...KURUKURU_TOKEN_COLORS
    },
    target
  );

  await editorConfig.update(
    "semanticTokenColorCustomizations",
    {
      ...currentSemanticColors,
      ...KURUKURU_SEMANTIC_COLORS
    },
    target
  );
}

async function installKuruKuru(context) {
  try {
    const config = vscode.workspace.getConfiguration("kuruKuru");

    const stickerPath =
      config.get("stickerPath") ||
      path.join(context.extensionPath, "assets", "Sticker.webp");

    const backgroundPath =
      config.get("wallpaperPath") ||
      path.join(context.extensionPath, "assets", "Background.webp");

    const stickerSize = config.get("stickerSize") || "180px";
    const stickerOpacity = clampOpacity(config.get("opacity"), 0.72);
    const backgroundOpacity = clampOpacity(config.get("backgroundOpacity"), 0.86);

    if (!fs.existsSync(stickerPath)) {
      vscode.window.showErrorMessage(`Sticker image not found: ${stickerPath}`);
      return;
    }

    if (!fs.existsSync(backgroundPath)) {
      vscode.window.showErrorMessage(`Background image not found: ${backgroundPath}`);
      return;
    }

    const cssPath = getWorkbenchCssPath();
    const backupPath = `${cssPath}.kurukuru-backup`;

    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(cssPath, backupPath);
    }

    let css = fs.readFileSync(cssPath, "utf8");
    css = removeOldBlock(css);

    const cssBlock = buildCssBlock({
      stickerPath,
      backgroundPath,
      stickerSize,
      stickerOpacity,
      backgroundOpacity
    });

    fs.writeFileSync(cssPath, `${css}\n${cssBlock}`, "utf8");

    await applyKuruKuruThemeColors();

    const reload = "Reload Window";
    const choice = await vscode.window.showInformationMessage(
      "KuruKuru installed. Sticker is smaller and background is applied to normal code editors. VS Code may warn that the installation is corrupt because internal CSS was modified.",
      reload
    );

    if (choice === reload) {
      vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to install KuruKuru: ${error.message}`);
  }
}

async function removeKuruKuru() {
  try {
    const cssPath = getWorkbenchCssPath();

    let css = fs.readFileSync(cssPath, "utf8");
    css = removeOldBlock(css);

    fs.writeFileSync(cssPath, css, "utf8");

    const reload = "Reload Window";
    const choice = await vscode.window.showInformationMessage(
      "KuruKuru sticker/background removed. Theme colors in settings.json were not removed.",
      reload
    );

    if (choice === reload) {
      vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to remove KuruKuru: ${error.message}`);
  }
}

module.exports = {
  activate,
  deactivate
};