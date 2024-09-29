import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', () => {
    checkPermission(['corretor']);
    setupForm();
    setupImagePreview();
});

function setupForm() {
    const form = document.getElementById('add-property-form');
    form.addEventListener('submit', handleSubmit);
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
    
    if (!validateForm(form)) {
        return;
    }

    const formData = new FormData(form);

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/properties`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Falha ao adicionar propriedade');
        }

        showSuccess('Propriedade adicionada com sucesso!');
        setTimeout(() => {
            window.location.href = 'manage-properties.html';
        }, 2000);
    } catch (error) {
        console.error('Erro ao adicionar propriedade:', error);
        showError('Erro ao adicionar propriedade. Por favor, tente novamente.');
    } finally {
        hideLoading();
    }
}

function validateForm(form) {
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
        showError('Por favor, preencha todos os campos obrigatórios.');
    }

    return isValid;
}

function showLoading() {
    // Implementar lógica para mostrar indicador de carregamento
}

function hideLoading() {
    // Implementar lógica para esconder indicador de carregamento
}

function showSuccess(message) {
    alert(message); // Substituir por uma solução mais elegante, como um toast
}

function showError(message) {
    alert(message); // Substituir por uma solução mais elegante, como um toast
}