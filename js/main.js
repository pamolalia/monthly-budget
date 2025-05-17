<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>


// Constants for localStorage keys
const BUDGET_KEY = 'food_budget';
const EXPENSES_KEY = 'food_expenses';

const supabase = supabase.createClient(
  'https://bidotqqjspfyaexqlxdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZG90cXFqc3BmeWFleHFseGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTI0MTIsImV4cCI6MjA2MzA2ODQxMn0.OW7XnCJ35ygpUZ5wftPkB4zalSdwf5YbInuEhFCPufo'
);

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app
    initApp();
    
    // Add event listeners for static elements
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    document.getElementById('editBudgetForm').addEventListener('submit', updateBudget);
    document.getElementById('resetBudgetBtn').addEventListener('click', resetBudget);
    
    // Add event listener for edit expense form using event delegation
    document.body.addEventListener('submit', function(event) {
        if (event.target.id === 'editExpenseForm') {
            event.preventDefault();
            updateExpense(event);
        }
    });
});

// Initialize the application
function initApp() {
    // Set current month
    displayCurrentMonth();
    
    // Load budget and expenses from localStorage
    loadBudget();
    loadExpenses();
    
    // Update budget display
    updateBudgetDisplay();
}

// Display current month in the format "Month Year"
function displayCurrentMonth() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    const monthYear = `${months[now.getMonth()]} ${now.getFullYear()}`;
    document.getElementById('currentMonth').textContent = monthYear;
}

// Load budget from localStorage or set default
function loadBudget() {
    const currentMonth = getCurrentMonthKey();
    let budgetData = JSON.parse(localStorage.getItem(BUDGET_KEY)) || {};
    
    if (!budgetData[currentMonth]) {
        budgetData[currentMonth] = 0;
        localStorage.setItem(BUDGET_KEY, JSON.stringify(budgetData));
    }
    
    document.getElementById('budgetAmount').textContent = formatCurrency(budgetData[currentMonth]);
    document.getElementById('editBudgetAmount').value = budgetData[currentMonth];
}

// Load expenses from localStorage
function loadExpenses() {
    const currentMonth = getCurrentMonthKey();
    let expensesData = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || {};
    
    if (!expensesData[currentMonth]) {
        expensesData[currentMonth] = [];
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(expensesData));
    }
    
    renderExpensesTable(expensesData[currentMonth]);
}

// Update the budget amount
function updateBudget(event) {
    event.preventDefault();
    
    const budgetInput = document.getElementById('editBudgetAmount');
    const newBudget = parseFloat(budgetInput.value);
    
    if (isNaN(newBudget) || newBudget < 0) {
        alert('Please enter a valid budget amount');
        return;
    }
    
    // Update budget in localStorage
    const currentMonth = getCurrentMonthKey();
    let budgetData = JSON.parse(localStorage.getItem(BUDGET_KEY)) || {};
    budgetData[currentMonth] = newBudget;
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgetData));
    
    // Update UI
    document.getElementById('budgetAmount').textContent = formatCurrency(newBudget);
    updateBudgetDisplay();
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editBudgetModal'));
    modal.hide();
}

// Reset budget to zero
function resetBudget() {
    // Set budget to zero in localStorage
    const currentMonth = getCurrentMonthKey();
    let budgetData = JSON.parse(localStorage.getItem(BUDGET_KEY)) || {};
    budgetData[currentMonth] = 0;
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgetData));
    
    // Update UI
    document.getElementById('budgetAmount').textContent = formatCurrency(0);
    document.getElementById('editBudgetAmount').value = 0;
    updateBudgetDisplay();
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editBudgetModal'));
    modal.hide();
}

// Add a new expense
function addExpense(event) {
    event.preventDefault();
    
    const restaurantInput = document.getElementById('restaurantName');
    const priceInput = document.getElementById('expensePrice');
    
    const restaurant = restaurantInput.value.trim();
    const price = parseFloat(priceInput.value);
    
    if (restaurant === '') {
        alert('Please enter a restaurant name');
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        alert('Please enter a valid price');
        return;
    }
    
    // Create new expense object
    const newExpense = {
        id: Date.now(),
        restaurant: restaurant,
        price: price,
        date: new Date().toISOString().split('T')[0]
    };
    
    // Add to localStorage
    const currentMonth = getCurrentMonthKey();
    let expensesData = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || {};
    
    if (!expensesData[currentMonth]) {
        expensesData[currentMonth] = [];
    }
    
    expensesData[currentMonth].unshift(newExpense); // Add to beginning of array
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expensesData));
    
    // Update UI
    renderExpensesTable(expensesData[currentMonth]);
    updateBudgetDisplay();
    
    // Reset form
    restaurantInput.value = '';
    priceInput.value = '';
    restaurantInput.focus();
}

// Render the expenses table
function renderExpensesTable(expenses) {
    const tableBody = document.getElementById('expensesTableBody');
    const totalElement = document.getElementById('totalSpent');
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Calculate total
    let total = 0;
    
    // Add expense rows
    expenses.forEach(expense => {
        total += expense.price;
        
        const row = document.createElement('tr');
        row.setAttribute('data-id', expense.id);
        row.innerHTML = `
            <td>${expense.restaurant}</td>
            <td>₱${expense.price.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>${formatDate(expense.date)}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary edit-expense" data-id="${expense.id}">Edit</button>
                <button class="btn btn-sm btn-outline-danger delete-expense" data-id="${expense.id}">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-expense').forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = parseInt(this.getAttribute('data-id'));
            editExpense(expenseId);
        });
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-expense').forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = parseInt(this.getAttribute('data-id'));
            deleteExpense(expenseId);
        });
    });
    
    // Update total row
    totalElement.textContent = formatCurrency(total);
    
    // Show/hide empty message
    const emptyMessage = document.getElementById('emptyTableMessage');
    if (expenses.length === 0) {
        emptyMessage.classList.remove('d-none');
    } else {
        emptyMessage.classList.add('d-none');
    }
}

// Update the budget display (remaining amount)
function updateBudgetDisplay() {
    const currentMonth = getCurrentMonthKey();
    
    // Get budget
    const budgetData = JSON.parse(localStorage.getItem(BUDGET_KEY)) || {};
    const budget = budgetData[currentMonth] || 0;
    
    // Calculate total expenses
    const expensesData = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || {};
    const expenses = expensesData[currentMonth] || [];
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.price, 0);
    
    // Calculate remaining budget
    const remaining = budget - totalSpent;
    
    // Update the UI
    const budgetLeftElement = document.getElementById('budgetLeft');
    budgetLeftElement.textContent = `Left: ${formatCurrency(remaining)} / ${formatCurrency(budget)}`;
    
    // Add color class based on percentage left
    budgetLeftElement.classList.remove('danger', 'warning', 'good');
    
    if (budget === 0) {
        // No budget set
        budgetLeftElement.classList.add('warning');
    } else {
        const percentLeft = (remaining / budget) * 100;
        
        if (percentLeft < 25) {
            budgetLeftElement.classList.add('danger');
        } else if (percentLeft < 50) {
            budgetLeftElement.classList.add('warning');
        } else {
            budgetLeftElement.classList.add('good');
        }
    }
}

// Helper: Get current month in format "YYYY-MM"
function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Helper: Format currency in Philippine Peso
function formatCurrency(amount) {
    return `₱${amount.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// Delete an expense
function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    const currentMonth = getCurrentMonthKey();
    let expensesData = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || {};
    
    if (expensesData[currentMonth]) {
        // Find and remove the expense
        expensesData[currentMonth] = expensesData[currentMonth].filter(expense => expense.id !== expenseId);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(expensesData));
        
        // Update UI
        renderExpensesTable(expensesData[currentMonth]);
        updateBudgetDisplay();
    }
}

// Edit an expense
function editExpense(expenseId) {
    const currentMonth = getCurrentMonthKey();
    let expensesData = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || {};
    
    if (!expensesData[currentMonth]) {
        return;
    }
    
    // Find the expense
    const expense = expensesData[currentMonth].find(exp => exp.id === expenseId);
    
    if (!expense) {
        alert('Expense not found');
        return;
    }
    
    // Display the modal first before accessing its elements
    const editExpenseModal = document.getElementById('editExpenseModal');
    const editModal = new bootstrap.Modal(editExpenseModal);
    editModal.show();
    
    // Wait for the modal to be shown before accessing form elements
    editExpenseModal.addEventListener('shown.bs.modal', function() {
        // Now the modal is visible, so we can safely access the elements
        const editExpenseIdInput = document.getElementById('editExpenseId');
        const editRestaurantNameInput = document.getElementById('editRestaurantName');
        const editExpensePriceInput = document.getElementById('editExpensePrice');
        
        if (!editExpenseIdInput || !editRestaurantNameInput || !editExpensePriceInput) {
            alert('An error occurred. Please try again.');
            editModal.hide();
            return;
        }
        
        // Populate edit modal with expense data
        editExpenseIdInput.value = expense.id;
        editRestaurantNameInput.value = expense.restaurant;
        editExpensePriceInput.value = expense.price;
    }, { once: true }); // Only run this listener once
}

// Update an expense
function updateExpense(event) {
    event.preventDefault();
    
    // Get form elements and values
    const editExpenseIdInput = document.getElementById('editExpenseId');
    
    if (!editExpenseIdInput) {
        return;
    }
    
    const expenseId = parseInt(editExpenseIdInput.value);
    
    // Get other form inputs
    const restaurantInput = document.getElementById('editRestaurantName');
    const priceInput = document.getElementById('editExpensePrice');
    
    if (!restaurantInput || !priceInput) {
        return;
    }
    
    const restaurant = restaurantInput.value.trim();
    const price = parseFloat(priceInput.value);
    
    if (restaurant === '') {
        alert('Please enter a restaurant name');
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        alert('Please enter a valid price');
        return;
    }
    
    const currentMonth = getCurrentMonthKey();
    let expensesData = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || {};
    
    if (!expensesData[currentMonth]) {
        return;
    }
    
    // Find and update the expense
    const expenseIndex = expensesData[currentMonth].findIndex(exp => exp.id === expenseId);
    
    if (expenseIndex === -1) {
        alert('Expense not found');
        return;
    }
    
    // Update the expense
    expensesData[currentMonth][expenseIndex].restaurant = restaurant;
    expensesData[currentMonth][expenseIndex].price = price;
    
    // Save updated data to localStorage
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expensesData));
    
    // Update UI
    renderExpensesTable(expensesData[currentMonth]);
    updateBudgetDisplay();
    
    // Close modal
    const editExpenseModal = document.getElementById('editExpenseModal');
    const modal = bootstrap.Modal.getInstance(editExpenseModal);
    if (modal) {
        modal.hide();
    } else {
        // Try to hide it manually if modal instance is not found
        editExpenseModal.classList.remove('show');
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }
}

// Helper: Format date in a readable format
function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-PH', options);
}
