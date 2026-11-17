import { lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import { AuthProvider } from './lib/auth'
import { isDemo } from './lib/supabase'
import Casting from './pages/Casting'
import Chisme from './pages/Chisme'
import Entrar from './pages/Entrar'
import Home from './pages/Home'
import Ideas from './pages/Ideas'
import Muro from './pages/Muro'
import NewsDetail from './pages/NewsDetail'
import NewsList from './pages/NewsList'
import Perfil from './pages/Perfil'
import Publicidad from './pages/Publicidad'
import Ranking from './pages/Ranking'

// En la demo usamos rutas con # porque el hosting de prueba no reescribe URLs
const Router = isDemo ? HashRouter : BrowserRouter

const Admin = lazy(() => import('./pages/admin/Admin'))

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="novedades" element={<NewsList />} />
            <Route path="novedades/:slug" element={<NewsDetail />} />
            <Route path="casting" element={<Casting />} />
            <Route path="chisme" element={<Chisme />} />
            <Route path="publicidad" element={<Publicidad />} />
            <Route path="ideas" element={<Ideas />} />
            <Route path="muro" element={<Muro />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="entrar" element={<Entrar />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="admin" element={<Suspense fallback={<Spinner />}><Admin /></Suspense>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

function NotFound() {
  return (
    <div className="card card-center narrow-sm">
      <div className="big-emoji wobble">🤷</div>
      <h1>Error 404</h1>
      <p className="muted">Esta página se fue a comprar cigarrillos y no volvió.</p>
      <Link to="/" className="btn btn-pink">Volver al inicio</Link>
    </div>
  )
}
