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
    const input = document.getElementById('images');
    const preview = document.getElementById('image-preview');

    if (!preview) {
        console.error('Elemento image-preview não encontrado');
        return;
    }

    input.addEventListener('change', () => {
        for (const file of input.files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'image-preview-item';
                imgContainer.setAttribute('data-src', e.target.result);
                const originalIndex = preview.children.length;
                imgContainer.setAttribute('data-original-index', originalIndex);
                imgContainer.setAttribute('data-index', originalIndex);

                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;

                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'remove-image';
                removeButton.textContent = 'X';
                removeButton.onclick = () => removeImage(imgContainer);

                const positionLabel = document.createElement('span');
                positionLabel.className = 'image-position';
                positionLabel.textContent = originalIndex + 1;

                imgContainer.appendChild(img);
                imgContainer.appendChild(removeButton);
                imgContainer.appendChild(positionLabel);
                preview.appendChild(imgContainer);
            };
            reader.readAsDataURL(file);
        }
    });

    // Inicializar Sortable
    new Sortable(preview, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        handle: '.image-preview-item', // Isso permite arrastar pelo item inteiro
        onEnd: function () {
            updateImageOrder();
        }
    });
}

function removeImage(imgContainer) {
    imgContainer.remove();
    updateImageOrder();
}

function updateImageOrder() {
    const imageContainers = document.querySelectorAll('.image-preview-item');
    const updatedOrder = [];
    console.log(updatedOrder);
    imageContainers.forEach((container, index) => {

        container.setAttribute('data-index', index); // Atualiza o índice

        // Adiciona ao array de ordem atualizada
        updatedOrder.push({
            originalIndex: container.getAttribute('data-original-index'),
            newIndex: index,
        });
    });

    // Log da nova ordem com nomes das imagens
    console.log('Nova ordem das imagens:', updatedOrder);
}

async function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    // Capturar a ordem atual das imagens
    const imageContainers = Array.from(document.querySelectorAll('.image-preview-item'));
    const currentImages = imageContainers.map((container, currentIndex) => ({
        src: container.getAttribute('data-src'),
        currentIndex: currentIndex,
        originalIndex: parseInt(container.getAttribute('data-original-index'))
    }));

    // Adicionar a nova ordem das imagens como um campo separado
    const newOrder = currentImages.map(img => img.originalIndex);
    formData.append('imageOrder', JSON.stringify(newOrder));

    // Converter data URLs para arquivos e adicionar ao FormData
    formData.delete('images');
    const imagePromises = currentImages.map(async (img, index) => {
        const response = await fetch(img.src);
        const blob = await response.blob();
        const file = new File([blob], `image_${index}.jpg`, { type: 'image/jpeg' });
        formData.append('images', file);
        console.log(`Adicionando ao FormData: Imagem ${index + 1} (originalmente na posição ${img.originalIndex + 1})`);
    });

    await Promise.all(imagePromises);

    // Remove campos vazios ou converte para null
    for (let [key, value] of formData.entries()) {
        if (value === '') {
            formData.delete(key);
        }
    }

    // Adicionar campos booleanos explicitamente
    const booleanFields = ['isCondominium', 'hasBackyard', 'hasBalcony', 'hasElevator', 'hasPromotion'];
    booleanFields.forEach(field => {
        formData.set(field, form.querySelector(`#${field}`).checked.toString());
    });

    // Adicionar o ID do corretor atual
    formData.append('capturedBy', getCurrentUser().id);
    formData.append('capturedByName', getCurrentUser().name);
    // Converter checkbox para booleano
    formData.set('isCondominium', form.isCondominium.checked);
    formData.set('hasBackyard', form.hasBackyard.checked);
    formData.set('hasBalcony', form.hasBalcony.checked);
    formData.set('hasElevator', form.hasElevator.checked);
    formData.set('hasPromotion', form.hasPromotion.checked);
    console.log('FormData111111111:', formData);
    
    // Log para verificar o conteúdo do FormData
    console.log('Conteúdo do FormData:');
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`${key}: ${value.name} (${value.size} bytes)`); // Imprime o nome e o tamanho do arquivo
        } else {
            console.log(`${key}: ${value}`); // Imprime outros valores
        }
    }
    
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
        document.getElementById('image-preview').innerHTML = ''; // Limpa as miniaturas
        setupImagePreview();
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