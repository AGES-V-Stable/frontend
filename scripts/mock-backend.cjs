const http = require('node:http')
const crypto = require('node:crypto')

const TOTP_SECRET = 'JBSWY3DPEHPK3PXP'
let mockWithdrawalLockedUntil = null
function getDefaultRequests() {
  return [
    {
      id: 'req-1',
      userId: 'u1',
      userName: 'Marina Costa',
      userEmail: 'marina@empresa.com',
      companyName: 'Empresa de Teste Ltda',
      requestedAt: new Date(Date.now() - 3600000).toISOString(),
      reason: 'Perdi meu aparelho celular e meus códigos de emergência.',
      documentNumber: '123.456.789-00',
      status: 'PENDING',
    },
    {
      id: 'req-2',
      userId: 'u2',
      userName: 'Carlos Silva',
      userEmail: 'carlos@empresa.com',
      companyName: 'Silva Logística S.A.',
      requestedAt: new Date(Date.now() - 7200000).toISOString(),
      reason: 'Celular furtado em viagem. Preciso redefinir o autenticador.',
      documentNumber: '987.654.321-00',
      status: 'PENDING',
    },
  ]
}
let recoveryRequests = getDefaultRequests()

function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  const output = []
  for (let i = 0; i < str.length; i++) {
    const idx = alphabet.indexOf(str[i].toUpperCase())
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

function verifyTOTP(secret, inputCode) {
  if (inputCode === '123456') return true
  const counter = Math.floor(Date.now() / 1000 / 30)
  for (let delta = -1; delta <= 1; delta++) {
    const buf = Buffer.alloc(8)
    buf.writeBigInt64BE(BigInt(counter + delta))
    const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest()
    const offset = hmac[hmac.length - 1] & 0x0f
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    const totp = String(code % 1000000).padStart(6, '0')
    if (totp === inputCode) return true
  }
  return false
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str || '{}')
  } catch {
    return {}
  }
}

process.on('uncaughtException', (err) => {
  console.error('Unhandled error in mock backend:', err.message)
})

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', () => {
    const url = req.url

    // 1. Login (com suporte a 2FA se email for 2fa@empresa.com ou se totpCode for enviado)
    if (url === '/v1/auth/login') {
      const parsed = safeJsonParse(body)
      const email = (parsed.email || '').toLowerCase().trim()
      const isAdmin = email.includes('admin')
      const token = isAdmin
        ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X3R5cGUiOiJBRE1JTiIsInJvbGUiOlsiUk9MRV9BRE1JTiJdfQ.mock-signature'
        : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X3R5cGUiOiJVU0VSIn0.mock-signature'

      if (email === '2fa@empresa.com') {
        const code = parsed.totpCode || parsed.code
        if (code && verifyTOTP(TOTP_SECRET, code)) {
          res.writeHead(200)
          res.end(JSON.stringify({ token }))
        } else if (code) {
          res.writeHead(401)
          res.end(
            JSON.stringify({
              message: 'Código de autenticação inválido ou expirado',
            }),
          )
        } else {
          // Desafio de 2FA solicitado pelo backend
          res.writeHead(200)
          res.end(
            JSON.stringify({
              requires2fa: true,
              twoFactorRequired: true,
              challengeToken: 'mock-challenge-token-2fa',
              tempToken: 'mock-challenge-token-2fa',
            }),
          )
        }
      } else {
        res.writeHead(200)
        res.end(JSON.stringify({ token }))
      }
    }
    // 1.05 Verificação de 2FA no login (/v1/auth/login/verify-2fa)
    else if (url === '/v1/auth/login/verify-2fa') {
      const parsed = safeJsonParse(body)
      const code = parsed.code || parsed.totpCode
      const isRecovery =
        code &&
        (code.replace(/[^A-Z0-9]/gi, '').length === 8 ||
          code === 'ABCD-1234' ||
          code === 'EMERGENCY-123')
      if (code && (verifyTOTP(TOTP_SECRET, code) || isRecovery)) {
        res.writeHead(200)
        res.end(
          JSON.stringify({
            token:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X3R5cGUiOiJVU0VSIn0.mock-signature',
          }),
        )
      } else {
        res.writeHead(401)
        res.end(
          JSON.stringify({
            message: 'Código de autenticação inválido ou expirado.',
          }),
        )
      }
    }
    // 1.1 Configuração 2FA (QR Code) / Reconfiguração
    else if (url === '/v1/auth/2fa/setup') {
      const parsed = safeJsonParse(body)
      const currentTotp = parsed.currentTotpCode || req.headers['x-current-totp']
      if (currentTotp) {
        if (!verifyTOTP(TOTP_SECRET, currentTotp)) {
          res.writeHead(401)
          res.end(
            JSON.stringify({
              message: 'Código do autenticador atual inválido ou expirado.',
            }),
          )
          return
        }
      }
      res.writeHead(200)
      res.end(
        JSON.stringify({
          otpauthUri: `otpauth://totp/V-Stable:cliente@empresa.com?secret=${TOTP_SECRET}&issuer=V-Stable`,
          secret: TOTP_SECRET,
        }),
      )
    }
    // 1.2 Ativação 2FA
    else if (url === '/v1/auth/2fa/activate') {
      const parsed = safeJsonParse(body)
      if (verifyTOTP(TOTP_SECRET, parsed.code)) {
        const recoveryCodes = [
          'A1B2-C3D4',
          'E5F6-G7H8',
          'J9K0-L1M2',
          'N3P4-Q5R6',
          'S7T8-U9V0',
          'W1X2-Y3Z4',
          'B5C6-D7E8',
          'F9G0-H1J2',
        ]
        res.writeHead(200)
        res.end(JSON.stringify({ success: true, recoveryCodes }))
      } else {
        res.writeHead(400)
        res.end(
          JSON.stringify({
            message: 'Código de autenticação inválido ou expirado.',
          }),
        )
      }
    }
    // 1.3 Solicitação de Recuperação de 2FA
    else if (url === '/v1/auth/2fa/recovery-request' && req.method === 'POST') {
      const parsed = safeJsonParse(body)
      const newReq = {
        id: `req-${Date.now()}`,
        userId: 'u1',
        userName: parsed.fullName || 'Marina Costa',
        userEmail: parsed.email || 'marina@empresa.com',
        companyName: 'Empresa de Teste Ltda',
        requestedAt: new Date().toISOString(),
        reason: parsed.reason || 'Perda de celular e códigos.',
        documentNumber: parsed.documentNumber || '123.456.789-00',
        status: 'PENDING',
      }
      recoveryRequests.unshift(newReq)
      res.writeHead(200)
      res.end(JSON.stringify({ success: true, id: newReq.id }))
    }
    // 1.4 Listagem de solicitações Admin
    else if (url === '/v1/admin/2fa-recovery-requests' && req.method === 'GET') {
      res.writeHead(200)
      res.end(JSON.stringify(recoveryRequests))
    }
    // 1.5 Aprovação Admin
    else if (url.startsWith('/v1/admin/2fa-recovery-requests/') && url.endsWith('/approve')) {
      const id = url.split('/')[4]
      const reqItem = recoveryRequests.find((r) => r.id === id)
      if (reqItem) reqItem.status = 'APPROVED'
      mockWithdrawalLockedUntil = new Date(Date.now() + 48 * 3600 * 1000).toISOString()
      res.writeHead(200)
      res.end(JSON.stringify({ success: true, withdrawalLockedUntil: mockWithdrawalLockedUntil }))
    }
    // 1.6 Rejeição Admin
    else if (url.startsWith('/v1/admin/2fa-recovery-requests/') && url.endsWith('/reject')) {
      const id = url.split('/')[4]
      const reqItem = recoveryRequests.find((r) => r.id === id)
      if (reqItem) reqItem.status = 'REJECTED'
      res.writeHead(200)
      res.end(JSON.stringify({ success: true }))
    }
    // 1.7 Reset de dados mock para testes
    else if (url === '/v1/admin/2fa-recovery-requests/reset') {
      recoveryRequests = getDefaultRequests()
      mockWithdrawalLockedUntil = null
      res.writeHead(200)
      res.end(JSON.stringify({ success: true, message: 'Solicitações resetadas para PENDENTE' }))
    }
    // 2. Dados do usuário autenticado
    else if (url === '/v1/users/me') {
      const authHeader = req.headers['authorization'] || ''
      const isAdmin = authHeader.includes(
        'eyJhY2NvdW50X3R5cGUiOiJBRE1JTiIsInJvbGUiOlsiUk9MRV9BRE1JTiJdfQ',
      )
      res.writeHead(200)
      res.end(
        JSON.stringify({
          id: isAdmin ? 'admin-1' : 'u1',
          name: isAdmin ? 'Administrador V-Stable' : 'Marina Costa',
          email: isAdmin ? 'admin@vstable.com' : 'marina@empresa.com',
          companyId: isAdmin ? null : 'c1',
          accountType: isAdmin ? 'ADMIN' : 'USER',
          roles: isAdmin ? ['ROLE_ADMIN'] : ['ROLE_USER'],
          twoFactorEnabled: !isAdmin,
          withdrawalLockedUntil: mockWithdrawalLockedUntil,
        }),
      )
    }
    // 3. Dados da empresa vinculada
    else if (url === '/v1/companies/c1') {
      res.writeHead(200)
      res.end(
        JSON.stringify({
          id: 'c1',
          legalName: 'Empresa de Teste Ltda',
          tradeName: 'Empresa de Teste',
          cnpj: '12345678000190',
        }),
      )
    }
    // 3.1 Beneficiários da empresa
    else if (url.includes('/beneficiaries')) {
      res.writeHead(200)
      res.end(
        JSON.stringify({
          content: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              companyId: 'c1',
              nickname: 'Atlas Imports',
              legalName: 'Atlas Imports LLC',
              currency: 'USD',
              receivingMethod: 'BANK_ACCOUNT',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            },
            {
              id: '6fa459ea-ee8a-4ca4-894e-db77e160355e',
              companyId: 'c1',
              nickname: 'Pacific Trade',
              legalName: 'Pacific Trade Co.',
              currency: 'USD',
              receivingMethod: 'BANK_ACCOUNT',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            },
          ],
          totalElements: 2,
          totalPages: 1,
          number: 0,
          size: 100,
        }),
      )
    }
    // 4. Cotação de Câmbio
    else if (url.startsWith('/v1/transfers/quote')) {
      const parsedBody = safeJsonParse(body)
      const amountType = parsedBody.amountType || 'SOURCE'
      const amount = Number(parsedBody.amount) || 1000
      const sourceCurrency = parsedBody.sourceCurrency || 'BRL'
      const destinationCurrency = parsedBody.destinationCurrency || 'USD'
      const rate = 5.5

      let src = 1000
      let dst = 181.82
      if (amountType === 'DESTINATION') {
        dst = amount
        src = Number((amount * rate).toFixed(2))
      } else {
        src = amount
        dst = Number((amount / rate).toFixed(2))
      }
      const feeAmount = Number((src * 0.02).toFixed(2))
      const totalAmount = Number((src + feeAmount).toFixed(2))

      res.writeHead(200)
      res.end(
        JSON.stringify({
          source: {
            amount: src,
            currency: sourceCurrency,
          },
          destination: {
            amount: dst,
            currency: destinationCurrency,
          },
          exchangeRate: {
            fromCurrency: sourceCurrency,
            toCurrency: destinationCurrency,
            rate: Number((1 / rate).toFixed(5)),
          },
          fee: {
            percentage: 2,
            amount: feeAmount,
            currency: sourceCurrency,
          },
          total: {
            amount: totalAmount,
            currency: sourceCurrency,
          },
        }),
      )
    }
    // 5. Criação da Transferência (com validação do 2FA!)
    else if (url === '/v1/transfers') {
      const parsed = safeJsonParse(body)
      console.log('📦 Requisição de transferência recebida:', parsed)

      // Regra de teste: código correto é 123456, TOTP válido ou código de recuperação de 8 caracteres
      const isRecovery =
        parsed.totpCode &&
        (parsed.totpCode.replace(/[^A-Z0-9]/gi, '').length === 8 || parsed.totpCode === 'ABCD-1234')
      if (parsed.totpCode === '123456' || verifyTOTP(TOTP_SECRET, parsed.totpCode) || isRecovery) {
        res.writeHead(200)
        res.end(JSON.stringify({ status: 'PROCESSING' }))
      } else {
        res.writeHead(401)
        res.end(
          JSON.stringify({
            message: 'Código de autenticação inválido ou expirado.',
          }),
        )
      }
    } else {
      res.writeHead(404)
      res.end(JSON.stringify({ message: 'Not found' }))
    }
  })
})

server.listen(8080, () => {
  console.log('🚀 Mini Mock Backend rodando em http://localhost:8080')
  console.log('👉 Código 2FA correto configurado: 123456')
})
