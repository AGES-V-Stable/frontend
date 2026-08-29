import { Route, Routes } from 'react-router'

import Home from '@/pages/Home'
import Login from '@/pages/Login'

import { PATHS } from './paths'

function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.HOME} element={<Home />} />
      <Route path={PATHS.LOGIN} element={<Login />} />
    </Routes>
  )
}

export default AppRoutes
