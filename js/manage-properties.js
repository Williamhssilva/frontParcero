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
    }
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
            <img src="${property.image}" alt="${property.title}" class="property-image">
            <div class="property-info">
                <h3 class="property-title">${property.title}</h3>
                <p class="property-price">R$ ${property.price.toLocaleString('pt-BR')}</p>
                <div class="property-actions">
                    <button class="btn btn-secondary view-details-btn" data-id="${property._id}">Ver Detalhes</button>
                    <a href="edit-property.html?id=${property._id}" class="btn btn-secondary">Editar</a>
                    <button class="btn btn-danger delete-btn" data-id="${property._id}">Excluir</button>
                </div>
            </div>
        `;
        propertiesList.appendChild(propertyCard);
    });

    // Adicionar event listeners para os botões
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => deleteProperty(button.getAttribute('data-id')));
    });

    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', () => showPropertyDetails(button.getAttribute('data-id')));
    });
}

async function showPropertyDetails(propertyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`);
        if (!response.ok) {
            throw new Error('Falha ao carregar detalhes da propriedade');
        }
        const data = await response.json();
        const property = data.data;

        // Imagens de overlay
        const overlayImages = [
            'https://via.placeholder.com/800x600.png?text=Imagem+1',
            'https://via.placeholder.com/800x600.png?text=Imagem+2',
            'https://via.placeholder.com/800x600.png?text=Imagem+3'
        ];

        const modal = document.getElementById('property-details-modal');
        const modalContent = modal.querySelector('.modal-content');

        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h2>${property.title}</h2>
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
            <p><strong>Preço:</strong> R$ ${property.price.toLocaleString('pt-BR')}</p>
            <p><strong>Endereço:</strong> ${property.address.street}, ${property.address.city} - ${property.address.state}</p>
            <p><strong>Quartos:</strong> ${property.bedrooms}</p>
            <p><strong>Banheiros:</strong> ${property.bathrooms}</p>
            <p><strong>Área:</strong> ${property.area} m²</p>
            <p><strong>Tipo:</strong> ${property.type}</p>
            <p><strong>Status:</strong> ${property.status}</p>
            <p><strong>Descrição:</strong> ${property.description}</p>
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
    } catch (error) {
        console.error('Erro ao carregar detalhes da propriedade:', error);
        alert('Erro ao carregar detalhes da propriedade');
    }
}

function initializeModalCarousel() {
    const galleryThumbs = new Swiper('.gallery-thumbs', {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesVisibility: true,
        watchSlidesProgress: true,
    });

    const galleryTop = new Swiper('.gallery-top', {
        spaceBetween: 10,
        effect: 'fade',  // Adiciona efeito de fade entre slides
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

    document.getElementById('edit-title').value = currentProperty.title || '';
    document.getElementById('edit-price').value = currentProperty.price || '';
    document.getElementById('edit-address').value = currentProperty.address ? 
        `${currentProperty.address.street}, ${currentProperty.address.city} - ${currentProperty.address.state}` : '';
    document.getElementById('edit-bedrooms').value = currentProperty.bedrooms || '';
    document.getElementById('edit-bathrooms').value = currentProperty.bathrooms || '';
    document.getElementById('edit-area').value = currentProperty.area || '';
    document.getElementById('edit-description').value = currentProperty.description || '';

    const imagesContainer = document.getElementById('edit-images-container');
    imagesContainer.innerHTML = '';
    if (currentProperty.images && Array.isArray(currentProperty.images)) {
        currentProperty.images.forEach((imageUrl, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.style.position = 'relative';
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = `Imagem ${index + 1}`;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X';
            deleteBtn.className = 'image-delete-btn';
            deleteBtn.onclick = () => deleteImage(index);
            imgContainer.appendChild(img);
            imgContainer.appendChild(deleteBtn);
            imagesContainer.appendChild(imgContainer);
        });
    }

    document.getElementById('edit-property-form').addEventListener('submit', updateProperty);
    document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
}

function cancelEdit() {
    document.getElementById('property-edit-mode').style.display = 'none';
    document.getElementById('property-view-mode').style.display = 'block';
}

async function updateProperty(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const updatedProperty = Object.fromEntries(formData.entries());
    
    // Adicionar lógica para lidar com as imagens aqui

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
            throw new Error('Falha ao atualizar a propriedade');
        }

        const data = await response.json();
        currentProperty = data.data;

        alert('Propriedade atualizada com sucesso!');
        cancelEdit();
        showPropertyDetails(currentProperty._id);
        loadAllProperties(); // Recarregar a lista de propriedades
    } catch (error) {
        console.error('Erro ao atualizar a propriedade:', error);
        alert('Erro ao atualizar a propriedade. Por favor, tente novamente.');
    }
}

function deleteImage(index) {
    currentProperty.images.splice(index, 1);
    showEditMode(); // Recarregar o modo de edição para refletir a mudança
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