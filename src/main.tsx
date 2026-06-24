import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useTasteStore } from './store/tasteStore'

// NOTE: intentionally not wrapped in <React.StrictMode>.
// @react-three/postprocessing currently crashes under React 19 StrictMode in dev.
createRoot(document.getElementById('root')!).render(<App />)

// Expose the store for automated visual checks / debugging.
;(window as unknown as { tasteStore: typeof useTasteStore }).tasteStore = useTasteStore
