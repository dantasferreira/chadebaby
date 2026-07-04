import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, runTransaction, push, set, onValue } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Suas configurações do Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDYokR4FMROlfLjZzVSZbDysUpEwGfMSB0",
    authDomain: "chadefraldas-0607.firebaseapp.com",
    databaseURL: "https://chadefraldas-0607-default-rtdb.firebaseio.com",
    projectId: "chadefraldas-0607",
    storageBucket: "chadefraldas-0607.firebasestorage.app",
    messagingSenderId: "111096311190",
    appId: "1:111096311190:web:21d47da8633fb5a6e601b7",
    measurementId: "G-15Y6BZWVKG"
};

// Inicializando o Firebase e o Banco de Dados
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const estoqueRef = ref(db, 'estoque');
const listaRef = ref(db, 'participantes');

// Atualiza a interface gráfica com as quantidades e botões
function updateUI(counts) {
    const tamanhos = ['p', 'm', 'g'];
    tamanhos.forEach(size => {
        const span = document.getElementById(`count-${size}`);
        const card = document.getElementById(`card-${size}`);
        const btn = card.querySelector('button');
        
        span.innerText = counts[size];

        if (counts[size] <= 0) {
            card.classList.add('disabled');
            span.innerText = "Esgotado!";
            btn.disabled = true;
            btn.innerText = "Indisponível";
        } else {
            card.classList.remove('disabled');
            btn.disabled = false;
            btn.innerText = `Doar ${size.toUpperCase()}`;
        }
    });
}

// Escuta mudanças de estoque em tempo real
onValue(estoqueRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        updateUI(data);
    } else {
        // Se o banco estiver vazio, cria o estoque inicial fixo solicitado
        set(estoqueRef, { p: 5, m: 10, g: 10 });
    }
});

// Escuta mudanças na lista de participantes em tempo real e exibe na tela
onValue(listaRef, (snapshot) => {
    const listaUl = document.getElementById('contributors-list');
    listaUl.innerHTML = '';
    
    const data = snapshot.val();
    if (data) {
        Object.values(data).reverse().forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${item.nome}</strong> escolheu o tamanho <span>${item.tamanho.toUpperCase()}</span>`;
            listaUl.appendChild(li);
        });
    } else {
        listaUl.innerHTML = '<li>Nenhuma confirmação ainda. Seja o primeiro!</li>';
    }
});

// Executa a transação de reserva de estoque e salva o nome do convidado
window.confirmarDoacao = function(size) {
    const nomeInput = document.getElementById('guest-name');
    const nome = nomeInput.value.trim();

    if (!nome) {
        alert("Por favor, digite seu nome antes de escolher o tamanho da fralda.");
        nomeInput.focus();
        return;
    }

    const itemEstoqueRef = ref(db, `estoque/${size}`);
    
    // Usa transação para evitar conflito se duas pessoas clicarem juntas no último item
    runTransaction(itemEstoqueRef, (currentCount) => {
        if (currentCount === null) return null;
        if (currentCount <= 0) return; // Cancelado se esgotou
        return currentCount - 1;
    }).then((result) => {
        if (result.committed) {
            // Se o estoque diminuiu com sucesso, salva o nome da pessoa na lista
            const novaPresencaRef = push(listaRef);
            set(novaPresencaRef, {
                nome: nome,
                tamanho: size,
                dataHora: new Date().toISOString()
            }).then(() => {
                alert(`Obrigado, ${nome}! Sua escolha do tamanho ${size.toUpperCase()} foi registrada.`);
                nomeInput.value = ''; // Limpa o campo de texto
            });
        } else {
            alert("Desculpe, esse tamanho acabou de esgotar! Escolha outra opção.");
        }
    }).catch((error) => {
        console.error("Erro ao processar a escolha:", error);
    });
};