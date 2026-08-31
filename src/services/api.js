const API_URL = ''

// Render (free tier) hiberna o backend após ~15min sem requisições e demora
// pra "acordar". Esses status/erros indicam isso (proxy fora do ar), não um
// erro da aplicação em si — por isso é seguro tentar de novo automaticamente.
const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 20000] // ~50s de tentativas
const STATUS_RETRIAVEIS = [502, 503, 504]

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function apiFetch(endpoint, options = {}) {
    for (let tentativa = 0; ; tentativa++) {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            })

            if (STATUS_RETRIAVEIS.includes(res.status) && tentativa < RETRY_DELAYS_MS.length) {
                await esperar(RETRY_DELAYS_MS[tentativa])
                continue
            }

            return res
        } catch (e) {
            if (tentativa < RETRY_DELAYS_MS.length) {
                await esperar(RETRY_DELAYS_MS[tentativa])
                continue
            }
            throw e
        }
    }
}