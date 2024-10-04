import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

let currentProperty = null;

document.addEventListener('DOMContentLoaded', () => {
    checkPermission(['corretor', 'administrador']);
    renderMenu();
    loadPropertyData();
});

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

        if (!response.ok) {
            throw new Error('Falha ao carregar dados da propriedade');
        }

        const data = await response.json();
        currentProperty = data.data;
        populateForm(currentProperty);
    } catch (error) {
        console.error('Erro ao carregar dados da propriedade:', error);
        showNotification('Erro ao carregar dados da propriedade', 'error');
    }
}

function populateForm(property) {
    const form = document.getElementById('edit-property-form');
    form.innerHTML = `
        <h2>Informações de Captação</h2>
        <div class="form-group">
            <label for="captureCity">Cidade de Captação</label>
            <input type="text" id="captureCity" name="captureCity" value="${property.captureCity || ''}" required>
        </div>
        <div class="form-group">
            <label for="captureCEP">CEP de Captação</label>
            <input type="text" id="captureCEP" name="captureCEP" value="${property.captureCEP || ''}" required>
        </div>

        <h2>Localização do Imóvel</h2>
        <div class="form-group">
            <label for="address">Endereço</label>
            <input type="text" id="address" name="address" value="${property.address || ''}" required>
        </div>
        <div class="form-group">
            <label for="neighborhood">Bairro</label>
            <input type="text" id="neighborhood" name="neighborhood" value="${property.neighborhood || ''}" required>
        </div>
        <div class="form-group">
            <label for="isCondominium">Condomínio?</label>
            <input type="checkbox" id="isCondominium" name="isCondominium" ${property.isCondominium ? 'checked' : ''}>
        </div>
        <div class="form-group">
            <label for="block">Quadra</label>
            <input type="text" id="block" name="block" value="${property.block || ''}">
        </div>
        <div class="form-group">
            <label for="apartmentNumber">Número do Apartamento</label>
            <input type="text" id="apartmentNumber" name="apartmentNumber" value="${property.apartmentNumber || ''}">
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
            <label for="totalArea">Área Total (m²)</label>
            <input type="number" id="totalArea" name="totalArea" value="${property.totalArea || ''}" required>
        </div>
        <div class="form-group">
            <label for="builtArea">Área Construída (m²)</label>
            <input type="number" id="builtArea" name="builtArea" value="${property.builtArea || ''}" required>
        </div>

        <h2>Tipologia do Imóvel</h2>
        <div class="form-group">
            <label for="garages">Vagas</label>
            <input type="number" id="garages" name="garages" value="${property.garages || ''}" required>
        </div>
        <div class="form-group">
            <label for="bedrooms">Quartos</label>
            <input type="number" id="bedrooms" name="bedrooms" value="${property.bedrooms || ''}" required>
        </div>
        <div class="form-group">
            <label for="suites">Suítes</label>
            <input type="number" id="suites" name="suites" value="${property.suites || ''}" required>
        </div>
        <div class="form-group">
            <label for="socialBathrooms">Banheiros Sociais</label>
            <input type="number" id="socialBathrooms" name="socialBathrooms" value="${property.socialBathrooms || ''}" required>
        </div>
        <div class="form-group">
            <label for="hasBackyard">Possui Quintal?</label>
            <input type="checkbox" id="hasBackyard" name="hasBackyard" ${property.hasBackyard ? 'checked' : ''}>
        </div>
        <div class="form-group">
            <label for="hasBalcony">Possui Varanda?</label>
            <input type="checkbox" id="hasBalcony" name="hasBalcony" ${property.hasBalcony ? 'checked' : ''}>
        </div>
        <div class="form-group">
            <label for="hasElevator">Possui Elevador?</label>
            <input type="checkbox" id="hasElevator" name="hasElevator" ${property.hasElevator ? 'checked' : ''}>
        </div>
        <div class="form-group">
            <label for="floors">Número de Andares</label>
            <input type="number" id="floors" name="floors" value="${property.floors || ''}">
        </div>
        <div class="form-group">
            <label for="floor">Andar do Apartamento</label>
            <input type="number" id="floor" name="floor" value="${property.floor || ''}">
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
            <input type="text" id="ownerName" name="ownerName" value="${property.ownerName || ''}" required>
        </div>
        <div class="form-group">
            <label for="ownerContact">Contato do Proprietário</label>
            <input type="text" id="ownerContact" name="ownerContact" value="${property.ownerContact || ''}" required>
        </div>

        <h2>Informações Financeiras</h2>
        <div class="form-group">
            <label for="salePrice">Preço de Venda</label>
            <input type="number" id="salePrice" name="salePrice" value="${property.salePrice || ''}" required>
        </div>
        <div class="form-group">
            <label for="desiredNetPrice">Preço Líquido Desejado</label>
            <input type="number" id="desiredNetPrice" name="desiredNetPrice" value="${property.desiredNetPrice || ''}">
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
            <label for="hasPromotion">Possui Promoção?</label>
            <input type="checkbox" id="hasPromotion" name="hasPromotion" ${property.exclusivityContract?.hasPromotion ? 'checked' : ''}>
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
            <label>Imagens atuais</label>
            <div class="property-images">
                ${generateImageHtml(property.images)}
            </div>
        </div>
        
        <div class="form-group">
            <label for="new-images">Adicionar novas imagens</label>
            <input type="file" id="new-images" name="images" multiple accept="image/*">
        </div>

        <div class="form-group">
            <label for="title">Título da Propriedade</label>
            <input type="text" id="title" name="title" value="${property.title || ''}" required>
        </div>
        <div class="form-group">
            <label for="description">Descrição da Propriedade</label>
            <textarea id="description" name="description" required>${property.description || ''}</textarea>
        </div>

        <button type="submit" class="submit-btn">Salvar Alterações</button>
    `;

    form.addEventListener('submit', handleEditSubmit);
}

function generateImageHtml(images) {
    if (!images || images.length === 0) {
        return '<p>Nenhuma imagem disponível</p>';
    }

    return images.map((image, index) => `
        <div class="property-image" data-image="${image}">
            <img src="${API_BASE_URL}${image}" alt="Imagem ${index + 1}" onerror="this.onerror=null;this.src='https://placehold.co/600x400?text=Imagem+não+encontrada';">
            <button type="button" class="remove-image" onclick="removeImage('${image}')">X</button>
        </div>
    `).join('');
}

function removeImage(imageUrl) {
    if (confirm('Tem certeza que deseja remover esta imagem?')) {
        // Remove a imagem do array currentProperty.images
        currentProperty.images = currentProperty.images.filter(img => img !== imageUrl);
        
        // Atualiza a visualização das imagens
        document.querySelector('.property-images').innerHTML = generateImageHtml(currentProperty.images);
        
        // Adiciona a imagem removida a um array de imagens para deletar
        if (!currentProperty.imagesToDelete) {
            currentProperty.imagesToDelete = [];
        }
        currentProperty.imagesToDelete.push(imageUrl);
    }
}

async function handleEditSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    // Converter checkbox para booleano
    formData.set('isCondominium', form.isCondominium.checked);
    formData.set('hasBackyard', form.hasBackyard.checked);
    formData.set('hasBalcony', form.hasBalcony.checked);
    formData.set('hasElevator', form.hasElevator.checked);
    formData.set('hasPromotion', form.hasPromotion.checked);

    // Adicionar as imagens existentes ao FormData
    currentProperty.images.forEach((image, index) => {
        console.log('Adicionando imagem ao FormData:', image);
        console.log('FormData:', index);
        formData.append(`existingImages[${index}]`, image);
    });

    // Adicionar as imagens para deletar ao FormData
    if (currentProperty.imagesToDelete) {
        currentProperty.imagesToDelete.forEach((image, index) => {
            formData.append(`imagesToDelete[${index}]`, image);
        });
    }

    const imageFiles = form.images.files;
    if (imageFiles.length > 10) {  // Ajuste este número conforme o limite definido no backend
        showNotification('Você pode enviar no máximo 10 imagens por vez.', 'error');
        return;
    }

    // Log dos dados do FormData (opcional, para depuração)
    for (let [key, value] of formData.entries()) {
        console.log(key, value);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${currentProperty._id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao atualizar a propriedade');
        }

        const updatedProperty = await response.json();
        console.log('Propriedade atualizada:', updatedProperty);

        showNotification('Propriedade atualizada com sucesso!', 'success');
        setTimeout(() => window.location.href = 'manage-properties.html', 2000);
    } catch (error) {
        console.error('Erro ao atualizar a propriedade:', error);
        showNotification(`Erro ao atualizar a propriedade: ${error.message}`, 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Expor a função removeImage globalmente para que possa ser chamada pelo onclick
window.removeImage = removeImage;

function setupImagePreview() {
    const input = document.getElementById('images');
    const preview = document.getElementById('image-preview');

    input.addEventListener('change', () => {
        preview.innerHTML = '';
        for (const file of input.files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'property-image';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button type="button" class="remove-image">X</button>
                `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        }
    });
}