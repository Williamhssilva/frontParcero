import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', () => {
    checkPermission(['corretor']);
    setupForm();
});

function setupForm() {
    const form = document.getElementById('add-property-form');
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
        const response = await fetch(`${API_BASE_URL}/api/properties`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(propertyData)
        });

        if (!response.ok) {
            throw new Error('Falha ao adicionar propriedade');
        }

        alert('Propriedade adicionada com sucesso!');
        window.location.href = 'manage-properties.html';
    } catch (error) {
        console.error('Erro ao adicionar propriedade:', error);
        alert('Erro ao adicionar propriedade. Por favor, tente novamente.');
    }
}