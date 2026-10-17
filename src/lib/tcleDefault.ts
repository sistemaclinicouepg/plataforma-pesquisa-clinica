/**
 * Modelo Oficial do Termo de Consentimento Livre e Esclarecido (TCLE) da UEPG
 * Baseado diretamente no protocolo aprovado:
 * "Comparação da eficácia do clareamento dental em consultório com peróxido de hidrogênio 6% e peróxido de carbamida 37%: ensaio clínico randomizado controlado"
 * Pesquisadora Responsável: Roberta Micheten Dias
 * Orientadora: Profa. Dra. Alessandra Reis
 * Instituição: Universidade Estadual de Ponta Grossa – UEPG
 */

export interface TCLETemplate {
  title: string;
  responsibleResearcher: string;
  researcherPhone?: string;
  researcherEmail?: string;
  advisor: string;
  institution: string;
  ethicsNumber: string;
  ethicsContacts: string;
  contentMarkdown: string;
  assentContentMarkdown: string;
}

export const OFFICIAL_UEPG_TCLE: TCLETemplate = {
  title:
    'Comparação da eficácia do clareamento dental em consultório com peróxido de hidrogênio 6% e peróxido de carbamida 37%: ensaio clínico randomizado controlado',
  responsibleResearcher: 'Roberta Micheten Dias',
  researcherPhone: '(42) 99946-5140',
  researcherEmail: 'robertinhamicheten@hotmail.com',
  advisor: 'Profa. Dra. Alessandra Reis',
  institution: 'Universidade Estadual de Ponta Grossa – UEPG',
  ethicsNumber: 'Parecer Consubstanciado CEP/UEPG',
  ethicsContacts:
    'Comitê de Ética em Pesquisa da UEPG (COEP): Av. Carlos Cavalcanti, nº 4748, Bloco Reitoria, Sala 22, Uvaranas, Ponta Grossa/PR, CEP 84030-900. Telefone: (42) 3220-3282. E-mail: coep105@uepg.br',
  contentMarkdown: `Você está sendo convidado(a) a participar de uma pesquisa científica desenvolvida na Universidade Estadual de Ponta Grossa (UEPG). Antes de decidir participar, é importante que leia atentamente este documento. Ele explica por que esta pesquisa está sendo realizada, quais procedimentos serão executados, quais são os possíveis riscos e benefícios, quais são seus direitos como participante e como seus dados serão protegidos.

Caso alguma informação não esteja clara, você poderá fazer perguntas aos pesquisadores antes de decidir se deseja participar. Somente participe se todas as suas dúvidas forem esclarecidas e se essa for sua vontade. Sua participação é totalmente voluntária.

### 1. Justificativa e Objetivos da Pesquisa
Esta pesquisa tem como objetivo comparar a eficácia de dois géis clareadores já utilizados no mercado odontológico, sendo o seu uso totalmente seguro:
- **Peróxido de hidrogênio 6%** (*Automixx HP 6%*, FGM, Joinville, SC, Brasil);
- **Peróxido de carbamida 37%** (*Whiteness Super-endo*, FGM, Joinville, SC, Brasil).

Serão realizadas **3 sessões clínicas com intervalo de 7 dias**, conforme a orientação do fabricante.

Além da alteração da cor dos dentes, também serão avaliados:
- Ocorrência de sensibilidade dentária;
- Intensidade de sensibilidade dentária;
- Ocorrência de irritação gengival;
- Intensidade da irritação gengival;
- Satisfação do participante em relação ao tratamento.

A pesquisa contará com aproximadamente 50 participantes. Você foi convidado(a) porque apresenta as características necessárias para participar desta pesquisa, de acordo com os critérios previamente definidos pelos pesquisadores. Sua participação somente ocorrerá caso você concorde livremente e assine este Termo de Consentimento Livre e Esclarecido.

### 2. Procedimentos da Pesquisa e Metodologia de Boca Dividida (Split-Mouth)
Inicialmente será realizada uma avaliação clínica completa da sua saúde bucal para verificar se você atende aos critérios de inclusão da pesquisa. Serão registrados seus dados clínicos, fotografias do sorriso e a cor inicial dos dentes utilizando métodos visuais e instrumentos específicos para avaliação da cor dental. Posteriormente será realizada a moldagem com silicone da arcada superior para confecção de moldes para avaliação de cor. Você receberá todas as orientações detalhadas, verbais e por escrito, sobre o tratamento.

A pesquisa utilizará um **delineamento de boca dividida**, ou seja, cada lado da boca receberá um dos tratamentos clareadores avaliados, porém a metodologia do estudo impede que você saiba em qual lado cada gel foi aplicado, para que não haja interferência nas avaliações da pesquisa.

Ao longo do tratamento serão realizados retornos periódicos para:
- Avaliação da cor dos dentes;
- Avaliação da sensibilidade dentária;
- Avaliação da irritação gengival;
- Esclarecimento de dúvidas;
- Acompanhamento da sua segurança durante todo o estudo.

O tempo total estimado para a realização do estudo será de **quatro semanas** (uma vez por semana será realizada a intervenção e uma semana após a finalização será realizada a avaliação de cor).

### 3. Riscos, Desconfortos e Assistência Integral
Os riscos desta pesquisa são considerados mínimos e semelhantes aos normalmente observados durante tratamentos clareadores realizados em consultório odontológico. Os principais desconfortos que poderão ocorrer são:
- Sensibilidade dentária temporária;
- Irritação gengival leve e transitória;
- Possível alteração temporária da sensibilidade ao frio.

Caso qualquer reação adversa seja observada, você será imediatamente avaliado(a) pelos pesquisadores. Se necessário, serão adotadas todas as medidas clínicas indicadas para controle dos sintomas, incluindo acompanhamento odontológico, interrupção temporária do tratamento, aplicação de agentes dessensibilizantes e prescrição de medicamentos analgésicos ou anti-inflamatórios. Todo o tratamento será gratuito.

Embora sejam esperados apenas riscos mínimos, existe a possibilidade de ocorrer algum dano decorrente da pesquisa. Caso isso aconteça, você terá direito à assistência integral, imediata e gratuita pelos pesquisadores e pela instituição responsável. Caso seja caracterizado dano decorrente da pesquisa, você terá direito à indenização, conforme previsto na legislação brasileira vigente.

### 4. Benefícios Esperados
Você receberá gratuitamente um tratamento clareador realizado com materiais de qualidade reconhecida e amplamente utilizados na Odontologia. O tratamento poderá proporcionar melhora da estética do sorriso e da satisfação com sua aparência. Entretanto, não é possível garantir que todos os participantes obtenham o mesmo grau de clareamento.

Além do benefício individual, sua participação contribuirá para o desenvolvimento científico e para o aperfeiçoamento dos protocolos de clareamento dental utilizados futuramente por cirurgiões-dentistas.

### 5. Despesas e Ausência de Remuneração
Você não terá qualquer despesa decorrente da participação nesta pesquisa. Todos os materiais, exames e procedimentos previstos serão fornecidos gratuitamente pelos pesquisadores. Não haverá qualquer pagamento pela participação.

### 6. Voluntariedade e Retirada de Consentimento
Sua participação é totalmente voluntária. Você poderá recusar participar ou desistir da pesquisa em qualquer momento, sem necessidade de apresentar justificativa. Sua decisão não causará qualquer prejuízo ao seu atendimento odontológico, ao seu relacionamento com a Universidade Estadual de Ponta Grossa ou com os pesquisadores.

### 7. Sigilo, Confidencialidade e LGPD (Lei nº 13.709/2018)
Todas as informações obtidas nesta pesquisa serão mantidas em absoluto sigilo. Seu nome não aparecerá em artigos científicos, dissertações, apresentações em congressos ou qualquer outra forma de divulgação. Cada participante receberá um código numérico para identificação. Somente os pesquisadores autorizados terão acesso aos dados identificáveis. Os resultados poderão ser publicados em revistas científicas nacionais e internacionais, porém sempre de forma coletiva, impossibilitando sua identificação.

Seus dados pessoais serão tratados de acordo com a **Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)**. Os dados serão utilizados exclusivamente para os objetivos desta pesquisa. As informações serão armazenadas em arquivos protegidos por senha e em armários trancados, sob responsabilidade dos pesquisadores, pelo período exigido pela legislação e pelas normas institucionais. Após esse período, os dados serão descartados de forma segura ou mantidos apenas quando houver obrigação legal ou autorização ética para sua guarda.

Caso novas informações relevantes sobre a pesquisa sejam obtidas durante sua realização e possam influenciar sua decisão de continuar participando, você será imediatamente informado(a). Você poderá solicitar esclarecimentos antes, durante ou após sua participação. Receberá uma via deste Termo de Consentimento.

### 8. Declaração do Participante
Declaro que:
- Li este Termo de Consentimento Livre e Esclarecido;
- Tive oportunidade de fazer perguntas;
- Todas as minhas dúvidas foram esclarecidas;
- Fui informado(a) sobre os objetivos, procedimentos, riscos, benefícios e meus direitos;
- Recebi informações suficientes para decidir livremente;
- Concordo voluntariamente em participar desta pesquisa.

Também declaro estar ciente de que poderei retirar meu consentimento a qualquer momento, sem sofrer qualquer prejuízo.

---
**Vias do Documento:**  
• 1ª via: Pesquisador (Arquivo institucional seguro UEPG)  
• 2ª via: Participante da pesquisa (Cópia integral assinada física ou digital com selo criptográfico)`,
  assentContentMarkdown: `Você está sendo convidado(a) a participar de uma pesquisa desenvolvida na Universidade Estadual de Ponta Grossa (UEPG) sobre clareamento dos dentes.

### O que vamos fazer?
Queremos comparar dois tipos de géis clareadores que já são usados por dentistas para saber qual funciona melhor.
- Faremos 3 consultas no consultório da UEPG, com uma semana de intervalo entre elas.
- Cada lado da sua boca receberá um tipo de gel de forma segura.
- Iremos olhar a cor dos dentes, tirar fotografias e verificar se você sentiu alguma sensibilidade ou incômodo na gengiva.

### O que você pode sentir?
Pode ser que você sinta uma sensibilidade leve ao tomar água fria ou uma irritação passageira na gengiva. Se isso acontecer, os dentistas pesquisadores irão aplicar remédios para aliviar na hora, sem nenhum custo para você ou sua família.

### Você é obrigado(a) a participar?
Não! Você só participa se você quiser e se os seus pais ou responsáveis também concordarem. Se você disser "sim" agora e depois mudar de ideia, pode parar a qualquer momento e ninguém vai ficar chateado com você.

### Seus dados serão protegidos
Ninguém além dos pesquisadores saberá o seu nome. Em qualquer trabalho da faculdade, você será identificado apenas por um código numérico.`,
};
