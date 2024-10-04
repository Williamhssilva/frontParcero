import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';  

// auth.js
export async function login(email, password) {
    try {
        console.log('Iniciando processo de login');
        const response = await fetch(`${API_BASE_URL}/api/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        console.log('Resposta recebida:', response.status);
        const data = await response.json();
        console.log('Dados recebidos:', data);

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            console.log('Token armazenado:', data.token); 
            console.log('Login bem-sucedido, atualizando menu');
            renderMenu();
            window.location.href = 'manage-properties.html';
        } else {
            throw new Error(data.message || 'Erro ao fazer login');
        }
    } catch (error) {
        console.error('Erro detalhado:', error);
        alert(error.message || 'Erro ao fazer login');
    }
}

export async function register(name, email, password, role) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password, role }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao registrar usuário');
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        renderMenu(); 
        window.location.href = 'manage-properties.html';
    } catch (error) {
        console.error('Erro:', error);
        alert(error.message);
    }
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    renderMenu();  // Use apenas renderMenu aqui
    // Redireciona para a página inicial
    window.location.href = 'login.html';
}

// Tornar a função logout disponível globalmente
window.logout = logout;

export function getCurrentUser() {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
}

export function isLoggedIn() {
    return !!localStorage.getItem('token');
}

export function isTokenValid() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('Token não encontrado no localStorage');
        return false;
    }
    console.log('Token encontrado:', token);
    // Aqui você pode adicionar uma verificação adicional, como decodificar o JWT
    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const role = document.getElementById('register-role').value;
            register(name, email, password, role);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            login(email, password);
        });
    }

    updateAuthUI();
});

function updateAuthUI() {
    const user = getCurrentUser();
    const userActionsElement = document.getElementById('user-actions');
    
    if (userActionsElement) {
        if (user) {
            userActionsElement.innerHTML = `
                <span>Olá, ${user.name}</span>
                <button onclick="logout()">Sair</button>
            `;
            if (user.role === 'corretor' && !user.isApproved) {
                userActionsElement.innerHTML += '<p>Sua conta está aguardando aprovação.</p>';
            }
        } else {
            userActionsElement.innerHTML = `
                <a href="login.html">Login</a>
                <a href="register.html">Registrar</a>
            `;
        }
    }
}

// função para verificar permissões
export function checkPermission(allowedRoles) {
    const user = getCurrentUser();
    if (!user) {
        console.log('Usuário não está logado. Redirecionando para a página de login.');
        window.location.href = 'login.html';
        return false;
    }
    
    if (user.role === 'administrador') {
        return true; // Administrador tem acesso a tudo
    }
    
    if (!allowedRoles.includes(user.role)) {
        console.log('Usuário não tem permissão. Redirecionando para a página inicial.');
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}