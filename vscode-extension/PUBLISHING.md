# AKIS Monitor Extension - Publishing Guide

## ✅ Fixed Issues

**Icon Missing in Activity Bar**: 
- **Root Cause**: Missing `resources/akis-icon-128.png` file referenced in `package.json`
- **Resolution**: Created icon with AKIS branding (cyan/dark theme)
- **Files Created**: 
  - `resources/akis-icon.svg` - Vector source
  - `resources/akis-icon-128.png` - 128x128 PNG for marketplace

## 📦 Current Package Status

- **Version**: 0.1.0
- **Package Size**: 3.13 MB (can be optimized further)
- **Files**: 1087 files (includes node_modules)
- **VSIX Location**: `/workspaces/NOP/vscode-extension/akis-monitor-0.1.0.vsix`

## 🚀 Publishing to VS Code Marketplace

### Prerequisites

1. **Create Publisher Account**
   - Go to https://marketplace.visualstudio.com/manage
   - Sign in with Microsoft/GitHub account
   - Create a new publisher ID (e.g., "nop-team" or your username)

2. **Get Personal Access Token (PAT)**
   - Go to https://dev.azure.com
   - Click User Settings > Personal Access Tokens
   - Click "New Token"
   - Name: "VS Code Extension Publishing"
   - Organization: All accessible organizations
   - Scopes: **Marketplace > Manage** (full access)
   - Copy the token (you'll only see it once!)

### Publishing Steps

#### Option 1: Web Portal (Easiest for first publish)

1. Go to https://marketplace.visualstudio.com/manage
2. Click "+ New Extension" → "Visual Studio Code"
3. Drag and drop `akis-monitor-0.1.0.vsix`
4. Fill in publisher details if needed
5. Click "Upload"

#### Option 2: Command Line (Recommended for updates)

```bash
cd /workspaces/NOP/vscode-extension

# First time only: Login
npx vsce login nop-team
# (Enter your PAT when prompted)

# Publish
npx vsce publish

# Or publish with specific version bump
npx vsce publish patch  # 0.1.0 -> 0.1.1
npx vsce publish minor  # 0.1.0 -> 0.2.0
npx vsce publish major  # 0.1.0 -> 1.0.0
```

### Update Publisher Name

Before publishing, update the publisher in `package.json`:

```json
{
  "publisher": "your-actual-publisher-id"
}
```

Replace `nop-team` with your actual VS Code Marketplace publisher ID.

## 📝 Pre-Publishing Checklist

- [x] Icon created and working
- [x] LICENSE file added (MIT)
- [x] README.md updated with features
- [x] .vscodeignore created
- [x] Extension compiles without errors
- [x] VSIX package created successfully
- [ ] Publisher account created
- [ ] PAT token obtained
- [ ] Publisher name updated in package.json
- [ ] Extension tested locally

## 🧪 Testing Locally

### Install from VSIX

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions view)
3. Click "..." menu (top right)
4. Select "Install from VSIX..."
5. Navigate to `/workspaces/NOP/vscode-extension/akis-monitor-0.1.0.vsix`
6. Click "Install"
7. Reload VS Code

### Verify Installation

1. Check Activity Bar (left sidebar) for AKIS Monitor icon
2. Click icon to open the extension views:
   - Live Session
   - Historical Diagram
   - Knowledge Graph
3. Test with an active AKIS session

## 🔄 Updating the Extension

After making changes:

```bash
cd /workspaces/NOP/vscode-extension

# 1. Update version in package.json
# 2. Compile
npm run compile

# 3. Test locally (optional)
# Press F5 in VS Code to launch Extension Development Host

# 4. Package
npm run package

# 5. Publish
npx vsce publish
```

## 📊 Optimization Opportunities

### Reduce Package Size

Current: 3.13 MB → Target: <500 KB

**Actions**:
1. Bundle with webpack/esbuild (recommended)
2. Exclude dev dependencies
3. Tree-shake unused D3 modules
4. Better .vscodeignore rules

**Bundle Setup**:
```bash
npm install --save-dev webpack webpack-cli ts-loader
```

Add `webpack.config.js` and update build scripts.

### Bundle Configuration (Future)

See: https://aka.ms/vscode-bundle-extension

## 🎯 Post-Publishing

After publishing:
1. Extension will appear at: `https://marketplace.visualstudio.com/items?itemName=YOUR-PUBLISHER.akis-monitor`
2. Users can install via: `ext install YOUR-PUBLISHER.akis-monitor`
3. Monitor analytics at: https://marketplace.visualstudio.com/manage

## 📚 Resources

- VS Code Extension API: https://code.visualstudio.com/api
- Publishing Extensions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- Marketplace: https://marketplace.visualstudio.com/vscode
- VSCE CLI: https://github.com/microsoft/vscode-vsce

## 🐛 Troubleshooting

**Icon still not showing?**
- Verify `resources/akis-icon-128.png` exists
- Check file path in `package.json`
- Reload VS Code after installing
- Check Developer Tools Console: `Help > Toggle Developer Tools`

**Publishing fails?**
- Verify PAT token has "Marketplace > Manage" scope
- Check publisher name matches your account
- Ensure package.json has all required fields

**Extension not activating?**
- Check `activationEvents` in package.json
- Look for errors in Output panel: `View > Output > Log (Extension Host)`
