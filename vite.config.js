import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Plugin to generate version.json file
function generateVersionFile() {
  return {
    name: 'generate-version-file',
    closeBundle() {
      const buildNumber = process.env.VITE_BUILD_NUMBER || 'dev'
      const buildDate = new Date().toISOString().split('T')[0]
      const versionInfo = {
        buildNumber,
        buildDate,
        timestamp: Date.now()
      }
      
      const distDir = path.resolve(__dirname, 'dist')
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true })
      }
      
      fs.writeFileSync(
        path.resolve(distDir, 'version.json'),
        JSON.stringify(versionInfo, null, 2)
      )
      console.log('Generated version.json:', versionInfo)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), generateVersionFile()],
  base: '/scales-tuner/',
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]),
  },
  server: {
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io']
  }
})
