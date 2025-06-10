// --- Configurações da Assinatura no Canvas ---
const SIGNATURE_CANVAS_WIDTH = 800;  // Largura para alta resolução no PDF
const SIGNATURE_CANVAS_HEIGHT = 300; // Altura para alta resolução no PDF

// Variáveis para o canvas da assinatura e seu contexto 2D
const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');

// Define a resolução interna do canvas para captura, mas o estilo limita o tamanho na tela.
// Isso é crucial para que a imagem da assinatura não fique pixelada no PDF final.
canvas.width = SIGNATURE_CANVAS_WIDTH;
canvas.height = SIGNATURE_CANVAS_HEIGHT;

let drawing = false;

// Configurações do pincel para o desenho da assinatura
ctx.lineWidth = 4; // Espessura da linha
ctx.lineCap = 'round'; // Pontas arredondadas
ctx.strokeStyle = '#000'; // Cor preta (preto sólido para a assinatura)

// Event Listeners para desenhar no canvas
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseout', stopDrawing); // Para de desenhar se o mouse sair do canvas

function startDrawing(e) {
    drawing = true;
    ctx.beginPath();
    // Ajusta a posição para a densidade de pixels do canvas de alta resolução
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
}

function stopDrawing() {
    drawing = false;
    saveSignature(); // Salva a assinatura como Base64 quando o desenho para
}

function draw(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
}

function limparAssinatura() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas visualmente
    document.getElementById('assinaturaBase64').value = ''; // Remove o dado Base64
}

function saveSignature() {
    // Converte o conteúdo do canvas para uma URL de dados (imagem Base64)
    const dataURL = canvas.toDataURL('image/png');
    document.getElementById('assinaturaBase64').value = dataURL;
}

// --- Lógica de Inicialização da Página e Campos Condicionais ---
// `window.onload` garante que todo o HTML esteja carregado antes de executar o script.
window.onload = function() {
    // Preenche a data atual no campo correspondente
    const today = new Date();
    const year = today.getFullYear(); 
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexed, adiciona 1 e formata para 2 dígitos
    const day = String(today.getDate()).padStart(2, '0'); // Formata o dia para 2 dígitos
    document.getElementById('dataAtual').value = `${year}-${month}-${day}`; 

    // Inicializa a visibilidade dos campos condicionais ao carregar a página
    toggleFilhosFields();
    toggleEmpresaAtualField();

    // Adiciona event listeners para alterar a visibilidade dos campos quando a seleção muda
    document.getElementById('temFilhos').addEventListener('change', toggleFilhosFields);
    document.getElementById('estaTrabalhando').addEventListener('change', toggleEmpresaAtualField);

    // Adiciona o event listener para o botão de gerar PDF.
    const gerarPdfButton = document.getElementById('gerarPdfButton');
    if (gerarPdfButton) { // Verifica se o botão existe antes de adicionar o listener
        gerarPdfButton.addEventListener('click', gerarPDF);
    }
};

// Controla a visibilidade dos campos "Quantos filhos" e "Idade dos filhos"
function toggleFilhosFields() {
    const temFilhos = document.getElementById('temFilhos').value;
    const qtdFilhosLabel = document.getElementById('labelQtdFilhos');
    const idadeFilhosLabel = document.getElementById('labelIdadeFilhos');
    const qtdFilhosInput = document.getElementById('qtd_filhos');
    const idadeFilhosInput = document.getElementById('idadefilhos');

    if (temFilhos === 'sim') { // Usa 'sim' aqui pois é o valor do option no HTML
        qtdFilhosLabel.style.display = 'block';
        idadeFilhosLabel.style.display = 'block';
        qtdFilhosInput.setAttribute('required', 'required');
        idadeFilhosInput.setAttribute('required', 'required');
    } else {
        qtdFilhosLabel.style.display = 'none';
        idadeFilhosLabel.style.display = 'none';
        qtdFilhosInput.removeAttribute('required');
        idadeFilhosInput.removeAttribute('required');
        qtdFilhosInput.value = ''; // Limpa o valor se campo for ocultado
        idadeFilhosInput.value = ''; // Limpa o valor se campo for ocultado
    }
}

// Controla a visibilidade do campo "Qual empresa"
function toggleEmpresaAtualField() {
    const estaTrabalhando = document.getElementById('estaTrabalhando').value;
    const empresaAtualDiv = document.getElementById('empresaAtual');
    const empresaAtualInput = document.getElementById('empresa_atual');

    if (estaTrabalhando === 'sim') { // Usa 'sim' aqui pois é o valor do option no HTML
        empresaAtualDiv.style.display = 'block';
        empresaAtualInput.setAttribute('required', 'required');
    } else {
        empresaAtualDiv.style.display = 'none';
        empresaAtualInput.removeAttribute('required');
        empresaAtualInput.value = ''; // Limpa o valor se campo for ocultado
    }
}

// --- Função Auxiliar para Formatar Datas ---
// Converte a data de YYYY-MM-DD para DD/MM/YYYY
const formatDate = (dateString) => {
    // Retorna "Não informado" para strings vazias ou já marcadas como tal
    if (!dateString || dateString.trim() === '' || dateString === 'Não informado') return 'Não informado'; 
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.warn('Erro ao formatar data:', dateString, e);
        return dateString; // Retorna o original se houver erro na formatação
    }
};

// --- Função Principal para Gerar o PDF (REESCRITA COMPLETA PARA DESENHO DIRETO NO PDF) ---
async function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const form = document.getElementById('jobForm');

    // 1. Validação do formulário
    if (!form.checkValidity()) {
        alert('Por favor, preencha todos os campos obrigatórios antes de gerar o PDF.');
        form.reportValidity();
        return;
    }

    // Oculta os botões temporariamente
    const generateButton = document.getElementById('gerarPdfButton');
    if (generateButton) { generateButton.style.display = 'none'; }
    const clearSignatureButton = document.querySelector('button[onclick="limparAssinatura()"]');
    if (clearSignatureButton) { clearSignatureButton.style.display = 'none'; }

    try {
        // 2. Capturar a imagem da assinatura
        let signatureImgData = null;
        const signatureBase64Input = document.getElementById('assinaturaBase64');
        if (signatureBase64Input.value) {
            saveSignature(); // Garante que o último traço seja salvo
            signatureImgData = signatureBase64Input.value;
        }

        // 3. Coletar todos os dados do formulário
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (key === 'assinatura') continue;
            const formElement = form.elements[key];
            if (formElement && formElement.tagName === 'SELECT') {
                data[key] = formElement.options[formElement.selectedIndex].text.trim() || 'Não informado';
            } else if ((formElement && (formElement.tagName === 'INPUT' || formElement.tagName === 'TEXTAREA')) && value.trim() === '') {
                data[key] = 'Não informado';
            } else {
                data[key] = value.trim() || 'Não informado';
            }
        }

        // 4. Inicializar jsPDF
        const doc = new jsPDF('p', 'mm', 'a4'); // 'p' = retrato, 'mm' = milímetros, 'a4'
        const margin = 15; // Margem padrão de 15mm de cada lado
        let yPos = margin; // Posição Y atual no PDF
        const contentWidth = doc.internal.pageSize.width - (2 * margin); // Largura disponível para conteúdo
        const pageHeight = doc.internal.pageSize.height; // Altura total da página

        // Configurações de estilo base
        const titleColor = [0, 86, 179]; // Azul
        const subtitleColor = [68, 68, 68]; // Cinza escuro
        const textColor = [0, 0, 0]; // Preto
        const faintColor = [102, 102, 102]; // Cinza claro

        // Espaçamentos e tamanhos de fonte
        const lineHeightDefault = 6; // Espaçamento entre linhas de dados (normal)
        const lineHeightSmall = 4.5; // Espaçamento entre linhas de texto menor (ex: dentro de perguntas/respostas)
        const sectionSpacing = 10; // Espaço antes de cada nova seção
        const subtitleLineOffset = 2; // Deslocamento da linha abaixo do subtítulo
        const labelColWidth = 45; // Largura reservada para o label na primeira coluna (em mm)
        const valueColOffset = 5; // Espaçamento entre label e valor na mesma linha

        // Função auxiliar para quebra de página
        const checkPageBreak = (currentY, minSpaceNeeded = lineHeightDefault * 3) => {
            if (currentY + minSpaceNeeded > pageHeight - margin) {
                doc.addPage();
                return margin; // Retorna a posição Y inicial da nova página
            }
            return currentY;
        };

        // --- Título Principal ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
        doc.text("Formulário de Solicitação de Emprego", doc.internal.pageSize.width / 2, yPos, { align: "center" });
        yPos += 15; // Espaço após o título

        // --- Função para Adicionar Seção e Subtítulo ---
        const addSectionTitle = (title) => {
            yPos = checkPageBreak(yPos, 25); // Garante espaço para o subtítulo e a linha
            yPos += sectionSpacing;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
            doc.text(title, margin, yPos);
            doc.setDrawColor(204, 204, 204); // Cor da linha divisória
            doc.line(margin, yPos + subtitleLineOffset, margin + contentWidth, yPos + subtitleLineOffset);
            yPos += lineHeightDefault + 2; // Espaço após o subtítulo e linha
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        };

        // --- Função para Adicionar um Campo Full-Width (Label: Value) ---
        const addFullWidthField = (label, value) => {
            yPos = checkPageBreak(yPos, lineHeightDefault * 2); // Garante espaço para label e pelo menos uma linha de valor
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.text(`${label}:`, margin, yPos);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            
            const valueX = margin + doc.getStringUnitWidth(`${label}: `) * (doc.getFontSize() / doc.internal.scaleFactor) + valueColOffset;
            const availableWidthForValue = contentWidth - (valueX - margin);
            
            const splitValue = doc.splitTextToSize(value, availableWidthForValue);
            
            if (splitValue.length > 1 || value.length > 50) { // Se o valor quebrar em várias linhas ou for longo
                doc.text(splitValue, valueX, yPos);
                yPos += splitValue.length * lineHeightSmall + 2; // Ajusta yPos para as linhas do valor
            } else { // Se o valor couber em uma linha ao lado do label
                doc.text(splitValue[0], valueX, yPos);
                yPos += lineHeightDefault;
            }
        };

        // --- Função para Adicionar um Par de Campos Lado a Lado (Melhorado) ---
        const addDualFields = (field1, field2) => {
            yPos = checkPageBreak(yPos, lineHeightDefault * 2); // Garante espaço para a linha de campos

            const halfWidth = contentWidth / 2; // Largura para cada "coluna" lógica
            const fieldPadding = 5; // Espaço entre as duas metades da linha

            // Campo 1
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            const label1Text = `${field1.label}: `;
            const label1Width = doc.getStringUnitWidth(label1Text) * doc.getFontSize() / doc.internal.scaleFactor;
            doc.text(label1Text, margin, yPos);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const value1X = margin + label1Width + valueColOffset;
            const availableWidth1 = halfWidth - label1Width - valueColOffset - fieldPadding;
            const splitValue1 = doc.splitTextToSize(field1.value, availableWidth1);
            doc.text(splitValue1, value1X, yPos);

            // Campo 2
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            const label2Text = `${field2.label}: `;
            const label2Width = doc.getStringUnitWidth(label2Text) * doc.getFontSize() / doc.internal.scaleFactor;
            const col2StartX = margin + halfWidth + fieldPadding; // Início da segunda coluna
            doc.text(label2Text, col2StartX, yPos);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const value2X = col2StartX + label2Width + valueColOffset;
            const availableWidth2 = halfWidth - label2Width - valueColOffset - fieldPadding;
            const splitValue2 = doc.splitTextToSize(field2.value, availableWidth2);
            doc.text(splitValue2, value2X, yPos);

            // Calcula a altura da linha com base no campo mais alto
            const height1 = splitValue1.length * lineHeightSmall;
            const height2 = splitValue2.length * lineHeightSmall;
            yPos += Math.max(height1, height2) + lineHeightDefault; // Avança Y pela altura maior
        };


        // --- Função para Adicionar Perguntas e Respostas do Questionário ---
        const addQuestionSection = (question, answer) => {
            yPos = checkPageBreak(yPos, 40); // Garante espaço para a pergunta e resposta
            
            // Desenha a linha lateral azul
            doc.setDrawColor(0, 123, 255); // Cor azul
            doc.setLineWidth(1.5); // Largura da linha
            const lineStartX = margin;
            const lineEndY = yPos + (doc.splitTextToSize(question, contentWidth - 8).length * lineHeightSmall) + 
                             (doc.splitTextToSize(answer, contentWidth - 8).length * lineHeightSmall) + 10; // Estima o fim da linha
            doc.line(lineStartX, yPos - 2, lineStartX, lineEndY); 
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]); // Azul para a pergunta
            const splitQuestion = doc.splitTextToSize(question, contentWidth - 8); // Recua um pouco para a borda
            doc.text(splitQuestion, margin + 5, yPos); // +5mm para a borda esquerda e padding
            yPos += splitQuestion.length * lineHeightSmall;
            yPos += 1; // Pequeno espaço entre pergunta e resposta

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]); // Preto para a resposta
            const splitAnswer = doc.splitTextToSize(answer, contentWidth - 8);
            doc.text(splitAnswer, margin + 5, yPos);
            yPos += splitAnswer.length * lineHeightSmall;
            yPos += 8; // Espaço após a resposta
        };


        // === Início das Seções do Formulário ===

        // --- Dados Pessoais ---
        addSectionTitle("Dados Pessoais");

        addDualFields({ label: "Data", value: formatDate(data.data) }, { label: "Cargo", value: data.cargo });
        addFullWidthField("Nome", data.nome);
        addDualFields({ label: "CPF", value: data.cpf }, { label: "RG", value: data.rg });
        // Adicione PIS e Carteira de Trabalho aqui
        addDualFields({ label: "PIS", value: data.pis }, { label: "Carteira de Trabalho", value: data.carteira });
        addDualFields({ label: "Data de Nascimento", value: formatDate(data.nascimento) }, { label: "Naturalidade", value: data.naturalidade });
        addFullWidthField("Nome do Pai", data.pai);
        addFullWidthField("Nome da Mãe", data.mae);
        addDualFields({ label: "CNH", value: data.cnh }, { label: "Vencimento CNH", value: formatDate(data.venc_cnh) });
        addFullWidthField("Endereço", data.endereco);
        addDualFields({ label: "Bairro", value: data.bairro }, { label: "Cidade", value: data.cidade });
        addDualFields({ label: "Estado", value: data.estado }, { label: "CEP", value: data.cep });
        addDualFields({ label: "Telefone Residencial", value: data.tel_res }, { label: "Celular", value: data.celular });
        addFullWidthField("E-mail", data.email);
        
        // Campos condicionais para filhos
        if (data.filhos === 'Sim') { // Comparar com 'Sim' pois estamos pegando o TEXTO do SELECT
            addDualFields({ label: "Possui filhos?", value: data.filhos }, { label: "Quantos filhos", value: data.qtd_filhos });
            addFullWidthField("Idade dos filhos", data.idadefilhos);
        } else {
            addFullWidthField("Possui filhos?", data.filhos);
        }

        addDualFields({ label: "Estado Civil", value: data.estado_civil }, { label: "Possui imóvel próprio?", value: data.imovel });
        addFullWidthField("Está recebendo seguro desemprego?", data.seguro);


        // --- Uniforme ---
        addSectionTitle("Uniforme");
        addDualFields({ label: "Calça", value: data.calca }, { label: "Camisa", value: data.camisa });
        addDualFields({ label: "Gandola", value: data.gandola }, { label: "Botina", value: data.botina });


        // --- Último Emprego ---
        addSectionTitle("Último Emprego");
        addFullWidthField("Empresa", data.ultima_empresa);
        addDualFields({ label: "Cidade", value: data.cidade_empresa }, { label: "Estado", value: data.estado_empresa });
        addFullWidthField("Função ou Cargo", data.cargo_empresa);
        addDualFields({ label: "Data de Admissão", value: formatDate(data.admissao) }, { label: "Data de Demissão", value: formatDate(data.demissao) });
        
        // Campo condicional para está trabalhando
        if (data.trabalhando === 'Sim') { // Comparar com 'Sim' pois estamos pegando o TEXTO do SELECT
            addDualFields({ label: "Está trabalhando?", value: data.trabalhando }, { label: "Qual empresa", value: data.empresa_atual });
        } else {
            addFullWidthField("Está trabalhando?", data.trabalhando);
        }


        // --- Escolaridade ---
        addSectionTitle("Escolaridade");
        addDualFields({ label: "Ensino Fundamental", value: data.fundamental }, { label: "Ensino Médio", value: data.medio });
        addDualFields({ label: "Ensino Técnico", value: data.tecnico }, { label: "Ensino Superior", value: data.superior });
        addFullWidthField("Curso Profissionalizante ou Técnico", data.curso_profi);
        addFullWidthField("Possui NT07 do curso BPC?", data.nt07);

        // --- Questionário ---
        addSectionTitle("Questionário");
        
        addQuestionSection("Você tem objetivos pessoais e profissionais? Quais?", data.objetivos);
        addQuestionSection("Quais experiências profissionais te deram maior satisfação e por quê?", data.experiencias);
        addQuestionSection("Cite suas qualidades e pontos fracos:", data.qualidades);
        addQuestionSection("Como era sua relação com seu último superior?", data.relacao_superior);
        addQuestionSection("Quais características você julga importante para este cargo?", data.caracteristicas);
        addQuestionSection("Qual sua visão sobre pedir demissão? Quando deve ser feito?", data.demissao_visao);
        addQuestionSection("O que te motiva a trabalhar melhor?", data.motivacao);
        addQuestionSection("O que você pensa sobre trabalhar em dois empregos?", data.dois_empregos);
        addQuestionSection("Por que devemos contratá-lo(a)? Como contribuirá com a empresa?", data.porque_contratar);

        // --- Seção Quem Sou Eu e Assinatura ---
        addSectionTitle("Quem Sou Eu");
        addQuestionSection("Quem sou eu?", data.quem_sou_eu); // Usando a mesma função para a textarea

        // Assinatura
        yPos = checkPageBreak(yPos, 70); // Garante espaço para a assinatura
        yPos += 10; // Espaço extra

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text("Assinatura do Candidato:", doc.internal.pageSize.width / 2, yPos, { align: "center" });
        yPos += 5; // Espaço após o rótulo

        if (signatureImgData) {
            const imgWidthPdf = 80; // Largura da imagem da assinatura no PDF (em mm)
            const imgHeightPdf = (SIGNATURE_CANVAS_HEIGHT * imgWidthPdf) / SIGNATURE_CANVAS_WIDTH; // Calcula altura para manter proporção
            
            // Centraliza a imagem da assinatura
            const imgX = (doc.internal.pageSize.width / 2) - (imgWidthPdf / 2);
            doc.addImage(signatureImgData, 'PNG', imgX, yPos, imgWidthPdf, imgHeightPdf);
            yPos += imgHeightPdf + 5; // Espaço após a imagem
        } else {
            doc.setFontSize(10);
            doc.setTextColor(faintColor[0], faintColor[1], faintColor[2]);
            doc.text("Assinatura não fornecida", doc.internal.pageSize.width / 2, yPos + 10, { align: "center" });
            yPos += 20; // Espaço para compensar a falta da imagem
        }

        // Linha da assinatura
        doc.setDrawColor(0, 0, 0); // Cor da linha preta
        doc.line((doc.internal.pageSize.width / 2) - 40, yPos, (doc.internal.pageSize.width / 2) + 40, yPos); // Linha de 80mm centralizada
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(faintColor[0], faintColor[1], faintColor[2]);
        doc.text("Assinatura do Candidato", doc.internal.pageSize.width / 2, yPos, { align: "center" });


        // 5. Salvar o PDF
        doc.save('formulario_emprego_preenchido.pdf');
        alert('PDF gerado com sucesso!');

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Ocorreu um erro ao gerar o PDF. Por favor, verifique o console do navegador para mais detalhes.');
    } finally {
        // Volta a exibir os botões após a tentativa de geração do PDF
        if (generateButton) {
            generateButton.style.display = 'block';
        }
        if (clearSignatureButton) {
            clearSignatureButton.style.display = 'inline-block';
        }
    }
}