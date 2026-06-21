import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { confirm: 'readonly', crypto: 'readonly', FileReader: 'readonly', FormData: 'readonly', localStorage: 'readonly', navigator: 'readonly', window: 'readonly' } },
  },
  {
    files: ['src/context/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
)
