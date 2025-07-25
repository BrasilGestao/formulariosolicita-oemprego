// --- Configurações da Assinatura no Canvas ---
const SIGNATURE_CANVAS_WIDTH = 800; // Largura para alta resolução no PDF
const SIGNATURE_CANVAS_HEIGHT = 300; // Altura para alta resolução no PDF

// Variáveis para o canvas principal (visível no formulário)
const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');

// Variáveis para o canvas do modal (maior, para assinatura)
const modalCanvas = document.getElementById('modalSignatureCanvas');
const modalCtx = modalCanvas.getContext('2d');

// Elementos do modal
const signatureModal = document.getElementById('signatureModal');
const openSignatureModalBtn = document.getElementById('openSignatureModal');
const closeSignatureModalBtn = document.getElementById('closeSignatureModal');
const saveModalSignatureBtn = document.getElementById('saveModalSignature');
const clearModalSignatureBtn = document.getElementById('clearModalSignature');

let drawing = false;
let currentCtx = null; // Variável para saber qual contexto está ativo (principal ou modal)

// Define a resolução interna dos canvas para captura.
canvas.width = SIGNATURE_CANVAS_WIDTH;
canvas.height = SIGNATURE_CANVAS_HEIGHT;
modalCanvas.width = SIGNATURE_CANVAS_WIDTH; // Ambos usam a mesma resolução interna para qualidade
modalCanvas.height = SIGNATURE_CANVAS_HEIGHT;

// Configurações do pincel (aplicar a ambos os contextos)
const setupCanvasContext = (context) => {
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.strokeStyle = '#000';
};

setupCanvasContext(ctx);
setupCanvasContext(modalCtx);

// Event Listeners para ambos os canvas (mouse e toque)
const addDrawingListeners = (element, context) => {
    element.addEventListener('mousedown', (e) => startDrawing(e, context));
    element.addEventListener('mouseup', stopDrawing);
    element.addEventListener('mousemove', (e) => draw(e, context));
    element.addEventListener('mouseout', stopDrawing);

    element.addEventListener('touchstart', (e) => startDrawing(e, context));
    element.addEventListener('touchend', stopDrawing);
    element.addEventListener('touchmove', (e) => draw(e, context));
    element.addEventListener('touchcancel', stopDrawing);
};

addDrawingListeners(canvas, ctx);
addDrawingListeners(modalCanvas, modalCtx);

function getCoordinates(e, canvasElement) {
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = canvasElement.width / rect.width;
    const scaleY = canvasElement.height / rect.height;

    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function startDrawing(e, context) {
    e.preventDefault();
    drawing = true;
    currentCtx = context; // Define qual contexto está ativo
    currentCtx.beginPath();
    const coords = getCoordinates(e, currentCtx.canvas); // Passa o elemento canvas correto
    currentCtx.moveTo(coords.x, coords.y);
}

function stopDrawing() {
    drawing = false;
}

function draw(e, context) {
    if (!drawing) return;
    e.preventDefault();
    if (currentCtx !== context) return; // Garante que estamos desenhando no contexto correto
    const coords = getCoordinates(e, currentCtx.canvas);
    currentCtx.lineTo(coords.x, coords.y);
    currentCtx.stroke();
}

function limparAssinatura() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas principal
    modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height); // Limpa o canvas do modal
    document.getElementById('assinaturaBase64').value = ''; // Remove o dado Base64
}

function saveSignature(sourceCanvas = canvas) { // Recebe qual canvas é a fonte da assinatura
    const dataURL = sourceCanvas.toDataURL('image/png');
    document.getElementById('assinaturaBase64').value = dataURL;

    if (sourceCanvas === modalCanvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o principal antes de desenhar
        const img = new Image();
        img.onload = () => {
            const aspectRatio = SIGNATURE_CANVAS_WIDTH / SIGNATURE_CANVAS_HEIGHT;
            let drawWidth = canvas.width;
            let drawHeight = canvas.width / aspectRatio;

            if (drawHeight > canvas.height) {
                drawHeight = canvas.height;
                drawWidth = canvas.height * aspectRatio;
            }

            const drawX = (canvas.width - drawWidth) / 2;
            const drawY = (canvas.height - drawHeight) / 2;

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        };
        img.src = dataURL;
    }
}

// --- Funções para Gerenciar o Modal ---
openSignatureModalBtn.addEventListener('click', () => {
    signatureModal.style.display = 'flex';
    if (document.getElementById('assinaturaBase64').value) {
        const img = new Image();
        img.onload = () => {
            modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
            modalCtx.drawImage(img, 0, 0, modalCanvas.width, modalCanvas.height);
        };
        img.src = document.getElementById('assinaturaBase64').value;
    }
    setupCanvasContext(modalCtx);
});

closeSignatureModalBtn.addEventListener('click', () => {
    signatureModal.style.display = 'none';
});

saveModalSignatureBtn.addEventListener('click', () => {
    saveSignature(modalCanvas);
    signatureModal.style.display = 'none';
});

clearModalSignatureBtn.addEventListener('click', () => {
    modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
});

// --- Lógica de Inicialização da Página e Campos Condicionais ---
window.onload = function() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('dataAtual').value = `${year}-${month}-${day}`;

    // Inicializa a visibilidade dos campos condicionais
    toggleFilhosFields();
    toggleEmpresaAtualField();
    toggleDisponibilidadeField(); // NOVO: Inicializa o novo campo

    // Adiciona event listeners para alterar a visibilidade
    document.getElementById('temFilhos').addEventListener('change', toggleFilhosFields);
    document.getElementById('estaTrabalhando').addEventListener('change', toggleEmpresaAtualField);
    document.getElementById('disponibilidadeDeslocamento').addEventListener('change', toggleDisponibilidadeField); // NOVO: Adiciona listener

    const gerarPdfButton = document.getElementById('gerarPdfButton');
    if (gerarPdfButton) {
        gerarPdfButton.addEventListener('click', gerarPDF);
    }
};

function toggleFilhosFields() {
    const temFilhos = document.getElementById('temFilhos').value;
    const qtdFilhosLabel = document.getElementById('labelQtdFilhos');
    const idadeFilhosLabel = document.getElementById('labelIdadeFilhos');
    const qtdFilhosInput = document.getElementById('qtd_filhos');
    const idadeFilhosInput = document.getElementById('idadefilhos');

    if (temFilhos === 'sim') {
        qtdFilhosLabel.style.display = 'block';
        idadeFilhosLabel.style.display = 'block';
        qtdFilhosInput.setAttribute('required', 'required');
        idadeFilhosInput.setAttribute('required', 'required');
    } else {
        qtdFilhosLabel.style.display = 'none';
        idadeFilhosLabel.style.display = 'none';
        qtdFilhosInput.removeAttribute('required');
        idadeFilhosInput.removeAttribute('required');
        qtdFilhosInput.value = '';
        idadeFilhosInput.value = '';
    }
}

function toggleEmpresaAtualField() {
    const estaTrabalhando = document.getElementById('estaTrabalhando').value;
    const empresaAtualDiv = document.getElementById('empresaAtual');
    const empresaAtualInput = document.getElementById('empresa_atual');

    if (estaTrabalhando === 'sim') {
        empresaAtualDiv.style.display = 'block';
        empresaAtualInput.setAttribute('required', 'required');
    } else {
        empresaAtualDiv.style.display = 'none';
        empresaAtualInput.removeAttribute('required');
        empresaAtualInput.value = '';
    }
}

// NOVO: Função para controlar a visibilidade do campo de justificativa de deslocamento
function toggleDisponibilidadeField() {
    const disponibilidade = document.getElementById('disponibilidadeDeslocamento').value;
    const justificativaContainer = document.getElementById('containerJustificativa');
    const justificativaInput = document.getElementById('motivoIndisponibilidade');

    if (disponibilidade === 'nao') {
        justificativaContainer.style.display = 'block';
        justificativaInput.setAttribute('required', 'required');
    } else {
        justificativaContainer.style.display = 'none';
        justificativaInput.removeAttribute('required');
        justificativaInput.value = ''; // Limpa o valor se o campo for ocultado
    }
}

// --- Função Auxiliar para Formatar Datas ---
const formatDate = (dateString) => {
    if (!dateString || dateString.trim() === '' || dateString === 'Não informado') return 'Não informado';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.warn('Erro ao formatar data:', dateString, e);
        return dateString;
    }
};

// --- Função Principal para Gerar o PDF ---
async function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const form = document.getElementById('jobForm');

    if (!form.checkValidity()) {
        alert('Por favor, preencha todos os campos obrigatórios antes de gerar o PDF.');
        form.reportValidity();
        return;
    }

    const generateButton = document.getElementById('gerarPdfButton');
    if (generateButton) { generateButton.style.display = 'none'; }
    const clearSignatureButton = document.querySelector('button[onclick="limparAssinatura()"]');
    if (clearSignatureButton) { clearSignatureButton.style.display = 'none'; }

    try {
        let signatureImgData = null;
        const signatureBase64Input = document.getElementById('assinaturaBase64');
        if (signatureBase64Input.value) {
            saveSignature();
            signatureImgData = signatureBase64Input.value;
        }

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

        const doc = new jsPDF('p', 'mm', 'a4');
        const margin = 15;
        let yPos = margin;
        const contentWidth = doc.internal.pageSize.width - (2 * margin);
        const pageHeight = doc.internal.pageSize.height;

        const titleColor = [0, 86, 179];
        const subtitleColor = [68, 68, 68];
        const textColor = [0, 0, 0];
        const faintColor = [102, 102, 102];

        const lineHeightDefault = 6;
        const lineHeightSmall = 4.5;
        const sectionSpacing = 10;
        const subtitleLineOffset = 2;
        const valueColOffset = 5;

        const checkPageBreak = (currentY, minSpaceNeeded = lineHeightDefault * 3) => {
            if (currentY + minSpaceNeeded > pageHeight - margin) {
                doc.addPage();
                return margin;
            }
            return currentY;
        };

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
        doc.text("Formulário de Solicitação de Emprego", doc.internal.pageSize.width / 2, yPos, { align: "center" });
        yPos += 15;

        const addSectionTitle = (title) => {
            yPos = checkPageBreak(yPos, 25);
            yPos += sectionSpacing;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2]);
            doc.text(title, margin, yPos);
            doc.setDrawColor(204, 204, 204);
            doc.line(margin, yPos + subtitleLineOffset, margin + contentWidth, yPos + subtitleLineOffset);
            yPos += lineHeightDefault + 2;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        };

        const addFullWidthField = (label, value) => {
            yPos = checkPageBreak(yPos, lineHeightDefault * 2);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.text(`${label}:`, margin, yPos);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            const valueX = margin + doc.getStringUnitWidth(`${label}: `) * (doc.getFontSize() / doc.internal.scaleFactor) + valueColOffset;
            const availableWidthForValue = contentWidth - (valueX - margin);
            const splitValue = doc.splitTextToSize(value, availableWidthForValue);

            doc.text(splitValue, valueX, yPos);
            yPos += splitValue.length * lineHeightSmall + (splitValue.length > 1 ? 2 : 0) + lineHeightDefault / 2;
        };

        const addDualFields = (field1, field2) => {
            yPos = checkPageBreak(yPos, lineHeightDefault * 2);
            const halfWidth = contentWidth / 2;
            const fieldPadding = 5;

            // Field 1
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
            const splitValue1 = doc.splitTextToSize(String(field1.value), availableWidth1);
            doc.text(splitValue1, value1X, yPos);

            // Field 2
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            const label2Text = `${field2.label}: `;
            const label2Width = doc.getStringUnitWidth(label2Text) * doc.getFontSize() / doc.internal.scaleFactor;
            const col2StartX = margin + halfWidth + fieldPadding;
            doc.text(label2Text, col2StartX, yPos);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const value2X = col2StartX + label2Width + valueColOffset;
            const availableWidth2 = halfWidth - label2Width - valueColOffset - fieldPadding;
            const splitValue2 = doc.splitTextToSize(String(field2.value), availableWidth2);
            doc.text(splitValue2, value2X, yPos);

            const height1 = splitValue1.length * lineHeightSmall;
            const height2 = splitValue2.length * lineHeightSmall;
            yPos += Math.max(height1, height2) + lineHeightDefault;
        };

        const addQuestionSection = (question, answer) => {
            yPos = checkPageBreak(yPos, 20);
            const questionLines = doc.splitTextToSize(question, contentWidth - 8);
            const answerLines = doc.splitTextToSize(String(answer), contentWidth - 8);
            const totalHeight = (questionLines.length + answerLines.length) * lineHeightSmall + 10;
            
            yPos = checkPageBreak(yPos, totalHeight);

            const startY = yPos;
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
            doc.text(questionLines, margin + 5, yPos);
            yPos += questionLines.length * lineHeightSmall + 1;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.text(answerLines, margin + 5, yPos);
            yPos += answerLines.length * lineHeightSmall;

            doc.setDrawColor(0, 123, 255);
            doc.setLineWidth(1.5);
            doc.line(margin, startY - 2, margin, yPos + 2);
            yPos += 8;
        };

        // === Início das Seções do Formulário ===

        addSectionTitle("Dados Pessoais");
        addDualFields({ label: "Data", value: formatDate(data.data) }, { label: "Cargo", value: data.cargo });
        addFullWidthField("Nome", data.nome);
        addDualFields({ label: "CPF", value: data.cpf }, { label: "RG", value: data.rg });
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

        if (data.filhos === 'Sim') {
            addDualFields({ label: "Possui filhos?", value: data.filhos }, { label: "Quantos filhos", value: data.qtd_filhos });
            addFullWidthField("Idade dos filhos", data.idadefilhos);
        } else {
            addFullWidthField("Possui filhos?", data.filhos);
        }

        addDualFields({ label: "Estado Civil", value: data.estado_civil }, { label: "Possui imóvel próprio?", value: data.imovel });
        addFullWidthField("Está recebendo seguro desemprego?", data.seguro);

        addSectionTitle("Uniforme");
        addDualFields({ label: "Calça", value: data.calca }, { label: "Camisa", value: data.camisa });
        addDualFields({ label: "Gandola", value: data.gandola }, { label: "Botina", value: data.botina });

        addSectionTitle("Último Emprego");
        addFullWidthField("Empresa", data.ultima_empresa);
        addDualFields({ label: "Cidade", value: data.cidade_empresa }, { label: "Estado", value: data.estado_empresa });
        addFullWidthField("Função ou Cargo", data.cargo_empresa);
        addDualFields({ label: "Data de Admissão", value: formatDate(data.admissao) }, { label: "Data de Demissão", value: formatDate(data.demissao) });

        if (data.trabalhando === 'Sim') {
            addDualFields({ label: "Está trabalhando?", value: data.trabalhando }, { label: "Qual empresa", value: data.empresa_atual });
        } else {
            addFullWidthField("Está trabalhando?", data.trabalhando);
        }

        // NOVO: Adicionando a seção de disponibilidade ao PDF
        addSectionTitle("Disponibilidade");
        addQuestionSection("Disponibilidade para deslocamento (Vila Velha, Serra, Cariacica)?", data.disponibilidade_deslocamento);
        // Se a resposta for "Não", adiciona a justificativa
        if (data.disponibilidade_deslocamento === 'Não') {
            addQuestionSection("Motivo da indisponibilidade:", data.motivo_indisponibilidade);
        }

        addSectionTitle("Escolaridade");
        addDualFields({ label: "Ensino Fundamental", value: data.fundamental }, { label: "Ensino Médio", value: data.medio });
        addDualFields({ label: "Ensino Técnico", value: data.tecnico }, { label: "Ensino Superior", value: data.superior });
        addFullWidthField("Curso Profissionalizante ou Técnico", data.curso_profi);
        addFullWidthField("Possui NT07 do curso BPC?", data.nt07);

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

        addSectionTitle("Quem Sou Eu");
        addQuestionSection("Quem sou eu?", data.quem_sou_eu);

        yPos = checkPageBreak(yPos, 70);
        yPos += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text("Assinatura do Candidato:", doc.internal.pageSize.width / 2, yPos, { align: "center" });
        yPos += 5;

        if (signatureImgData) {
            const imgWidthPdf = 80;
            const imgHeightPdf = (SIGNATURE_CANVAS_HEIGHT * imgWidthPdf) / SIGNATURE_CANVAS_WIDTH;
            const imgX = (doc.internal.pageSize.width / 2) - (imgWidthPdf / 2);
            doc.addImage(signatureImgData, 'PNG', imgX, yPos, imgWidthPdf, imgHeightPdf);
            yPos += imgHeightPdf;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(faintColor[0], faintColor[1], faintColor[2]);
            doc.text("Assinatura não fornecida", doc.internal.pageSize.width / 2, yPos + 10, { align: "center" });
            yPos += 20;
        }

        doc.setDrawColor(0, 0, 0);
        doc.line((doc.internal.pageSize.width / 2) - 40, yPos + 2, (doc.internal.pageSize.width / 2) + 40, yPos + 2);
        yPos += 7;
        doc.setFontSize(9);
        doc.setTextColor(faintColor[0], faintColor[1], faintColor[2]);
        doc.text("Assinatura do Candidato", doc.internal.pageSize.width / 2, yPos, { align: "center" });

        doc.save('formulario_emprego_preenchido.pdf');
        alert('PDF gerado com sucesso!');

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Ocorreu um erro ao gerar o PDF. Por favor, verifique o console do navegador para mais detalhes.');
    } finally {
        if (generateButton) {
            generateButton.style.display = 'block';
        }
        if (clearSignatureButton) {
            clearSignatureButton.style.display = 'inline-block';
        }
    }
}