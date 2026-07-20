import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { LandingPage } from "./LandingPage"
import "./styles.css"

if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_REACT_DEVTOOLS !== "1") {
  void import("react-grab")
  void import("react-scan")
}

const rootElement = document.getElementById("root")
if (!rootElement) throw new TypeError("React root element is missing")

const isEditorRoute = /^\/editor(?:\/|$)/.test(window.location.pathname)

createRoot(rootElement).render(<StrictMode>{isEditorRoute ? <App /> : <LandingPage />}</StrictMode>)
