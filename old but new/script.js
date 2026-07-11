// ===== DOM Elements =====
const form = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const transactionList = document.getElementById('transaction-list');
const emptyState = document.getElementById('empty-state');

const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const balanceEl = document.getElementById('balance');

// ===== Load Transactions from localStorage =====
let transactions = JSON.parse(localStorage.getItem('expenseTracker_transactions')) || [];

// ===== Initialize App =====
function init() {
    renderTransactions();
    updateDashboard();
}

// ===== Add Transaction =====
form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const type = typeInput.value;
    
    if (!description || isNaN(amount) || amount <= 0) {
        return;
    }
    
    const transaction = {
        id: Date.now(),
        description: description,
        amount: amount,
        type: type,
        date: new Date().toLocaleDateString('gu-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };
    
    transactions.unshift(transaction); // Add to beginning
    saveToLocalStorage();
    renderTransactions();
    updateDashboard();
    
    // Reset form
    form.reset();
    typeInput.value = 'income';
    
    // Visual feedback
    showNotification('✅ ટ્રાન્ઝેક્શન સફળતાપૂર્વક ઉમેરાઈ ગયું!');
});

// ===== Delete Transaction =====
function deleteTransaction(id) {
    if (confirm('શું તમે આ ટ્રાન્ઝેક્શન ડિલીટ કરવા માંગો છો?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveToLocalStorage();
        renderTransactions();
        updateDashboard();
        showNotification('🗑️ ટ્રાન્ઝેક્શન ડિલીટ થઈ ગયું');
    }
}

// ===== Render Transactions List =====
function renderTransactions() {
    transactionList.innerHTML = '';
    
    if (transactions.length === 0) {
        emptyState.classList.add('active');
        return;
    }
    
    emptyState.classList.remove('active');
    
    transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = `transaction-item ${transaction.type}`;
        
        const sign = transaction.type === 'income' ? '+' : '-';
        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        
        item.innerHTML = `
            <div class="transaction-info">
                <div class="desc">${escapeHtml(transaction.description)}</div>
                <div class="date">${transaction.date}</div>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${sign}₹${formatCurrency(transaction.amount)}
            </div>
            <button class="btn-delete" onclick="deleteTransaction(${transaction.id})" title="ડિલીટ કરો">
                🗑️
            </button>
        `;
        
        transactionList.appendChild(item);
    });
}

// ===== Update Dashboard Cards =====
function updateDashboard() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;
    
    totalIncomeEl.textContent = `₹${formatCurrency(income)}`;
    totalExpenseEl.textContent = `₹${formatCurrency(expense)}`;
    balanceEl.textContent = `₹${formatCurrency(balance)}`;
    
    // Color balance based on positive/negative
    if (balance < 0) {
        balanceEl.style.color = 'var(--expense)';
    } else if (balance > 0) {
        balanceEl.style.color = 'var(--income)';
    } else {
        balanceEl.style.color = 'var(--text)';
    }
}

// ===== Save to localStorage =====
function saveToLocalStorage() {
    localStorage.setItem('expenseTracker_transactions', JSON.stringify(transactions));
}

// ===== Format Currency =====
function formatCurrency(amount) {
    return amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ===== Escape HTML (Security) =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Notification Toast =====
function showNotification(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #1e293b;
        color: white;
        padding: 14px 28px;
        border-radius: 12px;
        font-size: 0.95rem;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 1000;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        white-space: nowrap;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ===== Start the App =====
init();