<template>
  <nav class="navbar">
    <div class="container d-flex justify-content-between align-items-center">
      <span class="wordmark-group">
        <img src="/IMG/forja-mark.svg" alt="" class="wordmark-icon">
        <span class="wordmark">forja.</span>
      </span>
      <button @click="fazerLogout" class="btn btn-sm btn-outline-danger">
        Sair
      </button>
    </div>
  </nav>

  <div class="container my-4 px-3">
    <h2 class="text-center mb-4" style="font-size: clamp(1.1rem, 5vw, 1.6rem);">
      Sua evolução
    </h2>

    <!-- Stat -->
    <div class="mb-4">
      <div class="stat-card stat-destaque">
        <div class="stat-value">{{ dados ? dados.treinos_feitos ?? 0 : '--' }}</div>
        <div class="stat-label">treinos feitos</div>
      </div>
    </div>

    <!-- Gráfico de progressão -->
    <div class="mb-5">
      <h5 class="mb-1" style="font-size: clamp(0.9rem, 4vw, 1.15rem);">
        Progressão total
      </h5>
      <p style="font-size: 0.75rem; color: var(--muted);" class="mb-3">desde o seu primeiro treino registrado</p>

      <div v-if="dados && dados.progressao_historico && dados.progressao_historico.length > 0"
        id="grafico-container"
        v-html="svgGrafico">
      </div>
      <p v-else class="text-center mt-3" style="color: var(--muted); font-size: 0.85rem;">
        Nenhum treino finalizado ainda.
      </p>
    </div>

    <div class="text-center mb-5">
      <a href="#" @click.prevent="$router.push('/')"
        class="btn btn-outline-secondary"
        style="min-height: 44px; display: inline-flex; align-items: center;">
        &lt; Voltar para treinos
      </a>
    </div>
  </div>

  <TerminalLog :logs="logs" />
</template>

<script>
import { apiFetch } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useTerminal } from '@/composables/useTerminal'
import TerminalLog from '@/components/TerminalLog.vue'

export default {
  name: 'EvolucaoView',
  components: { TerminalLog },

  setup() {
    const { logs, showError } = useTerminal()
    return { logs, showError }
  },

  data() {
    return {
      dados: null
    }
  },

  computed: {
    svgGrafico() {
      const data = this.dados?.progressao_historico
      if (!data || data.length === 0) return ''

      const W = 320, H = 240
      const PAD = { top: 12, right: 14, bottom: 52, left: 50 }
      const cW = W - PAD.left - PAD.right
      const cH = H - PAD.top - PAD.bottom
      const n = data.length
      const values = data.map(d => d.progressao_total)

      let minV = Math.min(0, ...values)
      let maxV = Math.max(0, ...values)
      if (minV === maxV) { minV -= 1; maxV += 1 }
      const rangePad = (maxV - minV) * 0.1 || 1
      minV -= rangePad
      maxV += rangePad
      const range = maxV - minV

      const yFor = (v) => PAD.top + cH - ((v - minV) / range) * cH

      const pts = data.map((d, i) => ({
        x: PAD.left + (n === 1 ? cW / 2 : (i / (n - 1)) * cW),
        y: yFor(d.progressao_total),
        label: d.dia.slice(5).replace('-', '/'),
        value: d.progressao_total
      }))

      const zeroY = yFor(0)
      const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      const fillPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},${zeroY.toFixed(1)} L${PAD.left},${zeroY.toFixed(1)} Z`

      const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => {
        const v = minV + f * range
        return { y: yFor(v), v: Math.round(v) }
      })

      const maxX = Math.min(n, 5)
      const xIdxs = new Set(Array.from({ length: maxX }, (_, i) => Math.round(i * (n - 1) / (maxX > 1 ? maxX - 1 : 1))))

      return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:visible;display:block">
        <defs><linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#D97757" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#D97757" stop-opacity="0.02"/>
        </linearGradient></defs>
        <rect x="${PAD.left}" y="${PAD.top}" width="${cW}" height="${cH}" fill="#FCFBF8"/>
        ${yTicks.map(t => `<line x1="${PAD.left}" y1="${t.y.toFixed(1)}" x2="${W - PAD.right}" y2="${t.y.toFixed(1)}" stroke="#E3DCCF" stroke-width="1"/>`).join('')}
        <line x1="${PAD.left}" y1="${zeroY.toFixed(1)}" x2="${W - PAD.right}" y2="${zeroY.toFixed(1)}" stroke="#B4522F" stroke-width="1" stroke-dasharray="3,3"/>
        <path d="${fillPath}" fill="url(#pGrad)"/>
        <path d="${linePath}" fill="none" stroke="#D97757" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#D97757" stroke="#FCFBF8" stroke-width="1.5"><title>${p.label}: ${p.value >= 0 ? '+' : ''}${p.value}%</title></circle>`).join('')}
        ${yTicks.map(t => `<text x="${PAD.left - 6}" y="${(t.y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#7C746A" font-family="'JetBrains Mono',monospace">${t.v}%</text>`).join('')}
        ${pts.filter((_, i) => xIdxs.has(i)).map(p => `<text x="${p.x.toFixed(1)}" y="${(PAD.top + cH + 14).toFixed(1)}" text-anchor="end" font-size="10" fill="#7C746A" font-family="'JetBrains Mono',monospace" transform="rotate(-40,${p.x.toFixed(1)},${(PAD.top + cH + 14).toFixed(1)})">${p.label}</text>`).join('')}
        <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + cH}" stroke="#E3DCCF" stroke-width="1"/>
      </svg>`
    }
  },

  async mounted() {
    try {
      const res = await apiFetch('/api/evolucao/dashboard')
      this.dados = await res.json()
    } catch (e) {
      this.showError('Erro ao carregar dados: ' + e.message)
    }
  },

  methods: {
    async fazerLogout() {
      const auth = useAuthStore()
      await auth.logout()
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.stat-card {
  border: 1px solid var(--line);
  background-color: var(--card);
  border-radius: var(--radius-sm);
  padding: 0.9rem 0.5rem;
  text-align: center;
}
.stat-destaque {
  background-color: var(--black);
  border-color: var(--black);
}
.stat-destaque .stat-value {
  color: var(--accent);
}
.stat-destaque .stat-label {
  color: #C9C2B7;
}
.stat-value {
  font-size: clamp(1.4rem, 6vw, 2.2rem);
  font-weight: 700;
  color: var(--ink);
  font-family: var(--font-mono);
}
.stat-label {
  font-size: clamp(0.6rem, 2.5vw, 0.75rem);
  color: var(--muted);
  margin-top: 4px;
}
#grafico-container { position: relative; height: 240px; }
</style>