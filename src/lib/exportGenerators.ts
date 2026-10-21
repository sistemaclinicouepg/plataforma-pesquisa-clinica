/**
 * Geradores de Scripts Estatísticos, Codebook e Formatos Científicos
 * UEPG - Departamento de Odontologia / Pós-Graduação em Clínica Integrada
 * Suporte para: R, SPSS, Jamovi, GraphPad Prism e Dicionário de Variáveis
 */

export interface ExportDatasetParticipant {
  researchCode: string;
  biologicalSex: string;
  dateOfBirth?: string | null;
  status: string;
  group?: string | null;
  sessions?: Array<{
    sessionNumber: number;
    shadeRight?: string | null;
    shadeLeft?: string | null;
    painScore0h?: number | null;
    painScore1h?: number | null;
    painScore24h?: number | null;
    painScore48h?: number | null;
    adverseEvents?: string | null;
    notes?: string | null;
  }>;
  responses?: Array<{
    id?: string;
    formId: string;
    answersJson: string;
    submittedAt?: string;
  }>;
}

const VITA_CLASSICAL_SHADES = [
  'B1', 'A1', 'B2', 'D2', 'A2', 'C1', 'C2', 'D4',
  'A3', 'D3', 'B3', 'A3.5', 'B4', 'C3', 'A4', 'C4'
];

export const getVitaSGU = (shade: string | null | undefined): number => {
  if (!shade) return 0;
  const idx = VITA_CLASSICAL_SHADES.indexOf(shade.toUpperCase().trim());
  return idx >= 0 ? idx + 1 : 0;
};

export function buildNumericCSVContent(projectName: string, participants: ExportDatasetParticipant[]): string {
  // Coletar todas as sessões extras (> 2) presentes nos dados
  const extraSessionNumbers = Array.from(
    new Set(
      participants.flatMap((p) => (p.sessions || []).map((s) => s.sessionNumber)).filter((n) => n > 2)
    )
  ).sort((a, b) => a - b);

  const headers = [
    'ID_PARTICIPANTE',
    'SEXO',
    'IDADE',
    'GRUPO_COD',
    'S1_EVA_0H',
    'S1_EVA_1H',
    'S1_EVA_24H',
    'S1_EVA_48H',
    'S2_EVA_0H',
    'S2_EVA_1H',
    'S2_EVA_24H',
    'S2_EVA_48H',
    ...extraSessionNumbers.flatMap((n) => [
      `S${n}_EVA_0H`,
      `S${n}_EVA_1H`,
      `S${n}_EVA_24H`,
      `S${n}_EVA_48H`,
    ]),
    'S1_SGU_DIR',
    'S1_SGU_ESQ',
    'S2_SGU_DIR',
    'S2_SGU_ESQ',
    'R14_SGU_DIR',
    'R14_SGU_ESQ',
    'R30_SGU_DIR',
    'R30_SGU_ESQ',
    'DELTA_SGU_DIR',
    'DELTA_SGU_ESQ',
    'EVENTO_ADVERSO_S1',
    'EVENTO_ADVERSO_S2',
    'ANALGESICO_S1',
    'ANALGESICO_S2',
    'RETENCAO_STATUS'
  ];

  const rows = participants.map((p) => {
    const s1 = p.sessions?.find((s) => s.sessionNumber === 1);
    const s2 = p.sessions?.find((s) => s.sessionNumber === 2);
    const r14 = p.sessions?.find((s) => s.sessionNumber === 3);
    const r30 = p.sessions?.find((s) => s.sessionNumber === 4);

    const sexCode = p.biologicalSex === 'Masculino' ? 1 : p.biologicalSex === 'Feminino' ? 2 : 3;

    let age = 'NA';
    if (p.dateOfBirth) {
      const b = new Date(p.dateOfBirth);
      const diff = Date.now() - b.getTime();
      age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)).toString();
    }

    let groupCode = 1;
    if (p.group) {
      const lower = p.group.toLowerCase();
      if (lower.includes('controle') || lower.includes('20%') || lower.includes('b')) {
        groupCode = 2;
      }
    }

    const s1SguR = s1?.shadeRight ? getVitaSGU(s1.shadeRight) : 'NA';
    const s1SguL = s1?.shadeLeft ? getVitaSGU(s1.shadeLeft) : 'NA';
    const s2SguR = s2?.shadeRight ? getVitaSGU(s2.shadeRight) : 'NA';
    const s2SguL = s2?.shadeLeft ? getVitaSGU(s2.shadeLeft) : 'NA';
    const r14SguR = r14?.shadeRight ? getVitaSGU(r14.shadeRight) : 'NA';
    const r14SguL = r14?.shadeLeft ? getVitaSGU(r14.shadeLeft) : 'NA';
    const r30SguR = r30?.shadeRight ? getVitaSGU(r30.shadeRight) : 'NA';
    const r30SguL = r30?.shadeLeft ? getVitaSGU(r30.shadeLeft) : 'NA';

    const latestR = r30SguR !== 'NA' ? r30SguR : (r14SguR !== 'NA' ? r14SguR : s2SguR);
    const latestL = r30SguL !== 'NA' ? r30SguL : (r14SguL !== 'NA' ? r14SguL : s2SguL);

    const deltaR = (s1SguR !== 'NA' && latestR !== 'NA') ? Number(s1SguR) - Number(latestR) : 'NA';
    const deltaL = (s1SguL !== 'NA' && latestL !== 'NA') ? Number(s1SguL) - Number(latestL) : 'NA';

    const advS1 = s1?.adverseEvents ? 1 : 0;
    const advS2 = s2?.adverseEvents ? 1 : 0;
    const analgS1 = s1?.notes?.includes('Analgésico: Sim') ? 1 : 0;
    const analgS2 = s2?.notes?.includes('Analgésico: Sim') ? 1 : 0;

    const retencao = p.status === 'EXCLUDED' ? 3 : (r30 || r14) ? 1 : 2;

    const extraValues = extraSessionNumbers.flatMap((n) => {
      const sn = p.sessions?.find((s) => s.sessionNumber === n);
      return [
        sn?.painScore0h ?? 'NA',
        sn?.painScore1h ?? 'NA',
        sn?.painScore24h ?? 'NA',
        sn?.painScore48h ?? 'NA',
      ];
    });

    return [
      p.researchCode,
      sexCode,
      age,
      groupCode,
      s1?.painScore0h ?? 'NA',
      s1?.painScore1h ?? 'NA',
      s1?.painScore24h ?? 'NA',
      s1?.painScore48h ?? 'NA',
      s2?.painScore0h ?? 'NA',
      s2?.painScore1h ?? 'NA',
      s2?.painScore24h ?? 'NA',
      s2?.painScore48h ?? 'NA',
      ...extraValues,
      s1SguR,
      s1SguL,
      s2SguR,
      s2SguL,
      r14SguR,
      r14SguL,
      r30SguR,
      r30SguL,
      deltaR,
      deltaL,
      advS1,
      advS2,
      analgS1,
      analgS2,
      retencao
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function generateCodebookMarkdown(projectName: string): string {
  return `# DICIONÁRIO DE VARIÁVEIS & CODEBOOK CLÍNICO (SPSS / R / JAMOVI)
**Projeto:** ${projectName}  
**Instituição:** Universidade Estadual de Ponta Grossa (UEPG) - Departamento de Odontologia  
**Padrão Regulatório:** CNS 466/12, ICH-GCP E6(R2), 21 CFR Part 11  
**Arquivo de Dados Associado:** \`uepg_ensaio_clinico_numerico.csv\`  
**Codificação:** UTF-8 | Delimitador: Vírgula (,) | Missing Value: \`NA\` ou \`999\`

---

## 1. Dicionário Detalhado de Variáveis

| Nome da Variável | Rótulo / Descrição Clínica | Tipo de Dado | Escala de Medida | Valores / Categorias Codificadas | Instrumento de Coleta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ID_PARTICIPANTE** | Código Único Desidentificado do Voluntário | Alfanumérico | Nominal | Ex: P001, P002, P003... | Ficha de Triagem UEPG |
| **SEXO** | Sexo Biológico do Participante | Numérico | Nominal | \`1\` = Masculino<br>\`2\` = Feminino<br>\`3\` = Outro | Anamnese Clínica |
| **IDADE** | Idade do Participante em Anos Completos | Numérico | Escalar | 18 a 70 anos (ou \`NA\`) | Cálculo da Data de Nascimento |
| **GRUPO_COD** | Protocolo / Grupo de Clareamento Alocado | Numérico | Nominal | \`1\` = Grupo Teste / Intervenção Principal<br>\`2\` = Grupo Controle / Comparador Ativo | Randomização em Bloco |
| **S1_EVA_0H** | Dor/Sensibilidade Imediata Sessão 1 (0 horas) | Numérico | Escalar (0-10) | Contínuo de 0.0 a 10.0 (\`NA\` se ausente) | EVA Digital Contínua 100mm |
| **S1_EVA_1H** | Dor/Sensibilidade 1 hora pós-clareamento S1 | Numérico | Escalar (0-10) | Contínuo de 0.0 a 10.0 | Diário Remoto do Paciente |
| **S1_EVA_24H** | Dor/Sensibilidade 24 horas pós-clareamento S1 | Numérico | Escalar (0-10) | Contínuo de 0.0 a 10.0 | Diário Remoto do Paciente |
| **S1_EVA_48H** | Dor/Sensibilidade 48 horas pós-clareamento S1 | Numérico | Escalar (0-10) | Contínuo de 0.0 a 10.0 | Diário Remoto do Paciente |
| **S2_EVA_0H** | Dor/Sensibilidade Imediata Sessão 2 (0 horas) | Numérico | Escalar (0-10) | Contínuo de 0.0 a 10.0 | EVA Digital Contínua 100mm |
| **S2_EVA_1H** | Dor/Sensibilidade 1 hora pós-clareamento S2 | Numérico | Escalar (0-10) | Contínuo de 0.0 a 10.0 | Diário Remoto do Paciente |
| **S2_EVA_24H** | Dor/Sensibilidade 24 horas pós-clareamento S2 | Numérico | Escalar (0-10) | Contínuo de 0.0 a 10.0 | Diário Remoto do Paciente |
| **S2_EVA_48H** | Dor/Sensibilidade 48 horas pós-clareamento S2 | Numérico | Escalar (0-10) | Contínuo de 0.0 a 10.0 | Diário Remoto do Paciente |
| **S1_SGU_DIR** | Cor Baseline Hemi-arco Direito (13 ao 11) | Numérico | Ordinal (1-16) | 1=B1, 2=A1, 3=B2, 4=D2, 5=A2, 6=C1, 7=C2, 8=D4, 9=A3, 10=D3, 11=B3, 12=A3.5, 13=B4, 14=C3, 15=A4, 16=C4 | Escala Vita Classical Ordenada |
| **S1_SGU_ESQ** | Cor Baseline Hemi-arco Esquerdo (21 ao 23) | Numérico | Ordinal (1-16) | 1 a 16 (Ordem por Luminosidade) | Escala Vita Classical Ordenada |
| **S2_SGU_DIR** | Cor Sessão 2 Hemi-arco Direito | Numérico | Ordinal (1-16) | 1 a 16 | Escala Vita Classical Ordenada |
| **S2_SGU_ESQ** | Cor Sessão 2 Hemi-arco Esquerdo | Numérico | Ordinal (1-16) | 1 a 16 | Escala Vita Classical Ordenada |
| **R14_SGU_DIR** | Cor Retorno 14 Dias Hemi-arco Direito | Numérico | Ordinal (1-16) | 1 a 16 | Escala Vita Classical Ordenada |
| **R14_SGU_ESQ** | Cor Retorno 14 Dias Hemi-arco Esquerdo | Numérico | Ordinal (1-16) | 1 a 16 | Escala Vita Classical Ordenada |
| **R30_SGU_DIR** | Cor Retorno 30 Dias Hemi-arco Direito | Numérico | Ordinal (1-16) | 1 a 16 | Escala Vita Classical Ordenada |
| **R30_SGU_ESQ** | Cor Retorno 30 Dias Hemi-arco Esquerdo | Numérico | Ordinal (1-16) | 1 a 16 | Escala Vita Classical Ordenada |
| **DELTA_SGU_DIR** | Variação de Clareamento Hemi-arco Direito | Numérico | Escalar (Δ) | ΔSGU = S1_SGU_DIR - Último_SGU_DIR | Cálculo Matemático (Diferença) |
| **DELTA_SGU_ESQ** | Variação de Clareamento Hemi-arco Esquerdo | Numérico | Escalar (Δ) | ΔSGU = S1_SGU_ESQ - Último_SGU_ESQ | Cálculo Matemático (Diferença) |
| **EVENTO_ADVERSO_S1** | Presença de Reação Adversa na Sessão 1 | Numérico | Binário | \`0\` = Não<br>\`1\` = Sim (Queimação, Ulceração, etc.) | Farmacovigilância UEPG |
| **EVENTO_ADVERSO_S2** | Presença de Reação Adversa na Sessão 2 | Numérico | Binário | \`0\` = Não<br>\`1\` = Sim | Farmacovigilância UEPG |
| **ANALGESICO_S1** | Uso de Analgésico de Resgate pós-S1 | Numérico | Binário | \`0\` = Não ingeriu medicação<br>\`1\` = Ingeriu analgésico | Diário do Voluntário |
| **ANALGESICO_S2** | Uso de Analgésico de Resgate pós-S2 | Numérico | Binário | \`0\` = Não ingeriu medicação<br>\`1\` = Ingeriu analgésico | Diário do Voluntário |
| **RETENCAO_STATUS** | Status de Retenção CONSORT | Numérico | Ordinal | \`1\` = Protocolo Completo (Acompanhado até o fim)<br>\`2\` = Em Acompanhamento Ativo<br>\`3\` = Descontinuado / Excluído | Matriz CONSORT UEPG |

---

## 2. Convenção da Escala Vita Classical Ordenada por Luminosidade (SGU)
A guia de cores Vita Classical foi organizada pelo critério científico odontológico internacional de ordenação por valor/luminosidade decrescente:
1: **B1** | 2: **A1** | 3: **B2** | 4: **D2** | 5: **A2** | 6: **C1** | 7: **C2** | 8: **D4** |
9: **A3** | 10: **D3** | 11: **B3** | 12: **A3.5** | 13: **B4** | 14: **C3** | 15: **A4** | 16: **C4**

Cálculo de Eficácia Clareadora:  
\`ΔSGU = SGU(Baseline) - SGU(Final)\`. Valores positivos indicam clareamento efetivo.
`;
}

export function generateRAnalysisScript(projectName: string): string {
  return `# ==============================================================================
# SCRIPT DE ANÁLISE BIOESTATÍSTICA - ENSAIO CLÍNICO ODONTOLÓGICO
# Projeto: ${projectName}
# Instituição: Universidade Estadual de Ponta Grossa (UEPG)
# Metodologia: Boca Dividida (Split-Mouth) / Randomizado Duplo-Cego
# ==============================================================================

# 1. Carregamento de Pacotes
required_packages <- c("tidyverse", "rstatix", "ggpubr", "car", "emmeans", "lme4")
for (pkg in required_packages) {
  if (!require(pkg, character.only = TRUE)) {
    install.packages(pkg, dependencies = TRUE)
    library(pkg, character.only = TRUE)
  }
}

# 2. Leitura dos Dados Numéricos
df <- read.csv("uepg_ensaio_clinico_numerico.csv", na.strings = c("NA", "", "999"))

# Transformar variáveis categóricas em fatores com rótulos
df <- df %>%
  mutate(
    SEXO = factor(SEXO, levels = c(1, 2, 3), labels = c("Masculino", "Feminino", "Outro")),
    GRUPO_COD = factor(GRUPO_COD, levels = c(1, 2), labels = c("Grupo Teste", "Grupo Controle")),
    RETENCAO_STATUS = factor(RETENCAO_STATUS, levels = c(1, 2, 3), labels = c("Completo", "Em Andamento", "Descontinuado"))
  )

cat("--- ESTRUTURA DO BANCO DE DADOS ---\\n")
glimpse(df)

# ==============================================================================
# 3. ANÁLISE DE EFICÁCIA CLAREADORA (DELTA SGU - BOCA DIVIDIDA)
# ==============================================================================
cat("\\n--- RESUMO DESCRITIVO DE EFICÁCIA (ΔSGU) ---\\n")
summary_delta <- df %>%
  summarise(
    N = sum(!is.na(DELTA_SGU_DIR) & !is.na(DELTA_SGU_ESQ)),
    Media_Delta_Dir = mean(DELTA_SGU_DIR, na.rm = TRUE),
    DP_Delta_Dir = sd(DELTA_SGU_DIR, na.rm = TRUE),
    Media_Delta_Esq = mean(DELTA_SGU_ESQ, na.rm = TRUE),
    DP_Delta_Esq = sd(DELTA_SGU_ESQ, na.rm = TRUE),
    Dif_Media = mean(DELTA_SGU_DIR - DELTA_SGU_ESQ, na.rm = TRUE),
    DP_Dif = sd(DELTA_SGU_DIR - DELTA_SGU_ESQ, na.rm = TRUE)
  )
print(summary_delta)

# Teste de Normalidade das Diferenças Pareadas (Shapiro-Wilk)
dif_pareada <- df$DELTA_SGU_DIR - df$DELTA_SGU_ESQ
shapiro_res <- shapiro.test(na.omit(dif_pareada))
cat("\\nTeste de Normalidade de Shapiro-Wilk (Diferença Pareada): W =", shapiro_res$statistic, "p =", shapiro_res$p.value, "\\n")

# Comparação Pareada Boca Dividida (Direito vs Esquerdo)
if (shapiro_res$p.value > 0.05) {
  cat("\\n-> Distribuição Normal: Aplicando Teste t de Student Pareado...\\n")
  ttest_res <- t.test(df$DELTA_SGU_DIR, df$DELTA_SGU_ESQ, paired = TRUE)
  print(ttest_res)
} else {
  cat("\\n-> Distribuição Não-Normal: Aplicando Teste dos Postos Sinalizados de Wilcoxon...\\n")
  wilcox_res <- wilcox.test(df$DELTA_SGU_DIR, df$DELTA_SGU_ESQ, paired = TRUE)
  print(wilcox_res)
}

# ==============================================================================
# 4. CINÉTICA DA SENSIBILIDADE DENTINÁRIA (LONGITUDINAL EVA 0h, 1h, 24h, 48h)
# ==============================================================================
# Transformar dados de dor para formato longo (tidy)
pain_long <- df %>%
  select(ID_PARTICIPANTE, GRUPO_COD, S1_EVA_0H, S1_EVA_1H, S1_EVA_24H, S1_EVA_48H) %>%
  pivot_longer(
    cols = starts_with("S1_EVA"),
    names_to = "Momento",
    names_prefix = "S1_EVA_",
    values_to = "EVA"
  ) %>%
  mutate(
    Momento = factor(Momento, levels = c("0H", "1H", "24H", "48H"), labels = c("0h", "1h", "24h", "48h"))
  )

cat("\\n--- MÉDIAS DE SENSIBILIDADE EVA POR MOMENTO (SESSÃO 1) ---\\n")
pain_summary <- pain_long %>%
  group_by(Momento) %>%
  summarise(
    N = sum(!is.na(EVA)),
    Media = mean(EVA, na.rm = TRUE),
    DP = sd(EVA, na.rm = TRUE),
    Mediana = median(EVA, na.rm = TRUE),
    IQR = IQR(EVA, na.rm = TRUE)
  )
print(pain_summary)

# Modelo Linear de Efeitos Mistos para Medidas Repetidas no Tempo
pain_model <- lmer(EVA ~ Momento + (1|ID_PARTICIPANTE), data = pain_long)
cat("\\n--- ANOVA DO MODELO DE MEDIDAS REPETIDAS ---\\n")
print(Anova(pain_model, type = 3))

# Comparações Múltiplas Post-Hoc com Correção de Bonferroni
cat("\\n--- CONTRASTES POST-HOC (PAIRWISE BONFERRONI) ---\\n")
emmeans_pain <- emmeans(pain_model, ~ Momento)
print(contrast(emmeans_pain, method = "pairwise", adjust = "bonferroni"))

# ==============================================================================
# 5. GRÁFICOS DE PUBLICAÇÃO CIENTÍFICA (GGPLOT2)
# ==============================================================================
# Gráfico 1: Cinética de Dor com Intervalo de Confiança 95%
p1 <- ggplot(pain_summary, aes(x = Momento, y = Media, group = 1)) +
  geom_line(color = "#1d4ed8", size = 1.2) +
  geom_point(color = "#1d4ed8", size = 3.5) +
  geom_errorbar(aes(ymin = pmax(0, Media - 1.96 * (DP/sqrt(N))), ymax = Media + 1.96 * (DP/sqrt(N))), width = 0.15, color = "#1d4ed8") +
  theme_classic(base_size = 14) +
  labs(
    title = "Cinética Longitudinal da Sensibilidade Dentinária (EVA)",
    subtitle = "Média ± IC 95% ao longo de 48 horas pós-clareamento",
    x = "Tempo após Intervenção Clínica",
    y = "Escala Visual Analógica (EVA 0-10)"
  ) +
  ylim(0, 10)

# Gráfico 2: Comparação de Eficácia Clareadora Pareada
df_box <- df %>%
  select(ID_PARTICIPANTE, DELTA_SGU_DIR, DELTA_SGU_ESQ) %>%
  pivot_longer(cols = c(DELTA_SGU_DIR, DELTA_SGU_ESQ), names_to = "Lado", values_to = "Delta") %>%
  mutate(Lado = factor(Lado, levels = c("DELTA_SGU_DIR", "DELTA_SGU_ESQ"), labels = c("Direito", "Esquerdo")))

p2 <- ggplot(df_box, aes(x = Lado, y = Delta, fill = Lado)) +
  geom_boxplot(alpha = 0.6, outlier.shape = NA, width = 0.4) +
  geom_jitter(width = 0.1, size = 2, alpha = 0.7, color = "#334155") +
  scale_fill_manual(values = c("#10b981", "#6366f1")) +
  theme_classic(base_size = 14) +
  theme(legend.position = "none") +
  labs(
    title = "Eficácia Clareadora por Hemi-arco (Boca Dividida)",
    subtitle = "Variação na Guia Vita Classical (ΔSGU)",
    x = "Hemi-arco Avaliado",
    y = "ΔSGU (Unidades de Clareamento)"
  )

# Salvar gráficos em alta resolução (300 DPI) para artigo científico
ggsave("cinetica_dor_uepg.png", p1, width = 7, height = 5, dpi = 300)
ggsave("delta_sgu_pareado_uepg.png", p2, width = 6, height = 5, dpi = 300)

cat("\\n[UEPG] Análise concluída com sucesso! Gráficos salvos em PNG alta resolução.\\n")
`;
}

export function generateSPSSSyntaxScript(projectName: string): string {
  return `* ============================================================================== .
* SYNTAX DE ANÁLISE BIOESTATÍSTICA - IBM SPSS STATISTICS .
* Projeto: ${projectName} .
* Departamento de Odontologia - Universidade Estadual de Ponta Grossa (UEPG) .
* ============================================================================== .

* 1. Importação do Banco de Dados Numérico CSV .
GET DATA
  /TYPE=TXT
  /FILE='uepg_ensaio_clinico_numerico.csv'
  /DELIMITERS=","
  /QUALIFIER='"'
  /FIRSTCASE=2
  /VARIABLES=
    ID_PARTICIPANTE A12
    SEXO F1.0
    IDADE F3.0
    GRUPO_COD F1.0
    S1_EVA_0H F4.1
    S1_EVA_1H F4.1
    S1_EVA_24H F4.1
    S1_EVA_48H F4.1
    S2_EVA_0H F4.1
    S2_EVA_1H F4.1
    S2_EVA_24H F4.1
    S2_EVA_48H F4.1
    S1_SGU_DIR F2.0
    S1_SGU_ESQ F2.0
    S2_SGU_DIR F2.0
    S2_SGU_ESQ F2.0
    R14_SGU_DIR F2.0
    R14_SGU_ESQ F2.0
    R30_SGU_DIR F2.0
    R30_SGU_ESQ F2.0
    DELTA_SGU_DIR F4.1
    DELTA_SGU_ESQ F4.1
    EVENTO_ADVERSO_S1 F1.0
    EVENTO_ADVERSO_S2 F1.0
    ANALGESICO_S1 F1.0
    ANALGESICO_S2 F1.0
    RETENCAO_STATUS F1.0.
CACHE.
EXECUTE.

* 2. Definição de Rótulos de Variáveis (Variable Labels) .
VARIABLE LABELS
  ID_PARTICIPANTE 'Código Único do Participante UEPG'
  SEXO 'Sexo Biológico'
  IDADE 'Idade em Anos'
  GRUPO_COD 'Grupo Alocado de Clareamento'
  S1_EVA_0H 'Sensibilidade Imediata Sessão 1 (0h)'
  S1_EVA_1H 'Sensibilidade 1 hora Sessão 1'
  S1_EVA_24H 'Sensibilidade 24 horas Sessão 1'
  S1_EVA_48H 'Sensibilidade 48 horas Sessão 1'
  DELTA_SGU_DIR 'Eficácia Clareadora ΔSGU Hemi-arco Direito'
  DELTA_SGU_ESQ 'Eficácia Clareadora ΔSGU Hemi-arco Esquerdo'
  RETENCAO_STATUS 'Status de Retenção CONSORT'.

* 3. Definição de Rótulos de Valores (Value Labels) .
VALUE LABELS
  SEXO 1 'Masculino' 2 'Feminino' 3 'Outro'
  /GRUPO_COD 1 'Grupo Teste' 2 'Grupo Controle'
  /EVENTO_ADVERSO_S1 0 'Ausente' 1 'Presente'
  /ANALGESICO_S1 0 'Não' 1 'Sim'
  /RETENCAO_STATUS 1 'Completo' 2 'Em Acompanhamento' 3 'Excluído'.
EXECUTE.

* 4. Estatística Descritiva Global .
DESCRIPTIVES VARIABLES=IDADE S1_EVA_0H S1_EVA_1H S1_EVA_24H S1_EVA_48H DELTA_SGU_DIR DELTA_SGU_ESQ
  /STATISTICS=MEAN STDDEV MIN MAX SEMEAN.

* 5. Teste t de Student Pareado (Boca Dividida: Delta SGU Direito vs Esquerdo) .
T-TEST PAIRS=DELTA_SGU_DIR WITH DELTA_SGU_ESQ (PAIRED)
  /CRITERIA=CI(.9500)
  /MISSING=ANALYSIS.

* 6. Análise de Variância de Medidas Repetidas (GLM Repeated Measures: EVA 0h, 1h, 24h, 48h) .
GLM S1_EVA_0H S1_EVA_1H S1_EVA_24H S1_EVA_48H
  /WSFACTOR=Tempo 4 Polynomial
  /MEASURE=EVA_Dor
  /METHOD=SSTYPE(3)
  /PLOT=PROFILE(Tempo)
  /EMMEANS=TABLES(Tempo) COMPARE ADJ(BONFERRONI)
  /PRINT=DESCRIPTIVE ETASQ HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=Tempo.

EXECUTE.
`;
}

export function generateGraphPadPrismFormat(projectName: string, participants: ExportDatasetParticipant[]): string {
  // Gera formato tabular compatível com colagem direta no GraphPad Prism
  let out = `## DADOS FORMATADOS PARA GRAPHPAD PRISM\n`;
  out += `## Projeto: ${projectName} - UEPG Odontologia\n\n`;

  out += `### TABELA 1: CINÉTICA DE DOR LONGITUDINAL - SESSÃO 1 (TABELA XY / GROUPED)\n`;
  out += `### X = Tempo em Horas | Linhas = Participantes | Valores = Escore EVA (0-10)\n`;
  out += `ParticipantID\tTime_0h\tTime_1h\tTime_24h\tTime_48h\n`;

  participants.forEach((p) => {
    const s1 = p.sessions?.find((s) => s.sessionNumber === 1);
    out += `${p.researchCode}\t${s1?.painScore0h ?? ''}\t${s1?.painScore1h ?? ''}\t${s1?.painScore24h ?? ''}\t${s1?.painScore48h ?? ''}\n`;
  });

  const hasS2 = participants.some((p) => p.sessions?.some((s) => s.sessionNumber === 2));
  if (hasS2) {
    out += `\n### TABELA 1B: CINÉTICA DE DOR LONGITUDINAL - SESSÃO 2 (TABELA XY / GROUPED)\n`;
    out += `ParticipantID\tTime_0h\tTime_1h\tTime_24h\tTime_48h\n`;
    participants.forEach((p) => {
      const s2 = p.sessions?.find((s) => s.sessionNumber === 2);
      out += `${p.researchCode}\t${s2?.painScore0h ?? ''}\t${s2?.painScore1h ?? ''}\t${s2?.painScore24h ?? ''}\t${s2?.painScore48h ?? ''}\n`;
    });
  }

  out += `\n### TABELA 2: EFICÁCIA CLAREADORA BOCA DIVIDIDA (COLUMN / PAIRED T-TEST)\n`;
  out += `### Coluna A = Hemi-arco Direito (ΔSGU) | Coluna B = Hemi-arco Esquerdo (ΔSGU)\n`;
  out += `ParticipantID\tDelta_Direito\tDelta_Esquerdo\n`;

  participants.forEach((p) => {
    const s1 = p.sessions?.find((s) => s.sessionNumber === 1);
    const s2 = p.sessions?.find((s) => s.sessionNumber === 2);
    const r14 = p.sessions?.find((s) => s.sessionNumber === 3);
    const r30 = p.sessions?.find((s) => s.sessionNumber === 4);

    const s1R = s1?.shadeRight ? getVitaSGU(s1.shadeRight) : 0;
    const s1L = s1?.shadeLeft ? getVitaSGU(s1.shadeLeft) : 0;
    const latestR = r30?.shadeRight ? getVitaSGU(r30.shadeRight) : (r14?.shadeRight ? getVitaSGU(r14.shadeRight) : (s2?.shadeRight ? getVitaSGU(s2.shadeRight) : 0));
    const latestL = r30?.shadeLeft ? getVitaSGU(r30.shadeLeft) : (r14?.shadeLeft ? getVitaSGU(r14.shadeLeft) : (s2?.shadeLeft ? getVitaSGU(s2.shadeLeft) : 0));

    const deltaR = (s1R > 0 && latestR > 0) ? (s1R - latestR) : '';
    const deltaL = (s1L > 0 && latestL > 0) ? (s1L - latestL) : '';

    out += `${p.researchCode}\t${deltaR}\t${deltaL}\n`;
  });

  return out;
}

export function generateCodebookText(projectName: string): string {
  return `================================================================================
DICIONÁRIO DE VARIÁVEIS & CODEBOOK CLÍNICO (SPSS / R / JAMOVI)
Projeto: ${projectName}
Instituição: Universidade Estadual de Ponta Grossa (UEPG) - Departamento de Odontologia
Conformidade: CNS 466/12, ICH-GCP E6(R2), 21 CFR Part 11
Arquivo Associado: uepg_ensaio_clinico_numerico.csv
Codificação: UTF-8 | Delimitador: Vírgula (,) | Missing Value: NA ou 999
================================================================================

1. VARIÁVEIS DEMOGRÁFICAS & DESENHO
--------------------------------------------------------------------------------
- ID_PARTICIPANTE: Código único desidentificado do participante (Ex: P001, P002...)
- SEXO: Sexo biológico (1 = Masculino, 2 = Feminino, 3 = Outro)
- IDADE: Idade em anos completos calculada a partir da data de nascimento
- GRUPO_COD: Protocolo alocado (1 = Grupo Teste / Intervenção, 2 = Grupo Controle)
- RETENCAO_STATUS: Status CONSORT (1 = Completo, 2 = Em Acompanhamento, 3 = Descontinuado/Excluído)

2. DESFECHOS DE SENSIBILIDADE DENTINÁRIA (EVA 0 a 10 mm)
--------------------------------------------------------------------------------
- S1_EVA_0H: Sensibilidade imediata pós-sessão 1 (0 horas)
- S1_EVA_1H: Sensibilidade 1 hora pós-sessão 1
- S1_EVA_24H: Sensibilidade 24 horas pós-sessão 1
- S1_EVA_48H: Sensibilidade 48 horas pós-sessão 1
- S2_EVA_0H: Sensibilidade imediata pós-sessão 2 (0 horas)
- S2_EVA_1H: Sensibilidade 1 hora pós-sessão 2
- S2_EVA_24H: Sensibilidade 24 horas pós-sessão 2
- S2_EVA_48H: Sensibilidade 48 horas pós-sessão 2

3. EFICÁCIA CLAREADORA (ESCALA VITA CLASSICAL ORDENADA 1 a 16)
--------------------------------------------------------------------------------
Convenção SGU (Luminosidade):
1=B1, 2=A1, 3=B2, 4=D2, 5=A2, 6=C1, 7=C2, 8=D4,
9=A3, 10=D3, 11=B3, 12=A3.5, 13=B4, 14=C3, 15=A4, 16=C4

- S1_SGU_DIR / S1_SGU_ESQ: Cor inicial baseline (hemi-arco direito e esquerdo)
- S2_SGU_DIR / S2_SGU_ESQ: Cor após 2ª sessão de clareamento
- R14_SGU_DIR / R14_SGU_ESQ: Cor no retorno de 14 dias
- R30_SGU_DIR / R30_SGU_ESQ: Cor no retorno de 30 dias
- DELTA_SGU_DIR / DELTA_SGU_ESQ: Variação de clareamento (S1_SGU - Último_SGU)

4. FARMACOVIGILÂNCIA E SEGURANÇA CLÍNICA
--------------------------------------------------------------------------------
- EVENTO_ADVERSO_S1 / S2: Presença de eventos adversos (0 = Ausente, 1 = Presente)
- ANALGESICO_S1 / S2: Ingestão de analgésico de resgate (0 = Não, 1 = Sim)
`;
}
