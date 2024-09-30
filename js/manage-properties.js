import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

let currentPage = 1;
const limit = 12; // Número de itens por página
let allProperties = []; // Array para armazenar todas as propriedades
let filteredProperties = []; // Array para armazenar propriedades filtradas

let currentProperty = null;

document.addEventListener('DOMContentLoaded', () => {
    if (checkPermission(['corretor', 'administrador'])) {
        setupSearch();
        loadAllProperties();
        setupModal(); // Adicione esta linha
        checkUrlParams(); // Adicione esta linha
    }

    // Adicionar event listeners para os botões "Ver Detalhes"
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', () => {
            const propertyId = button.getAttribute('data-id');
            showPropertyDetails(propertyId);
        });
    });
});

function setupSearch() {
    const searchInput = document.getElementById('property-search');
    searchInput.addEventListener('input', debounce(() => {
        filterProperties(searchInput.value);
    }, 300));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadAllProperties() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties?agent=${getCurrentUser().id}&limit=1000`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar propriedades');
        }

        const data = await response.json();
        allProperties = data.data.properties;
        filteredProperties = allProperties;
        displayProperties(currentPage);
        updatePagination(currentPage, Math.ceil(filteredProperties.length / limit));
    } catch (error) {
        console.error('Erro ao carregar propriedades:', error);
        alert('Erro ao carregar propriedades. Por favor, tente novamente mais tarde.');
    }
}

function filterProperties(searchTerm) {
    filteredProperties = allProperties.filter(property => 
        property.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    currentPage = 1;
    displayProperties(currentPage);
    updatePagination(currentPage, Math.ceil(filteredProperties.length / limit));
}

function displayProperties(page) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const propertiesToDisplay = filteredProperties.slice(startIndex, endIndex);

    const propertiesList = document.getElementById('properties-list');
    if (!propertiesList) {
        console.error('Elemento properties-list não encontrado na página atual');
        return;
    }
    propertiesList.innerHTML = '';

    propertiesToDisplay.forEach(property => {
        const propertyCard = document.createElement('div');
        propertyCard.className = 'property-card';
        propertyCard.innerHTML = `
            <div class="property-image-container">
                <img src="https://via.placeholder.com/300x200.png?text=Imóvel" alt="${property.title}" class="property-image">
                <div class="property-overlay">
                    <button class="btn-action btn-view" data-id="${property._id}" title="Ver Detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" data-id="${property._id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" data-id="${property._id}" title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="property-info">
                <h3 class="property-title">${property.title}</h3>
                <p class="property-price">R$ ${property.price.toLocaleString('pt-BR')}</p>
                <p class="property-status">Status: ${property.status}</p>
            </div>
        `;
        propertiesList.appendChild(propertyCard);
    });

    // Adicionar event listeners para os botões
    document.querySelectorAll('.btn-view').forEach(button => {
        button.addEventListener('click', () => showPropertyDetails(button.getAttribute('data-id')));
    });

    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', () => {
            const propertyId = button.getAttribute('data-id');
            showPropertyDetails(propertyId);
            setTimeout(() => showEditMode(), 100); // Pequeno delay para garantir que o modal esteja aberto
        });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const propertyId = button.getAttribute('data-id');
            deleteProperty(propertyId);
        });
    });
}

async function showPropertyDetails(propertyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) {
            throw new Error('Falha ao carregar detalhes da propriedade');
        }
        const data = await response.json();
        const property = data.data;

        // Armazenar a propriedade atual para uso na edição
        currentProperty = property;

        // Usar 3 imagens de overlay para cada imóvel
        const overlayImages = [
            'https://via.placeholder.com/800x600.png?text=Imagem+1',
            'https://via.placeholder.com/800x600.png?text=Imagem+2',
            'https://via.placeholder.com/800x600.png?text=Imagem+3'
        ];

        const modal = document.getElementById('property-details-modal');
        const modalContent = modal.querySelector('.modal-content');

        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <div id="property-view-mode">
                <div class="property-header">
                    <h2>${property.title}</h2>
                    <p class="property-price">R$ ${property.price.toLocaleString('pt-BR')}</p>
                </div>
                <div class="property-gallery">
                    <div class="swiper-container gallery-top">
                        <div class="swiper-wrapper">
                            ${overlayImages.map(img => `
                                <div class="swiper-slide">
                                    <img src="${img}" alt="Imagem da propriedade">
                                </div>
                            `).join('')}
                        </div>
                        <div class="swiper-button-next"></div>
                        <div class="swiper-button-prev"></div>
                    </div>
                    <div class="swiper-container gallery-thumbs">
                        <div class="swiper-wrapper">
                            ${overlayImages.map(img => `
                                <div class="swiper-slide">
                                    <img src="${img}" alt="Miniatura da imagem">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="property-info">
                    <p><strong>Endereço:</strong> ${property.address.street}, ${property.address.city} - ${property.address.state}</p>
                    <p><strong>Quartos:</strong> ${property.bedrooms}</p>
                    <p><strong>Banheiros:</strong> ${property.bathrooms}</p>
                    <p><strong>Área:</strong> ${property.area} m²</p>
                    <p><strong>Tipo:</strong> ${property.type}</p>
                    <p><strong>Status:</strong> ${property.status}</p>
                    <p><strong>Descrição:</strong> ${property.description}</p>
                </div>
                <button id="edit-property-btn" class="btn btn-primary">Editar Propriedade</button>
            </div>
            <div id="property-edit-mode" style="display: none;">
                <h2>Editar Propriedade</h2>
                <form id="edit-property-form">
                    <input type="text" id="edit-title" name="title" placeholder="Título" required>
                    <input type="number" id="edit-price" name="price" placeholder="Preço" required>
                    <input type="text" id="edit-address" name="address" placeholder="Endereço" required>
                    <input type="number" id="edit-bedrooms" name="bedrooms" placeholder="Quartos" required>
                    <input type="number" id="edit-bathrooms" name="bathrooms" placeholder="Banheiros" required>
                    <input type="number" id="edit-area" name="area" placeholder="Área" required>
                    <textarea id="edit-description" name="description" placeholder="Descrição" required></textarea>
                    <div id="edit-images-container"></div>
                    <button type="submit">Salvar Alterações</button>
                    <button type="button" id="cancel-edit">Cancelar</button>
                </form>
            </div>
        `;

        modal.style.display = 'block';

        // Inicializar o Swiper após a modal ser exibida
        initializeModalCarousel();

        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }

        // Adicionar event listener para o botão de editar
        document.getElementById('edit-property-btn').addEventListener('click', showEditMode);

        // Adicionar event listener para o formulário de edição
        document.getElementById('edit-property-form').addEventListener('submit', updateProperty);

        // Adicionar event listener para o botão de cancelar edição
        document.getElementById('cancel-edit').addEventListener('click', cancelEdit);

    } catch (error) {
        console.error('Erro ao carregar detalhes da propriedade:', error);
        showNotification('Erro ao carregar detalhes da propriedade. Por favor, tente novamente.', 'error');
    }
}

function initializeModalCarousel() {
    const galleryThumbs = new Swiper('.gallery-thumbs', {
        spaceBetween: 10,
        slidesPerView: 3,
        freeMode: true,
        watchSlidesVisibility: true,
        watchSlidesProgress: true,
    });

    new Swiper('.gallery-top', {
        spaceBetween: 10,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        thumbs: {
            swiper: galleryThumbs
        }
    });
}

function showEditMode() {
    document.getElementById('property-view-mode').style.display = 'none';
    document.getElementById('property-edit-mode').style.display = 'block';

    // Preencher o formulário com os dados atuais da propriedade
    document.getElementById('edit-title').value = currentProperty.title;
    document.getElementById('edit-price').value = currentProperty.price;
    document.getElementById('edit-address').value = `${currentProperty.address.street}, ${currentProperty.address.city} - ${currentProperty.address.state}`;
    document.getElementById('edit-bedrooms').value = currentProperty.bedrooms;
    document.getElementById('edit-bathrooms').value = currentProperty.bathrooms;
    document.getElementById('edit-area').value = currentProperty.area;
    document.getElementById('edit-description').value = currentProperty.description;

    // Adicionar o campo de status, se existir
    const statusSelect = document.getElementById('edit-status');
    if (statusSelect) {
        statusSelect.value = currentProperty.status;
    }

    // Garantir que os campos sejam editáveis
    const editForm = document.getElementById('edit-property-form');
    const inputs = editForm.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.removeAttribute('readonly');
        input.removeAttribute('disabled');
    });

    // Exibir as imagens atuais (se houver)
    const imagesContainer = document.getElementById('edit-images-container');
    imagesContainer.innerHTML = '';
    if (currentProperty.images && Array.isArray(currentProperty.images)) {
        currentProperty.images.forEach((imageUrl, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.innerHTML = `
                <img src="${imageUrl}" alt="Imagem ${index + 1}">
                <button type="button" class="remove-image" data-index="${index}">Remover</button>
            `;
            imagesContainer.appendChild(imgContainer);
        });
    }

    // Adicionar listener para remover imagens
    imagesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-image')) {
            const index = parseInt(e.target.dataset.index);
            currentProperty.images.splice(index, 1);
            showEditMode(); // Recarregar o modo de edição
        }
    });

    // Forçar a exibição das labels
    const labels = document.querySelectorAll('#property-edit-mode label');
    labels.forEach(label => {
        label.style.display = 'block';
        label.style.position = 'static';
        label.style.opacity = '1';
        label.style.pointerEvents = 'auto';
    });
}

async function updateProperty(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const updatedProperty = Object.fromEntries(formData.entries());

    // Converter valores numéricos
    updatedProperty.price = parseFloat(updatedProperty.price);
    updatedProperty.bedrooms = parseInt(updatedProperty.bedrooms);
    updatedProperty.bathrooms = parseInt(updatedProperty.bathrooms);
    updatedProperty.area = parseFloat(updatedProperty.area);

    // Separar o endereço em partes
    const [street, cityState] = updatedProperty.address.split(',');
    const [city, state] = cityState.trim().split('-');
    updatedProperty.address = { 
        street: street.trim(), 
        city: city.trim(), 
        state: state.trim(),
        zipCode: currentProperty.address.zipCode // Manter o CEP original
    };

    // Adicionar as imagens existentes
    updatedProperty.images = currentProperty.images;

    // Adicionar campos que podem não estar no formulário, mas são necessários
    updatedProperty.type = currentProperty.type;
    
    // Usar um valor válido para status
    updatedProperty.status = currentProperty.status === 'disponível' ? 'ativo' : currentProperty.status;

    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${currentProperty._id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProperty)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao atualizar a propriedade');
        }

        const data = await response.json();
        currentProperty = data.data;

        showNotification('Propriedade atualizada com sucesso!', 'success');
        cancelEdit();
        updatePropertyDetailsView(currentProperty);
        updatePropertyCard(currentProperty);
        
        // Atualizar a lista de propriedades
        const index = allProperties.findIndex(p => p._id === currentProperty._id);
        if (index !== -1) {
            allProperties[index] = currentProperty;
            displayProperties(currentPage);
        }
    } catch (error) {
        console.error('Erro ao atualizar a propriedade:', error);
        showNotification('Erro ao atualizar a propriedade: ' + error.message, 'error');
    }
}

function cancelEdit() {
    document.getElementById('property-edit-mode').style.display = 'none';
    document.getElementById('property-view-mode').style.display = 'block';
}

function updatePagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) {
        console.error('Elemento pagination não encontrado na página atual');
        return;
    }
    paginationContainer.innerHTML = '';

    if (totalPages > 1) {
        if (currentPage > 1) {
            const prevButton = createPaginationButton('Anterior', () => changePage(currentPage - 1));
            paginationContainer.appendChild(prevButton);
        }

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = createPaginationButton(i, () => changePage(i), i === currentPage);
            paginationContainer.appendChild(pageButton);
        }

        if (currentPage < totalPages) {
            const nextButton = createPaginationButton('Próxima', () => changePage(currentPage + 1));
            paginationContainer.appendChild(nextButton);
        }
    }
}

function createPaginationButton(text, onClick, isActive = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);
    if (isActive) {
        button.classList.add('active');
    }
    return button;
}

function changePage(page) {
    currentPage = page;
    displayProperties(currentPage);
    updatePagination(currentPage, Math.ceil(filteredProperties.length / limit));
}

function setupModal() {
    const modal = document.getElementById('property-details-modal');
    const closeBtn = modal.querySelector('.close');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// ... (mantenha as funções deleteProperty e showPropertyDetails como estavam antes)

// Adicione esta função
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const res = urlParams.get('res');

    if (res === '1') {
        showNotification('Propriedade adicionada com sucesso!', 'success');
    } else if (res === '0') {
        showNotification('Erro ao adicionar propriedade. Por favor, tente novamente.', 'error');
    }
}

// Adicione esta função se ainda não existir
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
}

async function deleteProperty(propertyId) {
    if (confirm('Tem certeza que deseja excluir esta propriedade?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao excluir a propriedade');
            }

            showNotification('Propriedade excluída com sucesso!', 'success');
            loadAllProperties(); // Recarregar a lista de propriedades
        } catch (error) {
            console.error('Erro ao excluir a propriedade:', error);
            showNotification('Erro ao excluir a propriedade. Por favor, tente novamente.', 'error');
        }
    }
}

function updatePropertyDetailsView(property) {
    const modal = document.getElementById('property-details-modal');
    if (!modal || modal.style.display === 'none') {
        // Se a modal não estiver visível, apenas atualize os dados armazenados
        currentProperty = property;
        return;
    }

    const elements = {
        title: document.getElementById('modal-property-title'),
        price: document.getElementById('modal-property-price'),
        address: document.getElementById('modal-property-address'),
        details: document.getElementById('modal-property-details'),
        description: document.getElementById('modal-property-description')
    };

    // Atualizar apenas os elementos que existem
    if (elements.title) elements.title.textContent = property.title;
    if (elements.price) elements.price.textContent = `R$ ${property.price.toLocaleString('pt-BR')}`;
    if (elements.address) elements.address.textContent = `${property.address.street}, ${property.address.city} - ${property.address.state}`;
    if (elements.details) elements.details.textContent = `${property.bedrooms} quartos | ${property.bathrooms} banheiros | ${property.area} m²`;
    if (elements.description) elements.description.textContent = property.description;

    // Atualizar imagens no carrossel
    updatePropertyImages(property.images);
}

function updatePropertyImages(images) {
    const imagesContainer = document.getElementById('modal-property-images');
    if (!imagesContainer) return;

    imagesContainer.innerHTML = '';
    images.forEach((imageUrl, index) => {
        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;
        imgElement.alt = `Imagem ${index + 1} da propriedade`;
        imagesContainer.appendChild(imgElement);
    });

    const imageOverlay = document.querySelector('.image-overlay');
    if (imageOverlay) {
        imageOverlay.textContent = `1/${images.length}`;
    }

    // Reinicializar o carrossel
    initializeCarousel();
}

function updatePropertyCard(property) {
    const card = document.querySelector(`.property-card[data-id="${property._id}"]`);
    if (card) {
        const elements = {
            title: card.querySelector('.property-title'),
            price: card.querySelector('.property-price'),
            address: card.querySelector('.property-address'),
            details: card.querySelector('.property-details'),
            image: card.querySelector('.property-image')
        };

        if (elements.title) elements.title.textContent = property.title;
        if (elements.price) elements.price.textContent = `R$ ${property.price.toLocaleString('pt-BR')}`;
        if (elements.address) elements.address.textContent = `${property.address.street}, ${property.address.city} - ${property.address.state}`;
        if (elements.details) elements.details.textContent = `${property.bedrooms} quartos | ${property.bathrooms} banheiros | ${property.area} m²`;
        
        if (elements.image && property.images.length > 0) {
            elements.image.style.backgroundImage = `url('${property.images[0]}')`;
        }
    }
}

function initializeCarousel() {
    const galleryTop = new Swiper('.gallery-top', {
        spaceBetween: 10,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        loop: true,
    });

    const galleryThumbs = new Swiper('.gallery-thumbs', {
        spaceBetween: 10,
        centeredSlides: true,
        slidesPerView: 'auto',
        touchRatio: 0.2,
        slideToClickedSlide: true,
        loop: true,
    });

    galleryTop.controller.control = galleryThumbs;
    galleryThumbs.controller.control = galleryTop;
}