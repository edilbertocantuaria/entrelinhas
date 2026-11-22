import { parseISO } from 'date-fns'
import { shift } from './format'
import type { AppData, Area, BodyWeight, Goal, JournalEntry, LogEntry, Settings, StudySession, Subject, Summary, Task, Workout, WorkoutSet } from './types'

export const DEFAULT_AREAS: Area[] = [
  { id: 'saude', name: 'Saúde', icon: 'heart-pulse', color: 'verde', order: 0, archived: false },
  { id: 'academico', name: 'Acadêmico', icon: 'graduation-cap', color: 'mar', order: 1, archived: false },
  { id: 'financeiro', name: 'Financeiro', icon: 'wallet', color: 'tijolo', order: 2, archived: false },
  { id: 'profissional', name: 'Profissional', icon: 'briefcase', color: 'celeste', order: 3, archived: false },
  { id: 'pessoal', name: 'Pessoal', icon: 'user', color: 'periwinkle', order: 4, archived: false },
  { id: 'mental', name: 'Mental', icon: 'brain', color: 'azul-cinza', order: 5, archived: false },
]

export const DEFAULT_SETTINGS: Settings = {
  maxTasks: 5,
  hideStreaks: false,
  hidePercent: false,
  quietFrom: '22:00',
  quietTo: '07:00',
  rollover: '04:00',
  monthlyAuto: true,
  quarterlyAuto: true,
  retroEnabled: true,
  retroDate: null,
  retroTime: '20:00',
  useAI: true,
  theme: 'system',
  illustrations: 'many',
  demoDate: null,
}

const GOALS: Goal[] = [
  {
    id: 'academia',
    title: 'Treinar na academia',
    areaId: 'saude',
    description: 'Treinar de 3 a 4 vezes por semana, alternando força e cardio.',
    metric: { type: 'frequency', min: 3, max: 4, noun: 'treinos' },
    startingPoint: 'Um treino por semana, sem regularidade.',
    achievableNote: 'A academia fica no caminho do trabalho. Três treinos cabem na semana.',
    why: 'Quero ter mais energia durante o dia e dormir melhor.',
    startDate: '2026-08-31',
    deadline: '2026-12-31',
    taskTitle: 'Treino na academia',
    reminder: { on: true, time: '07:00' },
  },
  {
    id: 'peso',
    title: 'Chegar aos 78 kg',
    areaId: 'saude',
    description: 'Sair de 85 kg e chegar a 78 kg, com uma medição por semana.',
    metric: { type: 'value', from: 85, to: 78, unit: 'kg' },
    startingPoint: '85 kg em julho.',
    achievableNote: 'Meio quilo por semana é um ritmo saudável e possível.',
    why: 'Quero subir escadas sem cansar e cuidar da saúde com calma.',
    startDate: '2026-07-06',
    deadline: '2026-12-31',
    taskTitle: 'Registrar o peso',
    reminder: { on: true, time: '07:30' },
  },
  {
    id: 'reserva',
    title: 'Reserva de emergência',
    areaId: 'financeiro',
    description: 'Guardar R$ 5.000 até dezembro, com um depósito por mês.',
    metric: { type: 'sum', target: 5000, unit: 'R$', currency: true },
    startingPoint: 'Começando do zero em julho.',
    achievableNote: 'Depois das contas fixas, sobram cerca de R$ 700 por mês.',
    why: 'Ter uma reserva me dá tranquilidade para imprevistos.',
    startDate: '2026-07-01',
    deadline: '2026-12-31',
    taskTitle: 'Guardar na reserva',
    reminder: { on: true, time: '09:00' },
  },
  {
    id: 'logica',
    title: 'Estudar Raciocínio Lógico',
    areaId: 'academico',
    description: 'Estudar Raciocínio Lógico em 60 dias diferentes até o fim do ano.',
    metric: { type: 'days', target: 60, unit: 'dias', sessionMinutes: 30 },
    startingPoint: 'Nenhum estudo regular da matéria.',
    achievableNote: 'Meia hora por dia cabe antes do jantar.',
    why: 'É a matéria que mais pesa na prova do ano que vem.',
    startDate: '2026-10-01',
    deadline: '2026-12-31',
    taskTitle: 'Raciocínio Lógico: 30 min',
    reminder: { on: false, time: '19:00' },
  },
  {
    id: 'projeto',
    title: 'Concluir projeto X',
    areaId: 'profissional',
    description: 'Entregar o projeto X em cinco etapas, da pesquisa à apresentação.',
    metric: {
      type: 'milestones',
      items: [
        { id: 'm1', title: 'Levantar requisitos' },
        { id: 'm2', title: 'Desenhar o protótipo' },
        { id: 'm3', title: 'Testar com 5 pessoas' },
        { id: 'm4', title: 'Ajustar a partir dos testes' },
        { id: 'm5', title: 'Apresentar para a equipe' },
      ],
    },
    startingPoint: 'Só a ideia no papel.',
    achievableNote: 'Uma etapa por mês, com folga para imprevistos.',
    why: 'É o trabalho de que mais quero me orgulhar neste ano.',
    startDate: '2026-09-01',
    deadline: '2026-12-18',
    taskTitle: 'Avançar no projeto X',
    reminder: { on: false, time: '10:00' },
  },
]

const WORKOUTS: { note: string; workout: WorkoutSet[] }[] = [
  {
    note: 'Treino A: pernas',
    workout: [
      { exercise: 'Agachamento', sets: 4, reps: 10, weight: 60 },
      { exercise: 'Leg press', sets: 3, reps: 12, weight: 120 },
      { exercise: 'Panturrilha', sets: 3, reps: 15, weight: 40 },
    ],
  },
  {
    note: 'Treino B: superiores',
    workout: [
      { exercise: 'Supino', sets: 4, reps: 8, weight: 40 },
      { exercise: 'Remada curvada', sets: 3, reps: 10, weight: 35 },
      { exercise: 'Desenvolvimento', sets: 3, reps: 10, weight: 16 },
    ],
  },
  {
    note: 'Treino C: cardio e core',
    workout: [
      { exercise: 'Esteira (25 min)', sets: 1 },
      { exercise: 'Prancha', sets: 3 },
      { exercise: 'Abdominal', sets: 3, reps: 15 },
    ],
  },
]

const GYM_WEEKS = [3, 3, 4, 2, 3, 4, 3, 3, 1, 3, 3]
const GYM_DAYS: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 2, 4, 5] }
const WEIGHTS = [85, 84.6, 84.3, 84.4, 83.9, 83.6, 83.4, 83, 83.1, 82.7, 82.4, 82.1, 82.2, 81.8, 81.5, 81.3, 81, 80.7, 80.4]
const STUDY_SKIPPED = new Set(['2026-10-13', '2026-10-22', '2026-10-29', '2026-11-07'])
const STUDY_MINUTES = [30, 25, 40, 30, 20, 45, 30]

function buildLogs(): LogEntry[] {
  const logs: LogEntry[] = []

  // Reserva: depósitos mensais, somando R$ 3.100
  ;[
    ['2026-07-05', 600],
    ['2026-08-05', 600],
    ['2026-09-04', 650],
    ['2026-10-05', 700],
    ['2026-11-05', 550],
  ].forEach(([date, value], index) =>
    logs.push({ id: `reserva-${index}`, date: date as string, goalId: 'reserva', value: value as number, note: 'Depósito mensal' }),
  )

  // Peso: uma medição por segunda-feira
  WEIGHTS.forEach((value, index) =>
    logs.push({ id: `peso-${index}`, date: shift('2026-07-06', index * 7), goalId: 'peso', value }),
  )

  // Academia: treinos por semana, alternando A, B e C
  let workout = 0
  GYM_WEEKS.forEach((count, week) => {
    // na semana da gripe, o único treino foi na segunda
    const days = week === 8 ? [0] : GYM_DAYS[count]
    days.forEach(day => {
      const template = WORKOUTS[workout % WORKOUTS.length]
      // a carga sobe 2,5 kg a cada três voltas pelos treinos A, B e C
      const bump = Math.floor(workout / (WORKOUTS.length * 3)) * 2.5
      const sets = template.workout.map(set => (set.weight ? { ...set, weight: set.weight + bump } : set))
      logs.push({ id: `academia-${workout}`, date: shift('2026-08-31', week * 7 + day), goalId: 'academia', note: template.note, workout: sets })
      workout++
    })
  })

  // Estudo: quase todos os dias desde 1º de outubro, menos aos domingos
  for (let i = 0, date = '2026-10-01'; date <= '2026-11-15'; i++, date = shift(date, 1)) {
    if (parseISO(date).getDay() === 0 || STUDY_SKIPPED.has(date)) continue
    logs.push({ id: `logica-${i}`, date, goalId: 'logica', value: STUDY_MINUTES[i % STUDY_MINUTES.length] })
  }

  // Projeto X: duas de cinco etapas concluídas
  logs.push({ id: 'projeto-m1', date: '2026-09-11', goalId: 'projeto', milestoneId: 'm1', note: 'Levantar requisitos' })
  logs.push({ id: 'projeto-m2', date: '2026-10-02', goalId: 'projeto', milestoneId: 'm2', note: 'Desenhar o protótipo' })

  return logs
}

function buildTasks(today: string, logs: LogEntry[]): Task[] {
  const tasks: Task[] = []
  const has = (goalId: string, date: string) => logs.some(log => log.goalId === goalId && log.date === date)
  const add = (task: Omit<Task, 'id' | 'later' | 'origin'> & { later?: boolean }) =>
    tasks.push({ id: `t${tasks.length}`, later: false, origin: task.goalId ? 'recurring' : 'standalone', ...task })

  // Semana da gripe: treinos dispensados não contam contra o ritmo
  add({ title: 'Treino na academia', goalId: 'academia', date: '2026-10-28', status: 'dismissed', dismissReason: 'Doente' })
  add({ title: 'Treino na academia', goalId: 'academia', date: '2026-10-30', status: 'dismissed', dismissReason: 'Doente' })

  // Histórico das duas primeiras semanas de uso diário
  for (let date = '2026-11-02'; date <= '2026-11-15' && date < today; date = shift(date, 1)) {
    const weekday = parseISO(date).getDay()
    if (has('academia', date)) add({ title: 'Treino na academia', goalId: 'academia', date, status: 'done' })
    if (has('peso', date)) add({ title: 'Registrar o peso', goalId: 'peso', date, status: 'done' })
    if (has('logica', date)) add({ title: 'Raciocínio Lógico: 30 min', goalId: 'logica', date, status: 'done' })
    else if (date === '2026-11-07')
      add({ title: 'Raciocínio Lógico: 30 min', goalId: 'logica', date, status: 'dismissed', dismissReason: 'Viagem' })
    else if (weekday !== 0) add({ title: 'Raciocínio Lógico: 30 min', goalId: 'logica', date, status: 'not_done' })
  }
  add({ title: 'Ligar para a mãe', date: '2026-11-08', status: 'done' })
  add({ title: 'Pagar a conta de luz', date: '2026-11-10', status: 'done' })
  add({ title: 'Levar roupa na lavanderia', date: '2026-11-12', status: 'not_done' })
  add({ title: 'Comprar presente da Bia', date: '2026-11-13', status: 'done' })

  // Ficou de ontem, aparece na abertura do dia
  add({ title: 'Responder o e-mail do síndico', date: shift(today, -1), status: 'pending' })

  // Hoje: 3 de 5
  add({ title: 'Treino na academia', goalId: 'academia', date: today, status: 'pending' })
  add({ title: 'Raciocínio Lógico: 30 min', goalId: 'logica', date: today, status: 'pending' })
  add({ title: 'Comprar pão', date: today, status: 'pending' })

  // Depois
  add({ title: 'Organizar a mesa do escritório', date: today, status: 'pending', later: true })
  add({ title: 'Marcar dentista', date: today, status: 'pending', later: true })

  return tasks
}

const JOURNAL: JournalEntry[] = (
  [
    ['2026-07-20', 4, ['reserva'], 'Primeiro depósito na reserva feito. É pouco perto do total, mas hoje o número deixou de ser zero.'],
    ['2026-08-12', 3, ['peso'], 'A balança subiu um pouco nesta semana. Respirei fundo e lembrei que a linha geral está descendo.'],
    ['2026-09-04', 4, ['academia'], 'Primeira semana completa de academia. Três treinos, como combinado comigo. Dormi melhor nas três noites.'],
    ['2026-09-17', 3, ['projeto'], 'Fechei o levantamento de requisitos do projeto X. Demorou mais do que eu queria, mas ficou bem feito.'],
    ['2026-10-01', 4, ['logica'], 'Comecei o estudo diário de Raciocínio Lógico. Meia hora, sem pressão, só para criar o hábito.'],
    ['2026-10-05', 5, ['reserva'], 'Depósito do mês feito logo no dia 5. Ver a reserva crescer virou um pequeno ritual.'],
    ['2026-10-09', 3, ['projeto'], 'Mostrei o protótipo do projeto X para a equipe. Vieram boas ideias e uma lista de ajustes.'],
    ['2026-10-14', 4, ['academia'], 'Voltei para a academia depois do feriado. O primeiro treino pesa, o segundo já anima.'],
    ['2026-10-21', 4, ['logica'], 'Acertei quase todas as questões de lógica proposicional. Estudar um pouco todo dia está funcionando.'],
    ['2026-10-28', 2, ['academia'], 'Gripe forte. Cancelei os treinos da semana e fiquei de repouso. O corpo pediu pausa e eu ouvi.'],
    ['2026-11-02', 3, [], 'Semana nova. Decidi abrir e fechar o dia por aqui, para ver se a cabeça fica mais leve.'],
    ['2026-11-05', 5, ['reserva'], 'Depositei mais R$ 550 na reserva. Passei dos R$ 3.000 e isso me deu uma tranquilidade que eu não esperava.'],
    ['2026-11-09', 4, ['peso'], 'A balança marcou 80,4 kg. Devagar, mas descendo. O que mais mudou foi a disposição de manhã.'],
    ['2026-11-11', 3, ['logica'], 'Dia corrido no trabalho. Mesmo assim, fiz 20 minutos de Raciocínio Lógico antes de dormir. Pouco, mas feito.'],
    ['2026-11-13', 4, ['academia'], 'O treino de pernas rendeu. Aumentei a carga no agachamento e saí da academia com a cabeça mais calma.'],
    ['2026-11-15', 4, [], 'Domingo tranquilo. Caminhei no parque de manhã e deixei o estudo de lado sem culpa. À noite organizei a semana.'],
  ] as [string, number, string[], string][]
).map(([date, mood, goalIds, text]) => ({ id: `j-${date}`, date, mood, goalIds, text }))

const SUMMARIES: Summary[] = [
  {
    id: 's-2026-10',
    kind: 'monthly',
    start: '2026-10-01',
    end: '2026-10-31',
    title: 'Um mês de constância possível',
    narrative:
      'Outubro foi um mês de constância possível. Você começou o estudo diário de Raciocínio Lógico e manteve o hábito em 24 dias, quase sempre com meia hora. Na academia, as três primeiras semanas seguiram no combinado, e na última o corpo pediu pausa por causa da gripe. A reserva recebeu R$ 700,00 e chegou a R$ 2.550,00. O peso seguiu descendo com calma, de 81,8 kg para 81,0 kg.',
    generatedAt: '2026-11-01',
    pinned: false,
    edited: false,
    seen: false,
    usedAI: true,
    variant: 0,
    reflections: {},
  },
  {
    id: 's-2026-q3',
    kind: 'quarterly',
    start: '2026-07-01',
    end: '2026-09-30',
    title: 'Um trimestre para montar a base',
    narrative:
      'Entre julho e setembro você montou a base. A reserva saiu do zero e chegou a R$ 1.850,00 com três depósitos mensais. O peso foi de 85,0 kg para 82,2 kg, medido toda segunda-feira. No fim de agosto a academia entrou na rotina, e setembro terminou com o projeto X em movimento, com os requisitos levantados. Foram meses de preparar o terreno, sem pressa.',
    generatedAt: '2026-10-01',
    pinned: false,
    edited: false,
    seen: true,
    usedAI: true,
    variant: 0,
    reflections: {},
  },
]

// ---------- Módulo Fitness ----------

function buildFitness(logs: LogEntry[]): { workouts: Workout[]; weights: BodyWeight[] } {
  // os treinos e pesos das metas aparecem também no módulo
  const workouts: Workout[] = logs
    .filter(log => log.goalId === 'academia')
    .map(log => ({ id: `w-${log.id}`, date: log.date, kind: 'musculacao', minutes: log.note?.includes('cardio') ? 45 : 60, exercises: log.workout, note: log.note, logId: log.id }))
  const extra: [string, Workout['kind'], number, number | undefined, string | undefined][] = [
    ['2026-09-13', 'caminhada', 35, 2.8, undefined],
    ['2026-09-27', 'caminhada', 40, 3.2, undefined],
    ['2026-10-03', 'bicicleta', 50, 13.5, 'Ciclovia da orla'],
    ['2026-10-10', 'danca', 60, undefined, 'Aula de forró'],
    ['2026-10-11', 'caminhada', 40, 3.3, undefined],
    ['2026-10-17', 'bicicleta', 55, 15, undefined],
    ['2026-10-24', 'danca', 60, undefined, 'Aula de forró'],
    ['2026-11-01', 'caminhada', 45, 3.8, undefined],
    ['2026-11-08', 'calistenia', 30, undefined, 'Barra e flexões na praça'],
    ['2026-11-14', 'bicicleta', 60, 17, undefined],
    ['2026-11-15', 'caminhada', 50, 4.2, 'Parque, de manhã'],
  ]
  extra.forEach(([date, kind, minutes, distanceKm, note], index) =>
    workouts.push({
      id: `w-extra-${index}`,
      date,
      kind,
      minutes,
      distanceKm,
      note,
      exercises:
        kind === 'calistenia'
          ? [
              { exercise: 'Barra fixa', sets: 3, reps: 5 },
              { exercise: 'Flexão', sets: 3, reps: 12 },
            ]
          : undefined,
    }),
  )
  const weights = logs.filter(log => log.goalId === 'peso').map(log => ({ id: `p-${log.id}`, date: log.date, kg: log.value ?? 0, logId: log.id }))
  return { workouts: workouts.sort((a, b) => a.date.localeCompare(b.date)), weights }
}

// ---------- Módulo Estudos ----------

const SUBJECTS: Subject[] = [
  { id: 'logica', name: 'Raciocínio Lógico', color: 'mar', goalId: 'logica' },
  { id: 'portugues', name: 'Português', color: 'periwinkle' },
  { id: 'informatica', name: 'Informática', color: 'ambar' },
]

const STUDY_NOTES: Record<string, Partial<Pick<StudySession, 'difficulty' | 'progress' | 'insight'>>> = {
  '2026-10-02': { difficulty: 'Confundo a negação de "todo" com "nenhum".' },
  '2026-10-08': { insight: 'Desenhar a tabela-verdade antes de ler as alternativas economiza tempo.' },
  '2026-10-15': { difficulty: 'Equivalências da condicional ainda saem devagar.' },
  '2026-10-21': { progress: 'Acertei quase todas as questões de lógica proposicional.' },
  '2026-10-27': { insight: 'Em questões de sequência, olhar primeiro a diferença entre os termos.' },
  '2026-11-04': { progress: 'Já nego proposições compostas sem consultar o resumo.' },
  '2026-11-11': { difficulty: 'Problemas de porcentagem com dois aumentos seguidos.' },
  '2026-11-14': { progress: 'Fiz 15 questões em meia hora, antes eram 10.', insight: 'Revisar os erros do dia anterior nos primeiros 5 minutos fixa melhor.' },
}

function buildStudy(logs: LogEntry[]): StudySession[] {
  const sessions: StudySession[] = logs
    .filter(log => log.goalId === 'logica')
    .map((log, index) => {
      const questions = 10 + (index % 3) * 5
      // o aproveitamento sobe aos poucos, de cerca de 55% para 85%
      const rate = Math.min(0.85, 0.55 + index * 0.009) + ((index % 4) - 1.5) * 0.03
      return { id: `e-${log.id}`, date: log.date, subjectId: 'logica', minutes: log.value ?? 30, questions, correct: Math.round(questions * rate), logId: log.id, ...STUDY_NOTES[log.date] }
    })
  let extra = 0
  for (let date = '2026-10-20'; date <= '2026-11-15'; date = shift(date, 1)) {
    const weekday = parseISO(date).getDay()
    if (weekday === 2 || weekday === 4) {
      const correct = 9 + (extra % 4)
      sessions.push({
        id: `e-pt-${extra}`,
        date,
        subjectId: 'portugues',
        minutes: 40,
        questions: 15,
        correct,
        ...(date === '2026-10-29' ? { difficulty: 'Crase antes de pronomes possessivos.' } : date === '2026-11-12' ? { progress: 'Regência verbal parou de ser chute.' } : {}),
      })
      extra++
    }
    if (weekday === 6 && date !== '2026-11-07')
      sessions.push({ id: `e-inf-${date}`, date, subjectId: 'informatica', minutes: 45, ...(date === '2026-10-31' ? { insight: 'Montar um quadro com os atalhos que mais caem ajuda a lembrar.' } : {}) })
  }
  return sessions.sort((a, b) => a.date.localeCompare(b.date))
}

export const DEFAULT_LETTER =
  'Oi, eu de 2027. Este ano foi o começo: abri a reserva, voltei para a academia e criei o hábito de estudar um pouco por dia. Espero que você continue no seu ritmo, sem se cobrar pelo que ficou para depois. Cuide do sono e comemore as coisas pequenas.'

/** Dados de exemplo. O histórico é fixo em 2026; as tarefas de hoje acompanham a data real. */
export function createSeed(today: string): AppData {
  const logs = buildLogs()
  return {
    areas: DEFAULT_AREAS,
    goals: GOALS,
    logs,
    tasks: buildTasks(today, logs),
    journal: JOURNAL,
    summaries: SUMMARIES,
    retros: {
      '2026': { year: 2026, generatedAt: '2026-11-16', saved: true, banner: false, announced: false, pinned: false, letter: DEFAULT_LETTER },
    },
    reviews: {},
    ...buildFitness(logs),
    subjects: SUBJECTS,
    studySessions: buildStudy(logs),
    day: { openedOn: today, closedOn: null },
    settings: DEFAULT_SETTINGS,
    session: null,
    onboarded: false,
    startedAt: '2026-11-02',
  }
}
