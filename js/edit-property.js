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
        currentProperty = data.data.property;
        populateForm(currentProperty);
    } catch (error) {
        console.error('Erro ao carregar dados da propriedade:', error);
        showNotification('Erro ao carregar dados da propriedade', 'error');
    }
}

function populateForm(property) {
    const form = document.getElementById('edit-property-form');
    form.innerHTML = `
        <div class="form-group">
            <label for="title">Título</label>
            <input type="text" id="title" name="title" value="${property.title || ''}" required>
        </div>
        <div class="form-group">
            <label for="salePrice">Preço de Venda</label>
            <input type="number" id="salePrice" name="salePrice" value="${property.salePrice || ''}" required>
        </div>
        <div class="form-group">
            <label for="address">Endereço</label>
            <input type="text" id="address" name="address" value="${property.address || ''}" required>
        </div>
        <div class="form-group">
            <label for="neighborhood">Bairro</label>
            <input type="text" id="neighborhood" name="neighborhood" value="${property.neighborhood || ''}" required>
        </div>
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
            <label for="totalArea">Área Total (m²)</label>
            <input type="number" id="totalArea" name="totalArea" value="${property.totalArea || ''}" required>
        </div>
        <div class="form-group">
            <label for="builtArea">Área Construída (m²)</label>
            <input type="number" id="builtArea" name="builtArea" value="${property.builtArea || ''}" required>
        </div>
        <div class="form-group">
            <label for="bedrooms">Quartos</label>
            <input type="number" id="bedrooms" name="bedrooms" value="${property.bedrooms || ''}" required>
        </div>
        <div class="form-group">
            <label for="bathrooms">Banheiros</label>
            <input type="number" id="bathrooms" name="bathrooms" value="${property.bathrooms || ''}" required>
        </div>
        <div class="form-group">
            <label for="description">Descrição</label>
            <textarea id="description" name="description" required>${property.description || ''}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">Salvar Alterações</button>
        <button type="button" id="cancel-edit" class="btn btn-secondary">Cancelar</button>
    `;

    form.addEventListener('submit', handleEditSubmit);
    document.getElementById('cancel-edit').addEventListener('click', () => window.history.back());
}

async function handleEditSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const updatedProperty = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${currentProperty._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updatedProperty)
        });

        if (!response.ok) {
            throw new Error('Falha ao atualizar a propriedade');
        }

        showNotification('Propriedade atualizada com sucesso!', 'success');
        setTimeout(() => window.location.href = 'manage-properties.html', 2000);
    } catch (error) {
        console.error('Erro ao atualizar a propriedade:', error);
        showNotification('Erro ao atualizar a propriedade. Por favor, tente novamente.', 'error');
    }
}

function showNotification(message, type) {
    // Implemente esta função para mostrar notificações ao usuário
    console.log(`${type.toUpperCase()}: ${message}`);
    // Você pode usar a mesma implementação que já existe no seu projeto
}