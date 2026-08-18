/**
 * Fix module-scope data: move MODULE_DATA inside components for UnderConstructionPage,
 * and move MODULE_CONFIG inside component for RbacMatrixPage.
 * Also fix LoadingScreen default param.
 */
const fs = require('fs');
const path = require('path');

// ========== 1. Fix UnderConstructionPage ==========
const ucpFile = path.resolve(__dirname, '../apps/web/src/pages/common/UnderConstructionPage.tsx');
if (fs.existsSync(ucpFile)) {
  let content = fs.readFileSync(ucpFile, 'utf8');
  
  // Remove the module-level MODULE_DATA and move inside component
  // The structure is: const MODULE_DATA...};\n\nexport const UnderConstructionPage
  // Replace with: export const UnderConstructionPage...{ const { t } = useI18n();\n  const MODULE_DATA...};
  
  const moduleDataStart = content.indexOf('const MODULE_DATA');
  const componentStart = content.indexOf('export const UnderConstructionPage');
  const useI18nLine = content.indexOf("const { t } = useI18n();");
  
  if (moduleDataStart > -1 && componentStart > -1) {
    // Extract MODULE_DATA block (from "const MODULE_DATA" to just before "export const")
    const moduleDataBlock = content.substring(moduleDataStart, componentStart).trim();
    
    // Remove MODULE_DATA from module scope
    content = content.substring(0, moduleDataStart) + content.substring(componentStart);
    
    // Now wrap the Arabic strings in the extracted block with t()
    // Read ar.json to get the mapping
    const arFile = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
    const ar = JSON.parse(fs.readFileSync(arFile, 'utf8'));
    
    // Build reverse map: Arabic text -> auto key
    const reverseAutoMap = {};
    if (ar.auto) {
      for (const [k, v] of Object.entries(ar.auto)) {
        reverseAutoMap[v] = `auto.${k}`;
      }
    }
    
    // Re-wrap Arabic strings in the MODULE_DATA with t()
    let wrappedBlock = moduleDataBlock.replace(/'([^']*[\u0600-\u06FF][^']*)'/g, (match, str) => {
      // Check if this Arabic string has a key in auto
      if (reverseAutoMap[str]) {
        return `t('${reverseAutoMap[str]}')`;
      }
      return match; // Keep as-is if no key found
    });
    
    // Insert the block right after `const { t } = useI18n();`
    const insertPoint = content.indexOf("const { t } = useI18n();") + "const { t } = useI18n();".length;
    content = content.substring(0, insertPoint) + '\n\n  ' + wrappedBlock + '\n' + content.substring(insertPoint);
    
    fs.writeFileSync(ucpFile, content, 'utf8');
    console.log('Fixed UnderConstructionPage: moved MODULE_DATA inside component');
  }
}

// ========== 2. Fix RbacMatrixPage ==========
const rbacFile = path.resolve(__dirname, '../apps/web/src/pages/rbac/RbacMatrixPage.tsx');
if (fs.existsSync(rbacFile)) {
  let content = fs.readFileSync(rbacFile, 'utf8');
  
  const moduleConfigStart = content.indexOf('const MODULE_CONFIG');
  const criticalStart = content.indexOf('const CRITICAL_PERMISSIONS');
  const componentStart = content.indexOf('export const RbacMatrixPage');
  
  if (moduleConfigStart > -1 && componentStart > -1) {
    // Extract MODULE_CONFIG block
    const endOfConfig = content.indexOf('};', moduleConfigStart) + 2;
    const moduleConfigBlock = content.substring(moduleConfigStart, endOfConfig);
    
    // Remove from module scope
    content = content.substring(0, moduleConfigStart) + content.substring(endOfConfig);
    
    // Read ar.json
    const arFile = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
    const ar = JSON.parse(fs.readFileSync(arFile, 'utf8'));
    const reverseAutoMap = {};
    if (ar.auto) {
      for (const [k, v] of Object.entries(ar.auto)) {
        reverseAutoMap[v] = `auto.${k}`;
      }
    }
    
    // Wrap Arabic strings in MODULE_CONFIG with t()
    let wrappedBlock = moduleConfigBlock.replace(/'([^']*[\u0600-\u06FF][^']*)'/g, (match, str) => {
      if (reverseAutoMap[str]) {
        return `t('${reverseAutoMap[str]}')`;
      }
      return match;
    });
    
    // Insert after useI18n in the component
    const useI18nInComponent = content.indexOf("const { t } = useI18n();", content.indexOf('export const RbacMatrixPage'));
    if (useI18nInComponent > -1) {
      const insertPoint = useI18nInComponent + "const { t } = useI18n();".length;
      content = content.substring(0, insertPoint) + '\n\n  ' + wrappedBlock + '\n' + content.substring(insertPoint);
      fs.writeFileSync(rbacFile, content, 'utf8');
      console.log('Fixed RbacMatrixPage: moved MODULE_CONFIG inside component');
    }
  }
}

// ========== 3. Fix LoadingScreen default param ==========
const loadingFile = path.resolve(__dirname, '../apps/web/src/components/LoadingScreen.tsx');
if (fs.existsSync(loadingFile)) {
  let content = fs.readFileSync(loadingFile, 'utf8');
  
  // Replace the hardcoded default with a prop that can be overridden
  // The issue is that default param value can't use t() since it's evaluated at module scope
  // Solution: use undefined as default and translate inside the component body
  content = content.replace(
    /export const LoadingScreen: React\.FC<\{ message\?: string \}> = \(\{[\s\r\n]*message = '[^']*',[\s\r\n]*\}\) => \{/,
    `export const LoadingScreen: React.FC<{ message?: string }> = ({
  message,
}) => {
  const { t } = useI18n();
  const displayMessage = message || t('auto.جاري_التحقق_من_بيانات_الجلسة_124642');`
  );
  
  // Add the useI18n import back
  if (!content.includes("import { useI18n }")) {
    content = `import { useI18n } from '../i18n/I18nContext';\n` + content;
  }
  
  // Replace {message} with {displayMessage} in the JSX
  content = content.replace('{message}', '{displayMessage}');
  
  fs.writeFileSync(loadingFile, content, 'utf8');
  console.log('Fixed LoadingScreen: moved default message inside component');
}

// ========== 4. Fix Layout.tsx SIDEBAR_GROUPS ==========
// These use defaultLabel/defaultTitle pattern - the sidebar rendering code already
// translates them via t(`nav.groups.${group.id}`) || group.defaultTitle
// So these are legitimately module-scope and should stay as raw Arabic fallbacks.
// No fix needed for Layout.tsx — the scanner already strips defaultLabel/defaultTitle patterns.

console.log('\nAll module-scope fixes applied.');
