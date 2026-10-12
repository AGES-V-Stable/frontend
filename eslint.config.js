import path from 'node:path'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const boundaries = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { invalid: 'Import violates architecture boundaries: {{source}}.' },
  },
  create(context) {
    const file = context.filename.replaceAll('\\', '/')
    const current = /\/src\/features\/([^/]+)\//.exec(file)?.[1]
    const shared = file.includes('/src/shared/')
    function check(node) {
      const source = node.source?.value
      if (typeof source !== 'string') return
      const target = source.startsWith('@/')
        ? source.slice(2)
        : source.startsWith('.')
          ? path
              .relative(path.resolve('src'), path.resolve(path.dirname(file), source))
              .replaceAll('\\', '/')
          : null
      if (!target) return
      const targetFeature = /^features\/([^/]+)(?:\/|$)/.exec(target)?.[1]
      const permittedPublicExport =
        target === 'features/auth' ||
        (current === 'transfers' && target === 'features/beneficiaries')
      if (
        (shared && (target.startsWith('features/') || target.startsWith('app/'))) ||
        (current &&
          (target.startsWith('app/') ||
            target.startsWith('test/') ||
            (targetFeature && targetFeature !== current && !permittedPublicExport)))
      ) {
        context.report({ node, messageId: 'invalid', data: { source } })
      }
    }
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    }
  },
}

export default defineConfig([
  {
    files: ['src/{features,shared}/**/*.{ts,tsx}'],
    ignores: ['**/*.test.*', '**/*.spec.*'],
    plugins: { architecture: { rules: { boundaries } } },
    rules: { 'architecture/boundaries': 'error' },
  },
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
