import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

let propertyId;

document.addEventListener('DOMContentLoaded', () => {
    checkPermission(['corretor']);
    propertyId = new URLSearchParams(window.location.search).get('id');
    if (!propertyId) {
        alert('ID da propriedade não fornecido');
        window.location.href = 'manage-properties.html';
    }
    loadPropertyData();
    setupForm();
});

async function loadPropertyData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar dados da propriedade');
        }

        const property = await response.json();
        fillForm(property);
    } catch (error) {
        console.error('Erro ao carregar dados da propriedade:', error);
        alert('Erro ao carregar dados da propriedade. Por favor, tente novamente.');
    }
}

function fillForm(property) {
    document.getElementById('title').value = property.title;
    document.getElementById('description').value = property.description;
    document.getElementById('type').value = property.type;
    document.getElementById('price').value = property.price;
    document.getElementById('bedrooms').value = property.bedrooms;
    document.getElementById('bathrooms').value = property.bathrooms;
    document.getElementById('area').value = property.area;
    document.getElementById('address').value = property.address.street;
    document.getElementById('city').value = property.address.city;
    document.getElementById('state').value = property.address.state;
    document.getElementById('zipCode').value = property.address.zipCode;
    document.getElementById('image').value = property.image;
}

function setupForm() {
    const form = document.getElementById('edit-property-form');
    form.addEventListener('submit', handleSubmit);
}

async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const propertyData = Object.fromEntries(formData.entries());

    propertyData.address = {
        street: propertyData.address,
        city: propertyData.city,
        state: propertyData.state,
        zipCode: propertyData.zipCode
    };

    delete propertyData.city;
    delete propertyData.state;
    delete propertyData.zipCode;

    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(propertyData)
        });

        if (!response.ok) {
            throw new Error('Falha ao atualizar propriedade');
        }

        alert('Propriedade atualizada com sucesso!');
        window.location.href = 'manage-properties.html';
    } catch (error) {
        console.error('Erro ao atualizar propriedade:', error);
        alert('Erro ao atualizar propriedade. Por favor, tente novamente.');
    }
}