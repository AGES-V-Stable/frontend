import { Navigate, Route, Routes } from 'react-router'

import { Home } from '@/pages/Home/Home'
import { Login } from '@/pages/Login/Login'
import { Register } from '@/pages/Register/Register'

import { PATHS } from './paths'

function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.HOME} element={<Home />} />
      <Route path={PATHS.LOGIN} element={<Login />} />
      <Route path={PATHS.REGISTER} element={<Register />} />

      <Route path="*" element={<Navigate to={PATHS.HOME} replace />} />
    </Routes>
  )
}

export default AppRoutes
