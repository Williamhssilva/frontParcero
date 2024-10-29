import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

let currentProperty = null;
let editor = null;
let imagesToDelete = [];

document.addEventListener('DOMContentLoaded', () => {
    checkPermission(['corretor', 'administrador']);
    setupForm();
    loadPropertyData();
    renderMenu();
});

function setupForm() {
    const form = document.getElementById('edit-property-form');
    form.addEventListener('submit', handleSubmit);
}

function updateImageOrder() {
    const imageContainers = document.querySelectorAll('.image-preview-item');
    imageContainers.forEach((container, index) => {
        container.setAttribute('data-index', index);
    });
}

async function loadPropertyData() {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
        showNotification('ID da propriedade não fornecido', 'error');
        return;
    }

    try {

        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        console.log('Resposta recebida:', response);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dados completos da API:', data);

        if (!data || !data.data || !data.data.property) {
            throw new Error('Estrutura de dados inválida na resposta da API');
        }

        currentProperty = data.data.property;
        console.log('Propriedade atual:', currentProperty);

        populateForm(currentProperty);

        setupImagePreview(currentProperty);

    } catch (error) {
        console.error('Erro ao carregar dados da propriedade:', error);
        showNotification(`Erro ao carregar dados da propriedade: ${error.message}`, 'error');
    }
}

function populateForm(property) {
    const form = document.getElementById('edit-property-form');
    form.innerHTML = '';

    // Exibição da Propriedade
    form.innerHTML += `
        <div class="form-group">
            <label for="title">Título da Propriedade</label>
            <input type="text" id="title" name="title" value="${property.title || ''}" required>
        </div>
        <div class="form-group">
            <label for="description">Descrição da Propriedade</label>
            <textarea id="description" name="description">${property.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="salePrice">Preço de Venda</label>
            <input type="number" id="salePrice" name="salePrice" value="${property.salePrice || ''}">
        </div>
        <div class="form-group">
            <label for="desiredNetPrice">Preço Líquido Desejado</label>
            <input type="number" id="desiredNetPrice" name="desiredNetPrice" value="${property.desiredNetPrice || ''}">
        </div>
        <h2>Localização do Imóvel</h2>
        <div class="form-group">
            <label for="captureCity">Cidade</label>
            <input type="text" id="captureCity" name="captureCity" value="${property.captureCity || ''}">
        </div>
        <div class="form-group">
            <label for="captureCEP">CEP</label>
            <input type="text" id="captureCEP" name="captureCEP" value="${property.captureCEP || ''}">
        </div>
        <div class="form-group">
            <label for="address">Endereço</label>
            <input type="text" id="address" name="address" value="${property.address || ''}">
        </div>
        <div class="form-group">
            <label for="neighborhood">Bairro</label>
            <input type="text" id="neighborhood" name="neighborhood" value="${property.neighborhood || ''}">
        </div>
        <div class="form-group">
            <label for="block">Quadra</label>
            <input type="text" id="block" name="block" value="${property.block || ''}">
        </div>       
        <h2>Características do Imóvel</h2>
        <div class="form-group">
            <label for="propertyType">Tipo de Imóvel</label>
            <select id="propertyType" name="propertyType" required>
                <option value="Casa" ${property.propertyType === 'Casa' ? 'selected' : ''}>Casa</option>
                <option value="Apartamento" ${property.propertyType === 'Apartamento' ? 'selected' : ''}>Apartamento</option>
                <option value="Lote" ${property.propertyType === 'Lote' ? 'selected' : ''}>Lote</option>
                <option value="Comercial" ${property.propertyType === 'Comercial' ? 'selected' : ''}>Comercial</option>
            </select>
        </div>
        <div class="form-group">
            <label for="secondaryType">Tipo Secundário</label>
            <select id="secondaryType" name="secondaryType">
                <option value="Individual" ${property.secondaryType === 'Individual' ? 'selected' : ''}>Individual</option>
                <option value="Geminada" ${property.secondaryType === 'Geminada' ? 'selected' : ''}>Geminada</option>
                <option value="Sobrado" ${property.secondaryType === 'Sobrado' ? 'selected' : ''}>Sobrado</option>
                <option value="Condomínio" ${property.secondaryType === 'Condomínio' ? 'selected' : ''}>Condomínio</option>
            </select>
        </div>
        <div class="form-group">
            <label for="isCondominium">Condomínio?</label>
            <input type="checkbox" id="isCondominium" name="isCondominium" ${property.isCondominium ? 'checked' : ''}>
        </div>
        <div class="form-group">
            <label for="totalArea">Área Total (m²)</label>
            <input type="number" id="totalArea" name="totalArea" value="${property.totalArea || ''}">
        </div>
        <div class="form-group">
            <label for="builtArea">Área Construída (m²)</label>
            <input type="number" id="builtArea" name="builtArea" value="${property.builtArea || ''}">
        </div>

        <h2>Tipologia do Imóvel</h2>
        <div class="form-group">
            <label for="garages">Vagas</label>
            <input type="number" id="garages" name="garages" value="${property.garages || ''}">
        </div>
        <div class="form-group">
            <label for="bedrooms">Quartos</label>
            <input type="number" id="bedrooms" name="bedrooms" value="${property.bedrooms || ''}">
        </div>
        <div class="form-group">
            <label for="suites">Suítes</label>
            <input type="number" id="suites" name="suites" value="${property.suites || ''}">
        </div>
        <div class="form-group">
            <label for="socialBathrooms">Banheiros Sociais</label>
            <input type="number" id="socialBathrooms" name="socialBathrooms" value="${property.socialBathrooms || ''}">
        </div>
        <div class="form-group">
            <label for="hasBackyard">Possui Quintal?</label>
            <input type="checkbox" id="hasBackyard" name="hasBackyard" ${property.hasBackyard ? 'checked' : ''}>
        </div>
        <div class="form-group">
            <label for="hasBalcony">Possui Varanda?</label>
            <input type="checkbox" id="hasBalcony" name="hasBalcony" ${property.hasBalcony ? 'checked' : ''}>
        </div>

        <div id="apartmentFields" class="hidden">
            <h2>Informações do Apartamento</h2>
            <div class="form-group">
                <label for="floors">Número de Andares</label>
                <input type="number" id="floors" name="floors" value="${property.floors || ''}">
            </div>
            <div class="form-group">
                <label for="apartmentNumber">Número do Apartamento</label>
                <input type="text" id="apartmentNumber" name="apartmentNumber" value="${property.apartmentNumber || ''}">
            </div>
            <div class="form-group">
                <label for="floor">Andar do Apartamento</label>
                <input type="number" id="floor" name="floor" value="${property.floor || ''}">
            </div>
            <div class="form-group">
                <label for="hasElevator">Possui Elevador?</label>
                <input type="checkbox" id="hasElevator" name="hasElevator" ${property.hasElevator ? 'checked' : ''}>
            </div>
        </div>
        <h2>Informações de Visita</h2>
        <div class="form-group">
            <label for="occupancyStatus">Status de Ocupação</label>
            <select id="occupancyStatus" name="occupancyStatus" required>
                <option value="Ocupado" ${property.occupancyStatus === 'Ocupado' ? 'selected' : ''}>Ocupado</option>
                <option value="Desocupado" ${property.occupancyStatus === 'Desocupado' ? 'selected' : ''}>Desocupado</option>
                <option value="Inquilino" ${property.occupancyStatus === 'Inquilino' ? 'selected' : ''}>Inquilino</option>
            </select>
        </div>
        <div class="form-group">
            <label for="keyLocation">Localização da Chave</label>
            <input type="text" id="keyLocation" name="keyLocation" value="${property.keyLocation || ''}">
        </div>
        <div class="form-group">
            <label for="ownerName">Nome do Proprietário</label>
            <input type="text" id="ownerName" name="ownerName" value="${property.ownerName || ''}">
        </div>
        <div class="form-group">
            <label for="ownerContact">Contato do Proprietário</label>
            <input type="text" id="ownerContact" name="ownerContact" value="${property.ownerContact || ''}">
        </div>

        <h2>Contrato de Exclusividade</h2>
        <div class="form-group">
            <label for="exclusivityStartDate">Data de Início</label>
            <input type="date" id="exclusivityStartDate" name="exclusivityStartDate" value="${property.exclusivityContract?.startDate?.split('T')[0] || ''}">
        </div>
        <div class="form-group">
            <label for="exclusivityEndDate">Data de Término</label>
            <input type="date" id="exclusivityEndDate" name="exclusivityEndDate" value="${property.exclusivityContract?.endDate?.split('T')[0] || ''}">
        </div>
        <div class="form-group">
            <label for="hasPromotion">Tem Promoção?</label>
            <input type="checkbox" id="hasPromotion" name="hasPromotion" 
                ${property.exclusivityContract?.hasPromotion ? 'checked' : ''}>
        </div>

        <h2>Detalhes Adicionais</h2>
        <div class="form-group">
            <label for="differentials">Diferenciais</label>
            <textarea id="differentials" name="differentials">${property.differentials || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="landmarks">Pontos de Referência</label>
            <textarea id="landmarks" name="landmarks">${property.landmarks || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="generalObservations">Observações Gerais</label>
            <textarea id="generalObservations" name="generalObservations">${property.generalObservations || ''}</textarea>
        </div>    
        
        <div class="form-group">
            <h1>Adicionar Novas Imagens</h1>
            <input type="file" id="images" name="images" multiple accept="image/*">
        </div>
        <h2>Imagens</h2>
        <div id="image-preview" class="image-preview-container"></div>

        <button type="submit" class="submit-btn">Salvar Alterações</button>
    `;

    // Inicializar CKEditor após adicionar o textarea
    if (ClassicEditor) {
        ClassicEditor
            .create(document.querySelector('#description'))
            .then(newEditor => {
                editor = newEditor;
                console.log('Editor inicializado:', editor);
            })
            .catch(error => {
                console.error('Erro ao inicializar o editor:', error);
            });
    }

    // Adicione o event listener para o select após a criação do elemento
    const propertyTypeSelect = document.getElementById('propertyType');
    propertyTypeSelect.addEventListener('change', toggleApartmentFields);
    
    // Chame a função para definir o estado inicial dos campos
    toggleApartmentFields();

    // Crie o elemento image-preview se ele não existir
    let imagePreviewElement = document.getElementById('image-preview');
    if (!imagePreviewElement) {
        imagePreviewElement = document.createElement('div');
        imagePreviewElement.id = 'image-preview';
        form.appendChild(imagePreviewElement);
    }

    // Adicione event listeners para os botões de remover imagem
    const removeButtons = form.querySelectorAll('.remove-image');
    removeButtons.forEach(button => {
        button.addEventListener('click', function () {
            const index = this.dataset.index;
            this.closest('.image-preview').remove();
        });
    });

    // Adicione event listener para o formulário
    form.addEventListener('submit', handleSubmit);
}

function setupImagePreview(property) {
    const previewContainer = document.getElementById('image-preview');
    const imageInput = document.getElementById('images');

    if (!previewContainer) {
        console.error('Container de preview não encontrado');
        return;
    }

    previewContainer.innerHTML = '';

    if (property && property.images && property.images.length > 0) {
        property.images.forEach((imagePath, index) => {
            if (!imagesToDelete.includes(imagePath)) {
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.setAttribute('data-index', index);
                previewItem.setAttribute('data-src', imagePath);
                
                const imageUrl = imagePath.startsWith('http') ? imagePath : `${API_BASE_URL}${imagePath}`;
                
                previewItem.innerHTML = `
                    <img src="${imageUrl}" alt="Imagem ${index + 1}">
                    <span class="image-position">${index + 1}</span>
                    <button type="button" class="remove-image">&times;</button>
                `;
                
                const removeButton = previewItem.querySelector('.remove-image');
                removeButton.addEventListener('click', () => {
                    imagesToDelete.push(imagePath);
                    previewItem.remove();
                    updateImageOrder();
                    console.log('Imagens para deletar:', imagesToDelete);
                });
                
                previewContainer.appendChild(previewItem);
            }
        });
    }

    // Adicionar listener para novas imagens
    imageInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        const currentCount = document.querySelectorAll('.image-preview-item').length;
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            const previewItem = document.createElement('div');
            
            previewItem.className = 'image-preview-item';
            previewItem.setAttribute('data-index', currentCount + index);
            previewItem.setAttribute('data-is-new', 'true');
            
            reader.onload = function(e) {
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Nova Imagem ${currentCount + index + 1}">
                    <span class="image-position">${currentCount + index + 1}</span>
                    <button type="button" class="remove-image">&times;</button>
                `;
                
                const removeButton = previewItem.querySelector('.remove-image');
                removeButton.addEventListener('click', () => {
                    previewItem.remove();
                    updateImageOrder();
                });
            };
            
            reader.readAsDataURL(file);
            previewContainer.appendChild(previewItem);
        });
        
        updateImageOrder();
    });

    // Inicializar Sortable
    new Sortable(previewContainer, {
        animation: 150,
        onEnd: updateImageOrder
    });
}

async function handleSubmit(event) {
    event.preventDefault();
    
    try {
        showLoading();
        const form = event.target;
        const formData = new FormData(form);
        
        // Adicionar conteúdo do editor
        if (editor) {
            const description = editor.getData();
            formData.set('description', description);
            console.log('Conteúdo do editor:', description);
        }

        // Processar checkboxes incluindo hasPromotion
        ['isCondominium', 'hasBackyard', 'hasBalcony', 'hasElevator', 'hasPromotion'].forEach(field => {
            const checkbox = document.getElementById(field);
            if (checkbox) {
                formData.set(field, checkbox.checked.toString());
            }
        });

        // Processar datas do contrato de exclusividade se existirem
        if (formData.get('exclusivityStartDate') || formData.get('exclusivityEndDate')) {
            formData.set('exclusivityContract.startDate', formData.get('exclusivityStartDate'));
            formData.set('exclusivityContract.endDate', formData.get('exclusivityEndDate'));
            delete formData.exclusivityStartDate;
            delete formData.exclusivityEndDate;
        }

        // Processar imagens
        const imageContainers = Array.from(document.querySelectorAll('.image-preview-item'));
        
        formData.delete('images');
        formData.delete('existingImages');
        
        const existingImages = imageContainers
            .filter(container => !container.getAttribute('data-is-new'))
            .map(container => container.getAttribute('data-src'))
            .filter(src => src && !imagesToDelete.includes(src));
        
        formData.append('existingImages', JSON.stringify(existingImages));
        
        // Adicionar novas imagens
        const imageInput = document.getElementById('images');
        if (imageInput.files.length > 0) {
            Array.from(imageInput.files).forEach(file => {
                formData.append('images', file);
            });
        }
        
        // Adicionar imagens para deletar
        if (imagesToDelete.length > 0) {
            formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
        }

        const response = await fetch(`${API_BASE_URL}/api/properties/${currentProperty._id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao atualizar propriedade');
        }

        currentProperty = data.data.property;
        imagesToDelete = []; // Limpar array após sucesso
        
        showNotification('Propriedade atualizada com sucesso!', 'success');
        await loadPropertyData();
        
    } catch (error) {
        console.error('Erro ao atualizar propriedade:', error);
        showNotification(error.message || 'Erro ao atualizar propriedade', 'error');
    } finally {
        hideLoading();
    }
}

function showLoading() {
    // Implementação do indicador de carregamento
}

function hideLoading() {
    // Implementação para esconder o indicador de carregamento
}

function showNotification(message, type = 'info') {
    // Implementação da notificação
}

function toggleApartmentFields() {
    const propertyTypeSelect = document.getElementById('propertyType');
    const apartmentFields = document.getElementById('apartmentFields');
    const hasElevatorField = document.getElementById('hasElevator');
    const floorsField = document.getElementById('floors');
    const floorField = document.getElementById('floor');

    if (propertyTypeSelect.value === 'Apartamento') {
        apartmentFields.classList.remove('hidden'); // Mostra os campos de apartamento
        hasElevatorField.parentElement.classList.remove('hidden'); // Mostra o campo de elevador
        floorsField.parentElement.classList.remove('hidden'); // Mostra o campo de andares
        floorField.parentElement.classList.remove('hidden'); // Mostra o campo de andar
    } else {
        apartmentFields.classList.add('hidden'); // Oculta os campos de apartamento
        hasElevatorField.parentElement.classList.add('hidden'); // Oculta o campo de elevador
        floorsField.parentElement.classList.add('hidden'); // Oculta o campo de andares
        floorField.parentElement.classList.add('hidden'); // Oculta o campo de andar
    }
}