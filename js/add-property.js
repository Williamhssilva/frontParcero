import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

console.log('add-property.js carregado');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    checkPermission(['corretor']);
    setupForm();
    setupImagePreview();
    renderMenu();
    console.log('Token armazenado:', localStorage.getItem('token'));
});

function setupForm() {
    console.log('Configurando formulário');
    const form = document.getElementById('add-property-form');
    console.log("Formulário encontrado:", form);
    
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); // Impede o envio tradicional do formulário
            console.log('Formulário submetido');
            handleSubmit(event);
        });
    } else {
        console.error('Formulário não encontrado');
    }
}

function setupImagePreview() {
    const input = document.getElementById('images');
    const preview = document.getElementById('image-preview');

    input.addEventListener('change', () => {
        preview.innerHTML = '';
        for (const file of input.files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100px';
                img.style.height = '100px';
                img.style.objectFit = 'cover';
                img.style.margin = '5px';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });
}

async function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    // Adicionar o ID do corretor atual
    formData.append('capturedBy', getCurrentUser().id);

    // Converter checkbox para booleano
    formData.set('isCondominium', form.isCondominium.checked);
    formData.set('hasBackyard', form.hasBackyard.checked);
    formData.set('hasBalcony', form.hasBalcony.checked);
    formData.set('hasElevator', form.hasElevator.checked);
    formData.set('hasPromotion', form.hasPromotion.checked);

    try {
        showLoading();
        console.log('Enviando requisição para o servidor');
        const response = await fetch(`${API_BASE_URL}/api/properties`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        console.log('Resposta recebida:', response.status);
        const data = await response.json();
        console.log('Dados da resposta:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Falha ao adicionar propriedade');
        }

        showNotification('Propriedade adicionada com sucesso!', 'success');
        form.reset(); // Limpa o formulário após o sucesso
    } catch (error) {
        console.error('Erro ao adicionar propriedade:', error);
        showNotification(`Erro ao adicionar propriedade: ${error.message}`, 'error');
    } finally {
        hideLoading();
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
    }, 3000);
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