interface LoginData {
  email: string
  password: string
}

interface LoginResponse {
  token: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

async function login(data: LoginData): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (response.status === 401) {
    throw new Error('E-mail ou senha inválidos')
  }

  if (response.status === 423) {
    throw new Error('Usuário bloqueado')
  }

  if (!response.ok) {
    throw new Error('Erro ao realizar login')
  }

  const authorization = response.headers.get('Authorization')

  if (!authorization) {
    throw new Error('Token não retornado pelo servidor')
  }

  // Handles "Bearer <token>"
  const token = authorization.startsWith('Bearer ')
    ? authorization.substring(7)
    : authorization

  return { token }
}

export const authService = {
  login,
}