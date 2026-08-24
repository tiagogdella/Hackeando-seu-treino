<template>
 <div class="focus-mode" style="padding-bottom: 96px;">
   <nav class="navbar">
        <div class="container d-flex justify-content-between align-items-center">
            <a class="navbar-brand fw-bold" href="#" @click.prevent="$router.push('/')">&lt; Voltar</a>
            <span class="fw-bold">{{  treino ? treino.nome : ''}}</span>
            <button @click="fazerLogout" class="btn btn-sm btn-outline-danger">
                Sair
            </button>
        </div>
   </nav>

   <div class="container my-4">

    <div
    v-for="(ex, i) in exercicios"
    :key="ex.id"
    class="card p-3 mb-3">

        <h5 class="mb-3">{{ ex.isIsometrico ? '⏱️' : '🏋️' }} {{ ex.nome }}</h5>

        <div class="mb-2">
            <label class="form-label fw-semibold">Número de séries</label>
            <input
                type="number"
                v-model.number="ex.numSeries"
                class="form-control"
                min="1"
                max="15"
                @change="ajustarSeries(ex)">
        </div>

        <div
        v-for="(serie, s) in ex.series"
        :key="s"
        class="row mb-2">

            <div class="col">
                <label class="form-label">S{{ s + 1 }} Peso (kg)</label>
                <input
                type="number"
                v-model="serie.peso"
                class="form-control"
                min="0"
                step="0.5">
            </div>
            <div class="col">
                <label class="form-label">
                    {{ ex.isIsometrico ? 'Segundos' : 'Repetições' }}
                </label>
                <input
                type="number"
                v-model="serie.reps"
                class="form-control"
                min="1">
            </div>
        </div>
        <small>Média de reps: <span class="num-highlight">{{ mediaReps(ex).toFixed(1) }}</span></small>
    </div>
   </div>

   <div class="focus-bottom-bar">
     <button
     class="btn btn-primary w-100"
     :disabled="salvando"
     @click="finalizarTreino">
         {{ salvando ? 'Salvando...' : 'Finalizar treino' }}
     </button>
   </div>

   <TerminalLog :logs="logs" />
 </div>
</template>

<script>
import { apiFetch } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useTerminal } from '@/composables/useTerminal'
import TerminalLog from '@/components/TerminalLog.vue'

export default {
    name: 'TreinoView',
    components: { TerminalLog},

    setup() {
        const { logs, showSuccess, showError, showLog } = useTerminal()
        return { logs, showSuccess, showError, showLog }
    },

    data() {
        return {
            treinoId: null,
            execucaoId: null,
            treino: null,
            exercicios: [],
            salvando: false,
            localSaveIntervalId: null,
            heartbeatIntervalId: null
        }
    },

    async mounted() {
        this.treinoId = localStorage.getItem('treinoSelecionado')
        if (!this.treinoId) {
            this.showError('Nenhum treino selecionado')
            setTimeout(() => this.$router.push('/'), 2000)
            return
        }

        const estadoSalvo = this.carregarEstadoLocal()

        try {
            const res = await apiFetch(`/api/treinos/${this.treinoId}`)
            this.treino = await res.json()

            const resUltimo = await apiFetch(`/api/treinos/${this.treinoId}/ultimo`)
            const ultimoTreino = await resUltimo.json()

            if (estadoSalvo?.execucaoId) {
                try {
                    const resExec = await apiFetch(`/api/execucoes/${estadoSalvo.execucaoId}`)
                    const dadosExec = await resExec.json()
                    if (dadosExec.volume_total == null){
                        this.execucaoId = estadoSalvo.execucaoId
                    }
                } catch (e) {}
            }

            const continuandoExecucaoAnterior = this.execucaoId === estadoSalvo?.execucaoId

            if(!this.execucaoId) {
                const resExec = await apiFetch(`/api/treinos/${this.treinoId}/executar`, { method: 'POST'})
                const dadosExec = await resExec.json()
                this.execucaoId = dadosExec.execucao_id
            }

            this.exercicios = this.treino.exercicios.map(ex => {
                const dadosUltimo = ultimoTreino.existe
                    ? ultimoTreino.series_por_exercicio.find(s => s.exercicio_id === ex.id)
                    : null

                const numSeries = dadosUltimo ? dadosUltimo.series.length : 3
                const isIsometrico = ex.tipo === 'isometrico'

                const series = Array.from({ length: numSeries }, (_, s) =>({
                    peso: dadosUltimo?.series[s]?.peso || '',
                    reps: dadosUltimo?.series[s]?.repeticoes || '',
                    pesoAnterior: dadosUltimo?.series[s]?.peso || '',
                    repsAnterior: dadosUltimo?.series[s]?.repeticoes || ''
                }))

                return { ...ex, isIsometrico, numSeries, series }
            })

            if (continuandoExecucaoAnterior) {
                this.restaurarEstado(estadoSalvo)
                this.showLog('Treino restaurado - continue de onde parou!', 'info')
            } else if (estadoSalvo) {
                // rascunho de uma execução que já foi finalizada antes - descarta, não faz sentido reaproveitar
                localStorage.removeItem(`treino_estado_${this.treinoId}`)
            }

            this.localSaveIntervalId = setInterval(() => this.salvarEstadoLocal(), 30000)

            // Mantém o servidor e a conexão com o banco acordados durante o
            // treino, evitando que o backend hiberne (Render free tier) e o
            // "Finalizar treino" caia no vazio depois de muito tempo parado.
            this.heartbeatIntervalId = setInterval(() => {
                apiFetch('/api/auth/status').catch(() => {})
            }, 4 * 60 * 1000)
        } catch (e) {
            this.showError('Erro ao carregar treino: ' + e.message)
            setTimeout(() => this.$router.push('/'), 2000)
        }
    },

    beforeUnmount() {
        clearInterval(this.localSaveIntervalId)
        clearInterval(this.heartbeatIntervalId)
        this.salvarEstadoLocal()
    },

    methods: {

        mediaReps(ex){
            const comReps = ex.series.filter(s => s.reps !== '')
            if (comReps.length === 0) return 0
            const soma = comReps.reduce((acumulador , s) => acumulador + Number(s.reps), 0)
            return soma / comReps.length
        },

        ajustarSeries(ex){
            const atual = ex.series.length
            const novo = ex.numSeries

            if (novo > atual) {
                for (let i = atual; i < novo; i++) {
                    ex.series.push({ peso: '', reps: '', pesoAnterior: '', repsAnterior: ''})
                }
            } else {
                ex.series.splice(novo)
            }
        },

        salvarEstadoLocal() {
            if (!this.treinoId || !this.execucaoId) return
            const estado = {
                execucaoId: this.execucaoId,
                timestamp: Date.now(),
                exercicios: this.exercicios.map(ex => ({
                    numSeries: ex.numSeries,
                    series: ex.series.map(s => ({ peso: s.peso, reps: s.reps }))
                }))
            }
            localStorage.setItem(`treino_estado_${this.treinoId}`, JSON.stringify(estado))
        },

        carregarEstadoLocal() {
            const str = localStorage.getItem(`treino_estado_${this.treinoId}`)
            if (!str) return null
            try {
                const parsed = JSON.parse(str)
                if(Date.now() - parsed.timestamp < 6 * 60 * 60 * 1000) return parsed
                localStorage.removeItem(`treino_estado_${this.treinoId}`)
            } catch (e) {
                localStorage.removeItem(`treino_estado_${this.treinoId}`)
            }
            return null
        },

        restaurarEstado(estado){
            if(!estado.exercicios) return
            estado.exercicios.forEach((exDados, i) => {
                if(!exDados || !this.exercicios[i]) return
                this.exercicios[i].numSeries = exDados.numSeries
                this.exercicios[i].series = exDados.series.map((s, si) => ({
                    peso: s.peso,
                    reps: s.reps,
                    pesoAnterior: this.exercicios[i].series[si]?.pesoAnterior || '',
                    repsAnterior: this.exercicios[i].series[si]?.repsAnterior || ''
                }))
            });
        },

        async finalizarTreino() {
            if(!this.execucaoId) return
            this.salvando = true

            try {
                let ordemGlobal = 1

                for (const ex of this.exercicios) {
                    for (const serie of ex.series) {
                        if (!serie.peso || !serie.reps) {
                            const unidade = ex.isIsometrico ? 'segundos' : 'reps'
                            this.showError(`Preencha peso e ${unidade} de todas as séries de ${ex.nome}`)
                            this.salvando = false
                            return
                        }

                        await apiFetch(`/api/execucoes/${this.execucaoId}/series`, {
                            method: 'POST',
                            body: JSON.stringify({
                                exercicio_id: ex.id,
                                peso: parseFloat(serie.peso),
                                repeticoes: parseInt(serie.reps),
                                ordem: ordemGlobal
                            })
                        })
                        ordemGlobal ++
                    }
                }

                const resFinal = await apiFetch(`/api/execucoes/${this.execucaoId}/finalizar`, {method: 'POST'})
                const resultado = await resFinal.json()

                if (!resFinal.ok) {
                    this.showError(resultado.erro || 'Erro ao finalizar treino')
                    this.salvando = false
                    return
                }

                localStorage.removeItem(`treino_estado_${this.treinoId}`)

                const resProgressao = await apiFetch(`/api/treinos/${this.treinoId}/progressao`)
                const progressao = await resProgressao.json()

                let mensagem = `Treino finalizado! Volume: ${resultado.volume_total.toFixed(2)}kg`
                if (progressao.progresso_percentual !== null) {
                    const sinal = progressao.progresso_percentual >= 0 ? '+' : ''
                mensagem += ` | Progressão: ${sinal}${progressao.progresso_percentual.toFixed(2)}%`
                }

                this.showSuccess(mensagem)

                if (progressao.delta_reps_por_exercicio?.length > 0) {
                    progressao.delta_reps_por_exercicio.forEach((item, idx) => {
                        const ex = this.exercicios.find(e => e.nome === item.exercicio_nome)
                        const unidade = ex?.isIsometrico ? 'seg' : 'reps'
                        const sinal = item.delta_reps > 0 ? '+' : ''
                        setTimeout(() => {
                            this.showLog(`${item.exercicio_nome}: ${sinal}${item.delta_reps} ${unidade}`, item.delta_reps >= 0 ? 'success' : 'info')
                        },(idx + 1) * 500)
                    })
                }

                setTimeout(() => this.$router.push('/'), 3000)

            } catch (e) {
                this.showError('Erro ao finalizar treino: ' + e.message)
                this.salvando = false
            }
        },

        async fazerLogout(){
            const auth = useAuthStore()
            await auth.logout()
            this.$router.push('/login')
        }
    }
}
</script>

<style scoped>
.focus-bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    background: var(--d-bg);
    border-top: 1px solid var(--d-line);
    z-index: 20;
}

.focus-bottom-bar .btn {
    max-width: 640px;
    margin: 0 auto;
    display: block;
}
</style>
