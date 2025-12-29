/**
 * CONFIGURAÇÃO DO FIREBASE
 * ========================
 * 
 * INSTRUÇÕES PARA CONFIGURAR SEU PROJETO FIREBASE:
 * 
 * 1. Acesse https://console.firebase.google.com/
 * 2. Clique em "Adicionar projeto" ou selecione um existente
 * 3. Vá em "Configurações do projeto" (engrenagem) > "Geral"
 * 4. Role até "Seus aplicativos" e clique em "</>" (Web)
 * 5. Registre o app e copie as credenciais
 * 6. Substitua os valores abaixo pelas suas credenciais
 * 
 * CONFIGURAR AUTENTICAÇÃO:
 * 1. No console Firebase, vá em "Authentication" > "Sign-in method"
 * 2. Ative o provedor "E-mail/senha"
 * 
 * CONFIGURAR FIRESTORE:
 * 1. No console Firebase, vá em "Firestore Database"
 * 2. Clique em "Criar banco de dados"
 * 3. Escolha o modo (produção ou teste)
 * 4. Selecione a região mais próxima (ex: southamerica-east1)
 * 
 * CONFIGURAR STORAGE (para anexos):
 * 1. No console Firebase, vá em "Storage"
 * 2. Clique em "Começar"
 * 3. Escolha a região (mesma do Firestore)
 * 
 * REGRAS DE SEGURANÇA DO FIRESTORE:
 * Vá em Firestore > Regras e substitua por:
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /projects/{projectId} {
 *       allow read, write: if request.auth != null;
 *     }
 *     match /comments/{commentId} {
 *       allow read, write: if request.auth != null;
 *     }
 *     match /tasksState/{docId} {
 *       allow read, write: if request.auth != null;
 *     }
 *     match /settings/{docId} {
 *       allow read, write: if request.auth != null;
 *     }
 *     match /reminders/{docId} {
 *       allow read, write: if request.auth != null;
 *     }
 *   }
 * }
 * 
 * REGRAS DE SEGURANÇA DO STORAGE:
 * Vá em Storage > Rules e substitua por:
 * 
 * rules_version = '2';
 * service firebase.storage {
 *   match /b/{bucket}/o {
 *     match /projects/{projectId}/{allPaths=**} {
 *       allow read, write: if request.auth != null;
 *     }
 *   }
 * }
 */

const firebaseConfig = {
    apiKey: "AIzaSyB5iY23Br7-WyUZCeI2w3GYRdEXI6kxPl0",
    authDomain: "estrategias-2026.firebaseapp.com",
    projectId: "estrategias-2026",
    storageBucket: "estrategias-2026.firebasestorage.app",
    messagingSenderId: "1094181799856",
    appId: "1:1094181799856:web:40c87a6445d9326239b875"
};

// Inicialização do Firebase
firebase.initializeApp(firebaseConfig);

// Referências para uso no app
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configurar persistência offline para o Firestore
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Persistência offline não disponível - múltiplas abas abertas');
        } else if (err.code === 'unimplemented') {
            console.warn('Persistência offline não suportada neste navegador');
        }
    });

console.log('Firebase inicializado com sucesso!');
