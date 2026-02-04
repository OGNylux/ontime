/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL: string
	readonly VITE_SUPABASE_ANON_KEY: string
	// add other env variables here as needed
	readonly [key: string]: string | undefined
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
