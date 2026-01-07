import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";

// Expose `supabase` to window in development for easier debugging in DevTools.
if (import.meta.env.DEV) {
	try {
		(window as any).supabase = supabase;
		// eslint-disable-next-line no-console
		console.info('supabase client exposed on window.supabase (DEV only)');
	} catch (e) {
		// ignore
	}
}

createRoot(document.getElementById("root")!).render(<App />);
