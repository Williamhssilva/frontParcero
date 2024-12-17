import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';
import { authenticatedFetch, publicFetch } from './utils.js';

let galleryTop;
let galleryThumbs;

let propertyDetailsInitialized = false;

export function initPropertyDetails() {
    if (propertyDetailsInitialized) {
        return;
    }
    propertyDetailsInitialized = true;

    

    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (propertyId) {
        fetchPropertyDetails(propertyId);
    } else {
        console.error('ID da propriedade não fornecido na URL');
        displayError('ID da propriedade não fornecido');
    }
}

async function fetchPropertyDetails(propertyId) {
    try {
        const url = `${API_BASE_URL}/api/public/properties/${propertyId}`;
        const data = await publicFetch(url);
        
        if (data && data.status === 'success' && data.data && data.data.property) {
            displayPropertyDetails(data.data);
            loadSimilarProperties(data.data);
        } else {
            throw new Error('Dados da propriedade não encontrados ou formato inválido');
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes da propriedade:', error);
        displayError('Não foi possível carregar os detalhes da propriedade. Por favor, tente novamente mais tarde.');
    }
}

function displayPropertyDetails(property) {
    if (!property || !property.property) {
        displayError('Dados da propriedade não disponíveis');
        return;
    }
    
    console.log('Propriedade recebida para exibição:', property);
    
    // Atualizar título e endereço !!* No momento não exibiremos o endereço da propriedade *!!
    document.getElementById('property-title').textContent = property.property.title || 'Título não disponível';
    //document.getElementById('property-address').textContent = `${property.property.address || ''}, ${property.property.neighborhood || ''}, ${property.property.captureCity || ''}`;

    // Atualizar galeria de imagens
    updatePropertyImages(property.property.images || []);

    // Atualizar preço
    document.getElementById('property-price').textContent = `R$ ${property.property.salePrice ? property.property.salePrice.toLocaleString('pt-BR') : 'Preço não informado'}`;

    // Atualizar características
    const featuresContainer = document.getElementById('property-features');
    featuresContainer.innerHTML = `
        <div class="feature"><i class="fas fa-bed"></i> ${property.property.bedrooms || 0} quartos</div>
        <div class="feature"><i class="fas fa-bath"></i> ${property.property.socialBathrooms || 0} banheiros</div> 
        <div class="feature"><i class="fas fa-ruler-combined"></i> ${property.property.totalArea || 0} m² total</div>
        <div class="feature"><i class="fas fa-vector-square"></i> ${property.property.builtArea || 0} m² construídos</div>
        <div class="feature"><i class="fas fa-car"></i> ${property.property.garages || 0} vagas</div> 
        <div class="feature"><i class="fas ${property.property.propertyType?.toLowerCase() === 'casa' ? 'fa-home' : 'fa-building'}"></i> ${property.property.propertyType || 'Tipo não informado'}</div>
    `;

    // Atualizar descrição
    document.getElementById('property-description-text').innerHTML = property.property.description || 'Descrição não disponível';

    

    

    // Configurar botões de ação
    document.getElementById('request-visit-btn').onclick = () => requestVisit(property.property._id);
    //document.getElementById('favorite-btn').onclick = () => toggleFavorite(property.property._id);

    function requestVisit(propertyId) {
        // Número do WhatsApp do corretor (substitua pelo número real)
        const phoneNumber = '553499250380';
        
        // Obtém o título e preço do imóvel
        const propertyTitle = document.getElementById('property-title').textContent;
        const propertyPrice = document.getElementById('property-price').textContent;
        
        // Monta a mensagem
        const message = encodeURIComponent(
            `Olá! Vi o imóvel "${propertyTitle}" (${propertyPrice}) no site e gostaria de agendar uma visita. ID do imóvel: ${propertyId}`
        );
        
        // Cria o link do WhatsApp
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
        
        // Abre em uma nova aba
        window.open(whatsappUrl, '_blank');
    }

    // Exibir data de captura e corretor responsável
    //const captureInfo = document.createElement('div');
    //captureInfo.className = 'capture-info';
    //captureInfo.innerHTML = `
    //    <p>Capturado em: ${new Date(property.property.captureDate).toLocaleDateString('pt-BR')}</p>
    //    <p>Corretor responsável: ${property.property.capturedByName || 'Não informado'}</p>
    //`;
    //document.getElementById('property-details').appendChild(captureInfo);
}

function updatePropertyImages(images) {
    const galleryTop = document.querySelector('.gallery-top .swiper-wrapper');
    const galleryThumbs = document.querySelector('.gallery-thumbs .swiper-wrapper');
    
    if (!galleryTop || !galleryThumbs) {
        console.error('Elementos da galeria não encontrados');
        return;
    }

    galleryTop.innerHTML = '';
    galleryThumbs.innerHTML = '';

    images.forEach(image => {
        const fullImageUrl = `${API_BASE_URL}${image}`; // Use API_BASE_URL aqui
        
        galleryTop.innerHTML += `
            <div class="swiper-slide">
                <img src="${fullImageUrl}" alt="Imagem da propriedade" onerror="this.src='https://via.placeholder.com/800x600?text=Imagem+não+encontrada';">
            </div>
        `;
        
        galleryThumbs.innerHTML += `
            <div class="swiper-slide">
                <img src="${fullImageUrl}" alt="Miniatura da imagem" onerror="this.src='https://via.placeholder.com/200x150?text=Miniatura+não+encontrada';">
            </div>
        `;
    });

    initializeCarousel();
}

function initializeCarousel() {
    const galleryTop = document.querySelector('.gallery-top');
    const galleryThumbs = document.querySelector('.gallery-thumbs');

    if (!galleryTop || !galleryThumbs) {
        console.error('Elementos do carousel não encontrados');
        return;
    }

    new Swiper(galleryThumbs, {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesVisibility: true,
        watchSlidesProgress: true,
    });

    new Swiper(galleryTop, {
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

async function loadSimilarProperties(property) {
    try {
        if (!property || !property.property || !property.property._id) {
            console.warn('Dados da propriedade inválidos para buscar similares');
            displaySimilarProperties([]);
            return;
        }

        // Tenta buscar propriedades similares
        try {
            const response = await publicFetch(`${API_BASE_URL}/api/public/properties/${property.property._id}/similar`);
            
            if (response && response.data && Array.isArray(response.data.similarProperties)) {
                displaySimilarProperties(response.data.similarProperties);
            } else {
                console.warn('Formato inválido de propriedades similares');
                displaySimilarProperties([]);
            }
        } catch (error) {
            // Se a rota não existir ou retornar erro, busca todas as propriedades
            const allPropertiesResponse = await publicFetch(`${API_BASE_URL}/api/public/properties`);
            
            if (allPropertiesResponse && allPropertiesResponse.data && Array.isArray(allPropertiesResponse.data.properties)) {
                // Filtra para mostrar apenas 3 propriedades diferentes da atual
                const similarProperties = allPropertiesResponse.data.properties
                    .filter(p => p.property._id !== property.property._id)
                    .slice(0, 3)
                    .map(p => ({ property: p.property }));
                
                displaySimilarProperties(similarProperties);
            } else {
                console.warn('Não foi possível carregar propriedades alternativas');
                displaySimilarProperties([]);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar propriedades similares:', error);
        displaySimilarProperties([]);
    }
}

function displaySimilarProperties(properties) {
    const propertiesGrid = document.querySelector('#similar-properties .properties-grid');
    if (!propertiesGrid) {
        console.error('Elemento properties-grid não encontrado');
        return;
    }

    if (!Array.isArray(properties) || properties.length === 0) {
        propertiesGrid.innerHTML = '<p class="no-similar">Nenhuma propriedade similar disponível no momento.</p>';
        return;
    }

    propertiesGrid.innerHTML = properties.map(property => `
        <div class="property-card" onclick="window.location.href='property-details.html?id=${property.property._id}'">
            <div class="property-image">
                <img src="${property.property.images && property.property.images.length > 0 
                    ? `${API_BASE_URL}${property.property.images[0]}` 
                    : 'https://via.placeholder.com/300x200.png?text=Imóvel+Similar'}"
                    onerror="this.src='https://via.placeholder.com/300x200.png?text=Imóvel+Similar'"
                    alt="Imagem do imóvel">
            </div>
            <div class="property-card-info">
                <h3 class="property-card-title">${property.property.title || 'Título não disponível'}</h3>
                <p class="property-card-price">${property.property.salePrice ? `R$ ${property.property.salePrice.toLocaleString('pt-BR')}` : 'Preço não informado'}</p>
                <p class="property-card-details">
                    ${property.property.bedrooms || 0} quartos | 
                    ${property.property.socialBathrooms || 0} banheiros | 
                    ${property.property.totalArea ? `${property.property.totalArea} m²` : 'Área não informada'}
                </p>
                <p class="property-card-address">${property.property.neighborhood || ''} ${property.property.captureCity ? `, ${property.property.captureCity}` : ''}</p>
            </div>
        </div>
    `).join('');
}



// Mantenha as funções requestVisit e toggleFavorite como estavam antes

document.addEventListener('DOMContentLoaded', initPropertyDetails);
