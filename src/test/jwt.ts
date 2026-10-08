/** Monta um JWT sem assinatura válida, só para os testes que leem as claims no frontend. */
export function fakeJwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS512' })}.${encode(claims)}.signature`
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600

export const userToken = (email = 'maria@empresa.com') =>
  fakeJwt({ sub: email, role: ['ROLE_USER'], account_type: 'USER', exp: inOneHour() })

export const adminToken = (email = 'admin@vstable.com') =>
  fakeJwt({ sub: email, role: ['ROLE_ADMIN'], account_type: 'ADMIN', exp: inOneHour() })
