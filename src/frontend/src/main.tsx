import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CookieConsent } from './components/CookieConsent'
import { 啟量 } from './data/量'

/*
  已許者,每入即載之 —— banner 但問其未擇者,不當令已許者每次再答。
  啟量 自驗其許與其識,故此處無條件呼之為安。
  Returning visitors who already consented get analytics loaded here; the
  banner only ever asks people who have not chosen. 啟量 checks consent and the
  measurement id itself, so calling it unconditionally is safe.
*/
啟量()

/*
  餅之問置於 App 之外 —— App 有三出(landing、說之頁、器),置其內則須三書之。
  Outside App because App has three return branches; putting it inside would
  mean writing it three times.
*/
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <CookieConsent />
  </StrictMode>,
)

/*
  離網之工。其註於載後,不於載中 —— 首載之時網已忙,再增一求則其畫愈遲。
  Registered after load, not during: the first paint is already competing for
  bandwidth and the worker buys nothing on a first visit.

  dev 之時不註 —— sw 之記與 vite 之熱替相犯,其改不見於屏而人不知其故。
  Never in dev: the worker's cache fights hot-module reload, and the symptom is
  edits that silently do not appear.
*/
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // 註之不成,則其站一如其舊。離網之用失之而已,不害其行。
      });
  });
}
