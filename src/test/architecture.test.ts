import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
const eslint = new ESLint()
it.each([
  ['src/features/clients/pages/Example.tsx', '@/app/components/NavBar'],
  ['src/features/clients/pages/Example.tsx', '../../../app/components/NavBar'],
  ['src/features/clients/pages/Example.tsx', '@/features/auth/api/user'],
  ['src/features/clients/api/example.ts', '@/test/fixtures/mockClients'],
  ['src/shared/example.ts', '@/features/auth'],
  ['src/shared/example.ts', '@/app/AppRoutes'],
])('blocks inward/private dependency %s -> %s', async (filePath, source) => {
  const result = await eslint.lintText(`export { example } from '${source}'`, { filePath })
  expect(result[0].messages.some((message) => message.ruleId === 'architecture/boundaries')).toBe(
    true,
  )
})
it.each([
  ['src/features/clients/pages/Example.tsx', '@/features/auth'],
  ['src/features/transfers/hooks/example.ts', '@/features/beneficiaries'],
  ['src/features/clients/pages/Example.tsx', '@/shared/components/Button'],
  ['src/features/clients/pages/Example.tsx', '../api/clients'],
])('allows intended dependency %s -> %s', async (filePath, source) => {
  const result = await eslint.lintText(`export { example } from '${source}'`, { filePath })
  expect(result[0].messages.some((message) => message.ruleId === 'architecture/boundaries')).toBe(
    false,
  )
})
it('blocks dynamic private cross-feature imports', async () => {
  const result = await eslint.lintText(
    "export const example = () => import('@/features/auth/api/user')",
    { filePath: 'src/features/clients/api/example.ts' },
  )
  expect(result[0].messages.some((message) => message.ruleId === 'architecture/boundaries')).toBe(
    true,
  )
})
