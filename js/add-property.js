import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

console.log('add-property.js carregado');

let editor; // Declarar variável global para o editor

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    checkPermission(['corretor']);
    setupForm();
    setupImagePreview();
    renderMenu();
    toggleApartmentFields();
    initEditor(); // Adicionar inicialização do editor

    // Adiciona o listener para o select
    const propertyTypeSelect = document.getElementById('propertyType');
    propertyTypeSelect.addEventListener('change', toggleApartmentFields);
});

function toggleApartmentFields() {
    const propertyTypeSelect = document.getElementById('propertyType');
    const apartmentFields = document.getElementById('apartmentFields');
    const loteFields = document.getElementById('casaFields');
    if (propertyTypeSelect.value === 'Apartamento') {
        loteFields.classList.remove('hidden');
        apartmentFields.classList.remove('hidden'); // Mostra os campos de apartamento
    } else if (propertyTypeSelect.value === 'Lote') {
        loteFields.classList.add('hidden');
        apartmentFields.classList.add('hidden'); // Oculta os campos de apartamento
    } else {
        loteFields.classList.remove('hidden');
        apartmentFields.classList.add('hidden'); // Oculta os campos de apartamento
    }
}

function setupForm() {
    const form = document.getElementById('add-property-form');

    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault(); // Impede o envio tradicional do formulário
            handleSubmit(event);
        });
    } else {
        console.error('Formulário não encontrado');
    }
}

function setupImagePreview() {
    const imageInput = document.getElementById('images');
    const previewContainer = document.getElementById('image-preview');
    
    imageInput.addEventListener('change', function(e) {
        previewContainer.innerHTML = '';
        const files = Array.from(e.target.files);
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.setAttribute('data-index', index);
            previewItem.setAttribute('data-original-index', index);
            
            reader.onload = function(e) {
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <span class="image-position">${index + 1}</span>
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

        // Inicializar Sortable
        if (!previewContainer.sortable) {
            previewContainer.sortable = new Sortable(previewContainer, {
                animation: 150,
                onEnd: updateImageOrder
            });
        }
    });
}

function updateImageOrder() {
    const imageContainers = document.querySelectorAll('.image-preview-item');
    
    // Atualizar os números de posição
    imageContainers.forEach((container, index) => {
        container.setAttribute('data-index', index);
        const positionSpan = container.querySelector('.image-position');
        if (positionSpan) {
            positionSpan.textContent = index + 1;
        }
    });
}

async function handleSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        
        // Capturar os containers de imagem
        const imageContainers = Array.from(document.querySelectorAll('.image-preview-item'));
        const imageInput = document.getElementById('images');
        const files = Array.from(imageInput.files);
        
        // Limpar imagens existentes e imageOrder do FormData
        formData.delete('images');
        formData.delete('imageOrder');
        
        // Criar array com a ordem atual das imagens
        const imageOrder = imageContainers.map(container => 
            parseInt(container.getAttribute('data-original-index'))
        ).filter(index => !isNaN(index));

        // Adicionar imagens na ordem original
        files.forEach((file, index) => {
            console.log(`Adicionando imagem ${index} ao FormData`);
            formData.append('images', file);
        });

        // Adicionar a ordem como JSON
        formData.append('imageOrder', JSON.stringify(imageOrder));

        // Adicionar o conteúdo do editor
        const description = editor.getData();
        formData.set('description', description);

        // Adicionar campos booleanos
        ['isCondominium', 'hasBackyard', 'hasBalcony', 'hasElevator', 'hasPromotion'].forEach(field => {
            const checkbox = document.getElementById(field);
            formData.set(field, checkbox ? checkbox.checked : false);
        });

        // Log para debug
        console.log('Ordem das imagens:', imageOrder);
        for (let [key, value] of formData.entries()) {
            if (key === 'images') {
                console.log('images:', value.name);
            } else {
                console.log(`${key}:`, value);
            }
        }

        // Enviar para o servidor
        const response = await fetch(`${API_BASE_URL}/api/properties`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao criar propriedade');
        }

        const data = await response.json();
        console.log('Propriedade criada com sucesso:', data);
        
        showNotification('Propriedade adicionada com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = 'properties.html';
        }, 2000);

    } catch (error) {
        console.error('Erro ao adicionar propriedade:', error);
        showNotification(`Erro ao adicionar propriedade: ${error.message}`, 'error');
    }
}

function validateForm(form) {
    console.log('Validating form');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });

    if (!isValid) {
        showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
    }

    console.log('Form validation result:', isValid);
    return isValid;
}

function showLoading() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingIndicator);
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 300);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);

    // Adicione este console.log para garantir que a mensagem seja exibida no console
    console.log(`Notificação: ${type} - ${message}`);
}

// Adicionar esta nova função
function initEditor() {
    ClassicEditor
        .create(document.querySelector('#description'))
        .then(newEditor => {
            editor = newEditor;
        })
        .catch(error => {
            console.error('Erro ao inicializar o editor:', error);
        });
}
