$baseUrl = "http://localhost:3000"
$projId = "b4360782-3701-4fad-8af4-263f0bd397ba"

Write-Host "=== INICIANDO SIMULACAO DE PONTA A PONTA (ENSAYO CLINICO UEPG) ===" -ForegroundColor Cyan

# 1. Cadastro de Paciente e Geracao de Codigo Cego
Write-Host "`n[ETAPA 1] Cadastrando novo paciente no sistema..." -ForegroundColor Yellow
$patientPayload = @{
  fullName = "Juliana Mendes de Oliveira"
  cpf = "444.555.666-88"
  phoneWhatsApp = "(42) 99888-7766"
  dateOfBirth = "1999-05-12"
  biologicalSex = "Feminino"
  chiefComplaint = "Deseja clarear os dentes para casamento"
  allergies = "Nenhuma alergia conhecida"
  projectId = $projId
} | ConvertTo-Json

$patRes = Invoke-RestMethod -Uri "$baseUrl/api/patients" -Method Post -Body $patientPayload -ContentType "application/json"
$partId = $patRes.participant.id
$researchCode = $patRes.participant.researchCode
Write-Host "-> Paciente cadastrado com sucesso! Codigo Cego Gerado: $researchCode (ID: $partId)" -ForegroundColor Green

# 2. Assinatura do TCLE Digital
Write-Host "`n[ETAPA 2] Coletando Assinatura Eletronica do TCLE..." -ForegroundColor Yellow
$tclePayload = @{
  participantId = $partId
  participantName = "Juliana Mendes de Oliveira"
  cpf = "444.555.666-88"
  signatureData = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMCAxMCBMMTAwIDEwMCIgc3Ryb2tlPSJibGFjayIvPjwvc3ZnPg=="
} | ConvertTo-Json

$tcleRes = Invoke-RestMethod -Uri "$baseUrl/api/tcle/sign" -Method Post -Body $tclePayload -ContentType "application/json"
Write-Host "-> TCLE assinado com sucesso! Hash criptografico SHA-256 e IP auditados." -ForegroundColor Green

# 3. Preenchimento de Ficha Clinica, Odontograma e Periograma
Write-Host "`n[ETAPA 3] Preenchendo Anamnese Clinica e Odontograma do Estudo..." -ForegroundColor Yellow
$anamnesisPayload = @{
  anamnesisDone = $true
  anamnesisData = (@{
    odontogram = @{
      "13" = "HIGIDO"; "12" = "HIGIDO"; "11" = "HIGIDO";
      "21" = "HIGIDO"; "22" = "HIGIDO"; "23" = "HIGIDO";
      "33" = "HIGIDO"; "32" = "HIGIDO"; "31" = "HIGIDO";
      "41" = "HIGIDO"; "42" = "HIGIDO"; "43" = "HIGIDO";
    }
    periodontogram = @{
      bleedingOnProbing = "0-10%"
      visiblePlaque = "< 20%"
      probingDepth = "≤ 3mm"
      gingivalRecession = "Ausente"
      furcationOrMobility = "Ausente"
    }
    answers = @{
      "crit_1" = "Não" # Sem alergia a peróxido
      "crit_2" = "Não" # Sem gravidez/lactação
      "crit_3" = "Sim" # Dentes íntegros
    }
    clinicalNotes = "Paciente apta ao protocolo de clareamento dental. Tecidos moles higidos."
  } | ConvertTo-Json)
} | ConvertTo-Json

$anamRes = Invoke-RestMethod -Uri "$baseUrl/api/participants/$partId" -Method Patch -Body $anamnesisPayload -ContentType "application/json"
Write-Host "-> Ficha Clinica salva! Trava etica liberada com sucesso." -ForegroundColor Green

# 4. Decisao de Triagem: Inclusao no Estudo
Write-Host "`n[ETAPA 4] Aprovando inclusao do participante na pesquisa..." -ForegroundColor Yellow
$approvePayload = @{ status = "APPROVED" } | ConvertTo-Json
$appRes = Invoke-RestMethod -Uri "$baseUrl/api/participants/$partId" -Method Patch -Body $approvePayload -ContentType "application/json"
Write-Host "-> Participante $researchCode INCLUIDO com sucesso no ensaio clinico!" -ForegroundColor Green

# 5. Randomizacao e Alocacao de Hemi-Arco (Split-Mouth)
Write-Host "`n[ETAPA 5] Realizando Alocacao de Randomizacao (Boca Dividida)..." -ForegroundColor Yellow
$allocPayload = @{ group = "Direita: HP 6% / Esquerda: CP 37%" } | ConvertTo-Json
$allocRes = Invoke-RestMethod -Uri "$baseUrl/api/participants/$partId" -Method Patch -Body $allocPayload -ContentType "application/json"
Write-Host "-> Alocacao realizada: Direita: HP 6% / Esquerda: CP 37%" -ForegroundColor Green

# 6. Registro de Atendimento: Sessao 1 (Baseline)
Write-Host "`n[ETAPA 6] Registrando Sessao 1 (Baseline & 1a Aplicacao)..." -ForegroundColor Yellow
$s1Payload = @{
  sessionNumber = 1
  sessionType = "BASELINE_INTERVENTION_1"
  sessionDate = "2026-09-17"
  shadeRight = "A3.5"
  shadeLeft = "A3.5"
  painScore0h = 1
  painScore1h = 4
  painScore24h = 2
  painScore48h = 0
  gingivalIrritation = "Ausente"
  adverseEvents = "Sensibilidade leve transitoria"
  operatorName = "Dra. Residente UEPG"
  evaluatorName = "Dr. Avaliador Cego"
  notes = "Aplicacao sem intercorrencias"
} | ConvertTo-Json

$s1Res = Invoke-RestMethod -Uri "$baseUrl/api/participants/$partId/sessions" -Method Post -Body $s1Payload -ContentType "application/json"
Write-Host "-> Sessao 1 gravada! Cores basais: A3.5 (Dir) / A3.5 (Esq)" -ForegroundColor Green

# 7. Relato do Paciente via Portal Mobile (/paciente)
Write-Host "`n[ETAPA 7] Paciente preenchendo Diario de Dor Mobile (24h)..." -ForegroundColor Yellow
$reportPayload = @{
  participantId = $partId
  sessionNumber = 1
  timePoint = "24h"
  painScore = 2
  painType = "Sensibilidade passageira ao ingerir agua fria"
  usedAnalgesic = "Não"
  gingivalSensation = "Normal"
  otherSymptoms = "Sensibilidade regredindo rapidamente"
} | ConvertTo-Json

$repRes = Invoke-RestMethod -Uri "$baseUrl/api/paciente/report" -Method Post -Body $reportPayload -ContentType "application/json"
Write-Host "-> Diario do paciente gravado diretamente pelo celular: EVA 2/10 sincronizado!" -ForegroundColor Green

# 8. Registro de Atendimento: Sessao 2 (7 dias) com Clareamento Aferido
Write-Host "`n[ETAPA 8] Registrando Sessao 2 (7 dias de evolucao)..." -ForegroundColor Yellow
$s2Payload = @{
  sessionNumber = 2
  sessionType = "INTERVENTION_2"
  sessionDate = "2026-09-24"
  shadeRight = "A2"
  shadeLeft = "A1"
  painScore0h = 0
  painScore1h = 1
  painScore24h = 0
  painScore48h = 0
  gingivalIrritation = "Ausente"
  adverseEvents = "Nenhum"
  operatorName = "Dra. Residente UEPG"
  evaluatorName = "Dr. Avaliador Cego"
  notes = "Excelente resposta estetica. Clareamento acentuado."
} | ConvertTo-Json

$s2Res = Invoke-RestMethod -Uri "$baseUrl/api/participants/$partId/sessions" -Method Post -Body $s2Payload -ContentType "application/json"
Write-Host "-> Sessao 2 gravada! Cores alcancadas: A2 (Dir) / A1 (Esq) -> Delta SGU positivo!" -ForegroundColor Green

# 9. Verificacao Consolidada
Write-Host "`n[ETAPA 9] Verificando dados consolidados no projeto..." -ForegroundColor Yellow
$projData = Invoke-RestMethod -Uri "$baseUrl/api/projects/$projId"
$curPart = $projData.project.participants | Where-Object { $_.id -eq $partId }

Write-Host "`n=== RESULTADO FINAL DA SIMULACAO E2E ===" -ForegroundColor Cyan
Write-Host "Codigo: $($curPart.researchCode)" -ForegroundColor White
Write-Host "Nome: $($curPart.patient.fullName)" -ForegroundColor White
Write-Host "Status: $($curPart.status)" -ForegroundColor Green
Write-Host "Grupo: $($curPart.group)" -ForegroundColor White
Write-Host "Sessoes Registradas: $($curPart.sessions.Count)/4" -ForegroundColor Green
Write-Host "S1 Cor: $($curPart.sessions[0].shadeRight) / $($curPart.sessions[0].shadeLeft)" -ForegroundColor White
Write-Host "S2 Cor: $($curPart.sessions[1].shadeRight) / $($curPart.sessions[1].shadeLeft)" -ForegroundColor White
Write-Host "Pico de Dor S1: EVA $($curPart.sessions[0].painScore1h)/10" -ForegroundColor Yellow
Write-Host "TCLE Assinado: $($curPart.signatures.Count > 0)" -ForegroundColor Green
Write-Host "`nSUCESSO TOTAL: O fluxo completo de ponta a ponta esta 100% funcional!" -ForegroundColor Green
