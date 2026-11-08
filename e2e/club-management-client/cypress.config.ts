import { execFileSync } from 'node:child_process'
import { defineConfig } from 'cypress'

const COMPOSE_FILE = '../../servers/club-management-server/docker-compose.yml'

export default defineConfig({
  e2e: {
    // localhost, like CLIENT_APP_URL: the social login cookie only comes back to the same host.
    baseUrl: 'http://localhost:8080',
    supportFile: false,
    // Mobile viewport is mandatory (constitution, Principle III).
    viewportWidth: 390,
    viewportHeight: 844,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on) {
      on('task', {
        // Runs a command inside a container of the stack, for what the browser cannot reach.
        composeExec({ service, env = {}, command }: { service: string; env?: Record<string, string>; command: string[] }) {
          const envArguments = Object.entries(env).flatMap(([name, value]) => ['-e', `${name}=${value}`])
          return execFileSync(
            'docker',
            ['compose', '-f', COMPOSE_FILE, 'exec', '-T', ...envArguments, service, ...command],
            { encoding: 'utf8', timeout: 120000 },
          )
        },
      })
    },
  },
})
